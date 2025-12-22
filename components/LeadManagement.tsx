
import React, { useState } from 'react';
import { Lead, LeadStatus } from '../types';
import { leadsService } from '../services/leadsService';
import { CsvImporter } from './CsvImporter';

interface LeadManagementProps {
  leads: Lead[];
  setLeads: React.Dispatch<React.SetStateAction<Lead[]>>;
  onStartCall: (lead: Lead) => void;
}

const LeadManagement: React.FC<LeadManagementProps> = ({ leads, setLeads, onStartCall }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showImporter, setShowImporter] = useState(false);

  const handleBulkImport = async (newLeads: Partial<Lead>[]) => {
    try {
      // Cast to any for simplicity where ID is omitted, usually Omit<Lead,'id'>
      const result = await leadsService.addLeadsBulk(newLeads as any);
      setLeads(prev => [...result, ...prev]);
    } catch (error) {
      alert("Import failed");
    }
  };

  const handleAddProspect = async () => {
    // Simple prompt-based entry for speed of verification. 
    // In a full app, this would be a Modal with proper form validation.
    const name = window.prompt("Enter prospect name (First Last):");
    if (!name) return;

    const phone = window.prompt("Enter phone number:");
    if (!phone) return;

    const [firstName, ...lastNameParts] = name.split(' ');
    const lastName = lastNameParts.join(' ');

    const newLead: any = {
      firstName: firstName || 'Unknown',
      lastName: lastName || 'Unknown',
      phoneNumber: phone,
      address: '123 Main St (Placeholder)',
      city: 'Austin',
      state: 'TX',
      zip: '78701',
      status: LeadStatus.NOT_CALLED,
      tcpaAcknowledged: true,
      notes: 'Added via Quick Add'
    };

    try {
      const created = await leadsService.addLead(newLead);
      setLeads(prev => [created, ...prev]);
    } catch (error) {
      alert("Failed to add lead. Check console.");
    }
  };

  const filteredLeads = leads.filter(l =>
    l.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.phoneNumber.includes(searchTerm)
  );

  return (
    <div className="h-full flex flex-row overflow-hidden">
      {/* Left Area: Table List */}
      <div className={`flex-1 flex flex-col min-w-0 transition-all ${selectedLead ? 'border-r border-[#e5e7eb]' : ''}`}>
        <div className="p-4 border-b border-[#e5e7eb] flex items-center justify-between bg-white">
          <div className="relative w-64">
            <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-[#6b7280] text-[11px]"></i>
            <input
              type="text"
              placeholder="Search prospects..."
              className="w-full pl-8 pr-4 py-2 border border-[#e5e7eb] text-[12px] outline-none focus:border-[#4338ca] transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <button className="px-3 py-2 border border-[#e5e7eb] text-[11px] font-bold uppercase text-[#111827] hover:bg-[#f8f9fb]">Bulk Action</button>
            <button
              onClick={() => setShowImporter(true)}
              className="px-3 py-2 border border-[#e5e7eb] text-[11px] font-bold uppercase text-[#111827] hover:bg-[#f8f9fb]"
            >
              Import CSV
            </button>
            <button
              onClick={handleAddProspect}
              className="px-3 py-2 bg-[#4338ca] text-white text-[11px] font-bold uppercase hover:bg-[#3730a3] transition-colors"
            >
              Add Prospect
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <table className="w-full table-dense">
            <thead>
              <tr>
                <th className="w-8 px-4"><input type="checkbox" /></th>
                <th>Name</th>
                <th>Phone Number</th>
                <th>Campaign</th>
                <th>Status</th>
                <th>Last Attempt</th>
              </tr>
            </thead>
            <tbody>
              {filteredLeads.map((lead) => (
                <tr
                  key={lead.id}
                  className={`cursor-pointer hover:bg-[#f8f9fb] transition-colors ${selectedLead?.id === lead.id ? 'bg-[#f5f7ff]' : ''}`}
                  onClick={() => setSelectedLead(lead)}
                >
                  <td className="w-8 px-4"><input type="checkbox" onClick={e => e.stopPropagation()} /></td>
                  <td className="font-bold text-[#111827]">{lead.firstName} {lead.lastName}</td>
                  <td className="text-[#6b7280] font-mono">{lead.phoneNumber}</td>
                  <td className="text-[#6b7280] uppercase text-[10px] font-bold">Standard Outreach</td>
                  <td>
                    <span className={`px-2 py-0.5 border text-[10px] font-bold uppercase ${lead.status === LeadStatus.APPOINTMENT_BOOKED ? 'border-green-200 text-green-700 bg-green-50' : 'border-[#e5e7eb] text-[#6b7280]'
                      }`}>
                      {lead.status}
                    </span>
                  </td>
                  <td className="text-[#6b7280] text-[11px]">10 Oct, 14:22</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Right Area: Context Detail Panel (Persistent) */}
      {selectedLead && (
        <div className="w-[380px] shrink-0 flex flex-col bg-white overflow-hidden shadow-2xl">
          <div className="p-5 border-b border-[#e5e7eb] flex items-center justify-between bg-[#f8f9fb]">
            <h3 className="text-sm font-bold text-[#111827] uppercase tracking-wide">Prospect Context</h3>
            <button onClick={() => setSelectedLead(null)} className="text-[#6b7280] hover:text-[#111827]"><i className="fas fa-times"></i></button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-8">
            <section>
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-[#f5f7ff] text-[#4338ca] flex items-center justify-center font-bold text-lg">
                  {selectedLead.firstName[0]}{selectedLead.lastName[0]}
                </div>
                <div>
                  <h4 className="text-base font-bold text-[#111827]">{selectedLead.firstName} {selectedLead.lastName}</h4>
                  <p className="text-xs text-[#6b7280] font-bold uppercase">{selectedLead.phoneNumber}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => onStartCall(selectedLead)}
                  className="flex-1 py-2 bg-[#4338ca] text-white text-[11px] font-bold uppercase tracking-wider shadow-sm"
                >
                  Initiate Outbound
                </button>
                <button className="px-4 py-2 border border-[#e5e7eb] text-[#111827] text-[11px] font-bold uppercase hover:bg-[#f8f9fb]">Message</button>
              </div>
            </section>

            <section className="space-y-4">
              <h5 className="text-[10px] font-black text-[#6b7280] uppercase tracking-widest border-b border-[#f3f4f6] pb-1">Operational Data</h5>
              <div className="grid grid-cols-2 gap-y-4 text-[11px]">
                <div>
                  <p className="text-[#6b7280] mb-1">Status</p>
                  <p className="font-bold text-[#111827] uppercase">{selectedLead.status}</p>
                </div>
                <div>
                  <p className="text-[#6b7280] mb-1">Source</p>
                  <p className="font-bold text-[#111827] uppercase">CSV Import</p>
                </div>
                <div className="col-span-2">
                  <p className="text-[#6b7280] mb-1">Primary Location</p>
                  <p className="font-bold text-[#111827] uppercase">{selectedLead.address}</p>
                  <p className="text-[#6b7280] text-[10px]">{selectedLead.city}, {selectedLead.state}</p>
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <h5 className="text-[10px] font-black text-[#6b7280] uppercase tracking-widest border-b border-[#f3f4f6] pb-1">Call Ledger</h5>
              <div className="space-y-3">
                {[
                  { date: '12 Oct', time: '14:20', type: 'Outbound', status: 'Connected' },
                  { date: '11 Oct', time: '10:15', type: 'Outbound', status: 'No-Answer' },
                ].map((log, i) => (
                  <div key={i} className="flex items-center justify-between p-3 border border-[#f3f4f6] bg-[#f8f9fb]">
                    <div>
                      <p className="text-[11px] font-bold text-[#111827]">{log.type} Call</p>
                      <p className="text-[10px] text-[#6b7280]">{log.date} at {log.time}</p>
                    </div>
                    <span className="text-[10px] font-bold text-[#6b7280] uppercase">{log.status}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      )}
      {showImporter && (
        <CsvImporter
          onClose={() => setShowImporter(false)}
          onImport={handleBulkImport}
        />
      )}
    </div>
  );
};

export default LeadManagement;
