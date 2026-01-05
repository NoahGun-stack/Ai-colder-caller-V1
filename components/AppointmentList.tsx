
import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { appointmentsService } from '../services/appointmentsService';
import { contactsService } from '../services/contactsService';
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
    const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
    const [editForm, setEditForm] = useState({
        datetime: '',
        notes: '',
        firstName: '',
        lastName: '',
        address: '',
        city: '',
        state: ''
    });
    const [visibleCalls, setVisibleCalls] = useState<Set<string>>(new Set());

    const toggleCallLogs = (id: string) => {
        const newVisible = new Set(visibleCalls);
        if (newVisible.has(id)) {
            newVisible.delete(id);
        } else {
            newVisible.add(id);
        }
        setVisibleCalls(newVisible);
    };

    useEffect(() => {
        if (editingAppointment) {
            setEditForm({
                datetime: editingAppointment.datetime,
                notes: editingAppointment.notes || '',
                firstName: editingAppointment.contact?.firstName || '',
                lastName: editingAppointment.contact?.lastName || '',
                address: editingAppointment.contact?.address || '',
                city: editingAppointment.contact?.city || '',
                state: editingAppointment.contact?.state || ''
            });
        }
    }, [editingAppointment]);

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
                        id,
                        firstName,
                        lastName,
                        phoneNumber,
                        address,
                        city,
                        city,
                        state,
                        call_logs (
                            id,
                            created_at,
                            duration,
                            outcome,
                            recording_url
                        )
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

    const handleSaveEdit = async () => {
        if (!editingAppointment) return;

        try {
            // Update Appointment
            await appointmentsService.updateAppointment(editingAppointment.id, {
                datetime: editForm.datetime,
                notes: editForm.notes
            });

            // Update Contact
            if (editingAppointment.contact) {
                await contactsService.updateContact(editingAppointment.contact.id, {
                    firstName: editForm.firstName,
                    lastName: editForm.lastName,
                    address: editForm.address,
                    city: editForm.city,
                    state: editForm.state
                });
            }

            setEditingAppointment(null);
            fetchAppointments();
            alert('Appointment updated successfully');
        } catch (error: any) {
            alert('Error updating: ' + error.message);
        }
    };

    const handleDeleteAppointment = async () => {
        if (!editingAppointment) return;
        if (!confirm('Are you sure you want to delete this appointment? This cannot be undone.')) return;

        try {
            await appointmentsService.deleteAppointment(editingAppointment.id);
            setEditingAppointment(null);
            fetchAppointments();
            alert('Appointment deleted successfully');
        } catch (error: any) {
            alert('Error deleting appointment: ' + error.message);
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
                    <div className="space-y-8">
                        {(() => {
                            // Group appointments by date
                            const grouped: { [key: string]: Appointment[] } = {};
                            appointments.forEach(apt => {
                                const dateKey = new Date(apt.datetime).toDateString();
                                if (!grouped[dateKey]) grouped[dateKey] = [];
                                grouped[dateKey].push(apt);
                            });

                            return Object.entries(grouped).map(([dateKey, groupApts]) => (
                                <div key={dateKey}>
                                    <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3 ml-1">
                                        {dateKey === new Date().toDateString() ? 'Today' :
                                            dateKey === new Date(Date.now() + 86400000).toDateString() ? 'Tomorrow' :
                                                dateKey}
                                    </h3>
                                    <ul className="space-y-4">
                                        {groupApts.map((apt) => {
                                            const date = new Date(apt.datetime);
                                            const isPast = date < new Date();

                                            return (
                                                <li key={apt.id} className="mb-3 bg-white rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200 overflow-hidden">
                                                    <div className="px-5 py-4 flex gap-4 items-start">
                                                        {/* Left Column: Time */}
                                                        <div className="flex-shrink-0 w-16 pt-1 text-center">
                                                            <div className="text-lg font-bold text-gray-900 leading-none">
                                                                {date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).replace(/\s[AP]M/, '')}
                                                            </div>
                                                            <div className="text-[10px] font-bold text-gray-500 uppercase mt-0.5">
                                                                {date.toLocaleTimeString([], { hour: 'numeric', hour12: true }).slice(-2)}
                                                            </div>
                                                            {isPast && (
                                                                <span className="mt-2 inline-block px-1.5 py-0.5 bg-gray-100 text-gray-500 text-[9px] font-bold uppercase rounded border border-gray-200">
                                                                    Past
                                                                </span>
                                                            )}
                                                        </div>

                                                        {/* Right Column: Main Content */}
                                                        <div className="flex-1 min-w-0">
                                                            {/* Header */}
                                                            <div className="flex justify-between items-start">
                                                                <h3 className="text-base font-bold text-gray-900 truncate pr-2">
                                                                    {apt.contact ? `${apt.contact.firstName} ${apt.contact.lastName}` : 'Unknown Contact'}
                                                                </h3>
                                                                <button
                                                                    onClick={() => setEditingAppointment(apt)}
                                                                    className="text-gray-300 hover:text-indigo-600 transition-colors p-1"
                                                                    title="Edit"
                                                                >
                                                                    <i className="fas fa-pen text-xs"></i>
                                                                </button>
                                                            </div>

                                                            {/* Single Line Details (Responsive) */}
                                                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-gray-600">
                                                                <div className="flex items-center gap-1.5 min-w-0">
                                                                    <i className="fas fa-map-marker-alt text-gray-400 text-xs w-3"></i>
                                                                    <span className="truncate max-w-[300px]" title={[apt.contact?.address, apt.contact?.city, apt.contact?.state].filter(Boolean).join(', ')}>
                                                                        {[apt.contact?.address, apt.contact?.city, apt.contact?.state].filter(Boolean).join(', ') || 'No Address'}
                                                                    </span>
                                                                </div>
                                                                <div className="flex items-center gap-1.5">
                                                                    <i className="fas fa-phone text-gray-400 text-xs w-3"></i>
                                                                    <span className="font-mono text-xs">{apt.contact?.phoneNumber}</span>
                                                                </div>
                                                            </div>

                                                            {/* Notes - Compact */}
                                                            {apt.notes && (
                                                                <div className="mt-2.5 flex items-start gap-2 text-sm text-gray-500 bg-yellow-50/60 p-2 rounded border border-yellow-100/50">
                                                                    <i className="fas fa-sticky-note text-yellow-400 text-xs mt-0.5"></i>
                                                                    <span className="italic leading-snug text-xs">{apt.notes}</span>
                                                                </div>
                                                            )}

                                                            {/* Call Logs - Compact Toggle */}
                                                            {((apt.contact as any)?.call_logs || []).filter((log: any) => {
                                                                if (!log.recording_url) return false;
                                                                const logEnd = new Date(log.created_at).getTime();
                                                                const logStart = logEnd - (log.duration * 1000);
                                                                const aptTime = new Date(apt.created_at).getTime();
                                                                return aptTime >= (logStart - 300000) && aptTime <= (logEnd + 60000);
                                                            }).length > 0 && (
                                                                    <div className="mt-3">
                                                                        <button
                                                                            onClick={() => toggleCallLogs(apt.id)}
                                                                            className="flex items-center gap-2 text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
                                                                        >
                                                                            <i className={`fas fa-caret-${visibleCalls.has(apt.id) ? 'down' : 'right'}`}></i>
                                                                            View Booking Call
                                                                        </button>
                                                                        {visibleCalls.has(apt.id) && (
                                                                            <div className="mt-2 space-y-1.5 animate-fadeIn">
                                                                                {((apt.contact as any)?.call_logs || [])
                                                                                    .filter((log: any) => {
                                                                                        if (!log.recording_url) return false;
                                                                                        // Heuristic: Appt was created DURING the call.
                                                                                        // Log created_at is approx end of call.
                                                                                        const logEnd = new Date(log.created_at).getTime();
                                                                                        const logStart = logEnd - (log.duration * 1000);
                                                                                        const aptTime = new Date(apt.created_at).getTime();
                                                                                        // Allow 5 min buffer before start (clock skew) and up to log creation
                                                                                        return aptTime >= (logStart - 300000) && aptTime <= (logEnd + 60000);
                                                                                    })
                                                                                    .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                                                                                    .map((log: any) => (
                                                                                        <div key={log.id} className="flex items-center gap-2 bg-gray-50 p-1.5 rounded border border-gray-200">
                                                                                            <div className="text-[9px] font-bold text-gray-400 w-8 text-center leading-tight">
                                                                                                {new Date(log.created_at).toLocaleString('default', { month: 'short' }).toUpperCase()}<br />
                                                                                                {new Date(log.created_at).getDate()}
                                                                                            </div>
                                                                                            <audio controls src={log.recording_url} className="h-6 w-full max-w-[200px]" />
                                                                                            <span className="text-[10px] text-gray-500 font-mono ml-auto mr-1">
                                                                                                {Math.floor(log.duration / 60)}:{(log.duration % 60).toString().padStart(2, '0')}
                                                                                            </span>
                                                                                        </div>
                                                                                    ))}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                )}
                                                        </div>
                                                    </div>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                </div>
                            ));
                        })()}
                    </div>
                )}
            </div>
            {editingAppointment && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6">
                        <div className="flex justify-between items-center mb-4 border-b border-gray-100 pb-2">
                            <h3 className="text-lg font-bold text-gray-900">Edit Appointment</h3>
                            <button onClick={() => setEditingAppointment(null)} className="text-gray-400 hover:text-gray-500">
                                <i className="fas fa-times"></i>
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Date & Time</label>
                                    <input
                                        type="datetime-local"
                                        className="w-full border border-gray-300 rounded-sm px-3 py-2 text-sm"
                                        value={editForm.datetime ? new Date(editForm.datetime).toISOString().slice(0, 16) : ''}
                                        onChange={e => setEditForm({ ...editForm, datetime: new Date(e.target.value).toISOString() })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Notes</label>
                                    <input
                                        type="text"
                                        className="w-full border border-gray-300 rounded-sm px-3 py-2 text-sm"
                                        value={editForm.notes}
                                        onChange={e => setEditForm({ ...editForm, notes: e.target.value })}
                                    />
                                </div>
                            </div>

                            <hr className="border-gray-100 my-2" />
                            <h4 className="text-xs font-bold text-gray-500 uppercase">Contact Details</h4>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs text-gray-600 mb-1">First Name</label>
                                    <input
                                        type="text"
                                        className="w-full border border-gray-300 rounded-sm px-3 py-2 text-sm"
                                        value={editForm.firstName}
                                        onChange={e => setEditForm({ ...editForm, firstName: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-600 mb-1">Last Name</label>
                                    <input
                                        type="text"
                                        className="w-full border border-gray-300 rounded-sm px-3 py-2 text-sm"
                                        value={editForm.lastName}
                                        onChange={e => setEditForm({ ...editForm, lastName: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs text-gray-600 mb-1">Address</label>
                                <input
                                    type="text"
                                    className="w-full border border-gray-300 rounded-sm px-3 py-2 text-sm"
                                    value={editForm.address}
                                    onChange={e => setEditForm({ ...editForm, address: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs text-gray-600 mb-1">City</label>
                                    <input
                                        type="text"
                                        className="w-full border border-gray-300 rounded-sm px-3 py-2 text-sm"
                                        value={editForm.city}
                                        onChange={e => setEditForm({ ...editForm, city: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-600 mb-1">State</label>
                                    <input
                                        type="text"
                                        className="w-full border border-gray-300 rounded-sm px-3 py-2 text-sm"
                                        value={editForm.state}
                                        onChange={e => setEditForm({ ...editForm, state: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="mt-6 flex justify-between items-center">
                            <button
                                onClick={handleDeleteAppointment}
                                className="px-4 py-2 border border-red-200 text-red-600 text-sm font-medium rounded-md hover:bg-red-50 hover:text-red-700 transition-colors"
                            >
                                <i className="fas fa-trash-alt mr-2"></i> Delete
                            </button>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setEditingAppointment(null)}
                                    className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSaveEdit}
                                    className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700"
                                >
                                    Save Changes
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
