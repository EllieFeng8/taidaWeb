/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Info, Router, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

const API_HOST = '';

export default function ConnectSetting({ isOpen, onClose, device }) {
    const deviceIdentifier = device?.name ?? device?.deviceName ?? device?.id ?? device?.deviceId;
    const [samplingFrequency, setSamplingFrequency] = useState('1');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleApply = async () => {
        if (!deviceIdentifier) {
            onClose?.();
            return;
        }

        const nextSamplingFrequency = Number(samplingFrequency);
        const payload = {
            read_frequency: Number.isNaN(nextSamplingFrequency) ? 0 : nextSamplingFrequency,
        };

        setIsSubmitting(true);

        try {
            console.log('Updating sampling frequency', {
                deviceIdentifier,
                payload,
            });

            const response = await fetch(`${API_HOST}/api/settings/frequency/${encodeURIComponent(deviceIdentifier)}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            console.log('Sampling frequency response', {
                status: response.status,
                ok: response.ok,
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            onClose?.();
        } catch (error) {
            console.error('更新取樣頻率失敗:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
                    >
                        <div className="flex items-center justify-between border-b border-slate-100 bg-white px-6 py-5">
                            <div className="flex items-center gap-4">
                                <div className="flex size-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                                    <Router size={28} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-slate-800">連線設定</h3>
                                    <p className="text-sm text-slate-500">設備 DEV-{device?.id} 的網路參數</p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <div className="space-y-6 p-8">
                            <div className="grid grid-cols-1 gap-6">
                                <InputField label="IP 地址" defaultValue="192.168.1.100" />
                                <InputField label="子網遮罩" defaultValue="255.255.255.0" />
                                <InputField label="預設閘道" defaultValue="192.168.1.1" />
                                <InputField label="DNS 伺服器" defaultValue="8.8.8.8" />
                                <InputField
                                    label="取樣頻率"
                                    type="number"
                                    value={samplingFrequency}
                                    onChange={(event) => setSamplingFrequency(event.target.value)}
                                />
                            </div>

                            <div className="flex gap-4 rounded-xl border border-blue-100 bg-blue-50/50 p-4">
                                <Info className="shrink-0 text-blue-600" size={20} />
                                <p className="text-xs leading-relaxed text-slate-600">
                                    請確保您的設備與網路參數相符。更改設定後可能需要重新啟動連線模組以生效。
                                </p>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 border-t border-slate-100 bg-slate-50/50 px-8 py-6">
                            <button
                                onClick={onClose}
                                className="rounded-xl px-6 py-2.5 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-200"
                            >
                                取消
                            </button>
                            <button
                                onClick={handleApply}
                                disabled={isSubmitting}
                                className="rounded-xl bg-blue-600 px-8 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-200 transition-all hover:bg-blue-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                確認套用
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}

function InputField({ label, defaultValue, value, onChange, type = 'text' }) {
    return (
        <div className="space-y-2">
            <label className="ml-1 text-sm font-bold text-slate-700">{label}</label>
            <input
                className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-slate-900 outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                type={type}
                defaultValue={defaultValue}
                value={value}
                onChange={onChange}
            />
        </div>
    );
}
