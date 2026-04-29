
import { createClient } from '@supabase/supabase-js';
import { AppData } from '../types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = (supabaseUrl && supabaseAnonKey) 
    ? createClient(supabaseUrl, supabaseAnonKey) 
    : null;

/**
 * Generates a random 6-character alphanumeric code for sync.
 */
const generateSyncCode = (length = 6): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};

/**
 * Backs up the current local data to Supabase.
 * Returns the generated sync code.
 */
export const uploadBackup = async (data: AppData): Promise<string> => {
    if (!supabase) {
        throw new Error('Supabase is not configured. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your environment.');
    }

    const syncCode = generateSyncCode();
    // We stringify the data. In a production app, you might want to encrypt this first.
    const encryptedData = JSON.stringify(data);

    const { error } = await supabase
        .from('backups')
        .insert({ 
            sync_code: syncCode, 
            encrypted_data: encryptedData,
            created_at: new Date().toISOString()
        });

    if (error) {
        console.error('Supabase backup error:', error);
        throw new Error(`Cloud backup failed: ${error.message}`);
    }

    return syncCode;
};

/**
 * Retrieves a backup from Supabase using a sync code.
 */
export const downloadBackup = async (code: string): Promise<AppData> => {
    if (!supabase) {
        throw new Error('Supabase is not configured.');
    }

    const { data, error } = await supabase
        .from('backups')
        .select('encrypted_data')
        .eq('sync_code', code.toUpperCase())
        .single();

    if (error) {
        if (error.code === 'PGRST116') {
            throw new Error('Invalid sync code. No backup found.');
        }
        console.error('Supabase retrieval error:', error);
        throw new Error(`Cloud restore failed: ${error.message}`);
    }

    if (!data || !data.encrypted_data) {
        throw new Error('Backup data is empty or invalid.');
    }

    try {
        return JSON.parse(data.encrypted_data) as AppData;
    } catch (e) {
        throw new Error('Failed to parse the retrieved backup data.');
    }
};
