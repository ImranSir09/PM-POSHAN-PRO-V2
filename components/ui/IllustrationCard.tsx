import React, { useMemo } from 'react';

interface IllustrationCardProps {
    inchargeName?: string;
    inchargeContact?: string;
}

const IllustrationCard: React.FC<IllustrationCardProps> = React.memo(({ inchargeName, inchargeContact }) => {
    const showInchargeDetails = Boolean(inchargeName && inchargeName.trim() !== '');

    const { greeting, dateSubtitle } = useMemo(() => {
        const now = new Date();
        const hour = now.getHours();
        const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
        const formatted = now.toLocaleDateString('en-IN', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        });
        return { greeting: greet, dateSubtitle: formatted };
    }, []);

    return (
        <div className="flex items-center justify-between gap-3 px-1 pt-0.5 pb-1">
            <div className="min-w-0">
                <h2 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-white truncate">
                    {showInchargeDetails ? `${greeting}, ${inchargeName}` : `${greeting}`}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {dateSubtitle}
                    {showInchargeDetails && (
                        <>
                            <span aria-hidden="true" className="mx-1.5">·</span>
                            <span>MDM Incharge</span>
                        </>
                    )}
                </p>
            </div>
            {showInchargeDetails && inchargeContact && (
                <div className="text-right text-xs text-slate-500 dark:text-slate-400 shrink-0 hidden sm:block tabular-nums">
                    {inchargeContact}
                </div>
            )}
        </div>
    );
});

IllustrationCard.displayName = 'IllustrationCard';

export default IllustrationCard;
