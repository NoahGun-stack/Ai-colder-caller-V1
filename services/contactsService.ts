import { supabase } from './supabase';
import { Contact } from '../types';

export const contactsService = {
    async fetchContacts() {
        const { data, error } = await supabase
            .from('contacts')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching contacts:', error);
            throw error;
        }

        return (data || []).map((row: any) => ({
            ...row,
            totalCalls: row.total_calls || 0,
            lastContactedAt: row.last_contacted_at,
            lastOutcome: row.last_outcome
        })) as Contact[];
    },

    async addContact(contact: Omit<Contact, 'id'>) {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) throw new Error('User not authenticated');

        const { data, error } = await supabase
            .from('contacts')
            .insert([
                {
                    ...contact,
                    user_id: user.id
                }
            ])
            .select();

        if (error) {
            console.error('Error adding contact:', error);
            throw error;
        }

        return (data && data.length > 0) ? data[0] as Contact : {} as Contact;
    },

    async addContactsBulk(contacts: Omit<Contact, 'id'>[]) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const contactsWithUser = contacts.map(c => ({
            ...c,
            user_id: user.id
        }));

        const { data, error } = await supabase
            .from('contacts')
            .insert(contactsWithUser)
            .select();

        if (error) {
            console.error('Error adding contacts bulk:', error);
            throw error;
        }

        return data as Contact[];
    },

    async updateContact(id: string, updates: Partial<Contact>) {
        const { data, error } = await supabase
            .from('contacts')
            .update(updates)
            .eq('id', id)
            .select();

        if (error) {
            console.error('Error updating contact:', error);
            throw error;
        }

        return (data && data.length > 0) ? data[0] as Contact : null;
    },
    async deleteContact(id: string) {
        // First delete related call logs
        const { error: logsError } = await supabase
            .from('call_logs')
            .delete()
            .eq('contact_id', id);

        if (logsError) {
            console.error('Error deleting related call logs:', logsError);
            throw logsError;
        }

        const { error } = await supabase
            .from('contacts')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting contact:', error);
            throw error;
        }
    },

    async deleteContactsBulk(ids: string[]) {
        // First delete related call logs
        const { error: logsError } = await supabase
            .from('call_logs')
            .delete()
            .in('contact_id', ids);

        if (logsError) {
            console.error('Error deleting related call logs bulk:', logsError);
            throw logsError;
        }

        const { error } = await supabase
            .from('contacts')
            .delete()
            .in('id', ids);

        if (error) {
            console.error('Error deleting contacts bulk:', error);
            throw error;
        }
    },

    async getCallLogs(contactId: string) {
        const { data, error } = await supabase
            .from('call_logs')
            .select('*')
            .eq('contact_id', contactId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching call logs:', error);
            throw error;
        }

        return data || [];
    }
};
