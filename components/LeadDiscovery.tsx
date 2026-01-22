import React, { useState } from 'react';
import { SearchParams, Lead } from '../types';
import { discoverLeads, qualifyLead } from '../services/geminiService';
import { Search, Loader2, Plus, MapPin, Globe, CheckSquare, Sliders, AlertTriangle, Check, Phone } from 'lucide-react';

interface LeadDiscoveryProps {
  onAddLeads: (leads: Lead[]) => void;
  existingLeads: Lead[];
  notify: (msg: string, type: 'success' | 'error' | 'info') => void;
}

const INDIAN_INDUSTRIES = [
  "Restaurants & Dhabas",
  "Coaching Centers & Tutors",
  "Sweet Shops & Bakeries",
  "Jewellery Showrooms",
  "Textile Wholesalers",
  "Real Estate Agencies",
  "Dentists & Clinics",
  "Gyms & Fitness Centers",
  "Wedding Planners",
  "Travel Agencies",
  "Boutique Hotels",
  "Furniture Manufacturers",
  "CA & Tax Consultants",
  "Interior Designers"
];

const GLOBAL_INDUSTRIES = [
  "Restaurants",
  "Cafes",
  "SaaS Startups",
  "Law Firms",
  "Dental Clinics",
  "Real Estate Agencies",
  "Marketing Agencies",
  "E-commerce Brands",
  "Fitness Studios",
  "Consulting Firms",
  "Spas & Wellness",
  "Pet Grooming"
];

const INDIAN_CITIES = [
  "Mumbai, India",
  "Delhi, India",
  "Bangalore (Bengaluru), India",
  "Hyderabad, India",
  "Chennai, India",
  "Pune, India",
  "Kolkata, India",
  "Ahmedabad, India",
  "Jaipur, India",
  "Surat, India",
  "Lucknow, India",
  "Indore, India",
  "Chandigarh, India",
  "Kochi, India"
];

const GLOBAL_CITIES = [
  "New York, USA",
  "London, UK",
  "Dubai, UAE",
  "Singapore",
  "Toronto, Canada",
  "Sydney, Australia",
  "Berlin, Germany",
  "San Francisco, USA",
  "Paris, France",
  "Tokyo, Japan"
];

