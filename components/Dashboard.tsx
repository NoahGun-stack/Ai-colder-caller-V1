
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Contact, LeadStatus } from '../types';

const data = [
  { name: 'Mon', calls: 120, booked: 12 },
  { name: 'Tue', calls: 150, booked: 18 },
  { name: 'Wed', calls: 180, booked: 22 },
  { name: 'Thu', calls: 160, booked: 15 },
  { name: 'Fri', calls: 210, booked: 28 },
  { name: 'Sat', calls: 80, booked: 8 },
  { name: 'Sun', calls: 40, booked: 3 },
];

interface DashboardProps {
  contacts: Contact[];
}

const Dashboard: React.FC<DashboardProps> = ({ contacts }) => {
  const bookedCount = contacts.filter(c => c.status === LeadStatus.APPOINTMENT_BOOKED).length;

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6 bg-[#f8f9fb]">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Calls Today', value: '142', sub: '+12% from yesterday' },
          { label: 'Connects', value: '88', sub: '62% connect rate' },
          { label: 'Appointments', value: (bookedCount + 12).toString(), sub: '14% conversion' },
          { label: 'Avg Duration', value: '2m 14s', sub: 'Operational efficiency' },
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
          <h4 className="text-[11px] font-bold text-[#111827] uppercase mb-8 border-b border-[#f3f4f6] pb-3">Operational Call Volume</h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
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
                {[
                  { ref: 'RT-8842', status: 'Booked', time: '14:52' },
                  { ref: 'RT-8841', status: 'Failed', time: '14:51' },
                  { ref: 'RT-8840', status: 'Connected', time: '14:50' },
                  { ref: 'RT-8839', status: 'Booked', time: '14:48' },
                  { ref: 'RT-8838', status: 'No-Ans', time: '14:47' },
                ].map((act, idx) => (
                  <tr key={idx} className="hover:bg-[#f8f9fb] transition-colors">
                    <td className="px-4 py-3 font-bold text-[#111827]">{act.ref}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`px-2 py-0.5 border text-[10px] font-bold uppercase ${act.status === 'Booked' ? 'border-green-200 text-green-700 bg-green-50' : 'border-[#e5e7eb] text-[#6b7280]'
                        }`}>
                        {act.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
