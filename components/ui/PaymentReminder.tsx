
import React from 'react';
import { CreditCard, Info } from 'lucide-react';
import { motion } from 'motion/react';

const PaymentReminder: React.FC = () => {
    return (
        <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 px-4 py-3 bg-white/40 dark:bg-slate-900/40 backdrop-blur-sm border border-slate-200/50 dark:border-slate-800/50 rounded-2xl flex items-center gap-3 shadow-sm group"
        >
            <div className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center shrink-0 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform">
                <CreditCard size={14} />
            </div>
            
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Subscription Support</span>
                    <Info size={10} className="text-slate-300 dark:text-slate-600" />
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-tight">
                    For enhanced features and cloud continuity, please support development via UPI <span className="font-bold text-indigo-600 dark:text-indigo-400">+91 9596555467</span>
                </p>
            </div>
        </motion.div>
    );
};

export default PaymentReminder;
