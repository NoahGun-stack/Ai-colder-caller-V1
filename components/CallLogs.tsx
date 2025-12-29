
import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';

interface CallLog {
    id: string;
    created_at: string;
    duration: number;
    outcome: string;
    sentiment: string;
    transcript: string;
    recording_url: string | null;
    contact: {
        firstName: string;
        lastName: string;
        phoneNumber: string;
    } | null;
}

export const CallLogs: React.FC = () => {
    const [logs, setLogs] = useState<CallLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    useEffect(() => {
        fetchLogs();
    }, []);

    const fetchLogs = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('call_logs')
                .select(`
                    id,
                    created_at,
                    duration,
                    outcome,
                    sentiment,
                    transcript,
                    recording_url,
                    contact:contacts (
                        firstName,
                        lastName,
                        phoneNumber
                    )
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setLogs(data as any || []);
        } catch (err) {
            console.error('Error fetching call logs:', err);
        } finally {
            setLoading(false);
        }
    };

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Loading call history...</div>;

    return (
        <div className="flex flex-col h-full bg-[#f8f9fb]">
            <header className="p-6 border-b border-[#e5e7eb] bg-white flex justify-between items-center shadow-sm">
                <div>
                    <h2 className="text-xl font-bold text-[#111827]">Call Ledger</h2>
                    <p className="text-sm text-[#6b7280]">Review recordings and AI analysis</p>
                </div>
                <button
                    onClick={fetchLogs}
                    className="px-4 py-2 bg-white border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-md"
                >
                    <i className="fas fa-sync-alt mr-2"></i> Refresh
                </button>
            </header>

            <div className="flex-1 overflow-auto p-6">
                {logs.length === 0 ? (
                    <div className="text-center py-12">
                        <div className="mx-auto h-12 w-12 text-gray-400">
                            <i className="fas fa-microphone-slash text-4xl"></i>
                        </div>
                        <h3 className="mt-2 text-sm font-medium text-gray-900">No calls recorded yet</h3>
                        <p className="mt-1 text-sm text-gray-500">Make some calls to populate the ledger.</p>
                    </div>
                ) : (
                    <div className="bg-white shadow overflow-hidden sm:rounded-md border border-gray-200">
                        <ul className="divide-y divide-gray-200">
                            {logs.map((log) => (
                                <li key={log.id} className="hover:bg-gray-50 transition-colors">
                                    <div className="px-4 py-4 sm:px-6">
                                        <div className="flex items-center justify-between cursor-pointer" onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}>
                                            <div className="flex items-center gap-4">
                                                <div className={`flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center font-bold text-lg text-white ${log.sentiment === 'Positive' ? 'bg-green-500' :
                                                        log.sentiment === 'Negative' ? 'bg-red-500' : 'bg-gray-400'
                                                    }`}>
                                                    {log.contact ? log.contact.firstName[0] : '?'}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-indigo-600 truncate">
                                                        {log.contact ? `${log.contact.firstName} ${log.contact.lastName}` : 'Unknown Number'}
                                                    </p>
                                                    <div className="flex items-center gap-2 text-xs text-gray-500">
                                                        <span>{new Date(log.created_at).toLocaleString()}</span>
                                                        <span>•</span>
                                                        <span>{formatDuration(log.duration)}</span>
                                                        <span>•</span>
                                                        <span className="uppercase font-bold tracking-wider">{log.outcome}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                {log.recording_url && (
                                                    <div onClick={e => e.stopPropagation()}>
                                                        <audio controls src={log.recording_url} className="h-8 w-60" />
                                                    </div>
                                                )}
                                                <i className={`fas fa-chevron-down text-gray-400 transition-transform ${expandedId === log.id ? 'rotate-180' : ''}`}></i>
                                            </div>
                                        </div>

                                        {expandedId === log.id && (
                                            <div className="mt-4 pl-14 pr-4 py-4 bg-gray-50 rounded-md border border-gray-100 text-sm text-gray-700">
                                                <h4 className="font-bold text-xs uppercase text-gray-500 mb-2">Transcript & Analysis</h4>
                                                <p className="whitespace-pre-wrap font-mono text-xs text-gray-600">{log.transcript}</p>
                                            </div>
                                        )}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
};
