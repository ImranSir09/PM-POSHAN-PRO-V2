import React, { useRef, useState } from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { supabase } from '../../lib/supabase';
import { useData } from '../../hooks/useData';
import { useToast } from '../../hooks/useToast';
import Modal from '../ui/Modal';
import { AppData } from '../../types';
import { validateImportData } from '../../services/dataValidator';

const DataManagement: React.FC = () => {
    const { data, importData, resetData, updateLastBackupDate } = useData();
    const { showToast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);

    // ✅ SAFE UDISE FETCH
    const getUdise = () => {
        try {
            const raw = localStorage.getItem("pmPoshanData_v2");
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            return parsed?.settings?.schoolDetails?.udise || null;
        } catch (e) {
            console.error("UDISE parse error", e);
            return null;
        }
    };

    // ✅ BACKUP (SAFE + UPSERT FIXED)
    const backupToCloud = async () => {
        const udise = getUdise();

        if (!udise) {
            showToast("UDISE not found", "error");
            return;
        }

        try {
            const raw = localStorage.getItem("pmPoshanData_v2");
            const fullData = raw ? JSON.parse(raw) : {};

            const { error } = await supabase.from('backups').upsert(
                [
                    {
                        udise,
                        data: fullData
                    }
                ],
                { onConflict: 'udise' }
            );

            if (error) {
                console.error(error);
                showToast("Backup failed", "error");
            } else {
                showToast("Backup saved", "success");
            }

        } catch (e) {
            console.error("Backup crash:", e);
            showToast("Backup error", "error");
        }
    };

    // ✅ RESTORE (NO CRASH VERSION)
    const restoreFromCloud = async () => {
        const udise = getUdise();

        if (!udise) {
            showToast("UDISE not found", "error");
            return;
        }

        try {
            const { data: row, error } = await supabase
                .from('backups')
                .select('*')
                .eq('udise', udise)
                .limit(1)
                .maybeSingle();

            if (error) {
                console.error(error);
                showToast("Restore failed", "error");
                return;
            }

            if (!row || !row.data) {
                showToast("No backup found", "error");
                return;
            }

            localStorage.setItem("pmPoshanData_v2", JSON.stringify(row.data));

            showToast("Restored successfully", "success");

            setTimeout(() => window.location.reload(), 800);

        } catch (e) {
            console.error("Restore crash:", e);
            showToast("Unexpected error", "error");
        }
    };

    // UI STATE
    const [isResetModalOpen, setResetModalOpen] = useState(false);
    const [importConfirmation, setImportConfirmation] = useState<{ data: AppData; summary: Record<string, string | number> } | null>(null);

    const handleExport = () => {
        try {
            const jsonString = JSON.stringify(data, null, 2);
            const blob = new Blob([jsonString], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');

            const schoolName = (data.settings.schoolDetails.name || 'School').replace(/[\\/:"*?<>|.\s]+/g, '_');

            const today = new Date();
            const dateString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

            a.href = url;
            a.download = `PM_POSHAN_Backup_${schoolName}_${dateString}.json`;
            document.body.appendChild(a);
            a.click();

            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 100);

            showToast('Export successful', 'success');
            updateLastBackupDate();

        } catch (error) {
            console.error(error);
            showToast('Export failed', 'error');
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
                if (typeof text !== 'string') throw new Error();

                const parsedData = JSON.parse(text);
                const { isValid, errors, summary } = validateImportData(parsedData);

                if (!isValid) {
                    errors.forEach(err => showToast(err, 'error'));
                    return;
                }

                setImportConfirmation({ data: parsedData as AppData, summary });

            } catch {
                showToast('Invalid file', 'error');
            }
        };

        reader.readAsText(file);
        event.target.value = '';
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

    return (
        <>
            <Modal isOpen={isResetModalOpen} onClose={() => setResetModalOpen(false)} title="Confirm Reset">
                <p className="text-sm mb-4">Delete all data permanently?</p>
                <div className="flex justify-end space-x-2">
                    <Button onClick={() => setResetModalOpen(false)}>Cancel</Button>
                    <Button variant="danger" onClick={handleReset}>Reset</Button>
                </div>
            </Modal>

            <Modal isOpen={!!importConfirmation} onClose={() => setImportConfirmation(null)} title="Confirm Import">
                <div className="space-y-4">
                    <p className="text-sm">This will overwrite current data.</p>
                    <div className="text-sm p-3 border rounded">
                        <p>School: {importConfirmation?.summary.schoolName}</p>
                        <p>UDISE: {importConfirmation?.summary.udise}</p>
                    </div>
                    <div className="flex justify-end space-x-2">
                        <Button onClick={() => setImportConfirmation(null)}>Cancel</Button>
                        <Button variant="danger" onClick={handleConfirmImport}>Confirm</Button>
                    </div>
                </div>
            </Modal>

            <div className="space-y-4">
                <Card title="Data Backup & Restore">
                    <div className="space-y-2">
                        <Button onClick={handleExport}>Export JSON</Button>
                        <Button onClick={handleImportClick}>Import JSON</Button>
                        <input type="file" ref={fileInputRef} onChange={handleFileChange} hidden />

                        <Button onClick={backupToCloud}>Backup to Cloud</Button>
                        <Button onClick={restoreFromCloud} variant="secondary">Restore from Cloud</Button>
                    </div>
                </Card>

                <Card title="Reset">
                    <Button onClick={() => setResetModalOpen(true)} variant="danger">Reset App</Button>
                </Card>
            </div>
        </>
    );
};

export default DataManagement;