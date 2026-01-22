import React, { useState, useEffect } from 'react';
import { Lead, GeneratedEmail } from '../types';
import { generateEmail } from '../services/geminiService';
import { Send, Loader2, Sparkles, RefreshCw, XCircle, ExternalLink, Check, Copy } from 'lucide-react';

interface OutreachProps {
  selectedLeads: Lead[];
  dailyLimitUsed: number;
  onSendEmails: (leads: Lead[], emails: GeneratedEmail[]) => void;
  onCancel: () => void;
  notify: (msg: string, type: 'success' | 'error' | 'info') => void;
}

const Outreach: React.FC<OutreachProps> = ({ selectedLeads, dailyLimitUsed, onSendEmails, onCancel, notify }) => {
  const [emails, setEmails] = useState<Record<string, GeneratedEmail>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [sentStatus, setSentStatus] = useState<Record<string, boolean>>({});

  const remainingDailyLimit = 100 - dailyLimitUsed;

  useEffect(() => {
    // Auto-generate emails on mount
    selectedLeads.forEach(lead => {
      if (!emails[lead.id] && !loading[lead.id]) {
        handleGenerateEmail(lead);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLeads]);

  const handleGenerateEmail = async (lead: Lead) => {
    setLoading(prev => ({ ...prev, [lead.id]: true }));
    const email = await generateEmail(lead);
    setEmails(prev => ({ ...prev, [lead.id]: email }));
    setLoading(prev => ({ ...prev, [lead.id]: false }));
  };

  const handleLaunchEmail = (lead: Lead) => {
    const emailContent = emails[lead.id];
    if (!emailContent) return;

    // Construct mailto link
    const subject = encodeURIComponent(emailContent.subject);
    const body = encodeURIComponent(emailContent.body);
    // Use lead.email if available, otherwise leave blank for user to fill
    const recipient = lead.email ? lead.email : '';
    
    window.open(`mailto:${recipient}?subject=${subject}&body=${body}`, '_blank');
  };

  const handleMarkAsSent = (leadId: string) => {
    setSentStatus(prev => ({ ...prev, [leadId]: true }));
  };

  const handleFinishCampaign = () => {
    const sentLeadIds = Object.keys(sentStatus).filter(id => sentStatus[id]);
    const sentLeads = selectedLeads.filter(l => sentLeadIds.includes(l.id));
    const sentEmailsData = sentLeads.map(l => emails[l.id]);

    onSendEmails(sentLeads, sentEmailsData);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    notify("Copied to clipboard!", 'info');
  };

  if (selectedLeads.length === 0) {
    return (
      <div className="text-center p-12">
        <p>No leads selected. Go back to Lead List.</p>
        <button onClick={onCancel} className="mt-4 text-blue-600 hover:underline">Return</button>
      </div>
    );
  }

  const sentCount = Object.keys(sentStatus).length;

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-xl shadow-sm border border-gray-100 gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Review & Launch</h2>
          <p className="text-sm text-gray-500">
            Review the AI-drafted emails and launch them in your default email app.
          </p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={onCancel}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleFinishCampaign}
            disabled={sentCount === 0}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2 transition-all shadow-md"
          >
            <Check className="h-4 w-4" />
            Finish & Save Stats ({sentCount})
          </button>
        </div>
      </div>

      {/* Security/Deliverability Notice */}
      <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg flex items-start gap-3">
        <div className="p-1 bg-blue-100 rounded-full text-blue-600 mt-0.5">
           <ExternalLink className="h-4 w-4" />
        </div>
        <div>
          <h4 className="text-sm font-bold text-blue-900">Why Manual Launch?</h4>
          <p className="text-xs text-blue-700 mt-1 leading-relaxed">
            To ensure 100% deliverability and avoid spam folders, we use <strong>Client-Side Sending</strong>. 
            Clicking "Launch in Mail App" opens your own email client (Gmail/Outlook). 
            This guarantees emails come from your real IP address and trusted domain history, preventing blocks.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {selectedLeads.map(lead => {
          const isSent = sentStatus[lead.id];
          return (
            <div key={lead.id} className={`bg-white rounded-xl shadow-sm border transition-all ${isSent ? 'border-green-200 bg-green-50/30' : 'border-gray-200'}`}>
               <div className="px-6 py-4 border-b border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                 <div className="flex items-center gap-3">
                   <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${isSent ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                     {isSent ? <Check className="h-5 w-5" /> : lead.businessName.substring(0, 2).toUpperCase()}
                   </div>
                   <div>
                     <h3 className="font-semibold text-gray-900">{lead.businessName}</h3>
                     <p className="text-xs text-gray-500">{lead.industry} • {lead.city}</p>
                   </div>
                 </div>
                 
                 <div className="flex items-center gap-2">
                   {!isSent && (
                     <button 
                       onClick={() => handleGenerateEmail(lead)}
                       className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                       title="Regenerate Draft"
                     >
                       <RefreshCw className={`h-4 w-4 ${loading[lead.id] ? 'animate-spin' : ''}`} />
                     </button>
                   )}
                   
                   {!isSent ? (
                     <button
                       onClick={() => { handleLaunchEmail(lead); handleMarkAsSent(lead.id); }}
                       disabled={loading[lead.id]}
                       className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 flex items-center gap-2 shadow-sm"
                     >
                       <ExternalLink className="h-4 w-4" />
                       Launch in Mail App
                     </button>
                   ) : (
                      <span className="px-4 py-2 bg-green-100 text-green-700 text-sm font-medium rounded-lg flex items-center gap-2">
                        <Check className="h-4 w-4" />
                        Sent
                      </span>
                   )}
                 </div>
               </div>
               
               {!isSent && (
                 <div className="p-6">
                    {loading[lead.id] ? (
                      <div className="flex flex-col items-center justify-center py-8 text-gray-400 gap-2">
                        <Sparkles className="animate-pulse text-yellow-400 h-6 w-6" />
                        <span className="text-sm">AI is drafting personalized email...</span>
                      </div>
                    ) : emails[lead.id] ? (
                      <div className="space-y-4">
                        <div className="relative group">
                          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 block">Subject</label>
                          <div className="flex items-center gap-2">
                            <input 
                              readOnly 
                              value={emails[lead.id].subject} 
                              className="w-full text-gray-800 font-medium bg-transparent border-none focus:ring-0 p-0"
                            />
                            <button onClick={() => copyToClipboard(emails[lead.id].subject)} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-blue-600">
                              <Copy className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                        
                        <div className="relative group">
                          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Message Body</label>
                          <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                            {emails[lead.id].body}
                            <button onClick={() => copyToClipboard(emails[lead.id].body)} className="absolute top-8 right-2 opacity-0 group-hover:opacity-100 p-2 text-gray-400 hover:text-blue-600 bg-white rounded-md shadow-sm border border-gray-200">
                              <Copy className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-red-500 text-sm">Failed to generate draft.</div>
                    )}
                 </div>
               )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Outreach;