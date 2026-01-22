import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';
import { CampaignStats, Lead } from '../types';
import { Mail, MousePointer, Users, CheckCircle, TrendingUp, PieChart as PieChartIcon } from 'lucide-react';

interface DashboardProps {
  stats: CampaignStats;
  leads: Lead[];
}

const Dashboard: React.FC<DashboardProps> = ({ stats, leads }) => {
  const chartData = [
    { name: 'Sent', value: stats.sent },
    { name: 'Opened', value: stats.opened },
    { name: 'Replied', value: stats.replied },
    { name: 'Clicked', value: stats.clicks },
  ];

  // Calculate Industry Data for Pie Chart
  const industryCounts: Record<string, number> = {};
  leads.forEach(lead => {
    const ind = lead.industry || 'Unknown';
    industryCounts[ind] = (industryCounts[ind] || 0) + 1;
  });
  
  const industryData = Object.entries(industryCounts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5); // Top 5

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#6b7280'];

  const recentLeads = leads.slice(0, 5).reverse(); // Show newest first

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<Mail className="text-blue-500" />} title="Emails Sent" value={stats.sent} sub="Today" />
        <StatCard icon={<Users className="text-green-500" />} title="Total Leads" value={leads.length} sub="Database" />
        <StatCard icon={<CheckCircle className="text-purple-500" />} title="Replied" value={stats.replied} sub={`${stats.sent > 0 ? ((stats.replied / stats.sent) * 100).toFixed(1) : 0}% Rate`} />
        <StatCard icon={<MousePointer className="text-orange-500" />} title="Clicks" value={stats.clicks} sub="Engagement" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bar Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col">
          <div className="flex justify-between items-center mb-6">
             <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
               <TrendingUp className="h-5 w-5 text-gray-400" />
               Campaign Performance
             </h3>
          </div>
          <div className="h-72 w-full flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={false} tickLine={false} dy={10} />
                <YAxis tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip 
                  cursor={{ fill: '#f9fafb' }} 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }} 
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={50}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={['#3b82f6', '#10b981', '#8b5cf6', '#f97316'][index % 4]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col">
           <h3 className="text-lg font-semibold text-gray-800 mb-6 flex items-center gap-2">
             <PieChartIcon className="h-5 w-5 text-gray-400" />
             Industry Distribution
           </h3>
           <div className="h-64 w-full flex-1">
             {industryData.length > 0 ? (
               <ResponsiveContainer width="100%" height="100%">
                 <PieChart>
                   <Pie
                     data={industryData}
                     cx="50%"
                     cy="50%"
                     innerRadius={60}
                     outerRadius={80}
                     paddingAngle={5}
                     dataKey="value"
                   >
                     {industryData.map((entry, index) => (
                       <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                     ))}
                   </Pie>
                   <Tooltip />
                   <Legend verticalAlign="bottom" height={36} iconType="circle" />
                 </PieChart>
               </ResponsiveContainer>
             ) : (
                <div className="h-full flex flex-col items-center justify-center text-gray-400">
                  <PieChartIcon className="h-12 w-12 opacity-20 mb-2" />
                  <p className="text-sm">No data available</p>
                </div>
             )}
           </div>
        </div>

        {/* Limits & Recent */}
        <div className="lg:col-span-1 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Daily Safety Limits</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Daily Emails (Safety Cap)</span>
                <span className="font-medium">{stats.dailyLimitUsed} / 100</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div 
                  className={`h-2.5 rounded-full ${stats.dailyLimitUsed >= 90 ? 'bg-red-500' : 'bg-blue-600'}`} 
                  style={{ width: `${Math.min((stats.dailyLimitUsed / 100) * 100, 100)}%` }}
                ></div>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Restricts sending to ensure domain reputation safety and compliance.
              </p>
            </div>
            
            <div className="pt-6 border-t border-gray-100">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Recently Added Leads</h4>
              <ul className="space-y-3">
                {recentLeads.length === 0 ? (
                  <li className="text-sm text-gray-400 italic text-center py-2">No leads found yet.</li>
                ) : (
                  recentLeads.map(lead => (
                    <li key={lead.id} className="flex justify-between items-center text-sm p-2 hover:bg-gray-50 rounded transition-colors">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0"></div>
                        <span className="truncate max-w-[120px] font-medium text-gray-700">{lead.businessName}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wide ${
                        lead.priorityScore === 'High' ? 'bg-green-100 text-green-700' :
                        lead.priorityScore === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {lead.priorityScore || 'New'}
                      </span>
                    </li>
                  ))
                )}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ icon, title, value, sub }: { icon: React.ReactNode, title: string, value: number, sub: string }) => (
  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-start justify-between hover:shadow-md transition-shadow">
    <div>
      <p className="text-sm font-medium text-gray-500">{title}</p>
      <h3 className="text-3xl font-bold text-gray-900 mt-1">{value}</h3>
      <p className="text-xs text-gray-400 mt-1">{sub}</p>
    </div>
    <div className="p-3 bg-gray-50 rounded-lg">
      {icon}
    </div>
  </div>
);

export default Dashboard;