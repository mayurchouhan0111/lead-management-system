import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Search, List, Send, Settings, Menu, X, Rocket, Inbox as InboxIcon, CheckCircle, AlertCircle, Info } from 'lucide-react';
import Dashboard from './components/Dashboard';
import LeadDiscovery from './components/LeadDiscovery';
import LeadList from './components/LeadList';
import Outreach from './components/Outreach';
import Inbox from './components/Inbox';
import { Lead, CampaignStats, AppView, GeneratedEmail } from './types';

// Initial stats (Real data starts at 0)
const initialStats: CampaignStats = {
  sent: 0,
  opened: 0,
  replied: 0,
  clicks: 0,
  dailyLimitUsed: 0
};

interface Notification {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

const App: React.FC = () => {
  // 1. IMPROVEMENT: Load initial state from LocalStorage
  const [view, setView] = useState<AppView>(AppView.DASHBOARD);
  
  const [leads, setLeads] = useState<Lead[]>(() => {
    try {
      const saved = localStorage.getItem('gp_leads');
      return saved ? JSON.parse(saved) : [];
    } catch (e) { return []; }
  });

  const [stats, setStats] = useState<CampaignStats>(() => {
    try {
      const saved = localStorage.getItem('gp_stats');
      return saved ? JSON.parse(saved) : initialStats;
    } catch (e) { return initialStats; }
  });

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [outreachLeads, setOutreachLeads] = useState<Lead[]>([]);
  
  // 2. IMPROVEMENT: Toast Notification System
  const [toasts, setToasts] = useState<Notification[]>([]);

  const notify = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = crypto.randomUUID();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  // 3. IMPROVEMENT: Persist data on change
  useEffect(() => {
    localStorage.setItem('gp_leads', JSON.stringify(leads));
  }, [leads]);

  useEffect(() => {
    localStorage.setItem('gp_stats', JSON.stringify(stats));
  }, [stats]);

  // Toggle Sidebar for mobile
  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  const handleAddLeads = (newLeads: Lead[]) => {
    setLeads(prev => [...prev, ...newLeads]);
    notify(`${newLeads.length} leads added to database!`, 'success');
    setView(AppView.LEADS);
  };

  const handleRemoveLead = (id: string) => {
    setLeads(prev => prev.filter(l => l.id !== id));
    notify("Lead removed", 'info');
  };

  const handleStartOutreach = (selectedLeads: Lead[]) => {
    setOutreachLeads(selectedLeads);
    setView(AppView.OUTREACH);
  };

  const handleSendEmails = (targetLeads: Lead[], emails: GeneratedEmail[]) => {
    // 1. Update Lead Status
    setLeads(prev => prev.map(l => 
      targetLeads.some(tl => tl.id === l.id) ? { ...l, status: 'Contacted' } : l
    ));

    // 2. Update Stats
    setStats(prev => ({
      ...prev,
      sent: prev.sent + targetLeads.length,
      dailyLimitUsed: prev.dailyLimitUsed + targetLeads.length
    }));

    // 3. Clear Outreach Stage
    setOutreachLeads([]);
    notify("Campaign marked as sent successfully!", 'success');
    setView(AppView.DASHBOARD);
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden font-sans">
      {/* Toast Container */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map(toast => (
          <div key={toast.id} className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg text-sm font-medium animate-fade-in-up transform transition-all ${
            toast.type === 'success' ? 'bg-white text-green-700 border-l-4 border-green-500' :
            toast.type === 'error' ? 'bg-white text-red-700 border-l-4 border-red-500' :
            'bg-white text-gray-700 border-l-4 border-blue-500'
          }`}>
            {toast.type === 'success' && <CheckCircle className="h-5 w-5 text-green-500" />}
            {toast.type === 'error' && <AlertCircle className="h-5 w-5 text-red-500" />}
            {toast.type === 'info' && <Info className="h-5 w-5 text-blue-500" />}
            {toast.message}
          </div>
        ))}
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden" onClick={() => setSidebarOpen(false)}></div>
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-30 w-64 bg-white border-r border-gray-200 transform transition-transform duration-200 ease-in-out lg:relative lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center gap-2 px-6 py-6 border-b border-gray-100">
          <div className="bg-indigo-600 p-2 rounded-lg shadow-sm">
            <Rocket className="h-5 w-5 text-white" />
          </div>
          <h1 className="text-xl font-bold text-gray-800 tracking-tight">GrowthPulse</h1>
        </div>

        <nav className="p-4 space-y-1">
          <NavItem 
            icon={<LayoutDashboard className="h-5 w-5" />} 
            label="Dashboard" 
            active={view === AppView.DASHBOARD} 
            onClick={() => { setView(AppView.DASHBOARD); setSidebarOpen(false); }} 
          />
          <NavItem 
            icon={<InboxIcon className="h-5 w-5" />} 
            label="Inbox" 
            active={view === AppView.INBOX} 
            onClick={() => { setView(AppView.INBOX); setSidebarOpen(false); }}
            badge={2} // Mock unread count
          />
          <NavItem 
            icon={<Search className="h-5 w-5" />} 
            label="Lead Discovery" 
            active={view === AppView.FINDER} 
            onClick={() => { setView(AppView.FINDER); setSidebarOpen(false); }} 
          />
          <NavItem 
            icon={<List className="h-5 w-5" />} 
            label="My Leads" 
            active={view === AppView.LEADS} 
            onClick={() => { setView(AppView.LEADS); setSidebarOpen(false); }} 
            badge={leads.length > 0 ? leads.length : undefined}
          />
          {view === AppView.OUTREACH && (
            <NavItem 
              icon={<Send className="h-5 w-5" />} 
              label="Active Campaign" 
              active={true} 
              onClick={() => {}} 
            />
          )}
        </nav>

        <div className="absolute bottom-0 w-full p-4 border-t border-gray-100">
           <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white shadow-sm">
                JD
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-medium text-gray-700 truncate">John Doe</p>
                <p className="text-xs text-gray-500 truncate">john@growth.co</p>
              </div>
           </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 lg:px-8 shadow-sm z-10">
          <button onClick={toggleSidebar} className="lg:hidden p-2 text-gray-500 hover:bg-gray-100 rounded-md">
            <Menu className="h-6 w-6" />
          </button>
          
          <div className="flex-1 px-4 lg:px-0">
             <h2 className="text-lg font-semibold text-gray-800">
               {view === AppView.DASHBOARD && 'Performance Overview'}
               {view === AppView.INBOX && 'Communications'}
               {view === AppView.FINDER && 'Find New Opportunities'}
               {view === AppView.LEADS && 'Lead Management'}
               {view === AppView.OUTREACH && 'Compose Campaign'}
             </h2>
          </div>

          <div className="flex items-center gap-4">
             <button className="p-2 text-gray-400 hover:text-gray-600">
               <Settings className="h-5 w-5" />
             </button>
          </div>
        </header>

        {/* Scrollable Area */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-8">
          {view === AppView.DASHBOARD && <Dashboard stats={stats} leads={leads} />}
          {view === AppView.INBOX && <Inbox />}
          {view === AppView.FINDER && <LeadDiscovery onAddLeads={handleAddLeads} existingLeads={leads} notify={notify} />}
          {view === AppView.LEADS && <LeadList leads={leads} onRemoveLead={handleRemoveLead} onSelectForOutreach={handleStartOutreach} />}
          {view === AppView.OUTREACH && <Outreach selectedLeads={outreachLeads} dailyLimitUsed={stats.dailyLimitUsed} onSendEmails={handleSendEmails} onCancel={() => setView(AppView.LEADS)} notify={notify} />}
        </div>
      </main>
    </div>
  );
};

const NavItem = ({ icon, label, active, onClick, badge }: { icon: any, label: string, active: boolean, onClick: () => void, badge?: number }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
      active ? 'bg-indigo-50 text-indigo-700 shadow-sm' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
    }`}
  >
    <div className="flex items-center gap-3">
      {icon}
      <span>{label}</span>
    </div>
    {badge !== undefined && (
      <span className="bg-red-100 text-red-600 py-0.5 px-2 rounded-full text-xs font-bold">
        {badge}
      </span>
    )}
  </button>
);

export default App;