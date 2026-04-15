
export interface SheetDBUser {
    udise: string;
    registration_key: string;
    school_name?: string;
}

export const validateUserWithSheetDB = async (udise: string, registrationKey: string): Promise<{ success: boolean; schoolName?: string; error?: string }> => {
    const apiUrl = import.meta.env.VITE_SHEETDB_URL;
    
    if (!apiUrl) {
        console.error('https://sheetdb.io/api/v1/4lvgbdscalcp3');
        return { success: false, error: 'System configuration error. Please contact developer.' };
    }

    try {
        // SheetDB search endpoint: GET /search?column=value
        const response = await fetch(`${apiUrl}/search?udise=${udise}&registration_key=${registrationKey}`);
        
        if (!response.ok) {
            throw new Error('Failed to connect to validation server.');
        }

        const data: SheetDBUser[] = await response.json();

        if (data && data.length > 0) {
            // Found a matching user
            return { 
                success: true, 
                schoolName: data[0].school_name 
            };
        } else {
            return { success: false, error: 'Invalid UDISE code or Registration Key.' };
        }
    } catch (error) {
        console.error('SheetDB Validation Error:', error);
        return { success: false, error: 'Connection error. Please check your internet and try again.' };
    }
};
