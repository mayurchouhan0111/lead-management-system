export interface Lead {
  id: string;
  businessName: string;
  industry: string;
  city: string;
  website: string;
  phoneNumber?: string;
  email?: string;
  rationale?: string;
  priorityScore?: 'High' | 'Medium' | 'Low';
  priorityReason?: string;
  status: 'New' | 'Qualified' | 'Contacted' | 'Responded' | 'Unsubscribed';
  addedAt: string;
}

export interface GeneratedEmail {
  subject: string;
  body: string;
}

export interface CampaignStats {
  sent: number;
  opened: number;
  replied: number;
  clicks: number;
  dailyLimitUsed: number;
}

export interface SearchParams {
  industry: string;
  city: string;
}

export interface InboxMessage {
  id: string;
  fromName: string;
  fromEmail: string;
  subject: string;
  preview: string;
  date: string;
  read: boolean;
  leadId?: string; // Links back to a lead in the DB
}

export enum AppView {
  DASHBOARD = 'DASHBOARD',
  FINDER = 'FINDER',
  LEADS = 'LEADS',
  OUTREACH = 'OUTREACH',
  INBOX = 'INBOX',
}