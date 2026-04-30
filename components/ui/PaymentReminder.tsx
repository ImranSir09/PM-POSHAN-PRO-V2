
import React from 'react';
import Card from './Card';

const PaymentReminder: React.FC = () => {
    return (
        <Card className="bg-indigo-50/50 dark:bg-indigo-900/20 border-indigo-100 dark:border-indigo-800/50 mb-6 overflow-hidden">
            <div className="flex flex-col sm:flex-row items-center gap-4 p-1">
                <div className="bg-white dark:bg-slate-800 p-2 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 shrink-0">
                    <img src="icons/icon-192.png" alt="Logo" className="w-10 h-10 object-contain" />
                </div>
                <div className="flex-1 text-center sm:text-left">
                    <h3 className="text-xs font-bold text-indigo-900 dark:text-indigo-300 uppercase tracking-wider mb-1">Service Subscription Reminder</h3>
                    <p className="text-[10px] text-slate-600 dark:text-slate-400 leading-relaxed">
                        To ensure improved service and official integration, please pay the nominal subscription fee.
                    </p>
                </div>
                <div className="bg-white dark:bg-slate-900/60 px-3 py-2 rounded-xl border border-indigo-100 dark:border-indigo-800 shrink-0 text-center min-w-[120px]">
                    <p className="text-[9px] text-slate-400 dark:text-slate-500 uppercase font-bold tracking-tighter mb-0.5">UPI Payment</p>
                    <p className="text-sm font-mono font-bold text-indigo-700 dark:text-indigo-400">+919596555467</p>
                </div>
            </div>
        </Card>
    );
};

export default PaymentReminder;
