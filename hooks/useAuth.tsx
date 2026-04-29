
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { useData } from './useData';
import { AuthData } from '../types';
import { validateUserWithSheetDB } from '../services/sheetdbService';
import { registerSchoolWithSupabase } from '../services/supabaseService';

interface AuthContextType {
    isAuthenticated: boolean;
    login: (udise: string, password: string) => Promise<boolean>;
    logout: () => void;
    setupAccount: (authData: AuthData, udise: string, schoolName: string) => Promise<void>;
    resetPassword: (answer: string, newPass: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { data, updateAuth, setupAccountData } = useData();
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    useEffect(() => {
        const sessionActive = sessionStorage.getItem('pm-poshan-auth') === 'true';
        if (sessionActive) {
            setIsAuthenticated(true);
        }
    }, []);

    const login = async (udise: string, password: string): Promise<boolean> => {
        // First check local password if UDISE matches
        if (data.settings.schoolDetails.udise === udise && data.auth?.password === password) {
            setIsAuthenticated(true);
            sessionStorage.setItem('pm-poshan-auth', 'true');
            return true;
        }

        // Otherwise check SheetDB
        const validation = await validateUserWithSheetDB(udise, password);
        if (validation.success) {
            // If local data is empty or mismatched, we should populate the basics
            // This ensures a smooth move to a new device
            if (data.settings.schoolDetails.udise !== udise) {
                setupAccountData({
                    username: validation.schoolName || 'User',
                    contact: '',
                    password: password,
                    securityQuestion: 'Cloud Restored Account',
                    securityAnswer: 'N/A'
                }, udise, validation.schoolName || 'Restored School');
            }

            setIsAuthenticated(true);
            sessionStorage.setItem('pm-poshan-auth', 'true');
            return true;
        }

        return false;
    };

    const logout = () => {
        setIsAuthenticated(false);
        sessionStorage.removeItem('pm-poshan-auth');
    };

    const setupAccount = async (authData: AuthData, udise: string, schoolName: string) => {
        // Register/Update on Supabase
        try {
            await registerSchoolWithSupabase(udise, authData.password, schoolName);
        } catch (error) {
            console.error('Cloud registration warning:', error);
            // We continue even if cloud registration fails, so user can still use local app
        }
        
        setupAccountData(authData, udise, schoolName);
        setIsAuthenticated(true);
        sessionStorage.setItem('pm-poshan-auth', 'true');
    };
    
    const resetPassword = async (answer: string, newPass: string): Promise<boolean> => {
        if (data.auth && data.auth.securityAnswer.trim().toLowerCase() === answer.trim().toLowerCase()) {
            updateAuth({ ...data.auth, password: newPass });
            return true;
        }
        return false;
    };

    return (
        <AuthContext.Provider value={{ isAuthenticated, login, logout, setupAccount, resetPassword }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
