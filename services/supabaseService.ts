
import { createClient } from '@supabase/supabase-js';
import { AppData } from '../types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = (supabaseUrl && supabaseAnonKey) 
    ? createClient(supabaseUrl, supabaseAnonKey) 
    : null;

/**
 * Backs up the current local data to Supabase using the School's UDISE code.
 */
export const uploadBackup = async (data: AppData): Promise<string> => {
    if (!supabase) {
        throw new Error('Supabase is not configured. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your environment.');
    }

    const udiseCode = data.settings.schoolDetails.udise;
    
    if (!udiseCode || udiseCode.length < 5) {
        throw new Error('Invalid UDISE code. Please set your school UDISE code in Settings first.');
    }

    const encryptedData = JSON.stringify(data);

    // Using upsert: matches on udise_code. If it exists, it updates; otherwise inserts.
    const { error } = await supabase
        .from('backups')
        .upsert({ 
            udise_code: udiseCode, 
            encrypted_data: encryptedData,
            updated_at: new Date().toISOString()
        }, { onConflict: 'udise_code' });

    if (error) {
        console.error('Supabase backup error:', error);
        throw new Error(`Cloud backup failed: ${error.message}`);
    }

    return udiseCode;
};

/**
 * Retrieves a backup from Supabase using a UDISE code.
 */
export const downloadBackup = async (udiseCode: string): Promise<AppData> => {
    if (!supabase) {
        throw new Error('Supabase is not configured.');
    }

    if (!udiseCode || udiseCode.length < 5) {
        throw new Error('Please enter a valid UDISE code.');
    }

    const { data, error } = await supabase
        .from('backups')
        .select('encrypted_data')
        .eq('udise_code', udiseCode)
        .single();

    if (error) {
        if (error.code === 'PGRST116') {
            throw new Error(`No cloud backup found for UDISE: ${udiseCode}`);
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
