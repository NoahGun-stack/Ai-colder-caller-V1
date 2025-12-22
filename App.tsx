
import React, { useState, useEffect } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from './services/supabase';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import ContactManagement from './components/ContactManagement';
import CampaignSettings from './components/CampaignSettings';
import CallConsole from './components/CallConsole';
import { contactsService } from './services/contactsService';
import { Contact } from './types';

type Tab = 'dashboard' | 'calls' | 'contacts' | 'campaigns' | 'appointments' | 'logs' | 'settings' | 'console';

const App: React.FC = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('calls');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContactForCall, setSelectedContactForCall] = useState<Contact | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) loadContacts();
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) loadContacts();
      else setContacts([]);
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadContacts = async () => {
    try {
      const data = await contactsService.fetchContacts();
      setContacts(data);
    } catch (error) {
      console.error('Failed to load contacts', error);
    }
  };

  const handleStartCall = (contact: Contact) => {
    setSelectedContactForCall(contact);
    setActiveTab('console');
  };

  const updateContactStatus = (id: string, updates: Partial<Contact>) => {
    setContacts(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: 'fa-chart-pie' },
    { id: 'calls', label: 'Contacts', icon: 'fa-address-book' },
    { id: 'campaigns', label: 'Campaigns', icon: 'fa-layer-group' },
    { id: 'appointments', label: 'Appointments', icon: 'fa-calendar-check' },
    { id: 'logs', label: 'Call Logs', icon: 'fa-list' },
  ];

  if (!session) {
    return <Auth />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-white">
      {/* Navigation Sidebar */}
      <aside className="w-[200px] bg-[#f8f9fb] border-r border-[#e5e7eb] flex flex-col shrink-0">
        <div className="h-14 flex items-center px-5 border-b border-[#e5e7eb]">
          <h1 className="text-sm font-bold tracking-tight uppercase text-[#111827]">RoofPulse</h1>
        </div>

        <nav className="flex-1 py-4 overflow-y-auto">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as Tab)}
              className={`w-full flex items-center gap-3 px-5 py-3 text-[12px] font-medium transition-all ${activeTab === item.id ? 'sidebar-item-active' : 'text-[#6b7280] hover:bg-[#f3f4f6]'}`}
            >
              <i className={`fas ${item.icon} w-4 text-center opacity-70`}></i>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-[#e5e7eb]">
          <button
            onClick={() => setActiveTab('settings')}
            className={`w-full flex items-center gap-3 px-2 py-2 text-[12px] font-medium mb-4 ${activeTab === 'settings' ? 'text-[#4338ca]' : 'text-[#6b7280]'}`}
          >
            <i className="fas fa-cog w-4 text-center opacity-70"></i>
            Settings
          </button>
          <div className="flex items-center gap-2 p-2 bg-white border border-[#e5e7eb]">
            <div className="w-6 h-6 bg-[#4338ca] text-white flex items-center justify-center font-bold text-[9px]">AX</div>
            <span className="text-[11px] font-bold text-[#111827] truncate">Apex Roofing</span>
          </div>
          <button
            onClick={() => supabase.auth.signOut()}
            className="w-full mt-2 flex items-center gap-3 px-2 py-2 text-[12px] font-medium text-red-600 hover:bg-red-50"
          >
            <i className="fas fa-sign-out-alt w-4 text-center opacity-70"></i>
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 bg-white border-b border-[#e5e7eb] flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-4">
            <h2 className="text-sm font-bold text-[#111827] uppercase tracking-wide">
              {activeTab === 'calls' ? 'Prospect Outreach' : activeTab.replace('-', ' ')}
            </h2>
          </div>
          <div className="flex items-center gap-6">
            <span className="text-[11px] font-bold text-green-600 flex items-center gap-1.5 uppercase">
              <span className="w-1.5 h-1.5 bg-green-600 rounded-full"></span> Active
            </span>
            <div className="flex items-center gap-3 text-[#6b7280]">
              <i className="fas fa-search text-xs cursor-pointer"></i>
              <i className="fas fa-bell text-xs cursor-pointer"></i>
              <i className="fas fa-user-circle text-sm cursor-pointer"></i>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-hidden relative">
          {activeTab === 'dashboard' && <Dashboard contacts={contacts} />}
          {activeTab === 'calls' && <ContactManagement contacts={contacts} setContacts={setContacts} onStartCall={handleStartCall} />}
          {activeTab === 'settings' && <CampaignSettings />}
          {activeTab === 'console' && (
            <CallConsole
              contact={selectedContactForCall}
              onClose={() => setSelectedContactForCall(null)}
              updateContact={updateContactStatus}
            />
          )}
          {['contacts', 'campaigns', 'appointments', 'logs'].includes(activeTab) && (
            <div className="h-full flex flex-col items-center justify-center text-center p-20">
              <i className="fas fa-server text-3xl text-[#d1d5db] mb-4"></i>
              <h3 className="text-sm font-bold text-[#111827] uppercase">Database Connection Active</h3>
              <p className="text-[11px] text-[#6b7280] mt-1 uppercase tracking-wider">Retrieving operational data for {activeTab}...</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default App;
