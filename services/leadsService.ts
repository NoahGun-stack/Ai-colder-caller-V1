import { supabase } from './supabase';
import { Lead } from '../types';

export const leadsService = {
    async fetchLeads() {
        const { data, error } = await supabase
            .from('leads')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching leads:', error);
            throw error;
        }

        return data as Lead[];
    },

    async addLead(lead: Omit<Lead, 'id'>) {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) throw new Error('User not authenticated');

        const { data, error } = await supabase
            .from('leads')
            .insert([
                {
                    ...lead,
                    user_id: user.id
                }
            ])
            .select()
            .single();

        if (error) {
            console.error('Error adding lead:', error);
            throw error;
        }

        return data as Lead;
    },

    async addLeadsBulk(leads: Omit<Lead, 'id'>[]) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const leadsWithUser = leads.map(l => ({
            ...l,
            user_id: user.id
        }));

        const { data, error } = await supabase
            .from('leads')
            .insert(leadsWithUser)
            .select();

        if (error) {
            console.error('Error adding leads bulk:', error);
            throw error;
        }

        return data as Lead[];
    },

    async updateLead(id: string, updates: Partial<Lead>) {
        const { data, error } = await supabase
            .from('leads')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Error updating lead:', error);
            throw error;
        }

        return data as Lead;
    }
};
