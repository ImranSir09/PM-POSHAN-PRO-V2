import React, { useState, useMemo } from 'react';
import Card from '../ui/Card';
import Input from '../ui/Input';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import DatePicker from '../ui/DatePicker';
import { useData } from '../../hooks/useData';
import { useToast } from '../../hooks/useToast';
import { CategoryBalance, Category } from '../../types';
import { Trash2 } from 'lucide-react';

const Receipts: React.FC = () => {
    const { addReceipt, deleteReceipt, data } = useData();
    const { showToast } = useToast();

    const todayString = useMemo(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }, []);

    const [date, setDate] = useState(todayString);
    const [rice, setRice] = useState<Record<Category, string>>({ balvatika: '', primary: '', middle: '' });
    const [cash, setCash] = useState<Record<Category, string>>({ balvatika: '', primary: '', middle: '' });
    const [receiptToDelete, setReceiptToDelete] = useState<string | null>(null);

    const handleValueChange = (
        setter: React.Dispatch<React.SetStateAction<Record<Category, string>>>,
        category: Category,
        value: string
    ) => {
        setter(prev => ({ ...prev, [category]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const riceBalance: CategoryBalance = {
            balvatika: parseFloat(rice.balvatika) || 0,
            primary: parseFloat(rice.primary) || 0,
            middle: parseFloat(rice.middle) || 0,
        };

        const cashBalance: CategoryBalance = {
            balvatika: parseFloat(cash.balvatika) || 0,
            primary: parseFloat(cash.primary) || 0,
            middle: parseFloat(cash.middle) || 0,
        };

        if (Object.values(riceBalance).some(v => v < 0) || Object.values(cashBalance).some(v => v < 0)) {
            showToast('Receipt values cannot be negative.', 'error');
            return;
        }

        const totalRice = riceBalance.balvatika + riceBalance.primary + riceBalance.middle;
        const totalCash = cashBalance.balvatika + cashBalance.primary + cashBalance.middle;

        if (!date || (totalRice === 0 && totalCash === 0)) {
            showToast('Please provide a date and at least one value.', 'error');
            return;
        }

        addReceipt({ date, rice: riceBalance, cash: cashBalance });
        showToast('Receipt saved successfully!', 'success');
        setRice({ balvatika: '', primary: '', middle: '' });
        setCash({ balvatika: '', primary: '', middle: '' });
    };

    const confirmDelete = () => {
        if (receiptToDelete) {
            deleteReceipt(receiptToDelete);
            showToast('Receipt deleted successfully!', 'success');
            setReceiptToDelete(null);
        }
    };

    return (
        <>
            <Modal isOpen={!!receiptToDelete} onClose={() => setReceiptToDelete(null)} title="Confirm Deletion">
                <p className="text-sm text-slate-600 dark:text-slate-300 mb-5">Are you sure you want to delete this receipt? This action cannot be undone.</p>
                <div className="flex justify-end gap-2">
                    <Button variant="secondary" onClick={() => setReceiptToDelete(null)}>Cancel</Button>
                    <Button variant="danger" onClick={confirmDelete}>Delete</Button>
                </div>
            </Modal>
            <div className="space-y-4">
                <Card title="Add New Receipt">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <p className="text-xs text-slate-500 dark:text-slate-400 -mt-2">
                            Log incoming rice and cash allotments. Receipts are added to your stock and reflected in the monthly summary.
                        </p>

                        <DatePicker
                            id="receipt-date"
                            label="Date"
                            value={date}
                            onChange={setDate}
                            max={todayString}
                        />

                        <div className="space-y-2.5 pt-1 border-t border-slate-100 dark:border-slate-800/80">
                            <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 pt-2">
                                Rice Received (kg)
                            </p>
                            <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
                                <Input label="Balvatika" id="rice-bal" type="number" step="0.01" placeholder="0" value={rice.balvatika} onChange={e => handleValueChange(setRice, 'balvatika', e.target.value)} min="0" max="9999" />
                                <Input label="Primary" id="rice-pri" type="number" step="0.01" placeholder="0" value={rice.primary} onChange={e => handleValueChange(setRice, 'primary', e.target.value)} min="0" max="9999" />
                                <Input label="Middle" id="rice-mid" type="number" step="0.01" placeholder="0" value={rice.middle} onChange={e => handleValueChange(setRice, 'middle', e.target.value)} min="0" max="9999" />
                            </div>
                        </div>

                        <div className="space-y-2.5 pt-1 border-t border-slate-100 dark:border-slate-800/80">
                            <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 pt-2">
                                Cash Received (₹)
                            </p>
                            <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
                                <Input label="Balvatika" id="cash-bal" type="number" step="0.01" placeholder="0" value={cash.balvatika} onChange={e => handleValueChange(setCash, 'balvatika', e.target.value)} min="0" max="99999" />
                                <Input label="Primary" id="cash-pri" type="number" step="0.01" placeholder="0" value={cash.primary} onChange={e => handleValueChange(setCash, 'primary', e.target.value)} min="0" max="99999" />
                                <Input label="Middle" id="cash-mid" type="number" step="0.01" placeholder="0" value={cash.middle} onChange={e => handleValueChange(setCash, 'middle', e.target.value)} min="0" max="99999" />
                            </div>
                        </div>

                        <Button type="submit" className="w-full">Save Receipt</Button>
                    </form>
                </Card>

                <Card title="Recent Receipts">
                    <div className="overflow-x-auto max-h-72 rounded-xl border border-slate-200/80 dark:border-slate-800/80">
                        <table className="min-w-[540px] w-full text-xs text-left border-collapse">
                            <thead className="bg-slate-50/95 dark:bg-slate-900/90 sticky top-0 z-10 border-b border-slate-200/80 dark:border-slate-800">
                                <tr>
                                    <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400" rowSpan={2}>Date</th>
                                    <th className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-center border-b border-slate-200/70 dark:border-slate-800" colSpan={3}>Rice (kg)</th>
                                    <th className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-center border-b border-slate-200/70 dark:border-slate-800" colSpan={3}>Cash (₹)</th>
                                    <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-right" rowSpan={2}>Action</th>
                                </tr>
                                <tr>
                                    <th className="px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 text-right">Bal</th>
                                    <th className="px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 text-right">Pri</th>
                                    <th className="px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 text-right">Mid</th>
                                    <th className="px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 text-right">Bal</th>
                                    <th className="px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 text-right">Pri</th>
                                    <th className="px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 text-right">Mid</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 bg-white dark:bg-slate-950">
                                {data.receipts.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="p-6 text-center text-slate-500 dark:text-slate-400">
                                            No receipts have been added yet.
                                        </td>
                                    </tr>
                                ) : (
                                    [...data.receipts].reverse().map(receipt => (
                                        <tr key={receipt.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-900/40 transition-colors">
                                            <td className="px-3 py-2.5 font-medium text-slate-800 dark:text-slate-200 whitespace-nowrap tabular-nums">
                                                {new Date(receipt.date + 'T00:00:00').toLocaleDateString('en-IN')}
                                            </td>
                                            <td className="px-2.5 py-2.5 text-right text-slate-700 dark:text-slate-300 tabular-nums">{receipt.rice.balvatika.toFixed(2)}</td>
                                            <td className="px-2.5 py-2.5 text-right text-slate-700 dark:text-slate-300 tabular-nums">{receipt.rice.primary.toFixed(2)}</td>
                                            <td className="px-2.5 py-2.5 text-right text-slate-700 dark:text-slate-300 tabular-nums">{receipt.rice.middle.toFixed(2)}</td>
                                            <td className="px-2.5 py-2.5 text-right text-slate-700 dark:text-slate-300 tabular-nums">{receipt.cash.balvatika.toFixed(2)}</td>
                                            <td className="px-2.5 py-2.5 text-right text-slate-700 dark:text-slate-300 tabular-nums">{receipt.cash.primary.toFixed(2)}</td>
                                            <td className="px-2.5 py-2.5 text-right text-slate-700 dark:text-slate-300 tabular-nums">{receipt.cash.middle.toFixed(2)}</td>
                                            <td className="px-3 py-2 text-right">
                                                <button
                                                    type="button"
                                                    onClick={() => setReceiptToDelete(receipt.id)}
                                                    aria-label="Delete receipt"
                                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                    <span>Delete</span>
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>
        </>
    );
};

export default Receipts;
