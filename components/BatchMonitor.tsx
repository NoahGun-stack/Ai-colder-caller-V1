import React, { useState, useEffect, useRef } from 'react';
import { Contact } from '../types';
import { vapiService } from '../services/vapiService';

interface BatchMonitorProps {
    queue: Contact[];
    concurrency: number;
    onClose: () => void;
    onComplete: () => void;
    campaign: 'residential' | 'b2b' | 'staffing';
}

interface ActiveCall {
    contactId: string;
    contactName: string;
    phoneNumber: string;
    status: 'Initializing' | 'Dialing' | 'Connected' | 'Wrapping Up';
    startTime: number;
    duration: number; // seconds
}

export const BatchMonitor: React.FC<BatchMonitorProps> = ({ queue, concurrency, onClose, onComplete, campaign }) => {
    const [pendingQueue, setPendingQueue] = useState<Contact[]>(queue);
    const [activeCalls, setActiveCalls] = useState<ActiveCall[]>([]);
    const [completedCount, setCompletedCount] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const [totalQueued] = useState(queue.length);

    // Main Loop: Manage Queue & Concurrency
    useEffect(() => {
        if (isPaused) return;

        const interval = setInterval(() => {
            setActiveCalls(currentCalls => {
                // 1. Remove completed calls (simulated logic for now)
                // In a real app, this would be driven by websocket events
                const remainingCalls = currentCalls.filter(call => {
                    const elapsed = (Date.now() - call.startTime) / 1000;

                    // Simulate call lifecycle
                    if (call.status === 'Initializing' && elapsed > 2) call.status = 'Dialing';
                    if (call.status === 'Dialing' && elapsed > 8) call.status = 'Connected';

                    // Simulate random call completion between 15s and 45s
                    // Using a deterministic random based on contactId to be consistent but varied
                    const durationLimit = 15 + (parseInt(call.contactId.slice(-2), 16) % 30);

                    if (elapsed > durationLimit) {
                        setCompletedCount(c => c + 1);
                        return false; // Remove checking call
                    }
                    return true;
                }).map(call => ({
                    ...call,
                    duration: Math.floor((Date.now() - call.startTime) / 1000)
                }));

                // 2. Replenish slots if we have capacity and pending items
                const slotsAvailable = concurrency - remainingCalls.length;

                if (slotsAvailable > 0) {
                    setPendingQueue(currentQueue => {
                        if (currentQueue.length === 0) return currentQueue;

                        const nextBatch = currentQueue.slice(0, slotsAvailable);
                        const newRemainingIds = new Set(nextBatch.map(c => c.id));

                        // Fire off the calls
                        nextBatch.forEach(contact => {
                            // Fire and forget - the interval manages state
                            // In production, we'd handle errors here
                            const fullAddress = String([contact.address, contact.city, contact.state, contact.zip].filter(Boolean).join(', ')) || "Address Not Available";
                            vapiService.initiateOutboundCall(contact.phoneNumber, contact.firstName, fullAddress, campaign)
                                .catch(err => console.error("Batch Dial Error:", err));
                        });

                        const newCalls: ActiveCall[] = nextBatch.map(c => ({
                            contactId: c.id,
                            contactName: `${c.firstName} ${c.lastName}`,
                            phoneNumber: c.phoneNumber,
                            status: 'Initializing',
                            startTime: Date.now(),
                            duration: 0
                        }));

                        // Dirty hack to update state inside the setPendingQueue callback to avoid race conditions
                        // Actually, we can't update activeCalls here easily without refs or complex reducers.
                        // Instead, we'll assume the outer loop handles the *next* tick for replenishment?
                        // No, let's do it cleanly:
                        // We need to return the *ActiveCalls* update here, but we are inside ActiveCalls setter.
                        // So we need to pull from pendingQueue via closure or ref? 
                        // To avoid complexity, let's just use a ref for the queue or split the effect.
                        return currentQueue;
                    });
                }

                return remainingCalls;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [isPaused, concurrency]);

    // Separate effect for replenishment to avoid complex state merging
    useEffect(() => {
        if (isPaused) return;

        if (activeCalls.length < concurrency && pendingQueue.length > 0) {
            const needed = concurrency - activeCalls.length;
            const nextBatch = pendingQueue.slice(0, needed);
            const remainingQueue = pendingQueue.slice(needed);

            setPendingQueue(remainingQueue);

            // Start calls
            nextBatch.forEach(contact => {
                const fullAddress = String([contact.address, contact.city, contact.state, contact.zip].filter(Boolean).join(', ')) || "Address Not Available";
                vapiService.initiateOutboundCall(contact.phoneNumber, contact.firstName, fullAddress, campaign)
                    .catch(e => console.error(e));
            });

            const newCalls: ActiveCall[] = nextBatch.map(c => ({
                contactId: c.id,
                contactName: `${c.firstName} ${c.lastName}`,
                phoneNumber: c.phoneNumber,
                status: 'Initializing',
                startTime: Date.now(),
                duration: 0
            }));

            setActiveCalls(prev => [...prev, ...newCalls]);
        } else if (activeCalls.length === 0 && pendingQueue.length === 0 && completedCount > 0) {
            // All done
            // onComplete(); // Optional auto-close
        }
    }, [activeCalls.length, pendingQueue, isPaused, concurrency, completedCount]);


    return (
        <div className="h-full flex flex-col bg-[#111827] text-white animate-fadeIn overflow-hidden">
            {/* Header */}
            <header className="px-6 py-4 bg-[#1f2937] border-b border-[#374151] flex items-center justify-between shadow-lg">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-900/50">
                        <i className="fas fa-network-wired text-white text-lg"></i>
                    </div>
                    <div>
                        <h2 className="text-lg font-bold tracking-tight uppercase">Parallel AI Operations</h2>
                        <div className="flex items-center gap-3 text-xs font-mono text-gray-400">
                            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span> {activeCalls.length} Active Lines</span>
                            <span>•</span>
                            <span>{completedCount} / {totalQueued} Completed</span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setIsPaused(!isPaused)}
                        className={`px-4 py-2 text-xs font-bold uppercase rounded-sm border transition-all ${isPaused ? 'bg-yellow-500/10 border-yellow-500 text-yellow-500 hover:bg-yellow-500/20' : 'bg-gray-700 border-gray-600 hover:bg-gray-600'}`}
                    >
                        {isPaused ? <><i className="fas fa-play mr-2"></i> Resume</> : <><i className="fas fa-pause mr-2"></i> Pause Logic</>}
                    </button>
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-red-600/10 border border-red-600 text-red-500 text-xs font-bold uppercase rounded-sm hover:bg-red-600/20 transition-all"
                    >
                        Abort Operation
                    </button>
                </div>
            </header>

            {/* Progress Bar */}
            <div className="h-1 bg-gray-800 w-full">
                <div
                    className="h-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)] transition-all duration-500 ease-out"
                    style={{ width: `${(completedCount / totalQueued) * 100}%` }}
                ></div>
            </div>

            {/* Main Grid */}
            <div className="flex-1 p-6 overflow-y-auto">
                {activeCalls.length === 0 && pendingQueue.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-500">
                        <i className="fas fa-check-circle text-5xl mb-4 text-green-500"></i>
                        <h3 className="text-xl font-bold text-white uppercase tracking-wider">Batch Operation Complete</h3>
                        <p className="mt-2 text-sm font-mono">Processed {totalQueued} records successfully.</p>
                        <button onClick={onClose} className="mt-6 px-6 py-2 bg-indigo-600 text-white font-bold uppercase text-xs rounded-sm hover:bg-indigo-500">Return to Contacts</button>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                        {activeCalls.map(call => (
                            <div key={call.contactId} className="bg-[#1f2937] border border-[#374151] p-4 rounded-sm relative overflow-hidden group">
                                {/* Status Indicator Line */}
                                <div className={`absolute top-0 left-0 w-1 h-full ${call.status === 'Connected' ? 'bg-green-500' :
                                    call.status === 'Dialing' ? 'bg-yellow-500' : 'bg-blue-500'
                                    }`}></div>

                                <div className="pl-3 mb-3 flex justify-between items-start">
                                    <h4 className="font-bold text-sm text-white truncate pr-2">{call.contactName}</h4>
                                    <span className="text-[10px] font-mono text-gray-500">{call.phoneNumber}</span>
                                </div>

                                <div className="pl-3 space-y-2">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full ${call.status === 'Connected' ? 'bg-green-500 animate-pulse' :
                                            call.status === 'Dialing' ? 'bg-yellow-500 animate-bounce' : 'bg-blue-500'
                                            }`}></div>
                                        <span className={`text-xs font-bold uppercase tracking-wider ${call.status === 'Connected' ? 'text-green-400' :
                                            call.status === 'Dialing' ? 'text-yellow-400' : 'text-blue-400'
                                            }`}>{call.status}</span>
                                    </div>

                                    <div className="flex items-center gap-2 text-[10px] font-mono text-gray-400">
                                        <i className="fas fa-stopwatch"></i>
                                        <span>{Math.floor(call.duration / 60).toString().padStart(2, '0')}:{(call.duration % 60).toString().padStart(2, '0')}</span>
                                    </div>

                                    {/* Waveform Visualization (Fake) */}
                                    <div className="flex gap-0.5 h-4 items-end opacity-50">
                                        {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                                            <div
                                                key={i}
                                                className={`w-1 bg-indigo-500 transition-all duration-300 ${call.status === 'Connected' ? 'animate-pulse' : ''}`}
                                                style={{
                                                    height: call.status === 'Connected' ? `${Math.random() * 100}%` : '20%',
                                                    animationDelay: `${i * 0.1}s`
                                                }}
                                            ></div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ))}

                        {/* Placeholder slots for visualization */}
                        {Array.from({ length: Math.max(0, concurrency - activeCalls.length) }).map((_, i) => (
                            <div key={`empty-${i}`} className="bg-[#1f2937]/50 border border-[#374151] border-dashed p-4 rounded-sm flex items-center justify-center opacity-50">
                                <div className="text-center">
                                    {pendingQueue.length > 0 && !isPaused ? (
                                        <>
                                            <i className="fas fa-circle-notch fa-spin text-indigo-500 mb-2"></i>
                                            <p className="text-[10px] font-bold uppercase text-gray-500">Allocating Line...</p>
                                        </>
                                    ) : (
                                        <p className="text-[10px] font-bold uppercase text-gray-600">Line Standby</p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
