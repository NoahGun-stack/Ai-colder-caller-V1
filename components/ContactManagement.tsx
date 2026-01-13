
import React, { useState } from 'react';
import { Contact, LeadStatus } from '../types';
import { supabase } from '../services/supabase';
import { contactsService } from '../services/contactsService';
import { CsvImporter } from './CsvImporter';
import { parseCSV } from '../utils/csvParser';
import { Modal } from './Modal';

interface ContactManagementProps {
    contacts: Contact[];
    setContacts: React.Dispatch<React.SetStateAction<Contact[]>>;
    onStartCall: (contact: Contact, campaign: 'residential' | 'b2b' | 'staffing') => void;
    onStartPowerDial?: (contacts: Contact[], autoPilot?: boolean, batchMode?: boolean, concurrency?: number, campaign?: 'residential' | 'b2b' | 'staffing') => void;
    activeCampaign?: 'residential' | 'b2b' | 'staffing';
}

const ContactManagement: React.FC<ContactManagementProps> = ({ contacts, setContacts, onStartCall, onStartPowerDial, activeCampaign = 'residential' }) => {
    const [searchTerm, setSearchTerm] = useState('');
    // Removed local callCampaign state
    const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [callLogs, setCallLogs] = useState<any[]>([]);
    const [showImporter, setShowImporter] = useState(false);
    const [importPreview, setImportPreview] = useState<Partial<Contact>[]>([]);
    const [selectTopN, setSelectTopN] = useState('');
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    // Modal States
    const [isAddContactModalOpen, setIsAddContactModalOpen] = useState(false);
    const [addContactForm, setAddContactForm] = useState({ firstName: '', lastName: '', phoneNumber: '', address: '' });

    const [isPowerDialModalOpen, setIsPowerDialModalOpen] = useState(false);
    const [powerDialConfig, setPowerDialConfig] = useState<{ contacts: Contact[], limit: number, campaign: 'residential' | 'b2b' | 'staffing' }>({
        contacts: [],
        limit: 5,
        campaign: activeCampaign || 'residential'
    });

    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    // Log Delete State
    const [isLogDeleteModalOpen, setIsLogDeleteModalOpen] = useState(false);
    const [logToDelete, setLogToDelete] = useState<string | null>(null);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target?.result as string;
            const parsed = parseCSV(text);
            if (parsed.length > 0) {
                setImportPreview(parsed);
                setShowImporter(true);
            } else {
                alert("Could not parse file. Ensure it is a valid CSV.");
            }
            // Reset input so same file can be selected again
            if (fileInputRef.current) fileInputRef.current.value = '';
        };
        reader.readAsText(file);
    };

    const handleBulkImport = async (newContacts: Partial<Contact>[]) => {
        console.log("Starting bulk import of", newContacts.length, "contacts");
        try {
            const result = await contactsService.addContactsBulk(newContacts as any);
            console.log("Import result:", result);
            setContacts(prev => [...result, ...prev]);
            alert(`Success! Imported ${result.length} contacts.`);
        } catch (error: any) {
            console.error(error);
            alert("Detailed Import Error: " + (error.message || JSON.stringify(error)));
        }
    };

    const handleToggleSelect = (id: string) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedIds(newSelected);
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedIds(new Set(filteredContacts.map(c => c.id)));
        } else {
            setSelectedIds(new Set());
        }
    };

    const handleBulkDelete = async () => {
        if (selectedIds.size === 0) return;
        setIsDeleteModalOpen(true);
    };

    const executeBulkDelete = async () => {
        try {
            await contactsService.deleteContactsBulk(Array.from(selectedIds));
            setContacts(prev => prev.filter(c => !selectedIds.has(c.id)));
            setSelectedIds(new Set());
            setSelectedContact(null);
            setIsDeleteModalOpen(false);
        } catch (error: any) {
            alert('Error deleting contacts: ' + (error.message || 'Unknown error'));
        }
    };

    const handleAddContact = () => {
        setAddContactForm({ firstName: '', lastName: '', phoneNumber: '', address: '' });
        setIsAddContactModalOpen(true);
    };

    const submitAddContact = async () => {
        if (!addContactForm.firstName || !addContactForm.phoneNumber) {
            alert("Name and Phone are required.");
            return;
        }

        const newContact: any = {
            firstName: addContactForm.firstName,
            lastName: addContactForm.lastName || '',
            phoneNumber: addContactForm.phoneNumber,
            address: addContactForm.address || 'No Address',
            city: 'Unknown',
            state: 'TX',
            zip: '',
            status: LeadStatus.NOT_CALLED,
            tcpaAcknowledged: true,
            notes: 'Added via Quick Add'
        };

        try {
            const created = await contactsService.addContact(newContact);
            setContacts(prev => [created, ...prev]);
            setIsAddContactModalOpen(false);
        } catch (error) {
            alert("Failed to add contact. Check console.");
        }
    };

    const initiatePowerDial = () => {
        const selectedContactsRaw = contacts.filter(c => selectedIds.has(c.id));

        // Deduplicate by Phone Number AND Name (keep first occurrence)
        const uniqueKeys = new Set<string>();
        const selectedContacts: Contact[] = [];

        selectedContactsRaw.forEach(contact => {
            const normalizedPhone = contact.phoneNumber.replace(/\D/g, '');
            const normalizedName = `${contact.firstName.toLowerCase().trim()}|${contact.lastName.toLowerCase().trim()}`;

            // Check if either phone OR name has been seen
            if (!uniqueKeys.has(normalizedPhone) && !uniqueKeys.has(normalizedName)) {
                uniqueKeys.add(normalizedPhone);
                uniqueKeys.add(normalizedName);
                selectedContacts.push(contact);
            }
        });

        if (selectedContacts.length !== selectedContactsRaw.length) {
            console.log(`Deduplicated ${selectedContactsRaw.length - selectedContacts.length} contacts with duplicate numbers.`);
        }

        if (selectedContacts.length > 1) {
            setPowerDialConfig({ contacts: selectedContacts, limit: 5, campaign: activeCampaign || 'residential' });
            setIsPowerDialModalOpen(true);
        } else {
            onStartPowerDial(selectedContacts, false, false, 1, activeCampaign);
        }
    };

    const [filterStatus, setFilterStatus] = useState<'all' | 'contacted' | 'uncontacted'>('all');

    const filteredContacts = contacts.filter(c => {
        const matchesSearch = c.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.phoneNumber.includes(searchTerm);

        if (!matchesSearch) return false;

        // Exclude booked appointments from the main contact list
        if (c.status === LeadStatus.APPOINTMENT_BOOKED) return false;

        const isContacted = (c.totalCalls || 0) > 0;

        if (filterStatus === 'contacted') return isContacted;
        if (filterStatus === 'uncontacted') return !isContacted;

        return true;
    });

    const hasHadConversation = (status: LeadStatus): boolean => {
        return [
            LeadStatus.CONNECTED,
            LeadStatus.NOT_INTERESTED,
            LeadStatus.CALL_BACK_LATER,
            LeadStatus.APPOINTMENT_BOOKED,
            LeadStatus.DO_NOT_CALL
        ].includes(status);
    };

    return (
        <div className="h-full flex flex-row overflow-hidden">
            {/* Left Area: Table List */}
            <div className={`flex-1 flex flex-col min-w-0 transition-all ${selectedContact ? 'border-r border-[#e5e7eb]' : ''}`}>
                <div className="p-4 border-b border-[#e5e7eb] flex items-center justify-between bg-white">
                    <div className="flex items-center gap-4">
                        <div className="relative w-64">
                            <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-[#6b7280] text-[11px]"></i>
                            <input
                                type="text"
                                placeholder="Search contacts..."
                                className="w-full pl-8 pr-4 py-2 border border-[#e5e7eb] text-[12px] outline-none focus:border-[#4338ca] transition-all"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <select
                            className="border border-[#e5e7eb] text-[11px] font-bold uppercase text-[#111827] px-2 py-2 outline-none"
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value as any)}
                        >
                            <option value="all">All Contacts</option>
                            <option value="contacted">Contacted</option>
                            <option value="uncontacted">Uncontacted</option>
                        </select>
                        <span className="text-[11px] font-bold text-[#6b7280] uppercase tracking-wider bg-[#f3f4f6] px-2 py-1 rounded-sm">
                            {filteredContacts.length} Visible
                        </span>

                        {/* Bulk Select Input */}
                        <div className="flex items-center ml-4">
                            <div className="flex items-center border border-[#e5e7eb] bg-white rounded-sm h-[34px] overflow-hidden group hover:border-[#4338ca] transition-colors">
                                <span className="bg-[#f9fafb] text-[10px] font-bold text-[#6b7280] uppercase px-2 h-full flex items-center border-r border-[#e5e7eb]">
                                    Select Top
                                </span>
                                <input
                                    type="text"
                                    pattern="[0-9]*"
                                    placeholder="#"
                                    value={selectTopN}
                                    onChange={(e) => {
                                        const val = e.target.value.replace(/\D/g, '');
                                        if (val === '' || (parseInt(val) > 0 && parseInt(val) <= filteredContacts.length)) {
                                            setSelectTopN(val);
                                        }
                                    }}
                                    className="w-12 px-2 text-[11px] font-bold text-center outline-none h-full text-[#111827] placeholder-gray-300"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && selectTopN) {
                                            const val = parseInt(selectTopN);
                                            if (val > 0) {
                                                const toSelect = filteredContacts.slice(0, val).map(c => c.id);
                                                setSelectedIds(new Set(toSelect));
                                                setSelectTopN('');
                                                (e.target as HTMLInputElement).blur();
                                            }
                                        }
                                    }}
                                />
                                {selectTopN && (
                                    <button
                                        onClick={() => {
                                            const val = parseInt(selectTopN);
                                            if (val > 0) {
                                                const toSelect = filteredContacts.slice(0, val).map(c => c.id);
                                                setSelectedIds(new Set(toSelect));
                                                setSelectTopN('');
                                            }
                                        }}
                                        className="h-full px-2 text-indigo-600 hover:bg-indigo-50 border-l border-[#e5e7eb]"
                                    >
                                        <i className="fas fa-check text-[10px]"></i>
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept=".csv"
                            onChange={handleFileSelect}
                        />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="px-3 py-2 border border-[#e5e7eb] text-[11px] font-bold uppercase text-[#111827] hover:bg-[#f8f9fb]"
                        >
                            Import CSV
                        </button>
                        {selectedIds.size > 0 && (
                            <>
                                <button
                                    onClick={initiatePowerDial}
                                    className="px-3 py-2 bg-indigo-600 text-white text-[11px] font-bold uppercase hover:bg-indigo-700 shadow-sm border border-transparent animate-pulse"
                                >
                                    <i className="fas fa-play mr-2 text-[10px]"></i>
                                    {selectedIds.size > 1 ? `Batch Dial (${selectedIds.size})` : 'Power Dial'}
                                </button>

                                <button
                                    onClick={handleBulkDelete}
                                    className="px-3 py-2 border border-red-200 text-red-600 bg-red-50 text-[11px] font-bold uppercase hover:bg-red-100"
                                >
                                    Delete ({selectedIds.size})
                                </button>
                            </>
                        )}

                        <button
                            onClick={handleAddContact}
                            className="px-3 py-2 bg-[#4338ca] text-white text-[11px] font-bold uppercase hover:bg-[#3730a3] transition-colors"
                        >
                            Add Contact
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                    <table className="w-full table-dense">
                        <thead>
                            <tr className="bg-[#f8f9fb]">
                                <th className="w-8 px-4 text-left">
                                    <input
                                        type="checkbox"
                                        checked={filteredContacts.length > 0 && selectedIds.size === filteredContacts.length}
                                        ref={input => {
                                            if (input) {
                                                input.indeterminate = selectedIds.size > 0 && selectedIds.size < filteredContacts.length;
                                            }
                                        }}
                                        onChange={handleSelectAll}
                                    />
                                </th>
                                <th className="px-4 py-3 text-[11px] font-bold text-[#6b7280] uppercase tracking-wider text-left">Name</th>
                                <th className="px-4 py-3 text-[11px] font-bold text-[#6b7280] uppercase tracking-wider text-left">Phone Number</th>
                                <th className="px-4 py-3 text-[11px] font-bold text-[#6b7280] uppercase tracking-wider text-left">Location</th>
                                <th className="px-4 py-3 text-[11px] font-bold text-[#6b7280] uppercase tracking-wider text-left">Status</th>
                                <th className="px-4 py-3 text-[11px] font-bold text-[#6b7280] uppercase tracking-wider text-left">Conversation</th>
                                <th className="px-4 py-3 text-[11px] font-bold text-[#6b7280] uppercase tracking-wider text-left">Attempts</th>
                                <th className="px-4 py-3 text-[11px] font-bold text-[#6b7280] uppercase tracking-wider text-left">Last Contact</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredContacts.map((contact) => (
                                <tr
                                    key={contact.id}
                                    className={`hover:bg-[#f8f9fb] transition-colors border-b border-[#f3f4f6] ${selectedContact?.id === contact.id ? 'bg-[#f5f7ff]' : ''}`}
                                >
                                    <td className="w-8 px-4 py-3">
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.has(contact.id)}
                                            onClick={e => e.stopPropagation()}
                                            onChange={() => handleToggleSelect(contact.id)}
                                        />
                                    </td>
                                    <td
                                        className="px-4 py-3 font-bold text-[#111827] text-[12px] cursor-pointer hover:text-indigo-600 transition-colors"
                                        onClick={() => {
                                            setSelectedContact(contact);
                                            contactsService.getCallLogs(contact.id).then(setCallLogs);
                                        }}
                                    >
                                        {contact.firstName} {contact.lastName}
                                        {contact.status === LeadStatus.APPOINTMENT_BOOKED ? (
                                            <span className="ml-2 px-1.5 py-0.5 bg-green-50 text-green-700 text-[9px] font-bold uppercase rounded-sm border border-green-200">Booked</span>
                                        ) : (contact.totalCalls || 0) === 0 ? (
                                            <span className="ml-2 px-1.5 py-0.5 bg-blue-50 text-blue-600 text-[9px] font-bold uppercase rounded-sm border border-blue-100">Uncontacted</span>
                                        ) : (
                                            <span className="ml-2 px-1.5 py-0.5 bg-gray-50 text-gray-500 text-[9px] font-bold uppercase rounded-sm border border-gray-100">Contacted</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-[#6b7280] font-mono text-[11px]">{contact.phoneNumber}</td>
                                    <td className="px-4 py-3 text-[#6b7280] text-[11px] truncate max-w-[200px]">{contact.address}, {contact.city}</td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-0.5 border text-[10px] font-bold uppercase rounded-sm ${contact.status === LeadStatus.APPOINTMENT_BOOKED ? 'border-green-200 text-green-700 bg-green-50' : 'border-[#e5e7eb] text-[#6b7280]'
                                            }`}>
                                            {contact.status}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        {hasHadConversation(contact.status) ? (
                                            <span className="inline-flex items-center justify-center w-5 h-5 bg-green-100 text-green-600 rounded-full">
                                                <i className="fas fa-check text-[10px]"></i>
                                            </span>
                                        ) : (
                                            <span className="text-gray-300 text-[10px]">-</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 font-bold text-[#111827] text-[12px] pl-8">{contact.totalCalls || 0}</td>
                                    <td className="px-4 py-3 text-[#6b7280] text-[11px]">
                                        {contact.lastContactedAt ? new Date(contact.lastContactedAt).toLocaleDateString() : '-'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {contacts.length === 0 && (
                        <div className="flex flex-col items-center justify-center p-12 text-center">
                            <i className="fas fa-address-book text-3xl text-[#d1d5db] mb-3"></i>
                            <p className="text-[12px] font-bold text-[#111827]">No contacts found</p>
                            <p className="text-[11px] text-[#6b7280]">Import a CSV or add a contact to get started.</p>
                        </div>
                    )}
                </div>
            </div>

            {
                showImporter && (
                    <CsvImporter
                        data={importPreview}
                        onImport={handleBulkImport}
                        onClose={() => setShowImporter(false)}
                    />
                )
            }

            {/* Right Area: Context Detail Panel (Persistent) */}
            {
                selectedContact && (
                    <div className="w-[380px] shrink-0 flex flex-col bg-white overflow-hidden shadow-2xl border-l border-[#e5e7eb]">
                        <div className="p-5 border-b border-[#e5e7eb] flex items-center justify-between bg-[#f8f9fb]">
                            <h3 className="text-sm font-bold text-[#111827] uppercase tracking-wide">Contact Context</h3>
                            <button onClick={() => setSelectedContact(null)} className="text-[#6b7280] hover:text-[#111827]"><i className="fas fa-times"></i></button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-8">
                            <section>
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="w-12 h-12 bg-[#f5f7ff] border border-[#e0e7ff] text-[#4338ca] flex items-center justify-center font-bold text-lg rounded-full">
                                        {selectedContact.firstName[0]}{selectedContact.lastName[0]}
                                    </div>
                                    <div>
                                        <h4 className="text-base font-bold text-[#111827]">{selectedContact.firstName} {selectedContact.lastName}</h4>
                                        <p className="text-xs text-[#6b7280] font-bold uppercase tracking-wider">{selectedContact.phoneNumber}</p>
                                    </div>
                                </div>

                                {/* Campaign Selector Removed - Controlled globally via Settings */}

                                <div className="flex gap-2">
                                    <button
                                        onClick={() => onStartCall(selectedContact, activeCampaign)}
                                        className="flex-1 py-2 bg-[#4338ca] text-white text-[11px] font-bold uppercase tracking-wider shadow-sm hover:bg-[#3730a3] transition-colors rounded-sm"
                                    >
                                        Initiate Outbound
                                    </button>
                                </div>
                            </section>

                            <section className="space-y-4">
                                <h5 className="text-[10px] font-black text-[#6b7280] uppercase tracking-widest border-b border-[#f3f4f6] pb-1">Operational Data</h5>
                                <div className="grid grid-cols-2 gap-y-4 text-[11px]">
                                    <div>
                                        <p className="text-[#6b7280] mb-1">Status</p>
                                        <p className="font-bold text-[#111827] uppercase">{selectedContact.status}</p>
                                    </div>
                                    <div>
                                        <p className="text-[#6b7280] mb-1">Source</p>
                                        <p className="font-bold text-[#111827] uppercase">CSV Import</p>
                                    </div>
                                    <div className="col-span-2">
                                        <p className="text-[#6b7280] mb-1">Primary Location</p>
                                        <p className="font-bold text-[#111827] uppercase">{selectedContact.address}</p>
                                        <p className="text-[#6b7280] text-[10px]">{selectedContact.city}, {selectedContact.state}</p>
                                    </div>
                                </div>
                            </section>

                            <section className="space-y-4">
                                <h5 className="text-[10px] font-black text-[#6b7280] uppercase tracking-widest border-b border-[#f3f4f6] pb-1">Call Ledger</h5>
                                <div className="space-y-3">
                                    {callLogs.length === 0 ? (
                                        <p className="text-[11px] text-[#6b7280] italic py-2">No call history available.</p>
                                    ) : (
                                        callLogs.map((log) => (
                                            <div key={log.id} className="flex items-center justify-between p-3 border border-[#f3f4f6] bg-[#f8f9fb] rounded-sm group hover:border-red-100 transition-colors">
                                                <div>
                                                    <p className="text-[11px] font-bold text-[#111827]">
                                                        {log.outcome === 'Connected' ? 'Connected Call' : 'Outbound Attempt'}
                                                    </p>
                                                    <p className="text-[10px] text-[#6b7280]">
                                                        {new Date(log.created_at).toLocaleDateString()} at {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <div className="text-right">
                                                        <span className={`block text-[10px] font-bold uppercase ${log.outcome === 'Connected' ? 'text-green-600' : 'text-[#6b7280]'}`}>
                                                            {log.outcome || 'Unknown'}
                                                        </span>
                                                        {log.duration > 0 && (
                                                            <span className="text-[9px] text-[#9ca3af] font-mono">{Math.floor(log.duration / 60)}m {log.duration % 60}s</span>
                                                        )}
                                                    </div>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setLogToDelete(log.id);
                                                            setIsLogDeleteModalOpen(true);
                                                        }}
                                                        className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-all ml-2"
                                                        title="Delete Log"
                                                    >
                                                        <i className="fas fa-trash-alt text-xs"></i>
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </section>
                        </div>
                    </div>
                )
            }
            {/* Add Contact Modal */}
            <Modal
                isOpen={isAddContactModalOpen}
                onClose={() => setIsAddContactModalOpen(false)}
                title="Add New Contact"
                footer={(
                    <button
                        onClick={submitAddContact}
                        className="px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded hover:bg-indigo-700"
                    >
                        Save Contact
                    </button>
                )}
            >
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">First Name</label>
                            <input
                                type="text"
                                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                                value={addContactForm.firstName}
                                onChange={e => setAddContactForm({ ...addContactForm, firstName: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Last Name</label>
                            <input
                                type="text"
                                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                                value={addContactForm.lastName}
                                onChange={e => setAddContactForm({ ...addContactForm, lastName: e.target.value })}
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Phone Number</label>
                        <input
                            type="tel"
                            className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                            value={addContactForm.phoneNumber}
                            onChange={e => setAddContactForm({ ...addContactForm, phoneNumber: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Address</label>
                        <input
                            type="text"
                            className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                            value={addContactForm.address}
                            onChange={e => setAddContactForm({ ...addContactForm, address: e.target.value })}
                        />
                    </div>
                </div>
            </Modal>

            {/* Power Dial Modal */}
            <Modal
                isOpen={isPowerDialModalOpen}
                onClose={() => setIsPowerDialModalOpen(false)}
                title="Start Power Dial Session"
                size="sm"
                footer={(
                    <button
                        onClick={() => {
                            onStartPowerDial?.(powerDialConfig.contacts, false, true, powerDialConfig.limit, powerDialConfig.campaign);
                            setIsPowerDialModalOpen(false);
                        }}
                        className="px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded hover:bg-indigo-700 w-full"
                    >
                        Start Dialing
                    </button>
                )}
            >
                <p className="text-sm text-gray-600 mb-4">
                    You are about to start a parallel dialing session for <strong className="text-gray-900">{powerDialConfig.contacts.length} contacts</strong>.
                </p>
                <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Max Concurrent Calls</label>
                    <input
                        type="number"
                        min="1"
                        max="10"
                        className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                        value={powerDialConfig.limit}
                        onChange={e => setPowerDialConfig({ ...powerDialConfig, limit: parseInt(e.target.value) || 1 })}
                    />
                    <p className="text-[10px] text-gray-500 mt-1">Recommended: 3-5 for best results.</p>
                </div>

                <div className="mt-4">
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Select Campaign / Agent</label>
                    <div className="grid grid-cols-1 gap-2">
                        {[
                            { id: 'residential', label: 'Residential (Jon - Inspection)', icon: 'fa-home' },
                            { id: 'b2b', label: 'B2B Sales (Alex - Demo)', icon: 'fa-briefcase' },
                            { id: 'staffing', label: 'Staffing (Sarah - Recruitment)', icon: 'fa-users' }
                        ].map((camp) => (
                            <button
                                key={camp.id}
                                onClick={() => setPowerDialConfig({ ...powerDialConfig, campaign: camp.id as any })}
                                className={`flex items-center gap-3 px-3 py-2 border rounded-sm transition-all text-left ${powerDialConfig.campaign === camp.id
                                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                                    : 'border-gray-200 hover:border-gray-300 text-gray-700'
                                    }`}
                            >
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${powerDialConfig.campaign === camp.id ? 'bg-indigo-200' : 'bg-gray-100'
                                    }`}>
                                    <i className={`fas ${camp.icon} text-xs`}></i>
                                </div>
                                <div>
                                    <p className="text-[11px] font-bold uppercase">{camp.label}</p>
                                </div>
                                {powerDialConfig.campaign === camp.id && (
                                    <i className="fas fa-check ml-auto text-indigo-600 text-xs"></i>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                title="Delete Contacts"
                size="sm"
                footer={(
                    <button
                        onClick={executeBulkDelete}
                        className="px-4 py-2 bg-red-600 text-white text-sm font-bold rounded hover:bg-red-700 w-full"
                    >
                        Yes, Delete {selectedIds.size} Contacts
                    </button>
                )}
            >
                <div className="text-center py-4">
                    <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                        <i className="fas fa-trash-alt text-red-600 text-lg"></i>
                    </div>
                    <p className="text-sm text-gray-500">
                        Are you sure you want to delete <strong className="text-gray-900">{selectedIds.size} contacts</strong>?
                        This action cannot be undone.
                    </p>
                </div>
            </Modal>

            {/* Log Delete Modal */}
            <Modal
                isOpen={isLogDeleteModalOpen}
                onClose={() => {
                    setIsLogDeleteModalOpen(false);
                    setLogToDelete(null);
                }}
                title="Delete Call Log"
                footer={
                    <>
                        <button
                            onClick={() => {
                                setIsLogDeleteModalOpen(false);
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
                                    setCallLogs(prev => prev.filter(l => l.id !== logToDelete));
                                    setIsLogDeleteModalOpen(false);
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

export default ContactManagement;
