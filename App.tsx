
import React, { useState, useEffect } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from './services/supabase';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import ContactManagement from './components/ContactManagement';
import CampaignSettings from './components/CampaignSettings';
import CallConsole from './components/CallConsole';
import { BatchMonitor } from './components/BatchMonitor';
import { AppointmentList } from './components/AppointmentList';
import { CallLogs } from './components/CallLogs';
import { contactsService } from './services/contactsService';
import { Contact, UserProfile } from './types';
import { AdminDashboard } from './components/AdminDashboard';

import { LandingPage } from './components/LandingPage';

type Tab = 'dashboard' | 'calls' | 'contacts' | 'campaigns' | 'appointments' | 'logs' | 'settings' | 'console' | 'admin';

const App: React.FC = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [showLanding, setShowLanding] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('calls');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContactForCall, setSelectedContactForCall] = useState<Contact | null>(null);
  const [selectedCampaign, setSelectedCampaign] = useState<'residential' | 'b2b' | 'staffing' | 'painting'>('residential');
  const [callQueue, setCallQueue] = useState<Contact[]>([]);
  const [isAutoPilot, setIsAutoPilot] = useState(false);
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [passwordRecoveryMode, setPasswordRecoveryMode] = useState(false);


  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        setShowLanding(false); // If session exists, skip landing
        loadContacts();
        fetchUserProfile(session.user.id);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setPasswordRecoveryMode(true);
        setShowLanding(false);
      }
      setSession(session);
      if (session) {
        setShowLanding(false);
        loadContacts();
        fetchUserProfile(session.user.id);
      } else {
        setContacts([]);
        setUserProfile(null);
        // Don't force showLanding = true here on logout, 
        // because user might want to see login screen if they just logged out? 
        // Actually for now let's default to Landing on explicit logout or no session
        // But if we toggle to Auth, we don't want auth state change to reset it?
        // Let's keep it simple: if session is null, we rely on showLanding state.
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Real-time subscription for contact updates (Call Status, etc.)
  useEffect(() => {
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen for INSERT/UPDATE/DELETE
          schema: 'public',
          table: 'contacts',
        },
        (payload: any) => {
          if (payload.eventType === 'UPDATE') {
            setContacts((current) =>
              current.map((c) => (c.id === payload.new.id ? { ...c, ...(payload.new as Contact) } : c))
            );
          } else if (payload.eventType === 'INSERT') {
            setContacts((current) => [payload.new as Contact, ...current]);
          } else if (payload.eventType === 'DELETE') {
            setContacts((current) => current.filter((c) => c.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadContacts = async () => {
    try {
      const data = await contactsService.fetchContacts();
      setContacts(data);
    } catch (error) {
      console.error('Failed to load contacts', error);
    }
  };

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (data) {
        setUserProfile(data);
        if (data.assigned_campaign) {
          setSelectedCampaign(data.assigned_campaign as 'residential' | 'b2b' | 'staffing' | 'painting');
        }
      }
    } catch (error) {
      console.error('Error loading profile', error);
    }
  };



  const handleStartCall = (contact: Contact, campaign: 'residential' | 'b2b' | 'staffing' | 'painting' = 'residential') => {
    setSelectedContactForCall(contact);
    setSelectedCampaign(campaign);
    setCallQueue([]); // Clear queue for single call
    setActiveTab('console');
  };

  const [batchConcurrency, setBatchConcurrency] = useState(10);

  const handleStartPowerDial = (contactsToDial: Contact[], autoPilot = false, batchMode = false, concurrency = 10, campaign: 'residential' | 'b2b' | 'staffing' | 'painting' = 'residential') => {
    if (contactsToDial.length === 0) return;
    setCallQueue(contactsToDial);
    setSelectedCampaign(campaign);

    if (batchMode) {
      setIsBatchMode(true);
      setBatchConcurrency(concurrency);
      setIsAutoPilot(false); // Batch implies auto
    } else {
      setSelectedContactForCall(contactsToDial[0]);
      setIsAutoPilot(autoPilot);
      setIsBatchMode(false);
    }
    setActiveTab('console');
  };

  const handleNextCall = () => {
    // Current contact is callQueue[0]
    const nextQueue = callQueue.slice(1);
    setCallQueue(nextQueue);

    if (nextQueue.length > 0) {
      setSelectedContactForCall(nextQueue[0]);
    } else {
      setSelectedContactForCall(null);
      setActiveTab('calls'); // Return to list when done
    }
  };

  const updateContactStatus = (id: string, updates: Partial<Contact>) => {
    setContacts(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: 'fa-chart-pie' },
    { id: 'calls', label: 'Contacts', icon: 'fa-address-book' },
    { id: 'appointments', label: 'Appointments', icon: 'fa-calendar-check' },
    { id: 'logs', label: 'Call Logs', icon: 'fa-list' },
  ];

  if (userProfile?.role === 'admin') {
    navItems.push({ id: 'admin', label: 'Admin', icon: 'fa-users-cog' });
  }

  if (!session && !passwordRecoveryMode) {
    if (showLanding) {
      return <LandingPage onSignIn={() => setShowLanding(false)} />;
    }
    return (
      <>
        <div className="fixed top-4 left-4 z-50">
          <button
            onClick={() => setShowLanding(true)}
            className="flex items-center gap-2 text-[#d1d5db] hover:text-[#d4a843] transition-colors font-medium text-sm bg-[#080808]/80 px-4 py-2 rounded-full border border-[#404040]"
          >
            <i className="fas fa-arrow-left"></i> Back to Home
          </button>
        </div>
        <Auth />
      </>
    );
  }

  if (passwordRecoveryMode) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#1a1a1a]">
        <div className="w-full max-w-md bg-[#080808] p-8 border border-[#404040] shadow-sm">
          <div className="mb-6 text-center">
            <div className="text-[#d4a843] font-black text-2xl tracking-tighter mb-2">HARLOW<span className="font-light">AI</span>GROUP</div>
            <p className="text-sm text-[#d1d5db] mt-2">Update your password</p>
          </div>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const password = (e.currentTarget.elements.namedItem('password') as HTMLInputElement).value;
              const { error } = await supabase.auth.updateUser({ password });
              if (!error) {
                setPasswordRecoveryMode(false);
                alert('Password updated successfully!');
              } else {
                alert('Error updating password: ' + error.message);
              }
            }}
            className="space-y-4"
          >
            <div>
              <label className="block text-xs font-medium text-white mb-1">New Password</label>
              <input type="password" name="password" required className="w-full border border-[#525252] px-3 py-2 text-sm focus:border-[#d4a843] outline-none" placeholder="••••••••" />
            </div>
            <button type="submit" className="w-full bg-[#d4a843] hover:bg-[#e8c06a] text-white font-medium py-2.5 text-sm">Update Password</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#080808]">
      {/* Navigation Sidebar */}
      <aside className="w-[200px] bg-[#1a1a1a] border-r border-[#404040] flex flex-col shrink-0">
        <div className="h-14 flex items-center px-5 border-b border-[#404040]">
          <div className="text-[#d4a843] font-black text-lg tracking-tighter">HARLOW<span className="font-light">AI</span>GROUP</div>
        </div>

        <nav className="flex-1 py-4 overflow-y-auto">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as Tab)}
              className={`w-full flex items-center gap-3 px-5 py-3 text-[12px] font-medium transition-all ${activeTab === item.id ? 'sidebar-item-active' : 'text-[#d1d5db] hover:bg-[#262626]'}`}
            >
              <i className={`fas ${item.icon} w-4 text-center opacity-70`}></i>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-[#404040]">
          <button
            onClick={() => setActiveTab('settings')}
            className={`w-full flex items-center gap-3 px-2 py-2 text-[12px] font-medium mb-4 ${activeTab === 'settings' ? 'text-[#d4a843]' : 'text-[#d1d5db]'}`}
          >
            <i className="fas fa-cog w-4 text-center opacity-70"></i>
            Settings
          </button>
          <div className="flex items-center gap-2 p-2 bg-[#080808] border border-[#404040]">
            <div className="w-6 h-6 bg-[#d4a843] text-white flex items-center justify-center font-bold text-[9px]">AR</div>
            <span className="text-[11px] font-bold text-white truncate">Prime Shield</span>
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
        <header className="h-14 bg-[#080808] border-b border-[#404040] flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-4">
            <h2 className="text-sm font-bold text-white uppercase tracking-wide">
              {activeTab === 'appointments' ? null : (activeTab === 'calls' ? 'Prospect Outreach' : activeTab.replace('-', ' '))}
            </h2>
          </div>
          <div className="flex items-center gap-6">
            {/* Header actions removed as per user request */}
          </div>
        </header>

        <main className="flex-1 overflow-hidden relative">
          {activeTab === 'dashboard' && <Dashboard contacts={contacts} />}
          {activeTab === 'calls' && (
            <ContactManagement
              contacts={contacts}
              setContacts={setContacts}
              onStartCall={handleStartCall}
              onStartPowerDial={handleStartPowerDial}
              activeCampaign={selectedCampaign}
            />
          )}
          {activeTab === 'settings' && (
            <CampaignSettings
              selectedCampaign={selectedCampaign}
              setSelectedCampaign={userProfile?.role === 'admin' ? setSelectedCampaign : undefined}
            />
          )}

          {activeTab === 'admin' && userProfile?.role === 'admin' && (
            <AdminDashboard currentUser={userProfile} />
          )}
          {activeTab === 'console' && (
            isBatchMode ? (
              <BatchMonitor
                queue={callQueue}
                concurrency={batchConcurrency}
                campaign={selectedCampaign}
                onClose={() => {
                  setCallQueue([]);
                  setIsBatchMode(false);
                  setActiveTab('calls');
                }}
                onComplete={() => {
                  // alert('Batch Complete');
                }}
              />
            ) : (
              <CallConsole
                contact={selectedContactForCall}
                onClose={() => {
                  setSelectedContactForCall(null);
                  setCallQueue([]);
                  setActiveTab('calls');
                }}
                updateContact={updateContactStatus}
                onNext={handleNextCall}
                hasNext={callQueue.length > 1}
                isAutoPilot={isAutoPilot}
                onToggleAutoPilot={() => setIsAutoPilot(!isAutoPilot)}
                campaign={selectedCampaign}
              />
            )
          )}
          {activeTab === 'appointments' && <AppointmentList />}
          {activeTab === 'logs' && <CallLogs />}
          {activeTab === 'contacts' && (
            <div className="h-full flex flex-col items-center justify-center text-center p-20">
              <i className="fas fa-server text-3xl text-[#d1d5db] mb-4"></i>
              <h3 className="text-sm font-bold text-white uppercase">Database Connection Active</h3>
              <p className="text-[11px] text-[#d1d5db] mt-1 uppercase tracking-wider">Retrieving operational data for contacts...</p>
            </div>
          )}
        </main>
      </div>
    </div>

  );
};

export default App;
