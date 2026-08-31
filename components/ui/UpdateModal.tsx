import React from 'react';
import Modal from './Modal';
import Button from './Button';
import { UpdateInfo } from '../../services/updateService';
import { Download, Sparkles, ArrowUpCircle, ExternalLink } from 'lucide-react';

interface UpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  updateInfo: UpdateInfo | null;
}

const UpdateModal: React.FC<UpdateModalProps> = ({ isOpen, onClose, updateInfo }) => {
  if (!updateInfo || !updateInfo.hasUpdate) return null;

  const handleUpdate = () => {
    if (updateInfo.downloadUrl) {
      window.open(updateInfo.downloadUrl, '_blank', 'noopener,noreferrer');
    }
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Update Available">
      <div className="space-y-4">
        {/* Header Icon & Version Banner */}
        <div className="flex items-center gap-3 p-3.5 bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 rounded-xl">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-indigo-600 text-white shadow-md shadow-indigo-500/20 shrink-0">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300">
                v{updateInfo.latestVersion}
              </span>
              <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 tracking-wider">
                New Version
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Installed: <span className="font-medium text-slate-700 dark:text-slate-300">v{updateInfo.currentVersion}</span>
            </p>
          </div>
        </div>

        {/* Release Notes */}
        <div className="space-y-1.5">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            What's New in {updateInfo.releaseName || `v${updateInfo.latestVersion}`}
          </h4>
          <div className="max-h-36 overflow-y-auto p-3 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
            {updateInfo.releaseNotes.trim() || 'Bug fixes and performance improvements.'}
          </div>
        </div>

        {/* Informational Notice */}
        <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">
          Clicking "Update Now" will download the latest APK file directly from GitHub.
        </p>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <Button variant="secondary" onClick={onClose} className="px-4 text-xs">
            Later
          </Button>
          <Button 
            onClick={handleUpdate} 
            className="px-4 text-xs bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5 shadow-md shadow-indigo-500/20"
          >
            <Download className="w-4 h-4" />
            Update Now
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default UpdateModal;
