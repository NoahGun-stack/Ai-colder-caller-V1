
import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { appointmentsService } from '../services/appointmentsService';
import { contactsService } from '../services/contactsService';
import { Contact } from '../types';
import { Modal } from './Modal';

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
    const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
    const [currentMonth, setCurrentMonth] = useState(new Date());

    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    const addToGoogleCalendar = (apt: Appointment) => {
        const start = new Date(apt.datetime);
        const end = new Date(start.getTime() + 60 * 60 * 1000); // Assume 1 hour default

        const formatDate = (date: Date) => date.toISOString().replace(/-|:|\.\d\d\d/g, "");

        const details = [
            `Client: ${apt.contact.firstName} ${apt.contact.lastName}`,
            `Phone: ${apt.contact.phoneNumber}`,
            `Notes: ${apt.notes || 'None'}`
        ].join('\\n');

        const location = [apt.contact.address, apt.contact.city, apt.contact.state].filter(Boolean).join(', ');

        const url = new URL('https://calendar.google.com/calendar/render');
        url.searchParams.append('action', 'TEMPLATE');
        url.searchParams.append('text', `Roof Inspection - ${apt.contact.lastName}`); // Title
        url.searchParams.append('dates', `${formatDate(start)}/${formatDate(end)}`);
        url.searchParams.append('details', details);
        url.searchParams.append('location', location);

        window.open(url.toString(), '_blank');
    };

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
                            recording_url,
                            transcript
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

    const handleDeleteClick = () => {
        setIsDeleteModalOpen(true);
    };

    const executeDeleteAppointment = async () => {
        if (!editingAppointment) return;

        try {
            await appointmentsService.deleteAppointment(editingAppointment.id);
            setEditingAppointment(null);
            setIsDeleteModalOpen(false);
            fetchAppointments();
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
                <div className="flex items-center gap-3">
                    <div className="flex bg-gray-100 p-1 rounded-md">
                        <button
                            onClick={() => setViewMode('list')}
                            className={`px-3 py-1.5 text-xs font-bold uppercase rounded-sm transition-all ${viewMode === 'list' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            <i className="fas fa-list mr-2"></i>List
                        </button>
                        <button
                            onClick={() => setViewMode('calendar')}
                            className={`px-3 py-1.5 text-xs font-bold uppercase rounded-sm transition-all ${viewMode === 'calendar' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            <i className="fas fa-calendar-alt mr-2"></i>Calendar
                        </button>
                    </div>
                    <button
                        onClick={fetchAppointments}
                        className="px-4 py-2 bg-white border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-md"
                    >
                        <i className="fas fa-sync-alt mr-2"></i> Refresh
                    </button>
                </div>
            </header>

            <div className="flex-1 overflow-auto p-6">
                {viewMode === 'list' ? (
                    appointments.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="mx-auto h-12 w-12 text-gray-400">
                                <i className="fas fa-calendar-times text-4xl"></i>
                            </div>
                            <h3 className="mt-2 text-sm font-medium text-gray-900">No appointments</h3>
                            <p className="mt-1 text-sm text-gray-500">Get on the phones and book some inspections!</p>
                        </div>
                    ) : (
                        <div className="space-y-8">
                            {Object.entries(appointments.reduce((acc, apt) => {
                                const dateKey = new Date(apt.datetime).toDateString();
                                if (!acc[dateKey]) acc[dateKey] = [];
                                acc[dateKey].push(apt);
                                return acc;
                            }, {} as { [key: string]: Appointment[] })).map(([dateKey, groupApts]) => (
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
                                            const address = [apt.contact?.address, apt.contact?.city, apt.contact?.state].filter(Boolean).join(', ');

                                            return (
                                                <li key={apt.id} className="mb-3 bg-white rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200 overflow-hidden group">
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
                                                            <div className="flex justify-between items-start">
                                                                <div>
                                                                    {/* Address is now MAIN Title */}
                                                                    <h3 className="text-base font-bold text-gray-900 truncate pr-2 flex items-center gap-2">
                                                                        <i className="fas fa-map-marker-alt text-gray-400 text-xs"></i>
                                                                        {address || 'No Address Provided'}
                                                                    </h3>
                                                                    <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                                                                        <span className="font-bold text-indigo-600 uppercase tracking-wide">
                                                                            {apt.contact ? `${apt.contact.firstName} ${apt.contact.lastName}` : 'Unknown Contact'}
                                                                        </span>
                                                                        <span>•</span>
                                                                        <span className="font-mono">{apt.contact?.phoneNumber}</span>
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                    <button
                                                                        onClick={() => addToGoogleCalendar(apt)}
                                                                        className="p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded"
                                                                        title="Add to Google Calendar"
                                                                    >
                                                                        <i className="fab fa-google"></i>
                                                                    </button>
                                                                    <button
                                                                        onClick={() => setEditingAppointment(apt)}
                                                                        className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-gray-100 rounded"
                                                                        title="Edit"
                                                                    >
                                                                        <i className="fas fa-pen text-xs"></i>
                                                                    </button>
                                                                </div>
                                                            </div>

                                                            {apt.notes && (
                                                                <div className="mt-2.5 flex items-start gap-2 text-sm text-gray-500 bg-yellow-50/60 p-2 rounded border border-yellow-100/50">
                                                                    <i className="fas fa-sticky-note text-yellow-400 text-xs mt-0.5"></i>
                                                                    <span className="italic leading-snug text-xs">{apt.notes}</span>
                                                                </div>
                                                            )}

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
                                                                            View Call
                                                                        </button>
                                                                        {visibleCalls.has(apt.id) && (
                                                                            <div className="mt-2 space-y-1.5 animate-fadeIn">
                                                                                {((apt.contact as any)?.call_logs || [])
                                                                                    .filter((log: any) => {
                                                                                        if (!log.recording_url) return false;
                                                                                        const logEnd = new Date(log.created_at).getTime();
                                                                                        const logStart = logEnd - (log.duration * 1000);
                                                                                        const aptTime = new Date(apt.created_at).getTime();
                                                                                        return aptTime >= (logStart - 300000) && aptTime <= (logEnd + 60000);
                                                                                    })
                                                                                    .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                                                                                    .map((log: any) => (
                                                                                        <div key={log.id} className="flex flex-col gap-2">
                                                                                            <div className="flex items-center gap-2 bg-gray-50 p-1.5 rounded border border-gray-200">
                                                                                                <div className="text-[9px] font-bold text-gray-400 w-8 text-center leading-tight">
                                                                                                    {new Date(log.created_at).toLocaleString('default', { month: 'short' }).toUpperCase()}<br />
                                                                                                    {new Date(log.created_at).getDate()}
                                                                                                </div>
                                                                                                <audio controls src={log.recording_url} className="h-6 w-full max-w-[200px]" />
                                                                                                <span className="text-[10px] text-gray-500 font-mono ml-auto mr-1">
                                                                                                    {Math.floor(log.duration / 60)}:{(log.duration % 60).toString().padStart(2, '0')}
                                                                                                </span>
                                                                                            </div>
                                                                                            {log.transcript && (
                                                                                                <div className="p-4 bg-white border border-gray-200 rounded-md text-sm text-gray-800 leading-relaxed whitespace-pre-wrap shadow-sm font-sans animate-fadeIn">
                                                                                                    <div className="flex items-center gap-2 mb-2 border-b border-gray-100 pb-1">
                                                                                                        <i className="fas fa-align-left text-gray-400 text-xs"></i>
                                                                                                        <h5 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Transcript</h5>
                                                                                                    </div>
                                                                                                    {log.transcript}
                                                                                                </div>
                                                                                            )}
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
                            ))}
                        </div>
                    )
                ) : (
                    // CALENDAR VIEW
                    <div className="h-full flex flex-col">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-gray-800">
                                {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
                            </h3>
                            <div className="flex gap-2">
                                <button onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() - 1)))} className="p-2 hover:bg-gray-100 rounded">
                                    <i className="fas fa-chevron-left"></i>
                                </button>
                                <button onClick={() => setCurrentMonth(new Date())} className="text-xs font-bold uppercase px-3 hover:bg-gray-100 rounded">
                                    Today
                                </button>
                                <button onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() + 1)))} className="p-2 hover:bg-gray-100 rounded">
                                    <i className="fas fa-chevron-right"></i>
                                </button>
                            </div>
                        </div>

                        {/* Days Header */}
                        <div className="grid grid-cols-7 border-b border-gray-200 pb-2 mb-2 text-center text-xs font-bold text-gray-500 uppercase">
                            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => <div key={day}>{day}</div>)}
                        </div>

                        {/* Calendar Grid */}
                        <div className="flex-1 grid grid-cols-7 grid-rows-6 gap-2">
                            {(() => {
                                const days = [];
                                const year = currentMonth.getFullYear();
                                const month = currentMonth.getMonth();
                                const firstDay = new Date(year, month, 1);
                                const lastDay = new Date(year, month + 1, 0);
                                const daysInMonth = lastDay.getDate();
                                const startingDay = firstDay.getDay();

                                // Previous Month Padding
                                for (let i = 0; i < startingDay; i++) {
                                    days.push(<div key={`empty-${i}`} className="bg-gray-50/50 rounded-lg"></div>);
                                }

                                // Days
                                for (let day = 1; day <= daysInMonth; day++) {
                                    const dateStr = new Date(year, month, day).toDateString();
                                    const dayApts = appointments.filter(a => new Date(a.datetime).toDateString() === dateStr);
                                    const isToday = new Date().toDateString() === dateStr;

                                    days.push(
                                        <div key={day} className={`min-h-[100px] p-2 bg-white border border-gray-100 rounded-lg hover:border-indigo-200 transition-colors ${isToday ? 'border-indigo-500 ring-1 ring-indigo-500 bg-indigo-50/10' : ''}`}>
                                            <div className="flex justify-between items-start mb-1">
                                                <span className={`text-xs font-bold ${isToday ? 'bg-indigo-600 text-white w-6 h-6 flex items-center justify-center rounded-full' : 'text-gray-700'}`}>
                                                    {day}
                                                </span>
                                            </div>
                                            <div className="space-y-1">
                                                {dayApts.map(apt => (
                                                    <div
                                                        key={apt.id}
                                                        onClick={() => setEditingAppointment(apt)}
                                                        className="text-[10px] bg-indigo-50 text-indigo-700 px-1.5 py-1 rounded border border-indigo-100 truncate cursor-pointer hover:bg-indigo-100"
                                                        title={`${new Date(apt.datetime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} - ${apt.contact.address || 'Inspection'}`}
                                                    >
                                                        <span className="font-bold mr-1">{new Date(apt.datetime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}:</span>
                                                        {apt.contact.address ? apt.contact.address.split(',')[0] : 'Inspection'}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                }
                                return days;
                            })()}
                        </div>
                    </div>
                )}
            </div>
            {/* Edit Appointment Modal */}
            <Modal
                isOpen={!!editingAppointment}
                onClose={() => setEditingAppointment(null)}
                title="Edit Appointment"
                size="lg"
                footer={(
                    <div className="flex justify-between w-full">
                        <button
                            onClick={handleDeleteClick}
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
                )}
            >
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
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                title="Delete Appointment"
                size="sm"
                footer={(
                    <button
                        onClick={executeDeleteAppointment}
                        className="px-4 py-2 bg-red-600 text-white text-sm font-bold rounded hover:bg-red-700 w-full"
                    >
                        Yes, Delete Appointment
                    </button>
                )}
            >
                <div className="text-center py-4">
                    <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                        <i className="fas fa-trash-alt text-red-600 text-lg"></i>
                    </div>
                    <p className="text-sm text-gray-500">
                        Are you sure you want to delete this appointment?
                        This action cannot be undone.
                    </p>
                </div>
            </Modal>
        </div>
    );
};
