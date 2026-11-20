import React, { ReactNode } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: ReactNode;
    zIndex?: string;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, zIndex = 'z-50' }) => {
    if (!isOpen) return null;

    return (
        <div
            className={`fixed inset-0 flex items-center justify-center bg-slate-950/50 backdrop-blur-sm p-4 ${zIndex}`}
            onClick={onClose}
        >
            <div
                className="bg-white dark:bg-slate-950 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xl w-full max-w-md max-h-[88vh] flex flex-col overflow-hidden modal-enter"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800/80 flex justify-between items-center bg-slate-50/70 dark:bg-slate-900/60 shrink-0">
                    <h3 className="text-base font-semibold tracking-tight text-slate-900 dark:text-slate-100 pr-2 truncate">
                        {title}
                    </h3>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close modal"
                        className="h-9 w-9 flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors rounded-xl hover:bg-slate-200/60 dark:hover:bg-slate-800 shrink-0"
                    >
                        <X size={18} />
                    </button>
                </div>
                <div className="p-5 overflow-y-auto">
                    {children}
                </div>
            </div>
        </div>
    );
};

export default Modal;
