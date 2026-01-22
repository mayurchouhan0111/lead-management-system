import { GoogleGenAI, Type } from "@google/genai";
import { Lead, GeneratedEmail } from "../types";

// Ensure API Key is available
const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

const SEARCH_MODEL = 'gemini-3-flash-preview';
const EMAIL_MODEL = 'gemini-3-flash-preview';

/**
 * Utility to retry operations with exponential backoff, specifically for rate limits.
 */
async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  let lastError: any;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      const errorText = error?.message || '';
      const isRateLimit = errorText.includes('429') || errorText.includes('quota') || error?.status === 429;
      
      if (isRateLimit && i < maxRetries - 1) {
        // Exponential backoff: 1s, 2s, 4s... plus jitter
        const waitTime = Math.pow(2, i) * 1000 + Math.random() * 1000;
        console.warn(`Rate limit hit. Retrying in ${Math.round(waitTime)}ms... (Attempt ${i + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }
      throw error;
    }
  }
  throw lastError;
}

/**
 * Discovers leads using Gemini with Google Search grounding.
 */
export const discoverLeads = async (industry: string, city: string, count: number = 5): Promise<Partial<Lead>[]> => {
  return withRetry(async () => {
    const prompt = `
      Search for ${count} existing, real-world ${industry} businesses in ${city}.
      Verify they exist.
      Prefer businesses that appear to be small/medium and might not have a mobile app (e.g. they use a basic website or just social media).
      
      Output the result ONLY as a JSON array of objects with these properties:
      - businessName: string
      - industry: string
      - city: string
      - website: string (The actual URL found, or "Not listed")
      - phoneNumber: string (The actual phone number or contact number found, or "Not listed")
      - rationale: string (Why this specific business needs an app based on your search)
      
      Do not include markdown formatting like \`\`\`json. Just return the raw JSON string.
    `;

    const response = await ai.models.generateContent({
      model: SEARCH_MODEL,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const text = response.text || '';
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    } else {
      console.warn("Could not parse JSON from discovery response", text);
      return [];
    }
  });
};

/**
 * Qualifies a lead by estimating a priority score.
 */
export const qualifyLead = async (lead: Partial<Lead>): Promise<{ score: 'High' | 'Medium' | 'Low'; reason: string }> => {
  return withRetry(async () => {
    const prompt = `
      Analyze this business lead for a mobile app development agency:
      Name: ${lead.businessName}
      Industry: ${lead.industry}
      Website: ${lead.website}
      Phone: ${lead.phoneNumber}
      Context: ${lead.rationale}

      Assign a Priority Score (High, Medium, or Low) based on:
      - Likelihood of needing digital transformation (High if no website or outdated).
      - Suitability for a mobile app (bookings, loyalty, orders).
      
      Return JSON: { "score": "High" | "Medium" | "Low", "reason": "Short explanation" }
    `;

    const response = await ai.models.generateContent({
      model: SEARCH_MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.STRING, enum: ["High", "Medium", "Low"] },
            reason: { type: Type.STRING }
          }
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from qualification");
    return JSON.parse(text);
  });
};

/**
 * Generates a personalized cold outreach email optimized for deliverability.
 */
export const generateEmail = async (lead: Lead): Promise<GeneratedEmail> => {
  return withRetry(async () => {
    const prompt = `
      Write a high-deliverability cold email to ${lead.businessName} (${lead.industry} in ${lead.city}).
      
      CRITICAL DELIVERABILITY RULES:
      1. Plain text only. No HTML structures.
      2. No spam trigger words (e.g., "Guarantee", "Free", "Urgent", "Winner", "Best price").
      3. Tone: Conversational, humble, and inquisitive. NOT salesy.
      4. Length: Very short. Under 100 words.
      
      Goal: Start a conversation about how a mobile app could help with bookings/orders.
      
      Structure:
      - Subject: Short, lower-case friendly (e.g., "question about [business name]" or "mobile app for [business name]").
      - Body: 
        - Greeting.
        - One sentence observation about their business (make it feel researched).
        - One sentence value prop (booking/loyalty).
        - Soft ask (e.g., "Worth a chat?").
        - Sign off.
      
      Return JSON: { "subject": "...", "body": "..." }
    `;

    const response = await ai.models.generateContent({
      model: EMAIL_MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            subject: { type: Type.STRING },
            body: { type: Type.STRING }
          }
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response for email generation");
    return JSON.parse(text);
  });
};
