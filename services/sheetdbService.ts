
import { showToast } from '../hooks/useToast';

export interface SheetDBUser {
    udise: string;
    registration_key: string;
    school_name?: string;
    active?: string | boolean;
    expiry_date?: string;
}

export const validateUserWithSheetDB = async (udise: string, registrationKey: string): Promise<{ success: boolean; schoolName?: string; error?: string }> => {
    let apiUrl = import.meta.env.VITE_SHEETDB_URL;
    
    if (!apiUrl || apiUrl.includes('YOUR_API_ID')) {
        const errorMsg = 'SheetDB API URL is not configured. Please set VITE_SHEETDB_URL in settings.';
        console.error(errorMsg);
        showToast(errorMsg, 'error');
        return { success: false, error: errorMsg };
    }

    // Remove trailing slash if present
    apiUrl = apiUrl.trim().replace(/\/$/, '');

    // Ensure protocol is present
    if (!apiUrl.startsWith('http')) {
        apiUrl = `https://${apiUrl}`;
    }

    try {
        const searchUrl = `${apiUrl}/search?udise=${udise}&registration_key=${registrationKey}`;
        console.log('Fetching from SheetDB:', searchUrl.replace(apiUrl.split('/').pop() || '', '***')); // Mask API ID in logs
        
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };

        const apiKey = import.meta.env.VITE_SHEETDB_API_KEY;
        if (apiKey) {
            headers['Authorization'] = `Bearer ${apiKey}`;
        }

        const response = await fetch(searchUrl, { headers });
        console.log('SheetDB Response status:', response.status);
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || errorData.message || 'Failed to connect to validation server.');
        }

        const data = await response.json();
        console.log('SheetDB Data received:', data);

        if (Array.isArray(data) && data.length > 0) {
            // Find an exact match for UDISE first
            const udiseMatch = data.find((u: any) => String(u.udise).trim() === String(udise).trim());
            
            if (!udiseMatch) {
                return { success: false, error: 'NOT_FOUND' };
            }

            // Check key
            if (String(udiseMatch.registration_key).trim() !== String(registrationKey).trim()) {
                return { success: false, error: 'INVALID_KEY' };
            }

            const user = udiseMatch as SheetDBUser;

            // 1. Check if account is active
            // SheetDB returns booleans as strings "TRUE"/"FALSE" or "1"/"0" sometimes
            const activeVal = String(user.active).toUpperCase();
            const isActive = user.active === undefined || 
                           user.active === true || 
                           activeVal === 'TRUE' || 
                           activeVal === '1' ||
                           activeVal === 'ACTIVE';
            
            if (!isActive) {
                return { success: false, error: 'DEACTIVATED' };
            }

            // 2. Check Expiry Date
            if (user.expiry_date) {
                const expiry = new Date(user.expiry_date);
                if (!isNaN(expiry.getTime())) {
                    const today = new Date();
                    // Set hours to 0 to compare only dates
                    today.setHours(0, 0, 0, 0);
                    
                    if (expiry < today) {
                        return { success: false, error: 'EXPIRED' };
                    }
                }
            }

            // Found a matching and valid user
            return { 
                success: true, 
                schoolName: user.school_name 
            };
        } else {
            return { success: false, error: 'NOT_FOUND' };
        }
    } catch (error) {
        console.error('SheetDB Validation Error:', error);
        const message = error instanceof Error ? error.message : 'Unknown connection error';
        return { 
            success: false, 
            error: `Connection error: ${message}. Please check your API URL and internet connection.` 
        };
    }
};
