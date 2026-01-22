import React from 'react';
import { Lead } from '../types';
import { MoreHorizontal, ExternalLink, Trash2, Download, Phone } from 'lucide-react';

interface LeadListProps {
  leads: Lead[];
  onRemoveLead: (id: string) => void;
  onSelectForOutreach: (leads: Lead[]) => void;
}

const LeadList: React.FC<LeadListProps> = ({ leads, onRemoveLead, onSelectForOutreach }) => {
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) newSelected.delete(id);
    else newSelected.add(id);
    setSelectedIds(newSelected);
  };

  const handleOutreachClick = () => {
    const selectedLeads = leads.filter(l => selectedIds.has(l.id));
    onSelectForOutreach(selectedLeads);
  };

  const handleExportCSV = () => {
    if (leads.length === 0) return;

    // Define headers
    const headers = [
      "Business Name", 
      "Industry", 
      "City", 
      "Website", 
      "Phone Number",
      "Priority Score", 
      "Priority Reason", 
      "Current Status", 
      "Date Added"
    ];

    // Format data rows with proper escaping for CSV
    const rows = leads.map(lead => [
      `"${(lead.businessName || '').replace(/"/g, '""')}"`, // Escape double quotes
      `"${(lead.industry || '').replace(/"/g, '""')}"`,
      `"${(lead.city || '').replace(/"/g, '""')}"`,
      `"${(lead.website || '').replace(/"/g, '""')}"`,
      `"${(lead.phoneNumber || '').replace(/"/g, '""')}"`,
      `"${lead.priorityScore || ''}"`,
      `"${(lead.priorityReason || '').replace(/"/g, '""')}"`,
      `"${lead.status || ''}"`,
      `"${lead.addedAt ? new Date(lead.addedAt).toLocaleDateString() : ''}"`
    ]);

    // Combine into CSV string
    const csvContent = [
      headers.join(','),
      ...rows.map(e => e.join(','))
    ].join('\n');

    // Create download link
    // Add Byte Order Mark (BOM) \uFEFF for better Excel UTF-8 handling
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `growthpulse_leads_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getPriorityColor = (score?: string) => {
    switch(score) {
      case 'High': return 'bg-green-100 text-green-800';
      case 'Medium': return 'bg-yellow-100 text-yellow-800';
      case 'Low': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden animate-fade-in">
      <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
           <h2 className="text-xl font-bold text-gray-800">My Leads Database</h2>
           <p className="text-sm text-gray-500">Manage, track, and export your qualified businesses.</p>
        </div>
        
        <div className="flex gap-2">
           <button
             onClick={handleExportCSV}
             disabled={leads.length === 0}
             className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
           >
             <Download className="h-4 w-4" />
             Export CSV
           </button>
           
           {selectedIds.size > 0 && (
             <button
               onClick={handleOutreachClick}
               className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium transition-colors"
             >
               Create Campaign ({selectedIds.size})
             </button>
           )}
        </div>
      </div>
      
      {leads.length === 0 ? (
        <div className="p-12 text-center text-gray-500">
          <p>You haven't added any leads yet. Go to Lead Discovery to find some.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4 font-semibold w-10">
                  <input 
                    type="checkbox" 
                    onChange={(e) => setSelectedIds(e.target.checked ? new Set(leads.map(l => l.id)) : new Set())}
                    checked={leads.length > 0 && selectedIds.size === leads.length}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                </th>
                <th className="px-6 py-4 font-semibold">Business</th>
                <th className="px-6 py-4 font-semibold">Phone</th>
                <th className="px-6 py-4 font-semibold">Score</th>
                <th className="px-6 py-4 font-semibold">Reasoning</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {leads.map((lead) => (
                <tr key={lead.id} className={`hover:bg-gray-50 transition-colors ${selectedIds.has(lead.id) ? 'bg-indigo-50/30' : ''}`}>
                  <td className="px-6 py-4">
                    <input 
                      type="checkbox"
                      checked={selectedIds.has(lead.id)}
                      onChange={() => toggleSelect(lead.id)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{lead.businessName}</div>
                    <div className="text-xs text-gray-500">{lead.industry}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Phone className="h-3 w-3 text-gray-400" />
                      {lead.phoneNumber || 'N/A'}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(lead.priorityScore)}`}>
                      {lead.priorityScore || 'N/A'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate" title={lead.priorityReason}>
                    {lead.priorityReason || '-'}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-xs px-2 py-1 rounded-md border ${
                      lead.status === 'Contacted' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                      lead.status === 'Responded' ? 'bg-green-50 text-green-700 border-green-200' :
                      'bg-gray-50 text-gray-600 border-gray-200'
                    }`}>
                      {lead.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {lead.website !== 'Not listed' && (
                        <a href={lead.website} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-blue-600">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      )}
                      <button onClick={() => onRemoveLead(lead.id)} className="text-gray-400 hover:text-red-600">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default LeadList;