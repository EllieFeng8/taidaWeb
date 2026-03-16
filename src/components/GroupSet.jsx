/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
    ArrowLeft,
    Check,
    Save
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { useLanguage } from '../contexts/LanguageContext';

const getGroupDeviceIdSet = (group) => {
    const devices = Array.isArray(group?.devices) ? group.devices : [];

    return new Set(
        devices.flatMap((device) => {
            if (typeof device === 'string') {
                return [device];
            }

            if (device && typeof device === 'object') {
                return [String(device.id), device.name].filter(Boolean);
            }

            return [];
        })
    );
};

export default function GroupSet({ group, onBack }) {
    const { t } = useLanguage();
    const [devices, setDevices] = useState([]);
    const [showSavedToast, setShowSavedToast] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [initialSelectedDeviceIds, setInitialSelectedDeviceIds] = useState([]);

    useEffect(() => {
        const selectedDeviceIds = getGroupDeviceIdSet(group);

        const fetchDevices = async () => {
            try {
                const response = await fetch('/api/devices', {
                    method: 'GET',
                });
                const data = await response.json();
                const normalizedDevices = Array.isArray(data)
                    ? data.map((device, index) => {
                        const id = String(device?.id ?? device?.deviceId ?? device?.name ?? `device-${index}`);
                        const name = device?.name ?? device?.deviceName ?? id;
                        const selected = selectedDeviceIds.has(id) || selectedDeviceIds.has(name);

                        return {
                            id,
                            name,
                            selected,
                        };
                    })
                    : [];

                setDevices(normalizedDevices);
                setInitialSelectedDeviceIds(
                    normalizedDevices.filter((device) => device.selected).map((device) => device.id)
                );
            } catch (error) {
                console.error(t('groups.error.fetchDevices'), error);
                setDevices([]);
                setInitialSelectedDeviceIds([]);
            }
        };

        fetchDevices();
    }, [group, t]);

    const toggleDevice = (id) => {
        setDevices(prev => prev.map(d => d.id === id ? { ...d, selected: !d.selected } : d));
    };

    useEffect(() => {
        if (!showSavedToast) {
            return undefined;
        }

        const backTimer = setTimeout(() => {
            onBack();
        }, 1000);

        return () => clearTimeout(backTimer);
    }, [onBack, showSavedToast]);

    const handleSave = async () => {
        if (!group?.id) {
            window.alert(t('groups.error.saveMissingId'));
            return;
        }

        const initialSelectedSet = new Set(initialSelectedDeviceIds);
        const currentSelectedDevices = devices.filter((device) => device.selected);
        const currentSelectedSet = new Set(currentSelectedDevices.map((device) => device.id));
        const devicesToAdd = currentSelectedDevices.filter((device) => !initialSelectedSet.has(device.id));
        const devicesToRemove = devices.filter((device) => !currentSelectedSet.has(device.id) && initialSelectedSet.has(device.id));

        setIsSaving(true);

        try {
            await Promise.all([
                ...devicesToAdd.map((device) =>
                    fetch(`/api/groups/${encodeURIComponent(group.id)}/devices/${encodeURIComponent(device.id)}`, {
                        method: 'POST',
                    }).then((response) => {
                        console.log(t('groups.log.deviceAdded'), {
                            action: 'add',
                            groupId: group.id,
                            groupName: group.name,
                            deviceId: device.id,
                            deviceName: device.name,
                            status: response.status,
                        });

                        if (!response.ok) {
                            throw new Error(`HTTP ${response.status}`);
                        }
                    })
                ),
                ...devicesToRemove.map((device) =>
                    fetch(`/api/groups/${encodeURIComponent(group.id)}/devices/${encodeURIComponent(device.id)}`, {
                        method: 'DELETE',
                    }).then((response) => {
                        console.log(t('groups.log.deviceRemoved'), {
                            action: 'remove',
                            groupId: group.id,
                            groupName: group.name,
                            deviceId: device.id,
                            deviceName: device.name,
                            status: response.status,
                        });

                        if (!response.ok) {
                            throw new Error(`HTTP ${response.status}`);
                        }
                    })
                ),
            ]);

            setInitialSelectedDeviceIds(Array.from(currentSelectedSet));
            setShowSavedToast(true);
        } catch (error) {
            console.error(t('groups.log.saveDevicesFailed'), error);
            window.alert(t('groups.error.saveDevicesFailed'));
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteGroup = async () => {
        if (!group?.id) {
            window.alert(t('groups.error.deleteMissingId'));
            return;
        }

        const confirmed = window.confirm(t('groups.confirm.deleteWithName', { name: group.name }));

        if (!confirmed) {
            return;
        }

        setIsDeleting(true);

        try {
            const response = await fetch(`/api/groups/${encodeURIComponent(group.id)}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            onBack?.();
        } catch (error) {
            console.error(t('groups.log.deleteFailed'), error);
            window.alert(t('groups.error.deleteFailed'));
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className="flex h-screen overflow-hidden font-sans">
            {showSavedToast && (
                <div className="fixed bottom-24 right-8 z-40 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700 shadow-lg shadow-emerald-100">
                    {t('common.saveSuccess')}
                </div>
            )}


            {/* Main content */}
            <main className="flex-1 flex flex-col overflow-hidden bg-background-light">

                {/* Scrollable content */}
                <div className="flex-1 overflow-y-auto p-10">
                    <div className="max-w-4xl mx-auto space-y-8">
                        {/* Header */}
                        <div className="space-y-3">
                            <div className="flex items-center gap-4">
                                <button
                                    type="button"
                                    onClick={onBack}
                                    className="p-2 hover:bg-white border border-transparent hover:border-slate-200 rounded-lg transition-all text-slate-500"
                                >
                                    <ArrowLeft size={20} />
                                </button>
                                <div>
                                    <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">{t('groups.deviceManagementTitle')}</h1>
                                    <p className="text-sm text-primary font-bold mt-1">{group?.name ?? t('groups.defaultGroupName')}</p>
                                </div>
                            </div>
                            <p className="text-slate-500 leading-relaxed max-w-2xl">
                                {t('groups.deviceManagementDescription')}
                            </p>
                        </div>

                        {/* Device list */}
                        <motion.section
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm"
                        >
                            <div className="p-6 border-b border-slate-100">
                                <h3 className="text-lg font-bold text-slate-800">{t('groups.availableDevices')}</h3>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                    <tr className="bg-slate-50/50">
                                        <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 w-24 text-center">{t('groups.table.select')}</th>
                                        <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">{t('groups.table.deviceId')}</th>
                                        <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">{t('groups.table.deviceName')}</th>
                                    </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                    {devices.map((device) => (
                                        <tr key={device.id} className="hover:bg-slate-50/50 transition-colors group">
                                            <td className="px-6 py-5 text-center">
                                                <button
                                                    onClick={() => toggleDevice(device.id)}
                                                    className={`mx-auto w-6 h-6 rounded-lg border flex items-center justify-center transition-all ${
                                                        device.selected
                                                            ? 'bg-primary border-primary text-white'
                                                            : 'border-slate-300 bg-white group-hover:border-primary'
                                                    }`}
                                                >
                                                    {device.selected && <Check size={16} strokeWidth={3} />}
                                                </button>
                                            </td>
                                            <td className="px-6 py-5 font-bold text-slate-700 text-lg">{device.id}</td>
                                            <td className="px-6 py-5 text-slate-600">{device.name}</td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            </div>

                            {/*<div className="px-6 py-4 bg-slate-50/30 border-t border-slate-100">*/}
                            {/*    <p className="text-sm text-slate-400 font-medium">{t('groups.table.summary', { shown: devices.length, total: devices.length })}</p>*/}
                            {/*</div>*/}
                        </motion.section>
                    </div>
                </div>

                {/* Footer action bar */}
                <footer className="p-6 border-t border-slate-200 bg-white">
                    <div className="fixed bottom-0 left-64 right-0 z-20 flex items-center justify-between gap-4 border-t border-slate-200 bg-white/80 p-6 backdrop-blur-md">
                        <button
                            onClick={handleDeleteGroup}
                            disabled={isDeleting}
                            className="px-6 py-2.5 rounded-xl border border-red-200 bg-red-50 text-sm font-bold text-red-600 hover:bg-red-100 transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {isDeleting ? t('common.deleting') : t('groups.deleteGroup')}
                        </button>
                        <div className="flex items-center gap-4">
                        <button onClick={onBack} className="px-6 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors">
                            {t('common.cancel')}
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="px-8 py-2.5 rounded-xl bg-primary text-white text-sm font-bold shadow-lg shadow-blue-500/20 hover:bg-blue-600 transition-all flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            <Save size={18} />
                            {isSaving ? t('common.saving') : t('groups.saveGroupSettings')}
                        </button>
                        </div>
                    </div>
                </footer>
            </main>
        </div>
    );
}

