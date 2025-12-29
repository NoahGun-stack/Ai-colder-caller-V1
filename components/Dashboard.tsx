import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Contact } from '../types';
import { supabase } from '../services/supabase';

interface DashboardProps {
  contacts: Contact[];
}

const Dashboard: React.FC<DashboardProps> = ({ contacts }) => {
  const [stats, setStats] = useState({
    callsToday: 0,
    callsYesterday: 0,
    connects: 0,
    appointments: 0,
    avgDuration: 0,
  });
  const [chartData, setChartData] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      // 1. Fetch Call Logs
      const { data: logs, error: logsError } = await supabase
        .from('call_logs')
        .select('id, created_at, duration, outcome, contact:contacts(firstName, lastName)');

      if (logsError) throw logsError;

      // 2. Fetch Appointments
      const { count: appointmentCount, error: aptError } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true });

      if (aptError) throw aptError;

      // Calculate Stats
      const todaysCalls = logs?.filter(l => new Date(l.created_at) >= today) || [];
      const yesterdaysCalls = logs?.filter(l => {
        const d = new Date(l.created_at);
        return d >= yesterday && d < today;
      }) || [];

      const totalDuration = logs?.reduce((acc, curr) => acc + (curr.duration || 0), 0) || 0;
      const avgDur = logs?.length ? Math.round(totalDuration / logs.length) : 0;

      // "Connects" heuristic: calls > 30 seconds
      const connects = logs?.filter(l => (l.duration || 0) > 30).length || 0;

      setStats({
        callsToday: todaysCalls.length,
        callsYesterday: yesterdaysCalls.length,
        connects,
        appointments: appointmentCount || 0,
        avgDuration: avgDur,
      });

      // Prepare Chart Data (Last 7 Days)
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        return {
          date: d.toLocaleDateString('en-US', { weekday: 'short' }), // "Mon"
          fullDate: d.setHours(0, 0, 0, 0)
        };
      });

      const chart = last7Days.map(dayObj => {
        const count = logs?.filter(l => {
          const d = new Date(l.created_at).setHours(0, 0, 0, 0);
          return d === dayObj.fullDate;
        }).length || 0;
        return { name: dayObj.date, calls: count };
      });
      setChartData(chart);

      const recent = logs?.slice(0, 5).map((l: any) => {
        const c = Array.isArray(l.contact) ? l.contact[0] : l.contact;
        return {
          ref: c ? `${c.firstName} ${c.lastName}` : 'Unknown',
          status: l.outcome,
          time: new Date(l.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
      }) || [];
      setRecentActivity(recent);

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

  if (loading) return <div className="p-6">Loading Dashboard...</div>;

  const percentageChange = stats.callsYesterday > 0
    ? Math.round(((stats.callsToday - stats.callsYesterday) / stats.callsYesterday) * 100)
    : 0;

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6 bg-[#f8f9fb]">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          {
            label: 'Calls Today',
            value: stats.callsToday.toString(),
            sub: `${percentageChange > 0 ? '+' : ''}${percentageChange}% from yesterday`
          },
          {
            label: 'Connects (>30s)',
            value: stats.connects.toString(),
            sub: `${stats.callsToday ? Math.round((stats.connects / stats.callsToday) * 100) : 0}% connect rate`
          },
          {
            label: 'Total Appointments',
            value: stats.appointments.toString(),
            sub: 'Lifetime'
          },
          {
            label: 'Avg Duration',
            value: formatDuration(stats.avgDuration),
            sub: 'Operational efficiency'
          },
        ].map((stat, i) => (
          <div key={i} className="bg-white border border-[#e5e7eb] p-5 shadow-sm">
            <p className="text-[11px] font-bold text-[#6b7280] uppercase tracking-wide mb-1">{stat.label}</p>
            <h3 className="text-2xl font-bold text-[#111827]">{stat.value}</h3>
            <p className="text-[10px] text-[#6b7280] mt-2 font-medium">{stat.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border border-[#e5e7eb] p-6 shadow-sm">
          <h4 className="text-[11px] font-bold text-[#111827] uppercase mb-8 border-b border-[#f3f4f6] pb-3">Call Volume (Last 7 Days)</h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 10 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 10 }} />
                <Tooltip cursor={{ fill: '#f8f9fb' }} contentStyle={{ fontSize: '11px', border: '1px solid #e5e7eb', borderRadius: '0' }} />
                <Bar dataKey="calls" fill="#4338ca" barSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white border border-[#e5e7eb] shadow-sm flex flex-col">
          <div className="p-4 border-b border-[#e5e7eb] bg-[#f8f9fb]">
            <h4 className="text-[11px] font-bold text-[#111827] uppercase">Recent Activity</h4>
          </div>
          <div className="flex-1 overflow-y-auto">
            <table className="w-full text-left table-dense">
              <tbody>
                {recentActivity.length > 0 ? recentActivity.map((act, idx) => (
                  <tr key={idx} className="hover:bg-[#f8f9fb] transition-colors">
                    <td className="px-4 py-3 font-bold text-[#111827] text-sm">{act.ref}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`px-2 py-0.5 border text-[10px] font-bold uppercase ${act.status === 'Completed' ? 'border-green-200 text-green-700 bg-green-50' : 'border-[#e5e7eb] text-[#6b7280]'
                        }`}>
                        {act.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-gray-400">{act.time}</td>
                  </tr>
                )) : (
                  <tr><td className="p-4 text-center text-xs text-gray-500">No recent activity</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
