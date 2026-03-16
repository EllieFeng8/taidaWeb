import React, { useEffect, useState } from 'react';
import { Edit3 } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

export default function ConfigurationPanel({ onClose, onSaved }) {
    const { t } = useLanguage();
    const [showSavedToast, setShowSavedToast] = useState(false);
    const [groupName, setGroupName] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [saveError, setSaveError] = useState('');

    useEffect(() => {
        if (!showSavedToast) {
            return undefined;
        }

        const closeTimer = setTimeout(() => {
            onClose?.();
        }, 1000);

        return () => clearTimeout(closeTimer);
    }, [onClose, showSavedToast]);

    const handleSave = async () => {
        const trimmedName = groupName.trim();

        if (!trimmedName) {
            setSaveError(t('config.error.groupNameRequired'));
            return;
        }

        setIsSaving(true);
        setSaveError('');

        try {
            const response = await fetch('/api/groups', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: trimmedName,
                }),
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            setShowSavedToast(true);
            await onSaved?.();
        } catch (error) {
            console.error(t('groups.log.saveGroupFailed'), error);
            setSaveError(t('groups.error.saveGroupFailed'));
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <section className="relative bg-white border border-slate-200 rounded-xl p-8 shadow-sm">
            {showSavedToast && (
                <div className="absolute right-6 top-6 z-10 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700 shadow-lg shadow-emerald-100">
                    {t('config.saved')}
                </div>
            )}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
                <div>
                    <h3 className="text-xl font-bold flex items-center gap-2 text-slate-800">
                        <Edit3 className="text-primary" size={24} />
                        {t('groups.title')}
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">{t('config.subtitle')}</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
                    >
                        {t('common.cancel')}
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="px-6 py-2 text-sm font-bold text-white bg-primary rounded-lg shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:scale-100"
                    >
                        {isSaving ? t('common.saving') : t('common.saveChanges')}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                <div className="space-y-6 lg:col-span-1">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">{t('config.groupNameLabel')}</label>
                        <input
                            className="w-full bg-slate-50 border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                            type="text"
                            value={groupName}
                            onChange={(event) => setGroupName(event.target.value)}
                            placeholder={t('config.groupNamePlaceholder')}
                        />

                        {saveError && (
                            <p className="mt-2 text-xs font-medium text-red-600">{saveError}</p>
                        )}
                    </div>

                    {/*<div className="p-4 rounded-xl bg-primary/5 border border-primary/10">*/}

                    {/*    <p className="text-xs text-slate-600 leading-relaxed">*/}
                    {/*        {t('config.apiHint')}*/}
                    {/*    </p>*/}
                    {/*</div>*/}
                </div>


            </div>
        </section>
    );
}
