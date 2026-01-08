
import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { contactsService } from '../services/contactsService';

import { Modal } from './Modal';

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
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'attempted'>('all');

    // Modal State
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [logToDelete, setLogToDelete] = useState<string | null>(null);

    useEffect(() => {
        fetchLogs();
    }, [searchQuery, statusFilter]);

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

            let filteredLogs = data as any || [];

            // Apply Filters (Client-side)
            if (searchQuery.trim() || statusFilter !== 'all') {
                const lowerQuery = searchQuery.toLowerCase();

                filteredLogs = filteredLogs.filter((log: any) => {
                    // Search Logic
                    const firstName = log.contact?.firstName?.toLowerCase() || '';
                    const lastName = log.contact?.lastName?.toLowerCase() || '';
                    const phone = log.contact?.phoneNumber || '';
                    const fullName = `${firstName} ${lastName}`;
                    const matchesSearch = !searchQuery.trim() || fullName.includes(lowerQuery) || phone.includes(lowerQuery);

                    if (!matchesSearch) return false;

                    // Status Logic
                    const outcome = (log.outcome || '').toLowerCase();
                    const isCompleted = (log.duration > 0) || outcome.includes('completed') || outcome.includes('connected');

                    if (statusFilter === 'completed') return isCompleted;
                    if (statusFilter === 'attempted') return !isCompleted;

                    return true;
                });
            }

            setLogs(filteredLogs);
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

    return (
        <div className="flex flex-col h-full bg-[#f8f9fb]">
            <header className="p-6 border-b border-[#e5e7eb] bg-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-sm">
                <div>
                    <h2 className="text-xl font-bold text-[#111827]">Call Ledger</h2>
                    <p className="text-sm text-[#6b7280]">Review recordings and AI analysis</p>
                </div>

                <div className="flex flex-1 w-full sm:w-auto sm:justify-end gap-3">
                    {/* Search Bar */}
                    <div className="relative flex-1 sm:max-w-xs">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <i className="fas fa-search text-gray-400"></i>
                        </div>
                        <input
                            type="text"
                            placeholder="Search name or phone..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 sm:text-sm"
                        />
                    </div>

                    {/* Status Filter */}
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as any)}
                        className="block pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                    >
                        <option value="all">All Outcomes</option>
                        <option value="completed">Completed (Connected)</option>
                        <option value="attempted">Attempted (No Answer)</option>
                    </select>



                    <button
                        onClick={fetchLogs}
                        className="p-2 text-gray-400 hover:text-gray-500"
                        title="Refresh"
                    >
                        <i className="fas fa-sync-alt"></i>
                    </button>
                </div>
            </header>

            <div className="flex-1 overflow-auto p-6">
                {loading ? (
                    <div className="p-8 text-center text-gray-500">Loading call history...</div>
                ) : logs.length === 0 ? (
                    <div className="text-center py-12">
                        <div className="mx-auto h-12 w-12 text-gray-400">
                            <i className="fas fa-search-minus text-4xl"></i>
                        </div>
                        <h3 className="mt-2 text-sm font-medium text-gray-900">No calls found</h3>
                        <p className="mt-1 text-sm text-gray-500">Try adjusting your search or filters.</p>
                        {(searchQuery || statusFilter !== 'all') && (
                            <button
                                onClick={() => { setSearchQuery(''); setStatusFilter('all'); }}
                                className="mt-3 text-indigo-600 hover:text-indigo-500 text-sm font-medium"
                            >
                                Clear filters
                            </button>
                        )}
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
                                                        <span className={`uppercase font-bold tracking-wider px-1.5 py-0.5 rounded ${log.outcome === 'Completed' || (log.duration || 0) > 0 ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                                                            }`}>
                                                            {log.outcome || (log.duration > 0 ? 'Connected' : 'Attempted')}
                                                        </span>
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
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setLogToDelete(log.id);
                                                        setIsDeleteModalOpen(true);
                                                    }}
                                                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-all ml-2"
                                                    title="Delete Log"
                                                >
                                                    <i className="fas fa-trash-alt"></i>
                                                </button>
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


            <Modal
                isOpen={isDeleteModalOpen}
                onClose={() => {
                    setIsDeleteModalOpen(false);
                    setLogToDelete(null);
                }}
                title="Delete Call Log"
                footer={
                    <>
                        <button
                            onClick={() => {
                                setIsDeleteModalOpen(false);
                                setLogToDelete(null);
                            }}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={async () => {
                                if (!logToDelete) return;
                                try {
                                    await contactsService.deleteCallLog(logToDelete);
                                    setLogs(prev => prev.filter(l => l.id !== logToDelete));
                                    setIsDeleteModalOpen(false);
                                    setLogToDelete(null);
                                } catch (err) {
                                    alert('Failed to delete log');
                                }
                            }}
                            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
                        >
                            Delete Log
                        </button>
                    </>
                }
            >
                <p className="text-sm text-gray-500">
                    Are you sure you want to delete this call log? This action cannot be undone.
                </p>
            </Modal>
        </div >
    );
};