const LeadDiscovery: React.FC<LeadDiscoveryProps> = ({ onAddLeads, existingLeads, notify }) => {
  const [params, setParams] = useState<SearchParams>({ industry: '', city: '' });
  const [isSearching, setIsSearching] = useState(false);
  const [discoveredLeads, setDiscoveredLeads] = useState<Partial<Lead>[]>([]);
  const [isQualifying, setIsQualifying] = useState<string | null>(null);
  const [region, setRegion] = useState<'INDIA' | 'GLOBAL'>('INDIA');
  const [fetchCount, setFetchCount] = useState<number>(10);
  
  // Bulk Selection State
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [isBulkAdding, setIsBulkAdding] = useState(false);

  // Helper to check for duplicates
  const isDuplicate = (leadName?: string) => {
    if (!leadName) return false;
    return existingLeads.some(l => l.businessName.toLowerCase() === leadName.toLowerCase());
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!params.industry || !params.city) return;

    setIsSearching(true);
    setDiscoveredLeads([]);
    setSelectedIndices(new Set());
    
    try {
      const results = await discoverLeads(params.industry, params.city, fetchCount);
      setDiscoveredLeads(results);
    } catch (error: any) {
      const isQuota = error?.message?.includes('429') || error?.message?.includes('quota');
      notify(isQuota ? "Daily search quota exceeded. Try again in a few minutes." : "Failed to discover leads.", 'error');
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddLead = async (index: number) => {
    const rawLead = discoveredLeads[index];
    if (!rawLead) return;

    setIsQualifying(rawLead.businessName || 'Lead');
    try {
      const qualification = await qualifyLead(rawLead);
      
      const newLead: Lead = {
        id: crypto.randomUUID(),
        businessName: rawLead.businessName || 'Unknown',
        industry: rawLead.industry || params.industry,
        city: rawLead.city || params.city,
        website: rawLead.website || 'Not listed',
        phoneNumber: rawLead.phoneNumber || 'Not listed',
        rationale: rawLead.rationale,
        priorityScore: qualification.score,
        priorityReason: qualification.reason,
        status: 'New',
        addedAt: new Date().toISOString()
      };

      onAddLeads([newLead]);
      setDiscoveredLeads(prev => prev.filter((_, i) => i !== index));
      setSelectedIndices(new Set()); 
    } catch (error: any) {
      const isQuota = error?.message?.includes('429') || error?.message?.includes('quota');
      notify(isQuota ? "Qualification quota hit. Retrying..." : "Failed to qualify lead", 'error');
    } finally {
      setIsQualifying(null);
    }
  };

  const handleBulkAdd = async () => {
    if (selectedIndices.size === 0) return;
    setIsBulkAdding(true);

    const validLeads: Lead[] = [];
    const indices = Array.from(selectedIndices);
    
    try {
      // Process SEQUENTIALLY to avoid hitting rate limits with parallel requests
      for (const idx of indices) {
        const rawLead = discoveredLeads[idx];
        if (!rawLead) continue;

        try {
          // Qualification with retry logic built into geminiService
          const qualification = await qualifyLead(rawLead);
          
          validLeads.push({
            id: crypto.randomUUID(),
            businessName: rawLead.businessName || 'Unknown',
            industry: rawLead.industry || params.industry,
            city: rawLead.city || params.city,
            website: rawLead.website || 'Not listed',
            phoneNumber: rawLead.phoneNumber || 'Not listed',
            rationale: rawLead.rationale,
            priorityScore: qualification.score,
            priorityReason: qualification.reason,
            status: 'New',
            addedAt: new Date().toISOString()
          });

          // Small pause to further reduce rate limit pressure
          await new Promise(r => setTimeout(r, 200));
        } catch (e) {
          console.error("Skipping lead due to error", rawLead.businessName);
        }
      }

      if (validLeads.length > 0) {
        onAddLeads(validLeads);
        setDiscoveredLeads(prev => prev.filter((_, i) => !selectedIndices.has(i)));
        setSelectedIndices(new Set());
      }
    } finally {
      setIsBulkAdding(false);
    }
  };

  const toggleSelection = (index: number) => {
    if (isDuplicate(discoveredLeads[index].businessName)) return;
    const newSet = new Set(selectedIndices);
    if (newSet.has(index)) newSet.delete(index);
    else newSet.add(index);
    setSelectedIndices(newSet);
  };

  const toggleSelectAll = () => {
    const availableIndices = discoveredLeads
        .map((l, i) => ({ lead: l, index: i }))
        .filter(item => !isDuplicate(item.lead.businessName))
        .map(item => item.index);

    if (selectedIndices.size === availableIndices.length) {
      setSelectedIndices(new Set());
    } else {
      setSelectedIndices(new Set(availableIndices));
    }
  };

  const activeIndustries = region === 'INDIA' ? INDIAN_INDUSTRIES : GLOBAL_INDUSTRIES;
  const activeCities = region === 'INDIA' ? INDIAN_CITIES : GLOBAL_CITIES;

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in pb-10">
      <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 text-center">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Lead Discovery Engine</h2>
        <p className="text-gray-500 mb-6">Find businesses in your niche that need digital transformation.</p>
        
        <div className="flex justify-center mb-6">
          <div className="bg-gray-100 p-1 rounded-lg inline-flex relative">
            <button
              onClick={() => { setRegion('INDIA'); setParams({ industry: '', city: '' }); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                region === 'INDIA' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <MapPin className="h-4 w-4" />
              India (Domestic)
            </button>
            <button
              onClick={() => { setRegion('GLOBAL'); setParams({ industry: '', city: '' }); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                region === 'GLOBAL' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Globe className="h-4 w-4" />
              International
            </button>
          </div>
        </div>
        
        <form onSubmit={handleSearch} className="max-w-2xl mx-auto space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 text-left">
              <label className="block text-xs font-semibold text-gray-500 mb-1 ml-1 uppercase">Industry</label>
              <input
                type="text"
                placeholder={region === 'INDIA' ? "e.g. Coaching Centers" : "e.g. SaaS"}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                value={params.industry}
                onChange={(e) => setParams({ ...params, industry: e.target.value })}
                required
                list="industry-suggestions"
              />
              <datalist id="industry-suggestions">
                {activeIndustries.map((ind) => (
                  <option key={ind} value={ind} />
                ))}
              </datalist>
            </div>
            
            <div className="flex-1 text-left">
              <label className="block text-xs font-semibold text-gray-500 mb-1 ml-1 uppercase">City / Location</label>
              <input
                type="text"
                placeholder={region === 'INDIA' ? "e.g. Mumbai" : "e.g. New York"}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                value={params.city}
                onChange={(e) => setParams({ ...params, city: e.target.value })}
                required
                list="city-suggestions"
              />
              <datalist id="city-suggestions">
                {activeCities.map((city) => (
                  <option key={city} value={city} />
                ))}
              </datalist>
            </div>
          </div>

          <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 text-sm text-gray-600">
               <Sliders className="h-4 w-4 text-gray-400" />
               <span>Results per search: <span className="font-bold text-gray-900">{fetchCount}</span></span>
               <input 
                 type="range" 
                 min="5" 
                 max="50" 
                 step="5" 
                 value={fetchCount}
                 onChange={(e) => setFetchCount(parseInt(e.target.value))}
                 className="w-24 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
               />
            </div>

            <button
              type="submit"
              disabled={isSearching}
              className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-blue-300 transition-colors flex items-center justify-center gap-2 min-w-[140px] shadow-sm"
            >
              {isSearching ? <Loader2 className="animate-spin h-5 w-5" /> : <Search className="h-5 w-5" />}
              {isSearching ? 'Searching...' : 'Find Leads'}
            </button>
          </div>
        </form>
      </div>

      {discoveredLeads.length > 0 && (
        <div className="space-y-4">
          <div className="flex justify-between items-center px-2">
            <h3 className="text-lg font-semibold text-gray-700 ml-1">Discovered Candidates</h3>
            
            <div className="flex items-center gap-3 bg-white border border-gray-200 px-3 py-2 rounded-lg shadow-sm">
               <div className="flex items-center gap-2 border-r border-gray-200 pr-3 mr-1">
                 <input 
                    type="checkbox"
                    checked={discoveredLeads.length > 0 && selectedIndices.size > 0 && selectedIndices.size === discoveredLeads.filter(l => !isDuplicate(l.businessName)).length}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    id="select-all"
                 />
                 <label htmlFor="select-all" className="text-sm text-gray-600 cursor-pointer select-none">Select Available</label>
               </div>
               
               <button
                  onClick={handleBulkAdd}
                  disabled={selectedIndices.size === 0 || isBulkAdding}
                  className="text-sm font-medium bg-blue-600 text-white px-3 py-1.5 rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
               >
                  {isBulkAdding ? <Loader2 className="animate-spin h-3 w-3" /> : <CheckSquare className="h-3 w-3" />}
                  {isBulkAdding ? 'Processing...' : `Add Selected (${selectedIndices.size})`}
               </button>
            </div>
          </div>

          <div className="grid gap-4">
            {discoveredLeads.map((lead, idx) => {
              const duplicate = isDuplicate(lead.businessName);
              return (
              <div 
                key={idx} 
                className={`bg-white p-5 rounded-lg border transition-all ${
                  selectedIndices.has(idx) ? 'border-blue-400 ring-1 ring-blue-50' : 'border-gray-200 hover:shadow-md'
                } flex flex-col md:flex-row justify-between items-start md:items-center gap-4 ${duplicate ? 'opacity-75 bg-gray-50' : ''}`}
              >
                <div className="flex items-start gap-4 flex-1">
                  <div className="pt-1.5">
                    <input 
                      type="checkbox"
                      disabled={duplicate}
                      checked={selectedIndices.has(idx)}
                      onChange={() => toggleSelection(idx)}
                      className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer disabled:cursor-not-allowed"
                    />
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h4 className="font-bold text-gray-900 text-lg">{lead.businessName}</h4>
                      {duplicate && (
                        <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                          <AlertTriangle className="h-3 w-3" />
                          Already Added
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500 mt-1">
                      <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {lead.city}</span>
                      <span className="flex items-center gap-1"><Globe className="h-3 w-3" /> {lead.website}</span>
                      <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {lead.phoneNumber}</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-2 bg-gray-50 p-2 rounded inline-block">
                      <span className="font-semibold text-gray-700">AI Insight: </span>
                      {lead.rationale}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => handleAddLead(idx)}
                  disabled={!!isQualifying || isBulkAdding || duplicate}
                  className={`px-4 py-2 border font-medium rounded-lg flex items-center gap-2 shrink-0 transition-colors text-sm ${
                    duplicate ? 'bg-gray-100 text-gray-400 border-gray-200' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {duplicate ? (
                     <><Check className="h-4 w-4" /> In DB</>
                  ) : isQualifying === lead.businessName ? (
                    <><Loader2 className="animate-spin h-4 w-4" /> Qualifying...</>
                  ) : (
                    <><Plus className="h-4 w-4" /> Add Single</>
                  )}
                </button>
              </div>
            );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default LeadDiscovery;