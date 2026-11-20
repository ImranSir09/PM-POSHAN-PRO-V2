import React, { useRef, useState, useEffect } from 'react';
import Button from '../ui/Button';
import { useData } from '../../hooks/useData';
import { useToast } from '../../hooks/useToast';
import Modal from '../ui/Modal';
import UpdateModal from './UpdateModal';
import { AppData } from '../../types';
import { validateImportData } from '../../services/dataValidator';
import { uploadBackup, downloadBackup } from '../../services/supabaseService';
import { checkForAppUpdates, getCurrentAppVersion, UpdateInfo } from '../../services/updateService';
import { saveOrDownloadFile } from '../../services/fileDownloadService';
import { Cloud, CloudDownload, CloudUpload, Info, Loader2, Mail, Phone, RefreshCw } from 'lucide-react';

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

    // Update Checker State
    const [appVersion, setAppVersion] = useState<string>('2.1.0');
    const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
    const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
    const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);

    useEffect(() => {
        getCurrentAppVersion().then(v => setAppVersion(v));
    }, []);

    const handleManualUpdateCheck = async () => {
        setIsCheckingUpdate(true);
        try {
            const info = await checkForAppUpdates();
            setUpdateInfo(info);
            if (info.hasUpdate) {
                setIsUpdateModalOpen(true);
            } else {
                showToast(`PM POSHAN PRO is up to date (v${info.currentVersion}).`, 'info');
            }
        } catch (error: any) {
            showToast('Unable to check for updates. Please verify your connection.', 'error');
            console.error('Manual update check failed:', error);
        } finally {
            setIsCheckingUpdate(false);
        }
    };

    const handleExport = async () => {
        try {
            const jsonString = JSON.stringify(data, null, 2);
            const schoolName = (data.settings.schoolDetails.name || 'School').replace(/[\\/:"*?<>|.\s]+/g, '_');
            
            const today = new Date();
            const yyyy = today.getFullYear();
            const mm = String(today.getMonth() + 1).padStart(2, '0');
            const dd = String(today.getDate()).padStart(2, '0');
            const dateString = `${yyyy}-${mm}-${dd}`;
            
            const filename = `PM_POSHAN_Backup_${schoolName}_${dateString}.json`;
            
            await saveOrDownloadFile(jsonString, filename, 'application/json');

            showToast('Data exported successfully!', 'success');
            updateLastBackupDate();
        } catch (error) {
            showToast('Error exporting data. Check permissions or try again.', 'error');
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
            <UpdateModal 
                isOpen={isUpdateModalOpen} 
                onClose={() => setIsUpdateModalOpen(false)} 
                updateInfo={updateInfo} 
            />

            <Modal isOpen={isResetModalOpen} onClose={() => setResetModalOpen(false)} title="Confirm Reset">
                <p className="text-sm text-slate-600 dark:text-slate-300 mb-5">Are you sure you want to delete ALL data? This action cannot be undone. It is highly recommended to export your data first.</p>
                <div className="flex justify-end gap-2">
                    <Button variant="secondary" onClick={() => setResetModalOpen(false)}>Cancel</Button>
                    <Button variant="danger" onClick={handleReset}>Yes, Reset Data</Button>
                </div>
            </Modal>
            
            <Modal isOpen={!!importConfirmation} onClose={() => setImportConfirmation(null)} title="Confirm Data Import">
                <div className="space-y-4">
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                        Please review the details from the file before importing.
                        <strong className="block mt-1 text-amber-600 dark:text-amber-400">Warning: This will overwrite all current application data.</strong>
                    </p>
                    <div className="text-sm divide-y divide-slate-200/70 dark:divide-slate-800/80 bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 px-3.5 py-1 rounded-xl">
                        <div className="flex justify-between py-2 text-xs sm:text-sm">
                            <span className="text-slate-500 dark:text-slate-400">School Name</span>
                            <span className="font-semibold text-slate-900 dark:text-white text-right">{importConfirmation?.summary.schoolName}</span>
                        </div>
                        <div className="flex justify-between py-2 text-xs sm:text-sm">
                            <span className="text-slate-500 dark:text-slate-400">UDISE</span>
                            <span className="font-semibold text-slate-900 dark:text-white tabular-nums">{importConfirmation?.summary.udise}</span>
                        </div>
                        <div className="flex justify-between py-2 text-xs sm:text-sm">
                            <span className="text-slate-500 dark:text-slate-400">Daily Entries</span>
                            <span className="font-semibold text-slate-900 dark:text-white tabular-nums">{importConfirmation?.summary.entryCount}</span>
                        </div>
                        <div className="flex justify-between py-2 text-xs sm:text-sm">
                            <span className="text-slate-500 dark:text-slate-400">Receipts</span>
                            <span className="font-semibold text-slate-900 dark:text-white tabular-nums">{importConfirmation?.summary.receiptCount}</span>
                        </div>
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button variant="secondary" onClick={() => setImportConfirmation(null)}>Cancel</Button>
                        <Button variant="danger" onClick={handleConfirmImport}>Confirm & Overwrite</Button>
                    </div>
                </div>
            </Modal>

            <div className="divide-y divide-slate-200/80 dark:divide-slate-800/80">
                {/* Local Backup & Restore */}
                <section className="pb-5 space-y-4">
                    <div>
                        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Local Backup & Restore</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            Export all records to a JSON file or restore from an existing backup.
                        </p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <Button onClick={handleExport} className="w-full">Export to JSON</Button>
                        <Button onClick={handleImportClick} variant="secondary" className="w-full">Import from JSON</Button>
                        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" className="hidden" />
                    </div>
                    <p className="text-[11px] text-amber-700 dark:text-amber-400">
                        Note: Importing a backup replaces all current local data.
                    </p>
                </section>

                {/* Cloud Sync */}
                <section className="py-5 space-y-4">
                    <div className="flex items-start justify-between gap-2">
                        <div>
                            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Cloud Sync (Supabase)</h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
                                Current UDISE: <span className="font-semibold text-slate-700 dark:text-slate-200">{data.settings.schoolDetails.udise || 'Not Set'}</span>
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setShowCloudInfo(!showCloudInfo)}
                            aria-label="How Cloud Sync works"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                            <Info className="w-4 h-4" />
                        </button>
                    </div>

                    {showCloudInfo && (
                        <div className="bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/70 dark:border-indigo-800/50 p-3 rounded-xl text-xs text-indigo-900 dark:text-indigo-200 space-y-1">
                            <p className="font-semibold flex items-center gap-1.5">
                                <Cloud className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                                How Cloud Sync works
                            </p>
                            <ul className="list-disc list-inside space-y-0.5 text-indigo-800/90 dark:text-indigo-300/90">
                                <li>Backup stores your data using your school's <b>UDISE Code</b>.</li>
                                <li>Ensure your UDISE code is set correctly under School Details.</li>
                                <li>Use that UDISE code on any device to restore (overwrites local data).</li>
                            </ul>
                        </div>
                    )}

                    <div className="space-y-3">
                        <Button 
                            onClick={handleCloudBackup} 
                            disabled={isCloudSyncing || !data.settings.schoolDetails.udise}
                            variant="secondary"
                            className="w-full"
                        >
                            {isCloudSyncing ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <CloudUpload className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                            )}
                            <span>{isCloudSyncing ? 'Syncing...' : 'Upload Backup to Cloud'}</span>
                        </Button>

                        {lastSyncedUdise && (
                            <div className="px-3 py-2 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-800/60 rounded-xl text-center">
                                <p className="text-xs text-emerald-700 dark:text-emerald-300 tabular-nums">
                                    Synced for UDISE: <b>{lastSyncedUdise}</b>
                                </p>
                            </div>
                        )}

                        <div className="pt-2 space-y-1.5">
                            <label htmlFor="restore-udise-input" className="block text-xs font-medium text-slate-600 dark:text-slate-300">
                                Restore from Cloud (Enter UDISE)
                            </label>
                            <div className="flex gap-2">
                                <input 
                                    id="restore-udise-input"
                                    type="text" 
                                    placeholder="Enter 11-digit UDISE Code"
                                    value={inputUdiseCode}
                                    onChange={(e) => setInputUdiseCode(e.target.value)}
                                    className="flex-1 h-[42px] px-3 text-sm bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl tabular-nums text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                                />
                                <Button 
                                    onClick={handleCloudRestore} 
                                    disabled={isCloudSyncing || inputUdiseCode.length < 5}
                                    className="px-4"
                                >
                                    {isCloudSyncing ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <CloudDownload className="w-4 h-4" />
                                    )}
                                    <span>Restore</span>
                                </Button>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Reset Application */}
                <section className="py-5 space-y-3">
                    <div>
                        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Reset Application</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            <span className="font-semibold text-rose-600 dark:text-rose-400">This action is irreversible.</span> Permanently clears all local records and settings. Export a backup first.
                        </p>
                    </div>
                    <Button onClick={() => setResetModalOpen(true)} variant="danger" className="w-full">
                        Reset All Data
                    </Button>
                </section>

                {/* App Version & Support */}
                <section className="pt-5 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">App Version & Updates</p>
                            <p className="text-sm font-semibold text-slate-900 dark:text-white tabular-nums mt-0.5">
                                PM POSHAN PRO v{appVersion}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                Offline-first ledger — all calculations stay on your device.
                            </p>
                        </div>
                        <Button 
                            onClick={handleManualUpdateCheck} 
                            disabled={isCheckingUpdate} 
                            variant="secondary" 
                            size="sm"
                        >
                            {isCheckingUpdate ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                                <RefreshCw className="w-3.5 h-3.5" />
                            )}
                            <span>{isCheckingUpdate ? 'Checking...' : 'Check for Updates'}</span>
                        </Button>
                    </div>

                    <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-3">
                        <div>
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Support & Developer</p>
                            <p className="text-sm font-semibold text-slate-900 dark:text-white mt-0.5">Imran Gani Mugloo</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <a
                                href="tel:+919149690096"
                                aria-label="Call support"
                                className="flex items-center justify-center w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-950/50 dark:hover:text-indigo-400 transition-colors"
                            >
                                <Phone className="w-4 h-4" />
                            </a>
                            <a
                                href="mailto:emraanmugloo123@gmail.com"
                                aria-label="Email support"
                                className="flex items-center justify-center w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-950/50 dark:hover:text-indigo-400 transition-colors"
                            >
                                <Mail className="w-4 h-4" />
                            </a>
                        </div>
                    </div>
                </section>
            </div>
        </>
    );
};

export default DataManagement;
