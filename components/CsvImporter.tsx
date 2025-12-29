
import React, { useRef, useState } from 'react';
import { parseCSV } from '../utils/csvParser';
import { Lead } from '../types';

interface CsvImporterProps {
    data: Partial<Lead>[];
    onImport: (leads: Partial<Lead>[]) => Promise<void>;
    onClose: () => void;
}

export const CsvImporter: React.FC<CsvImporterProps> = ({ data, onImport, onClose }) => {
    const [loading, setLoading] = useState(false);

    const handleImport = async () => {
        setLoading(true);
        try {
            await onImport(data);
            onClose();
        } catch (error) {
            alert("Failed to import leads.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center">
            <div className="bg-white w-[600px] shadow-2xl flex flex-col max-h-[80vh]">
                <div className="p-4 border-b border-[#e5e7eb] flex items-center justify-between">
                    <h3 className="font-bold text-[#111827] uppercase">Confirm Import</h3>
                    <button onClick={onClose}><i className="fas fa-times text-[#6b7280]"></i></button>
                </div>

                <div className="p-6 flex-1 overflow-y-auto">
                    <div>
                        <p className="text-xs text-[#6b7280] uppercase font-bold mb-3">Previewing {data.length} Prospects</p>
                        <div className="border border-[#e5e7eb] overflow-hidden">
                            <table className="w-full table-dense">
                                <thead>
                                    <tr className="bg-[#f8f9fb]">
                                        <th className="text-left p-2 text-[10px] text-[#6b7280] uppercase">Name</th>
                                        <th className="text-left p-2 text-[10px] text-[#6b7280] uppercase">Phone</th>
                                        <th className="text-left p-2 text-[10px] text-[#6b7280] uppercase">Address</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.slice(0, 5).map((row, i) => (
                                        <tr key={i} className="border-t border-[#e5e7eb]">
                                            <td className="p-2 text-[11px] font-bold text-[#111827]">{row.firstName} {row.lastName}</td>
                                            <td className="p-2 text-[11px] text-[#6b7280] font-mono">{row.phoneNumber}</td>
                                            <td className="p-2 text-[11px] text-[#6b7280]">{row.address}, {row.city}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {data.length > 5 && <p className="text-[10px] text-[#6b7280] mt-2 italic">...and {data.length - 5} more</p>}
                    </div>
                </div>

                <div className="p-4 border-t border-[#e5e7eb] bg-[#f8f9fb] flex justify-end gap-2">
                    <button onClick={onClose} className="px-4 py-2 border border-[#e5e7eb] text-[11px] font-bold uppercase text-[#111827]">Cancel</button>
                    <button
                        onClick={handleImport}
                        disabled={loading}
                        className="px-4 py-2 bg-[#4338ca] text-white text-[11px] font-bold uppercase disabled:opacity-50"
                    >
                        {loading ? 'Importing...' : 'Confirm Import'}
                    </button>
                </div>
            </div>
        </div>
    );
};
