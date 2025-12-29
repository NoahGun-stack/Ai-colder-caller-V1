
import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { Contact } from '../types';

interface Appointment {
    id: string;
    created_at: string;
    datetime: string;
    notes: string;
    status: string;
    contact: Contact; // Joined data
}

export const AppointmentList: React.FC = () => {
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAppointments();
    }, []);

    const fetchAppointments = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('appointments')
                .select(`
                    id,
                    created_at,
                    datetime,
                    notes,
                    status,
                    contact:contacts (
                        firstName,
                        lastName,
                        phoneNumber,
                        address,
                        city,
                        state
                    )
                `)
                .order('datetime', { ascending: true });

            if (error) throw error;
            setAppointments(data as any || []);
        } catch (err) {
            console.error('Error fetching appointments:', err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div className="p-8 text-center text-gray-500">Loading appointments...</div>;
    }

    return (
        <div className="flex flex-col h-full bg-[#f8f9fb]">
            <header className="p-6 border-b border-[#e5e7eb] bg-white flex justify-between items-center shadow-sm">
                <div>
                    <h2 className="text-xl font-bold text-[#111827]">Appointments</h2>
                    <p className="text-sm text-[#6b7280]">Manage your upcoming roof inspections</p>
                </div>
                <button
                    onClick={fetchAppointments}
                    className="px-4 py-2 bg-white border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-md"
                >
                    <i className="fas fa-sync-alt mr-2"></i> Refresh
                </button>
            </header>

            <div className="flex-1 overflow-auto p-6">
                {appointments.length === 0 ? (
                    <div className="text-center py-12">
                        <div className="mx-auto h-12 w-12 text-gray-400">
                            <i className="fas fa-calendar-times text-4xl"></i>
                        </div>
                        <h3 className="mt-2 text-sm font-medium text-gray-900">No appointments</h3>
                        <p className="mt-1 text-sm text-gray-500">Get on the phones and book some inspections!</p>
                    </div>
                ) : (
                    <div className="bg-white shadow overflow-hidden sm:rounded-md border border-gray-200">
                        <ul className="divide-y divide-gray-200">
                            {appointments.map((apt) => {
                                const date = new Date(apt.datetime);
                                const isPast = date < new Date();

                                return (
                                    <li key={apt.id} className={`hover:bg-gray-50 transition-colors ${isPast ? 'opacity-75 bg-gray-50' : ''}`}>
                                        <div className="px-4 py-4 sm:px-6">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-4">
                                                    <div className="flex-shrink-0">
                                                        <span className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold">
                                                            {new Date(apt.datetime).getDate()}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-indigo-600 truncate">
                                                            {apt.contact ? `${apt.contact.firstName} ${apt.contact.lastName}` : 'Unknown Contact'}
                                                        </p>
                                                        <p className="text-sm text-gray-500">
                                                            {apt.contact?.address || 'No Address'}, {apt.contact?.city}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="ml-2 flex-shrink-0 flex flex-col items-end">
                                                    <p className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                                        {date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
                                                    </p>
                                                    <p className="text-sm text-gray-500 mt-1">
                                                        {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="mt-2 sm:flex sm:justify-between">
                                                <div className="sm:flex">
                                                    <p className="flex items-center text-sm text-gray-500">
                                                        <i className="fas fa-sticky-note mr-2 text-gray-400"></i>
                                                        {apt.notes || 'No notes'}
                                                    </p>
                                                </div>
                                                <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                                                    <i className="fas fa-phone mr-2 text-gray-400"></i>
                                                    {apt.contact?.phoneNumber}
                                                </div>
                                            </div>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
};
