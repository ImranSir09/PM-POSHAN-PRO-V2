
import React, { useRef, useState } from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { useData } from '../../hooks/useData';
import { useToast } from '../../hooks/useToast';
import Modal from '../ui/Modal';
import { AppData } from '../../types';
import { validateImportData } from '../../services/dataValidator';
import { uploadBackup, downloadBackup } from '../../services/supabaseService';
import { Cloud, CloudDownload, CloudUpload, Info, Loader2 } from 'lucide-react';

const DataManagement: React.FC = () => {
    const { data, importData, resetData, updateLastBackupDate } = useData();
    const { showToast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    // Local Backup State
    const [isResetModalOpen, setResetModalOpen] = useState(false);
    const [importConfirmation, setImportConfirmation] = useState<{ data: AppData; summary: Record<string, string | number> } | null>(null);

    // Cloud Backup State
    const [isCloudSyncing, setIsCloudSyncing] = useState(false);
    const [lastSyncedUdise, setLastSyncedUdise] = useState('');
    const [inputUdiseCode, setInputUdiseCode] = useState('');
    const [showCloudInfo, setShowCloudInfo] = useState(false);

    const handleExport = () => {
        try {
            const jsonString = JSON.stringify(data, null, 2);
            // Use text/plain with charset to ensure mobile devices treat it as readable text.
            // The 'download' attribute below forces it to save as a file with the .json extension,
            // preventing the browser from just opening it in a tab.
            const blob = new Blob([jsonString], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            
            const schoolName = (data.settings.schoolDetails.name || 'School').replace(/[\\/:"*?<>|.\s]+/g, '_');
            
            const today = new Date();
            const yyyy = today.getFullYear();
            const mm = String(today.getMonth() + 1).padStart(2, '0');
            const dd = String(today.getDate()).padStart(2, '0');
            const dateString = `${yyyy}-${mm}-${dd}`;
            
            a.download = `PM_POSHAN_Backup_${schoolName}_${dateString}.json`;
            document.body.appendChild(a);
            a.click();
            
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 100);

            showToast('Data exported successfully!', 'success');
            updateLastBackupDate();
        } catch (error) {
            showToast('Error exporting data. Check browser permissions or try again.', 'error');
            console.error("Data export failed:", error);
        }
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const text = e.target?.result;
                if (typeof text !== 'string') throw new Error('Invalid file content');
                const parsedData = JSON.parse(text);
                const { isValid, errors, summary } = validateImportData(parsedData);

                if (!isValid) {
                    errors.forEach(err => showToast(err, 'error'));
                    showToast('Import failed. The file is invalid or corrupted.', 'error');
                    return;
                }
                setImportConfirmation({ data: parsedData as AppData, summary });
            } catch (error) {
                showToast('Failed to read or parse the file. It may be corrupted.', 'error');
                console.error(error);
            }
        };
        reader.readAsText(file);
        event.target.value = ''; // Reset input
    };
    
    const handleConfirmImport = () => {
        if (importConfirmation) {
            importData(importConfirmation.data);
            setImportConfirmation(null);
        }
    };

    const handleReset = () => {
        resetData();
        setResetModalOpen(false);
    };

    const handleCloudBackup = async () => {
        setIsCloudSyncing(true);
        try {
            const udise = await uploadBackup(data);
            setLastSyncedUdise(udise);
            showToast('Data uploaded to cloud using UDISE code!', 'success');
            updateLastBackupDate();
        } catch (error: any) {
            showToast(error.message || 'Cloud backup failed.', 'error');
        } finally {
            setIsCloudSyncing(false);
        }
    };

    const handleCloudRestore = async () => {
        const inputCode = inputUdiseCode.trim();
        const currentUdise = data.settings.schoolDetails.udise;

        if (!inputCode) {
            showToast('Please enter a UDISE code.', 'error');
            return;
        }

        // Security check: If a UDISE is already set, don't allow restoring from a different one
        if (currentUdise && currentUdise !== inputCode) {
            showToast(`Restore blocked. The entered UDISE (${inputCode}) does not match your currently configured school (${currentUdise}).`, 'error');
            return;
        }

        setIsCloudSyncing(true);
        try {
            const cloudData = await downloadBackup(inputCode);
            const { isValid, errors, summary } = validateImportData(cloudData);

            if (!isValid) {
                errors.forEach(err => showToast(err, 'error'));
                showToast('Restore failed. Cloud data is invalid.', 'error');
                return;
            }

            setImportConfirmation({ data: cloudData, summary });
            showToast(`Cloud data retrieved for UDISE: ${inputCode}! Please confirm restore.`, 'success');
        } catch (error: any) {
            showToast(error.message || 'Cloud restore failed.', 'error');
        } finally {
            setIsCloudSyncing(false);
        }
    };

    return (
        <>
            <Modal isOpen={isResetModalOpen} onClose={() => setResetModalOpen(false)} title="Confirm Reset">
                <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">Are you sure you want to delete ALL data? This action cannot be undone. It is highly recommended to export your data first.</p>
                <div className="flex justify-end space-x-2">
                    <Button variant="secondary" onClick={() => setResetModalOpen(false)}>Cancel</Button>
                    <Button variant="danger" onClick={handleReset}>Yes, Reset Data</Button>
                </div>
            </Modal>
            
            <Modal isOpen={!!importConfirmation} onClose={() => setImportConfirmation(null)} title="Confirm Data Import">
                <div className="space-y-4">
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                        Please review the details from the file before importing.
                        <strong className="block mt-1 text-yellow-600 dark:text-yellow-400">Warning: This will overwrite all current application data.</strong>
                    </p>
                    <div className="text-sm space-y-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 p-4 rounded-xl">
                        <p><strong>School Name:</strong> {importConfirmation?.summary.schoolName}</p>
                        <p><strong>UDISE:</strong> {importConfirmation?.summary.udise}</p>
                        <p><strong>Daily Entries Found:</strong> {importConfirmation?.summary.entryCount}</p>
                        <p><strong>Receipts Found:</strong> {importConfirmation?.summary.receiptCount}</p>
                    </div>
                    <div className="flex justify-end space-x-2">
                        <Button variant="secondary" onClick={() => setImportConfirmation(null)}>Cancel</Button>
                        <Button variant="danger" onClick={handleConfirmImport}>Confirm & Overwrite</Button>
                    </div>
                </div>
            </Modal>

            <div className="space-y-4">
                <Card title="Data Backup & Restore">
                    {/* ... existing local backup ... */}
                    <div className="space-y-3">
                        <div>
                            <p className="text-sm font-medium mb-1">Export Data (Local File)</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                                Save all app data to a file. Store it safely to prevent data loss.
                            </p>
                            <Button onClick={handleExport} className="w-full">Export to JSON</Button>
                        </div>
                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                            <p className="text-sm font-medium mb-1">Import Data (Local File)</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                                Restore data from a backup file. <span className="font-bold text-yellow-600 dark:text-yellow-400">Warning: Replaces all current data.</span>
                            </p>
                            <Button onClick={handleImportClick} variant="secondary" className="w-full">Select File to Import</Button>
                            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" className="hidden" />
                        </div>
                    </div>
                </Card>

                <Card title={
                    <div className="flex items-center justify-between">
                        <span>Cloud Sync (Supabase)</span>
                        <button onClick={() => setShowCloudInfo(!showCloudInfo)} className="text-slate-400 hover:text-sky-500 transition-colors">
                            <Info size={18} />
                        </button>
                    </div>
                }>
                    <div className="space-y-4">
                        {showCloudInfo && (
                            <div className="bg-sky-50 dark:bg-sky-900/30 border border-sky-100 dark:border-sky-800 p-3 rounded-lg text-xs text-sky-800 dark:text-sky-300 mb-2 animate-in fade-in slide-in-from-top-1">
                                <p className="font-medium mb-1 flex items-center gap-1">
                                    <Cloud size={14} /> How Cloud Sync works:
                                </p>
                                <ul className="list-disc list-inside space-y-1">
                                    <li>Backup stores your data securely using your school's <b>UDISE Code</b>.</li>
                                    <li>Ensure your UDISE code is correctly set in <b>Settings</b>.</li>
                                    <li>Use that UDISE code on any device to restore your data.</li>
                                    <li>Restore overwrites your current local data.</li>
                                </ul>
                            </div>
                        )}

                        <div className="space-y-2">
                            <div className="flex flex-col gap-2">
                                <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 dark:text-slate-500">Current UDISE: {data.settings.schoolDetails.udise || 'Not Set'}</p>
                                <Button 
                                    onClick={handleCloudBackup} 
                                    disabled={isCloudSyncing || !data.settings.schoolDetails.udise}
                                    variant="secondary"
                                    className="w-full bg-sky-50 hover:bg-sky-100 dark:bg-sky-900/20 dark:hover:bg-sky-900/40 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800"
                                >
                                    {isCloudSyncing ? (
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    ) : (
                                        <CloudUpload className="w-4 h-4 mr-2" />
                                    )}
                                    {isCloudSyncing ? 'Syncing...' : 'Upload to Cloud'}
                                </Button>

                                {lastSyncedUdise && (
                                    <div className="p-2 bg-green-50 dark:bg-green-900/30 border border-green-100 dark:border-green-800 rounded-lg text-center animate-in zoom-in-95">
                                        <p className="text-[10px] text-green-800 dark:text-green-300">Successfully synced UDISE: <b>{lastSyncedUdise}</b></p>
                                    </div>
                                )}
                            </div>

                            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
                                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Restore from Cloud (Enter UDISE)</p>
                                <div className="flex gap-2">
                                    <input 
                                        type="text" 
                                        placeholder="Enter UDISE Code"
                                        value={inputUdiseCode}
                                        onChange={(e) => setInputUdiseCode(e.target.value)}
                                        className="flex-1 px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-sky-500 dark:text-white"
                                    />
                                    <Button 
                                        onClick={handleCloudRestore} 
                                        disabled={isCloudSyncing || inputUdiseCode.length < 5}
                                        className="whitespace-nowrap px-4"
                                    >
                                        {isCloudSyncing ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <CloudDownload className="w-4 h-4 mr-2" />
                                        )}
                                        Restore
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </Card>

                <Card title="Reset Application">
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                        <span className="font-bold text-red-600 dark:text-red-400">This action is irreversible.</span> It will permanently delete all data. Ensure you have a backup if you wish to restore later.
                    </p>
                    <Button onClick={() => setResetModalOpen(true)} variant="danger" className="w-full">Reset All Data</Button>
                </Card>

                <Card title="Help & About">
                    <div className="space-y-4 text-sm text-slate-600 dark:text-slate-300">
                         <div>
                            <h3 className="font-semibold text-sky-700 dark:text-sky-400">App Guide</h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                A quick guide to the app's main functions:
                            </p>
                            <ul className="list-disc list-inside space-y-1 mt-2 text-xs">
                                <li><b>Dashboard:</b> Your daily hub. Add/edit today's meal entry and see a monthly overview.</li>
                                <li><b>Summary:</b> View detailed monthly breakdowns of consumption and stock balances.</li>
                                <li><b>Receipts:</b> Log all incoming rice and cash to keep your records accurate.</li>
                                <li><b>Reports:</b> Generate PDF reports and manage your application data.</li>
                                <li><b>Settings:</b> Crucial for accuracy! Configure your school details, enrollment, and food rates here.</li>
                            </ul>
                        </div>
                        <div>
                            <h3 className="font-semibold text-sky-700 dark:text-sky-400">Feedback & Support</h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                Have questions or suggestions? Your feedback is valuable! Please get in touch.
                            </p>
                        </div>
                        <div className="text-xs pt-2 border-t border-slate-200/50 dark:border-white/10">
                            <p><strong>App Version:</strong> 2.1.0</p>
                            <p><strong>Developer:</strong> Imran Gani Mugloo</p>
                            <p><strong>Contact:</strong> <a href="tel:+919149690096" className="text-sky-600 dark:text-sky-400 hover:underline">+91 9149690096</a></p>
                            <p><strong>Email:</strong> <a href="mailto:emraanmugloo123@gmail.com" className="text-sky-600 dark:text-sky-400 hover:underline">emraanmugloo123@gmail.com</a></p>
                        </div>
                    </div>
                </Card>
            </div>
        </>
    );
};

export default DataManagement;
