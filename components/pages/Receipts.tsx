import React, { useState, useMemo } from 'react';
import Card from '../ui/Card';
import Input from '../ui/Input';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import { supabase } from '../../../lib/supabase';
import { useData } from '../../hooks/useData';
import { useToast } from '../../hooks/useToast';
import { CategoryBalance, Category, Receipt } from '../../types';

const Receipts: React.FC = () => {
    const { addReceipt, deleteReceipt, data } = useData();
    const { showToast } = useToast();

    const todayString = useMemo(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }, []);

    const [date, setDate] = useState(todayString);
    const [rice, setRice] = useState<Record<Category, string>>({
        balvatika: '',
        primary: '',
        middle: ''
    });
    const [cash, setCash] = useState<Record<Category, string>>({
        balvatika: '',
        primary: '',
        middle: ''
    });
    const [receiptToDelete, setReceiptToDelete] = useState<string | null>(null);

    const handleValueChange = (
        setter: React.Dispatch<React.SetStateAction<Record<Category, string>>>,
        category: Category,
        value: string
    ) => {
        setter(prev => ({ ...prev, [category]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
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

        if (
            Object.values(riceBalance).some(v => v < 0) ||
            Object.values(cashBalance).some(v => v < 0)
        ) {
            showToast('Receipt values cannot be negative.', 'error');
            return;
        }

        const totalRice =
            riceBalance.balvatika +
            riceBalance.primary +
            riceBalance.middle;

        const totalCash =
            cashBalance.balvatika +
            cashBalance.primary +
            cashBalance.middle;

        if (!date || (totalRice === 0 && totalCash === 0)) {
            showToast('Please provide a date and at least one value.', 'error');
            return;
        }

        // ✅ Create receipt
        const newReceipt: Receipt = {
            id: Date.now().toString(),
            date,
            rice: riceBalance,
            cash: cashBalance
        };

        // ✅ Save locally
        addReceipt(newReceipt);

        // ✅ Get UDISE
        const school = JSON.parse(localStorage.getItem("pmposhan_school") || "{}");
        const udise = school?.udise;

        // ✅ Sync to Supabase (safe)
        if (udise) {
            try {
                await supabase.from('receipts').upsert([
                    {
                        id: newReceipt.id,
                        udise,
                        date,
                        rice: riceBalance,
                        cash: cashBalance
                    }
                ]);

                if (totalCash > 0) {
                    await supabase.from('cashbook').upsert([
                        {
                            id: Date.now(),
                            udise,
                            date,
                            totalcost: totalCash,
                            description: "Cooking Cost Received through Receipt",
                            type: "income",
                            source: "receipt",
                            receiptid: newReceipt.id
                        }
                    ]);
                }

            } catch (error) {
                console.error("Supabase sync failed:", error);
            }
        }

        showToast('Receipt saved and synced!', 'success');

        // ✅ Reset form
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
            <Modal
                isOpen={!!receiptToDelete}
                onClose={() => setReceiptToDelete(null)}
                title="Confirm Deletion"
            >
                <p className="text-sm mb-4">
                    Are you sure you want to delete this receipt?
                </p>
                <div className="flex justify-end space-x-2">
                    <Button variant="secondary" onClick={() => setReceiptToDelete(null)}>
                        Cancel
                    </Button>
                    <Button variant="danger" onClick={confirmDelete}>
                        Delete
                    </Button>
                </div>
            </Modal>

            <div className="space-y-4">
                <Card title="Add New Receipt">
                    <form onSubmit={handleSubmit} className="space-y-4">

                        <Input
                            label="Date"
                            type="date"
                            value={date}
                            onChange={e => setDate(e.target.value)}
                            required
                        />

                        <fieldset className="p-4 border rounded-xl">
                            <legend>Rice (kg)</legend>
                            <div className="grid grid-cols-3 gap-3">
                                <Input label="Balvatika" type="number" value={rice.balvatika} onChange={e => handleValueChange(setRice, 'balvatika', e.target.value)} />
                                <Input label="Primary" type="number" value={rice.primary} onChange={e => handleValueChange(setRice, 'primary', e.target.value)} />
                                <Input label="Middle" type="number" value={rice.middle} onChange={e => handleValueChange(setRice, 'middle', e.target.value)} />
                            </div>
                        </fieldset>

                        <fieldset className="p-4 border rounded-xl">
                            <legend>Cash (₹)</legend>
                            <div className="grid grid-cols-3 gap-3">
                                <Input label="Balvatika" type="number" value={cash.balvatika} onChange={e => handleValueChange(setCash, 'balvatika', e.target.value)} />
                                <Input label="Primary" type="number" value={cash.primary} onChange={e => handleValueChange(setCash, 'primary', e.target.value)} />
                                <Input label="Middle" type="number" value={cash.middle} onChange={e => handleValueChange(setCash, 'middle', e.target.value)} />
                            </div>
                        </fieldset>

                        <Button type="submit" className="w-full">
                            Save Receipt
                        </Button>
                    </form>
                </Card>
            </div>
        </>
    );
};

export default Receipts;
