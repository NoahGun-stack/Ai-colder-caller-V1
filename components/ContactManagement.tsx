
import React, { useState } from 'react';
import { Contact, LeadStatus } from '../types';
import { contactsService } from '../services/contactsService';
import { CsvImporter } from './CsvImporter';
import { parseCSV } from '../utils/csvParser';

interface ContactManagementProps {
    contacts: Contact[];
    setContacts: React.Dispatch<React.SetStateAction<Contact[]>>;
    onStartCall: (contact: Contact) => void;
}

const ContactManagement: React.FC<ContactManagementProps> = ({ contacts, setContacts, onStartCall }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
    const [showImporter, setShowImporter] = useState(false);
    const [importPreview, setImportPreview] = useState<Partial<Contact>[]>([]);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

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

    const handleAddContact = async () => {
        const name = window.prompt("Enter contact name (First Last):");
        if (!name) return;

        const phone = window.prompt("Enter phone number:");
        if (!phone) return;

        const [firstName, ...lastNameParts] = name.split(' ');
        const lastName = lastNameParts.join(' ');

        const newContact: any = {
            firstName: firstName || 'Unknown',
            lastName: lastName || 'Unknown',
            phoneNumber: phone,
            address: '123 Main St (Placeholder)',
            city: 'Austin',
            state: 'TX',
            zip: '78701',
            status: LeadStatus.NOT_CALLED,
            tcpaAcknowledged: true,
            notes: 'Added via Quick Add'
        };

        try {
            const created = await contactsService.addContact(newContact);
            setContacts(prev => [created, ...prev]);
        } catch (error) {
            alert("Failed to add contact. Check console.");
        }
    };

    const filteredContacts = contacts.filter(c =>
        c.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.phoneNumber.includes(searchTerm)
    );

    return (
        <div className="h-full flex flex-row overflow-hidden">
            {/* Left Area: Table List */}
            <div className={`flex-1 flex flex-col min-w-0 transition-all ${selectedContact ? 'border-r border-[#e5e7eb]' : ''}`}>
                <div className="p-4 border-b border-[#e5e7eb] flex items-center justify-between bg-white">
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
                                <th className="w-8 px-4 text-left"><input type="checkbox" /></th>
                                <th className="px-4 py-3 text-[11px] font-bold text-[#6b7280] uppercase tracking-wider text-left">Name</th>
                                <th className="px-4 py-3 text-[11px] font-bold text-[#6b7280] uppercase tracking-wider text-left">Phone Number</th>
                                <th className="px-4 py-3 text-[11px] font-bold text-[#6b7280] uppercase tracking-wider text-left">Campaign</th>
                                <th className="px-4 py-3 text-[11px] font-bold text-[#6b7280] uppercase tracking-wider text-left">Status</th>
                                <th className="px-4 py-3 text-[11px] font-bold text-[#6b7280] uppercase tracking-wider text-left">Last Attempt</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredContacts.map((contact) => (
                                <tr
                                    key={contact.id}
                                    className={`cursor-pointer hover:bg-[#f8f9fb] transition-colors border-b border-[#f3f4f6] ${selectedContact?.id === contact.id ? 'bg-[#f5f7ff]' : ''}`}
                                    onClick={() => setSelectedContact(contact)}
                                >
                                    <td className="w-8 px-4 py-3"><input type="checkbox" onClick={e => e.stopPropagation()} /></td>
                                    <td className="px-4 py-3 font-bold text-[#111827] text-[12px]">{contact.firstName} {contact.lastName}</td>
                                    <td className="px-4 py-3 text-[#6b7280] font-mono text-[11px]">{contact.phoneNumber}</td>
                                    <td className="px-4 py-3 text-[#6b7280] uppercase text-[10px] font-bold">Standard Outreach</td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-0.5 border text-[10px] font-bold uppercase rounded-sm ${contact.status === LeadStatus.APPOINTMENT_BOOKED ? 'border-green-200 text-green-700 bg-green-50' : 'border-[#e5e7eb] text-[#6b7280]'
                                            }`}>
                                            {contact.status}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-[#6b7280] text-[11px]">10 Oct, 14:22</td>
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

            {showImporter && (
                <CsvImporter
                    data={importPreview}
                    onImport={handleBulkImport}
                    onClose={() => setShowImporter(false)}
                />
            )}

            {/* Right Area: Context Detail Panel (Persistent) */}
            {selectedContact && (
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
                            <div className="flex gap-2">
                                <button
                                    onClick={() => onStartCall(selectedContact)}
                                    className="flex-1 py-2 bg-[#4338ca] text-white text-[11px] font-bold uppercase tracking-wider shadow-sm hover:bg-[#3730a3] transition-colors rounded-sm"
                                >
                                    Initiate Outbound
                                </button>
                                <button className="px-4 py-2 border border-[#e5e7eb] text-[#111827] text-[11px] font-bold uppercase hover:bg-[#f8f9fb] rounded-sm">Message</button>
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
                                {[
                                    { date: '12 Oct', time: '14:20', type: 'Outbound', status: 'Connected' },
                                    { date: '11 Oct', time: '10:15', type: 'Outbound', status: 'No-Answer' },
                                ].map((log, i) => (
                                    <div key={i} className="flex items-center justify-between p-3 border border-[#f3f4f6] bg-[#f8f9fb] rounded-sm">
                                        <div>
                                            <p className="text-[11px] font-bold text-[#111827]">{log.type} Call</p>
                                            <p className="text-[10px] text-[#6b7280]">{log.date} at {log.time}</p>
                                        </div>
                                        <span className="text-[10px] font-bold text-[#6b7280] uppercase">{log.status}</span>
                                    </div>
                                ))}
                            </div>
                        </section>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ContactManagement;
