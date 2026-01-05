import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { contactsService } from './services/contactsService';
import { supabase } from './services/supabase';
import { LeadStatus } from './types';

async function verifyContactCRUD() {
    console.log('Starting Contact CRUD Verification...');

    // 1. Authenticate (Assume user is already signed in or use a test account if possible. 
    // For this environment, we might need to rely on existing session or skip if no session.
    // However, the services rely on supabase.auth.getUser()

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        console.error('No authenticated user found. Please sign in via the app first or set up a test user.');
        // Try to sign in if we had credentials, but we don't. 
        // We will assume the environment has a valid session if `npm run dev` is working for the user.
        // If this fails, we'll know.
        return;
    }
    console.log('Authenticated as:', user.email);

    // 2. Add a Contact
    const testContact = {
        firstName: 'TestDelete',
        lastName: 'User',
        phoneNumber: '+15550009999',
        address: '123 Delete St',
        city: 'Deletetown',
        state: 'TX',
        zip: '77777',
        status: LeadStatus.NOT_CALLED,
        tcpaAcknowledged: true,
        notes: 'To be deleted'
    };

    console.log('Adding contact...');
    let createdContact;
    try {
        createdContact = await contactsService.addContact(testContact);
        console.log('Contact added:', createdContact.id);
    } catch (e) {
        console.error('Failed to add contact:', e);
        return;
    }

    // 3. Verify it exists
    console.log('Verifying existence...');
    const contacts = await contactsService.fetchContacts();
    const found = contacts.find(c => c.id === createdContact.id);
    if (!found) {
        console.error('Contact not found after creation!');
        return;
    }
    console.log('Contact found in list.');

    // 3.5. Create a Call Log to test FK constraint
    console.log('Creating dummy call log...');
    const { error: logError } = await supabase.from('call_logs').insert({
        contact_id: createdContact.id,
        duration: 60,
        outcome: 'Connected',
        sentiment: 'Positive',
        transcript: 'Test transcript'
    });

    if (logError) {
        console.error('Failed to create dummy call log:', logError);
        return;
    }
    console.log('Dummy call log created.');

    // 4. Delete the contact
    console.log('Deleting contact...');
    try {
        await contactsService.deleteContact(createdContact.id);
        console.log('Delete command sent.');
    } catch (e) {
        console.error('Failed to delete contact:', e);
        return;
    }

    // 5. Verify it is gone
    console.log('Verifying removal...');
    const contactsAfter = await contactsService.fetchContacts();
    const foundAfter = contactsAfter.find(c => c.id === createdContact.id);
    if (foundAfter) {
        console.error('Contact still exists after deletion!');
    } else {
        console.log('Contact successfully removed.');
    }

    // 6. Bulk Delete Verification
    console.log('Starting Bulk Delete Verification...');
    const bulkContacts = [
        { ...testContact, firstName: 'BulkDelete1', phoneNumber: '+15550009991' },
        { ...testContact, firstName: 'BulkDelete2', phoneNumber: '+15550009992' }
    ];

    console.log('Adding multiple contacts...');
    let createdBulk;
    try {
        createdBulk = await contactsService.addContactsBulk(bulkContacts);
        console.log(`Added ${createdBulk.length} contacts for bulk delete.`);
    } catch (e) {
        console.error('Failed to add bulk contacts:', e);
        return;
    }

    const bulkIds = createdBulk.map(c => c.id);
    console.log('Bulk IDs to delete:', bulkIds);

    console.log('Deleting bulk contacts...');
    try {
        await contactsService.deleteContactsBulk(bulkIds);
        console.log('Bulk delete command sent.');
    } catch (e) {
        console.error('Failed to delete bulk contacts:', e);
        return;
    }

    console.log('Verifying bulk removal...');
    const contactsFinal = await contactsService.fetchContacts();
    const stillExists = contactsFinal.filter(c => bulkIds.includes(c.id));

    if (stillExists.length > 0) {
        console.error('Some contacts still exist after bulk deletion:', stillExists.map(c => c.id));
    } else {
        console.log('All bulk contacts successfully removed.');
        console.log('SUCCESS: Bulk delete verification passed.');
    }
}

verifyContactCRUD();
