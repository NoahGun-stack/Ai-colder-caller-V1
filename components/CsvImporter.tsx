
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
            <div className="bg-[#080808] w-[600px] shadow-2xl flex flex-col max-h-[80vh]">
                <div className="p-4 border-b border-[#404040] flex items-center justify-between">
                    <h3 className="font-bold text-white uppercase">Confirm Import</h3>
                    <button onClick={onClose}><i className="fas fa-times text-[#d1d5db]"></i></button>
                </div>

                <div className="p-6 flex-1 overflow-y-auto">
                    <div>
                        <p className="text-xs text-[#d1d5db] uppercase font-bold mb-3">Previewing {data.length} Prospects</p>
                        <div className="border border-[#404040] overflow-hidden">
                            <table className="w-full table-dense">
                                <thead>
                                    <tr className="bg-[#1a1a1a]">
                                        <th className="text-left p-2 text-[10px] text-[#d1d5db] uppercase">Name</th>
                                        <th className="text-left p-2 text-[10px] text-[#d1d5db] uppercase">Phone</th>
                                        <th className="text-left p-2 text-[10px] text-[#d1d5db] uppercase">Address</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.slice(0, 5).map((row, i) => (
                                        <tr key={i} className="border-t border-[#404040]">
                                            <td className="p-2 text-[11px] font-bold text-white">{row.firstName} {row.lastName}</td>
                                            <td className="p-2 text-[11px] text-[#d1d5db] font-mono">{row.phoneNumber}</td>
                                            <td className="p-2 text-[11px] text-[#d1d5db]">{row.address}, {row.city}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {data.length > 5 && <p className="text-[10px] text-[#d1d5db] mt-2 italic">...and {data.length - 5} more</p>}
                    </div>
                </div>

                <div className="p-4 border-t border-[#404040] bg-[#1a1a1a] flex justify-end gap-2">
                    <button onClick={onClose} className="px-4 py-2 border border-[#404040] text-[11px] font-bold uppercase text-white">Cancel</button>
                    <button
                        onClick={handleImport}
                        disabled={loading}
                        className="px-4 py-2 bg-[#d4a843] text-white text-[11px] font-bold uppercase disabled:opacity-50"
                    >
                        {loading ? 'Importing...' : 'Confirm Import'}
                    </button>
                </div>
            </div>
        </div>
    );
};
