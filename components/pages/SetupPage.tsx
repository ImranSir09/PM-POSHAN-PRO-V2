
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { validateUserWithSheetDB } from '../../services/sheetdbService';
import Card from '../ui/Card';
import Input from '../ui/Input';
import Button from '../ui/Button';
import TermsModal from '../ui/TermsModal';
import PasswordInput from '../ui/PasswordInput';

const SECURITY_QUESTIONS = [
    "What was your first school's name?",
    "What is your mother's maiden name?",
    "What is the name of your first pet?",
    "In what city were you born?",
];

const SetupPage: React.FC = () => {
    const { setupAccount } = useAuth();
    const { showToast } = useToast();
    
    // Activation States
    const [udise, setUdise] = useState('');
    const [signupKeyInput, setSignupKeyInput] = useState('');
    
    // Account States
    const [username, setUsername] = useState('');
    const [contact, setContact] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [securityQuestion, setSecurityQuestion] = useState(SECURITY_QUESTIONS[0]);
    const [securityAnswer, setSecurityAnswer] = useState('');
    const [agreedToTerms, setAgreedToTerms] = useState(false);
    
    // UI States
    const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isVerified, setIsVerified] = useState(false);
    const [verifiedSchoolName, setVerifiedSchoolName] = useState('');

    const [errors, setErrors] = useState({
        udise: '',
        signupKey: '',
        username: '',
        contact: '',
        password: '',
        confirmPassword: '',
        securityAnswer: '',
        terms: '',
    });

    const validate = useCallback((fieldName?: keyof typeof errors) => {
        const newErrors = { ...errors };
        
        const validators: Record<keyof typeof errors, () => string> = {
            udise: () => {
                if (!udise) return 'UDISE code is required.';
                if (udise.length !== 11) return 'UDISE code must be exactly 11 digits.';
                return '';
            },
            signupKey: () => !signupKeyInput.trim() ? 'Registration Key is required.' : '',
            username: () => !username.trim() ? 'Username is required.' : '',
            contact: () => {
                const trimmedContact = contact.trim();
                if (trimmedContact && !/^\d{10}$/.test(trimmedContact)) return 'Contact number must be 10 digits.';
                return '';
            },
            password: () => {
                if (!password) return 'Password is required.';
                if (password.length < 6) return 'Password must be at least 6 characters long.';
                return '';
            },
            confirmPassword: () => {
                if (!confirmPassword) return 'Please confirm your password.';
                if (password && confirmPassword !== password) return 'Passwords do not match.';
                return '';
            },
            securityAnswer: () => !securityAnswer ? 'Security answer is required.' : '',
            terms: () => !agreedToTerms ? 'You must agree to the Terms and Conditions to proceed.' : '',
        };

        let isValid = true;
        if (fieldName) {
            const error = validators[fieldName]();
            newErrors[fieldName] = error;
            isValid = error === '';
            
            if (fieldName === 'password' && confirmPassword) {
                const confirmErr = validators.confirmPassword();
                newErrors.confirmPassword = confirmErr;
                if (confirmErr) isValid = false;
            }
        } else {
            // Only validate relevant fields based on current step
            const fieldsToValidate = isVerified 
                ? (['username', 'contact', 'password', 'confirmPassword', 'securityAnswer', 'terms'] as const)
                : (['udise', 'signupKey'] as const);

            fieldsToValidate.forEach(key => {
                const error = validators[key]();
                newErrors[key] = error;
                if (error) isValid = false;
            });
        }
        
        console.log('Validation check:', { isVerified, isValid, newErrors });
        setErrors(newErrors);
        return isValid;
    }, [udise, signupKeyInput, username, contact, password, confirmPassword, securityAnswer, agreedToTerms, errors, isVerified]);

    const handleVerify = async () => {
        console.log('handleVerify called');
        const isValid = validate();
        if (isValid) {
            setIsProcessing(true);
            try {
                console.log('Calling validateUserWithSheetDB with:', udise, signupKeyInput.trim());
                const validation = await validateUserWithSheetDB(udise, signupKeyInput.trim());
                console.log('Validation response:', validation);
                if (validation.success) {
                    setVerifiedSchoolName(validation.schoolName || 'Verified School');
                    setIsVerified(true);
                    showToast('School verified successfully!', 'success');
                } else {
                    // Set a specific error for the fields if possible, or show a toast
                    const errorMsg = validation.error || 'Invalid UDISE or Key combination.';
                    showToast(errorMsg, 'error');
                    setErrors(prev => ({ ...prev, udise: errorMsg, signupKey: errorMsg }));
                }
            } catch (error) {
                console.error('handleVerify error:', error);
                showToast('Connection error. Please try again.', 'error');
            } finally {
                setIsProcessing(false);
            }
        } else {
            showToast('Please check the errors above.', 'info');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (validate()) {
            setIsProcessing(true);
            try {
                // Proceed with account setup
                await setupAccount({
                    username,
                    contact,
                    password,
                    securityQuestion,
                    securityAnswer,
                }, udise, verifiedSchoolName);
                
                showToast(`Setup complete for ${verifiedSchoolName}! Welcome.`, 'success');
            } catch (error) {
                showToast('An error occurred during setup.', 'error');
                setIsProcessing(false);
            }
        } else {
            showToast('Please correct the errors and try again.', 'error');
        }
    };

    return (
        <>
            <TermsModal isOpen={isTermsModalOpen} onClose={() => setIsTermsModalOpen(false)} />
            <div className="min-h-screen font-sans flex items-center justify-center p-4 relative z-10">
                <div className="w-full max-w-md z-10">
                    <div className="text-center mb-6">
                        <div className="flex justify-center mb-4">
                            <img src="/icons/icon-192.png" alt="PM Poshan Pro Logo" className="w-16 h-16 rounded-xl shadow-md" />
                        </div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">PM Poshan Pro</h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">New School Registration</p>
                    </div>

                    {!isVerified ? (
                        <Card title="Step 1: School Activation">
                            <div className="space-y-5">
                                <p className="text-xs text-slate-500 dark:text-slate-400">Enter your school details to verify your registration key from our records.</p>
                                <Input
                                    label="School UDISE Code (11 Digits)"
                                    id="udise-setup"
                                    type="tel"
                                    maxLength={11}
                                    value={udise}
                                    onChange={e => setUdise(e.target.value.replace(/[^0-9]/g, ''))}
                                    onBlur={() => validate('udise')}
                                    required
                                    placeholder="e.g. 01010101010"
                                    className={errors.udise ? 'border-red-500 focus:ring-red-500/20 focus:border-red-500' : ''}
                                />
                                {errors.udise && <p className="mt-1 text-xs text-red-500">{errors.udise}</p>}
                                
                                <Input
                                    label="Registration Key"
                                    id="signup-key"
                                    value={signupKeyInput}
                                    onChange={e => setSignupKeyInput(e.target.value)}
                                    onBlur={() => validate('signupKey')}
                                    required
                                    placeholder="Enter your unique registration key"
                                    className={errors.signupKey ? 'border-red-500 focus:ring-red-500/20 focus:border-red-500' : ''}
                                />
                                {errors.signupKey ? (
                                    <p className="mt-1 text-xs text-red-500">{errors.signupKey}</p>
                                ) : (
                                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Please provide your unique registration key provided by the developer.</p>
                                )}
                                
                                <Button onClick={handleVerify} className="w-full py-3" isLoading={isProcessing}>
                                    Verify School Details
                                </Button>
                                
                                <div className="mt-6 text-xs pt-4 border-t border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-center">
                                    <p className="font-semibold mb-1 text-slate-700 dark:text-slate-300">Developer Contact for Registration Key:</p>
                                    <p>Imran Gani Mugloo</p>
                                    <p><a href="tel:+919149690096" className="text-indigo-600 dark:text-indigo-400 hover:underline">+91 9149690096</a></p>
                                    <p><a href="mailto:emraanmugloo123@gmail.com" className="text-indigo-600 dark:text-indigo-400 hover:underline">emraanmugloo123@gmail.com</a></p>
                                </div>
                            </div>
                        </Card>
                    ) : (
                        <Card title="Step 2: Account Details">
                            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                                <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800/50 rounded-xl mb-2">
                                    <p className="text-[10px] uppercase tracking-wider font-bold text-green-600 dark:text-green-400">Verified School</p>
                                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{verifiedSchoolName}</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">UDISE: {udise}</p>
                                </div>

                                <Input
                                    label="MDM Incharge Name"
                                    id="username"
                                    value={username}
                                    onChange={e => setUsername(e.target.value)}
                                    onBlur={() => validate('username')}
                                    required
                                    className={errors.username ? 'border-red-500 focus:ring-red-500/20 focus:border-red-500' : ''}
                                />
                                {errors.username && <p className="mt-1 text-xs text-red-500">{errors.username}</p>}
                                
                                <Input
                                    label="Contact Number"
                                    id="contact"
                                    type="tel"
                                    maxLength={10}
                                    value={contact}
                                    onChange={e => setContact(e.target.value.replace(/[^0-9]/g, ''))}
                                    onBlur={() => validate('contact')}
                                    className={errors.contact ? 'border-red-500 focus:ring-red-500/20 focus:border-red-500' : ''}
                                />
                                {errors.contact && <p className="mt-1 text-xs text-red-500">{errors.contact}</p>}
                                
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <PasswordInput
                                        label="Create Password (min. 6)"
                                        id="password"
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        onBlur={() => validate('password')}
                                        required
                                    />
                                    <PasswordInput
                                        label="Confirm Password"
                                        id="confirm-password"
                                        value={confirmPassword}
                                        onChange={e => setConfirmPassword(e.target.value)}
                                        onBlur={() => validate('confirmPassword')}
                                        required
                                    />
                                </div>
                                {(errors.password || errors.confirmPassword) && (
                                    <p className="mt-1 text-xs text-red-500">{errors.password || errors.confirmPassword}</p>
                                )}
                                
                                <fieldset className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-slate-50/50 dark:bg-slate-900/20">
                                    <legend className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 px-2 uppercase tracking-wider">Account Recovery</legend>
                                    <div className="space-y-4">
                                        <div className="text-xs text-slate-500 dark:text-slate-400 mb-1 italic">Used to reset your password if forgotten.</div>
                                        <select
                                            id="security-question"
                                            value={securityQuestion}
                                            onChange={e => setSecurityQuestion(e.target.value)}
                                            className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 text-sm rounded-xl p-2.5 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all shadow-sm"
                                        >
                                            {SECURITY_QUESTIONS.map(q => <option key={q} value={q}>{q}</option>)}
                                        </select>
                                        <Input
                                            label="Security Answer"
                                            id="security-answer"
                                            value={securityAnswer}
                                            onChange={e => setSecurityAnswer(e.target.value)}
                                            onBlur={() => validate('securityAnswer')}
                                            required
                                        />
                                        {errors.securityAnswer && <p className="mt-1 text-xs text-red-500">{errors.securityAnswer}</p>}
                                    </div>
                                </fieldset>

                                <div className="pt-2">
                                    <div className="flex items-center space-x-2">
                                        <input
                                            type="checkbox"
                                            id="terms-agree"
                                            checked={agreedToTerms}
                                            onChange={e => setAgreedToTerms(e.target.checked)}
                                            onBlur={() => validate('terms')}
                                            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                        />
                                        <label htmlFor="terms-agree" className="text-xs text-slate-600 dark:text-slate-300">
                                            I agree to the{' '}
                                            <button type="button" onClick={() => setIsTermsModalOpen(true)} className="text-indigo-600 dark:text-indigo-400 hover:underline">Terms and Conditions</button>
                                        </label>
                                    </div>
                                     {errors.terms && <p className="mt-1 text-xs text-red-500">{errors.terms}</p>}
                                </div>
                                
                                <div className="flex space-x-3 pt-2">
                                    <Button variant="secondary" onClick={() => setIsVerified(false)} className="flex-1">
                                        Back
                                    </Button>
                                    <Button type="submit" className="flex-[2] py-3" isLoading={isProcessing}>
                                        Complete Setup
                                    </Button>
                                </div>
                            </form>
                        </Card>
                    )}
                </div>
            </div>
        </>
    );
};

export default SetupPage;
