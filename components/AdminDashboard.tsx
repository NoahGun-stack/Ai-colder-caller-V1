import React, { useEffect, useState } from 'react';
import { CampaignConfigurator } from './CampaignConfigurator';
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

    const deleteUser = async (id: string) => {
        if (!window.confirm("Are you sure you want to delete this user? This action cannot be undone.")) return;

        try {
            const { error } = await supabase.rpc('admin_delete_user', { target_user_id: id });

            if (error) throw error;

            setProfiles(profiles.filter(p => p.id !== id));
        } catch (err: any) {
            console.error('Error deleting profile:', err);
            alert('Failed to delete profile: ' + err.message);
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
        <div className="h-full bg-[#1a1a1a] p-8 overflow-y-auto animate-fadeIn">
            <header className="mb-8">
                <h2 className="text-2xl font-bold text-white uppercase tracking-tight">User Administration</h2>
                <p className="text-sm text-[#d1d5db] font-bold uppercase tracking-widest mt-1">Manage Account Roles and AI Agent Assignments</p>
            </header>

            {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded text-sm">
                    {error}
                </div>
            )}

            <div className="bg-[#080808] border border-[#404040] shadow-sm rounded-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-[#262626] border-b border-[#404040]">
                                <th className="px-6 py-4 text-[11px] font-black text-[#d1d5db] uppercase tracking-widest">User Email</th>
                                <th className="px-6 py-4 text-[11px] font-black text-[#d1d5db] uppercase tracking-widest">System Role</th>
                                <th className="px-6 py-4 text-[11px] font-black text-[#d1d5db] uppercase tracking-widest">Assigned Agent (Campaign)</th>
                                <th className="px-6 py-4 text-[11px] font-black text-[#d1d5db] uppercase tracking-widest">Status</th>
                                <th className="px-6 py-4 text-[11px] font-black text-[#d1d5db] uppercase tracking-widest">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#e5e7eb]">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-sm text-[#d1d5db]">Loading users...</td>
                                </tr>
                            ) : profiles.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-sm text-[#d1d5db]">No users found.</td>
                                </tr>
                            ) : (
                                profiles.map((profile) => (
                                    <tr key={profile.id} className="hover:bg-[#262626] transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-bold text-white">{profile.email}</div>
                                            <div className="text-[10px] text-[#e5e7eb] font-mono">{profile.id}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <select
                                                value={profile.role}
                                                onChange={(e) => updateProfile(profile.id, { role: e.target.value as 'admin' | 'user' })}
                                                className={`text-[11px] font-bold uppercase px-2 py-1 rounded border outline-none cursor-pointer ${profile.role === 'admin'
                                                    ? 'bg-[#1a1a1a] text-[#c084fc] border-[#525252]'
                                                    : 'bg-[#262626] text-gray-700 border-[#404040]'
                                                    }`}
                                            >
                                                <option value="user">Standard User</option>
                                                <option value="admin">Administrator</option>
                                            </select>
                                        </td>
                                        <td className="px-6 py-4">
                                            <select
                                                value={profile.assigned_campaign}
                                                onChange={(e) => updateProfile(profile.id, { assigned_campaign: e.target.value as 'residential' | 'b2b' | 'staffing' | 'real_estate' | 'realtor_ai' })}
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
                                                <option value="real_estate">Home Buyer (Mike)</option>
                                                <option value="realtor_ai">Realtor AI (Josh)</option>
                                            </select>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                Active
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <button
                                                onClick={() => deleteUser(profile.id)}
                                                className="text-red-500 hover:text-red-700 text-xs font-bold uppercase transition-colors"
                                                title="Delete User"
                                            >
                                                Delete
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="mt-12 bg-[#080808] border border-[#404040] shadow-sm rounded-sm p-6">
                {/* Passing setProps as no-op for now unless we lift state, currently Configurator manages its own state */}
                <CampaignConfigurator />
            </div>
        </div >
    );
};
