/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Info, Router, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useLanguage } from '../contexts/LanguageContext';

const API_HOST = '';

const normalizeSamplingFrequency = (payload) => {
    if (typeof payload === 'number' && Number.isFinite(payload) && payload > 0) {
        return String(payload);
    }

    if (typeof payload === 'string') {
        const parsedValue = Number(payload);
        return Number.isFinite(parsedValue) && parsedValue > 0 ? String(parsedValue) : '';
    }

    if (payload && typeof payload === 'object') {
        const candidateKeys = [
            'read_frequency',
            // 'readFrequency',
            // 'POLLING_INTERVAL_MS',
            // 'pollingIntervalMs',
            // 'polling_interval_ms',
            // 'frequency',
            // 'samplingFrequency',
            // 'value',
        ];

        for (const key of candidateKeys) {
            const parsedValue = Number(payload[key]);
            if (Number.isFinite(parsedValue) && parsedValue > 0) {
                return String(parsedValue);
            }
        }
    }

    return '';
};

const parseFrequencyResponse = async (response) => {
    const responseText = await response.text();

    if (!responseText) {
        return '';
    }

    try {
        return normalizeSamplingFrequency(JSON.parse(responseText));
    } catch {
        return normalizeSamplingFrequency(responseText);
    }
};

export default function ConnectSetting({ isOpen, onClose, device }) {
    const deviceIdentifier = device?.name ?? device?.deviceName ?? device?.id ?? device?.deviceId;
    const deviceName = device?.name ?? device?.deviceName ?? '';
    const deviceApiId = device?.id ?? device?.deviceId ?? 4;
    const [ipAddress, setIpAddress] = useState('');
    const [samplingFrequency, setSamplingFrequency] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [feedback, setFeedback] = useState(null);
    const { t } = useLanguage();

    useEffect(() => {
        let isActive = true;

        if (!isOpen) {
            setFeedback(null);
            return () => {
                isActive = false;
            };
        }

        setIpAddress('');
        setSamplingFrequency('');
        setFeedback(null);

        if (!deviceIdentifier) {
            return () => {
                isActive = false;
            };
        }

        const fetchDeviceFrequency = async () => {
            const response = await fetch(`${API_HOST}/api/settings/frequency/${encodeURIComponent(deviceIdentifier)}`, {
                method: 'GET',
            });

            if (!response.ok) {
                throw new Error(`Frequency HTTP ${response.status}`);
            }

            return parseFrequencyResponse(response);
        };

        const fetchDeviceIp = async () => {
            const response = await fetch(`${API_HOST}/api/devices`, {
                method: 'GET',
            });

            if (!response.ok) {
                throw new Error(`Devices HTTP ${response.status}`);
            }

            const data = await response.json();
            const deviceList = Array.isArray(data) ? data : [];
            const matchedDevice = deviceList.find((deviceItem) => {
                const candidateIdentifiers = [deviceItem?.name, deviceItem?.deviceName].filter(Boolean);
                return candidateIdentifiers.some((candidate) => String(candidate) === String(deviceIdentifier));
            });

            return matchedDevice?.ip ? String(matchedDevice.ip) : '';
        };

        const loadDeviceSettings = async () => {
            setIsLoading(true);

            try {
                const [frequencyResult, ipResult] = await Promise.allSettled([
                    fetchDeviceFrequency(),
                    fetchDeviceIp(),
                ]);

                if (!isActive) {
                    return;
                }

                setSamplingFrequency(frequencyResult.status === 'fulfilled' ? frequencyResult.value : '');
                setIpAddress(ipResult.status === 'fulfilled' ? ipResult.value : '');

                if (frequencyResult.status === 'rejected') {
                    console.error('讀取設備頻率失敗:', frequencyResult.reason);
                }

                if (ipResult.status === 'rejected') {
                    console.error('讀取設備 IP 失敗:', ipResult.reason);
                }

                if (frequencyResult.status === 'rejected' || ipResult.status === 'rejected') {
                    setFeedback({ type: 'error', message: t('connectSetting.loadFailed') });
                }
            } finally {
                if (isActive) {
                    setIsLoading(false);
                }
            }
        };

        loadDeviceSettings();

        return () => {
            isActive = false;
        };
    }, [deviceIdentifier, isOpen, t]);

    const handleApply = async () => {
        setFeedback(null);

        if (!deviceIdentifier || !deviceName) {
            onClose?.();
            return;
        }

        const nextSamplingFrequency = Number(samplingFrequency);

        if (!Number.isFinite(nextSamplingFrequency) || nextSamplingFrequency <= 0) {
            setFeedback({
                type: 'error',
                message: t('connectSetting.invalidFrequency'),
            });
            return;
        }

        const payload = {
            name: deviceName,
            ip: ipAddress,
            read_frequency: nextSamplingFrequency,
        };

        setIsSubmitting(true);

        try {
            const response = await fetch(`${API_HOST}/api/devices/${encodeURIComponent(deviceApiId)}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            if (response.status === 200 || response.ok) {
                setFeedback({
                    type: 'success',
                    message: t('connectSetting.applySuccess'),
                });
                return;
            }

            setFeedback({
                type: 'error',
                message: t('connectSetting.applyFailed'),
            });
        } catch (error) {
            console.error('更新取樣頻率失敗:', error);
            setFeedback({
                type: 'error',
                message: t('connectSetting.applyFailed'),
            });
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
                                    <h3 className="text-xl font-bold text-slate-800">{t('connectSetting.title')}</h3>
                                    <p className="text-sm text-slate-500">
                                        {t('connectSetting.subtitle', { device: deviceName })}
                                    </p>
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
                            {feedback?.message && (
                                <div
                                    className={`rounded-xl border px-4 py-3 text-sm font-medium ${
                                        feedback.type === 'success'
                                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                            : 'border-red-200 bg-red-50 text-red-700'
                                    }`}
                                >
                                    {feedback.message}
                                </div>
                            )}

                            <div className="grid grid-cols-1 gap-6">
                                <InputField
                                    label={t('connectSetting.ipAddress')}
                                    value={ipAddress}
                                    placeholder={isLoading ? t('common.loading') : t('connectSetting.ipUnavailable')}
                                    readOnly
                                />
                                <InputField
                                    label={t('connectSetting.samplingFrequency')}
                                    type="number"
                                    value={samplingFrequency}
                                    placeholder={isLoading ? t('common.loading') : ''}
                                    onChange={(event) => setSamplingFrequency(event.target.value)}
                                    disabled={isLoading || isSubmitting}
                                />
                            </div>

                            <div className="flex gap-4 rounded-xl border border-blue-100 bg-blue-50/50 p-4">
                                <Info className="shrink-0 text-blue-600" size={20} />
                                <p className="text-xs leading-relaxed text-slate-600">
                                    {t('connectSetting.imformation')}
                                </p>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 border-t border-slate-100 bg-slate-50/50 px-8 py-6">
                            <button
                                onClick={onClose}
                                className="rounded-xl px-6 py-2.5 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-200"
                            >
                                {t('connectSetting.cancel')}
                            </button>
                            <button
                                onClick={handleApply}
                                disabled={isLoading || isSubmitting}
                                className="rounded-xl bg-blue-600 px-8 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-200 transition-all hover:bg-blue-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {isSubmitting ? t('common.saving') : t('connectSetting.apply')}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}

function InputField({ label, value, onChange, type = 'text', placeholder = '', readOnly = false, disabled = false }) {
    return (
        <div className="space-y-2">
            <label className="ml-1 text-sm font-bold text-slate-700">{label}</label>
            <input
                className={`h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-slate-900 outline-none transition-all ${
                    readOnly || disabled
                        ? 'cursor-not-allowed text-slate-500'
                        : 'focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10'
                }`}
                type={type}
                value={value ?? ''}
                onChange={onChange}
                placeholder={placeholder}
                readOnly={readOnly}
                disabled={disabled}
            />
        </div>
    );
}
