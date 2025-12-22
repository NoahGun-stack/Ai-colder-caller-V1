
import React, { useState, useEffect, useRef } from 'react';
import { Contact, LeadStatus } from '../types';
import { RealtimeService } from '../services/realtimeService';
import { vapiService } from '../services/vapiService';

interface CallConsoleProps {
  contact: Contact | null;
  onClose: () => void;
  updateContact: (id: string, updates: Partial<Contact>) => void;
}

interface LogEntry {
  role: 'AGENT' | 'ENDPOINT' | 'SYSTEM' | 'USER';
  text: string;
  time: string;
}

const CallConsole: React.FC<CallConsoleProps> = ({ contact, onClose, updateContact }) => {
  const [isCalling, setIsCalling] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isSummarizing, setIsSummarizing] = useState(false);
  const realtimeRef = useRef<RealtimeService | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (realtimeRef.current) {
        realtimeRef.current.disconnect();
      }
    };
  }, []);



  const openAiKey = import.meta.env.VITE_OPENAI_API_KEY;
  const vapiParams = {
    privateKey: import.meta.env.VITE_VAPI_PRIVATE_KEY,
    phoneNumberId: import.meta.env.VITE_VAPI_PHONE_NUMBER_ID
  };

  const startCall = async () => {
    if (!contact) return;

    // PRIORITY 1: REAL PSTN CALL (VAPI)
    if (vapiParams.privateKey && vapiParams.phoneNumberId) {
      setIsCalling(true);
      setLogs([{
        role: 'SYSTEM',
        text: `INITIATING VAPI TELEPHONY NETWORK...`,
        time: new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit' })
      }]);

      try {
        const result = await vapiService.initiateOutboundCall(contact.phoneNumber, `${contact.firstName} ${contact.lastName}`);
        setLogs(prev => [...prev, {
          role: 'SYSTEM',
          text: `CALL DISPATCHED: ${result.id}`,
          time: new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit' })
        }]);
        // Note: In a full production app, we would connect a websocket here to Vapi to get live transcripts.
        // For now, the call happens on the phone network.
      } catch (err: any) {
        setLogs(prev => [...prev, {
          role: 'SYSTEM',
          text: `VAPI ERROR: ${err.message}`,
          time: new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit' })
        }]);
        setIsCalling(false);
      }
      return;
    }

    // PRIORITY 2: SIMULATION (OPENAI REALTIME)
    if (!openAiKey) {
      alert("Please set VITE_VAPI_PRIVATE_KEY for real calls OR VITE_OPENAI_API_KEY for simulation.");
      return;
    }

    setIsCalling(true);
    setLogs([{
      role: 'SYSTEM',
      text: `ESTABLISHING REALTIME CONNECTION...`,
      time: new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit' })
    }]);

    realtimeRef.current = new RealtimeService(openAiKey);

    // Subscribe to updates
    realtimeRef.current.onUpdate = (role, text) => {
      setLogs(prev => {
        // Check if we should append to last log (streaming text) or new log
        const last = prev[prev.length - 1];
        if (last && last.role === role && role !== 'SYSTEM') {
          return [
            ...prev.slice(0, -1),
            { ...last, text: last.text + text }
          ];
        }
        return [...prev, {
          role: role as any,
          text: text,
          time: new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit' })
        }];
      });
    };

    try {
      await realtimeRef.current.connect();
    } catch (err) {
      setLogs(prev => [...prev, { role: 'SYSTEM', text: 'ERROR: CONNECTION FAILED.', time: new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit' }) }]);
      setIsCalling(false);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    // Text input disabled for voice mode usually, but could be PTT text injection
    if (e) e.preventDefault();
  };

  const endCall = async () => {
    if (realtimeRef.current) {
      realtimeRef.current.disconnect();
    }
    setIsCalling(false);
    onClose();
  };

  if (!contact) return null;

  return (
    <div className="h-full flex flex-col bg-[#f8f9fb] animate-fadeIn overflow-hidden">
      <header className="p-4 bg-white border-b border-[#e5e7eb] flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="p-2 text-[#6b7280] hover:text-[#111827]"><i className="fas fa-chevron-left"></i></button>
          <div>
            <h3 className="text-sm font-bold text-[#111827] uppercase tracking-wide">{contact.firstName} {contact.lastName}</h3>
            <p className="text-[10px] text-[#6b7280] font-bold uppercase tracking-widest">{contact.phoneNumber} • OUTBOUND SESSION</p>
          </div>
        </div>
        <div className="flex gap-2">
          {!isCalling ? (
            <button onClick={startCall} className="bg-[#4338ca] text-white px-6 py-2 text-[11px] font-bold uppercase">Start Call</button>
          ) : (
            <button onClick={endCall} disabled={isSummarizing} className="bg-[#111827] text-white px-6 py-2 text-[11px] font-bold uppercase disabled:opacity-50">
              {isSummarizing ? 'Processing...' : 'End Session'}
            </button>
          )}
        </div>
      </header>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 min-h-0 overflow-hidden">
        <div className="lg:col-span-3 flex flex-col min-h-0 overflow-hidden">
          {/* Audio Simulation Panel */}
          <div className="p-4 bg-white border-b border-[#e5e7eb] flex items-center gap-4 shrink-0">
            <div className="flex-1 h-8 bg-[#f8f9fb] border border-[#e5e7eb] flex items-center px-4">
              <div className="w-full flex items-center gap-2">
                <i className="fas fa-play text-[#6b7280] text-[10px]"></i>
                <div className="flex-1 h-1 bg-[#e5e7eb]">
                  <div className={`h-full bg-[#4338ca] transition-all duration-300 ${isCalling ? 'w-1/3' : 'w-0'}`}></div>
                </div>
                <span className="text-[10px] font-bold text-[#6b7280]">00:14 / 02:45</span>
              </div>
            </div>
            <div className="flex gap-4">
              <i className="fas fa-volume-up text-[#6b7280] text-xs"></i>
              <i className="fas fa-download text-[#6b7280] text-xs"></i>
            </div>
          </div>

          {/* Audit Transcript */}
          <div ref={scrollRef} className="flex-1 p-8 overflow-y-auto space-y-6 bg-white font-mono text-[11px]">
            {logs.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center opacity-30 text-[#6b7280]">
                <i className="fas fa-terminal text-4xl mb-4"></i>
                <p className="uppercase tracking-[0.4em] font-bold text-[10px]">Signal Awaiting Handshake</p>
              </div>
            )}
            {logs.map((log, i) => (
              <div key={i} className="flex gap-4 border-b border-[#f3f4f6] pb-2 last:border-0">
                <span className="text-[#6b7280] w-14 shrink-0">[{log.time}]</span>
                <span className={`w-20 shrink-0 font-bold uppercase tracking-wider ${log.role === 'AGENT' ? 'text-[#4338ca]' : log.role === 'USER' ? 'text-[#111827]' : 'text-[#6b7280] italic'}`}>
                  {log.role}
                </span>
                <span className="flex-1 text-[#111827] uppercase">{log.text}</span>
              </div>
            ))}
          </div>

          {isCalling && (
            <div className="p-4 bg-[#f8f9fb] border-t border-[#e5e7eb]">
              <form onSubmit={handleSendMessage} className="relative">
                <input
                  type="text"
                  placeholder="Simulate endpoint response..."
                  className="w-full bg-white border border-[#e5e7eb] pl-4 pr-12 py-3 text-[11px] font-bold text-[#111827] uppercase outline-none focus:border-[#4338ca]"
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                />
                <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 text-[#4338ca]"><i className="fas fa-chevron-right"></i></button>
              </form>
            </div>
          )}
        </div>

        <div className="bg-white border-l border-[#e5e7eb] p-6 space-y-8 overflow-y-auto">
          <section className="space-y-4">
            <h4 className="text-[10px] font-black text-[#6b7280] uppercase tracking-widest border-b border-[#f3f4f6] pb-1">Session Data</h4>
            <div className="space-y-3 text-[11px] font-bold uppercase">
              <div className="flex justify-between">
                <span className="text-[#6b7280]">Status</span>
                <span className="text-[#111827]">Active / Live</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6b7280]">Codec</span>
                <span className="text-[#111827]">G.711 / OPUS</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6b7280]">Encryption</span>
                <span className="text-[#111827]">TLS 1.2</span>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h4 className="text-[10px] font-black text-[#6b7280] uppercase tracking-widest border-b border-[#f3f4f6] pb-1">Compliance Matrix</h4>
            <div className="space-y-3 text-[11px] font-bold uppercase">
              <div className="flex justify-between items-center">
                <span className="text-[#6b7280]">TCPA Scrub</span>
                <span className="text-green-600 border border-green-200 bg-green-50 px-2 py-0.5 text-[9px]">Verified</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#6b7280]">Recording</span>
                <span className="text-blue-600 border border-blue-200 bg-blue-50 px-2 py-0.5 text-[9px]">Opt-In</span>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default CallConsole;
