
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
        console.error('SheetDB API URL is not configured or still has placeholder.');
        return { success: false, error: 'System configuration error. Please set your SheetDB URL in settings.' };
    }

    // Remove trailing slash if present
    apiUrl = apiUrl.replace(/\/$/, '');

    try {
        const searchUrl = `${apiUrl}/search?udise=${udise}&registration_key=${registrationKey}`;
        console.log('Fetching from SheetDB:', searchUrl);
        
        const response = await fetch(searchUrl);
        console.log('SheetDB Response status:', response.status);
        
        if (!response.ok) {
            throw new Error('Failed to connect to validation server.');
        }

        const data: SheetDBUser[] = await response.json();

        if (data && data.length > 0) {
            const user = data[0];

            // 1. Check if account is active
            // SheetDB returns booleans as strings "TRUE"/"FALSE" or "1"/"0" sometimes
            const isActive = user.active === undefined || 
                           user.active === true || 
                           user.active === 'TRUE' || 
                           user.active === '1';
            
            if (!isActive) {
                return { success: false, error: 'This account has been deactivated. Please contact support.' };
            }

            // 2. Check Expiry Date
            if (user.expiry_date) {
                const expiry = new Date(user.expiry_date);
                const today = new Date();
                // Set hours to 0 to compare only dates
                today.setHours(0, 0, 0, 0);
                
                if (expiry < today) {
                    return { success: false, error: 'This registration key has expired.' };
                }
            }

            // Found a matching and valid user
            return { 
                success: true, 
                schoolName: user.school_name 
            };
        } else {
            return { success: false, error: 'Invalid UDISE code or Registration Key.' };
        }
    } catch (error) {
        console.error('SheetDB Validation Error:', error);
        return { success: false, error: 'Connection error. Please check your internet and try again.' };
    }
};
