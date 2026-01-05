import { supabase } from './supabase';

export const appointmentsService = {
    async updateAppointment(id: string, updates: { datetime?: string; notes?: string; status?: string }) {
        const { data, error } = await supabase
            .from('appointments')
            .update(updates)
            .eq('id', id)
            .select();

        if (error) {
            console.error('Error updating appointment:', error);
            throw error;
        }

        return (data && data.length > 0) ? data[0] : null;
    },

    async deleteAppointment(id: string) {
        const { error } = await supabase
            .from('appointments')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting appointment:', error);
            throw error;
        }
    }
};
