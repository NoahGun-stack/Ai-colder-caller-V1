import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { UserProfile } from '../types';

interface AdminDashboardProps {
    currentUser: UserProfile | null;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ currentUser }) => {
    const [profiles, setProfiles] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchProfiles();
    }, []);

    const fetchProfiles = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .order('email');

            if (error) throw error;
            setProfiles(data || []);
        } catch (err: any) {
            console.error('Error fetching profiles:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const updateProfile = async (id: string, updates: Partial<UserProfile>) => {
        try {
            const { error } = await supabase
                .from('profiles')
                .update(updates)
                .eq('id', id);

            if (error) throw error;

            // Optimistic update
            setProfiles(profiles.map(p => p.id === id ? { ...p, ...updates } : p));
        } catch (err: any) {
            console.error('Error updating profile:', err);
            alert('Failed to update profile: ' + err.message);
        }
    };

    if (!currentUser || currentUser.role !== 'admin') {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center p-8 bg-red-50 border border-red-200 rounded-lg">
                    <h3 className="text-lg font-bold text-red-800 uppercase">Access Denied</h3>
                    <p className="text-sm text-red-600 mt-2">You do not have administrative privileges.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full bg-[#f8f9fb] p-8 overflow-y-auto animate-fadeIn">
            <header className="mb-8">
                <h2 className="text-2xl font-bold text-[#111827] uppercase tracking-tight">User Administration</h2>
                <p className="text-sm text-[#6b7280] font-bold uppercase tracking-widest mt-1">Manage Account Roles and AI Agent Assignments</p>
            </header>

            {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded text-sm">
                    {error}
                </div>
            )}

            <div className="bg-white border border-[#e5e7eb] shadow-sm rounded-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-[#f3f4f6] border-b border-[#e5e7eb]">
                                <th className="px-6 py-4 text-[11px] font-black text-[#6b7280] uppercase tracking-widest">User Email</th>
                                <th className="px-6 py-4 text-[11px] font-black text-[#6b7280] uppercase tracking-widest">System Role</th>
                                <th className="px-6 py-4 text-[11px] font-black text-[#6b7280] uppercase tracking-widest">Assigned Agent (Campaign)</th>
                                <th className="px-6 py-4 text-[11px] font-black text-[#6b7280] uppercase tracking-widest">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#e5e7eb]">
                            {loading ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-8 text-center text-sm text-gray-500">Loading users...</td>
                                </tr>
                            ) : profiles.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-8 text-center text-sm text-gray-500">No users found.</td>
                                </tr>
                            ) : (
                                profiles.map((profile) => (
                                    <tr key={profile.id} className="hover:bg-[#f9fafb] transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-bold text-[#111827]">{profile.email}</div>
                                            <div className="text-[10px] text-[#9ca3af] font-mono">{profile.id}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <select
                                                value={profile.role}
                                                onChange={(e) => updateProfile(profile.id, { role: e.target.value as 'admin' | 'user' })}
                                                className={`text-[11px] font-bold uppercase px-2 py-1 rounded border outline-none cursor-pointer ${profile.role === 'admin'
                                                    ? 'bg-purple-100 text-purple-800 border-purple-200'
                                                    : 'bg-gray-100 text-gray-700 border-gray-200'
                                                    }`}
                                            >
                                                <option value="user">Standard User</option>
                                                <option value="admin">Administrator</option>
                                            </select>
                                        </td>
                                        <td className="px-6 py-4">
                                            <select
                                                value={profile.assigned_campaign}
                                                onChange={(e) => updateProfile(profile.id, { assigned_campaign: e.target.value as 'residential' | 'b2b' | 'staffing' })}
                                                className={`text-[11px] font-bold uppercase px-2 py-1 rounded border outline-none cursor-pointer w-full max-w-[200px] ${profile.assigned_campaign === 'b2b'
                                                    ? 'bg-indigo-100 text-indigo-800 border-indigo-200'
                                                    : profile.assigned_campaign === 'staffing'
                                                        ? 'bg-orange-100 text-orange-800 border-orange-200'
                                                        : 'bg-green-100 text-green-800 border-green-200'
                                                    }`}
                                            >
                                                <option value="residential">Residential (Jon)</option>
                                                <option value="b2b">B2B Sales (Alex)</option>
                                                <option value="staffing">Staffing (Sarah)</option>
                                            </select>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                Active
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
