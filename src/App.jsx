import React, {useEffect, useRef, useState} from 'react';
import {Sidebar} from './components/Sidebar';
import {Header} from './components/Header';
import GroupSettings from './page/GroupSettings.jsx';
import {GroupControl} from './components/GroupControl';
import {Dashboard} from './page/Dashboard';
import Alarm from './page/Alarm.jsx';
import {IndustrialControl} from './page/IndustrialControl.jsx';
import HistoryList from './page/HistoryList.jsx';
import {LanguageProvider, useLanguage} from './contexts/LanguageContext';

const DEFAULT_POLLING_INTERVAL_MS = 1000;
const DEVICE_REFRESH_INTERVAL_MS = 30000;

const INPUT_REGISTER_KEYS = {
    register29: ['abnormal_code'],
    register30: ['inverter_abnormal_code'],
};

const REGISTER_29_ALERT_MESSAGES = {
    1: '電磁閥一 異常',
    2: '電磁閥二 異常',
    3: '風扇 異常',
};

const REGISTER_30_ALERT_MESSAGES = {
    1: '加速過電流(ocA)',
    2: '減速過電流(ocd)',
    21: '過載(OverLoad)',
    24: '馬達過熱',
    33: 'U 相電流檢知異常',
    34: 'V 相電流檢知異常',
    35: 'W相電流檢知異常',
    76: 'STO',
};

const getDeviceIdentifier = (device) => device?.name ?? device?.deviceName ?? device?.id ?? device?.deviceId ?? '';

const readFirstAvailableValue = (payload, keys) => {
    for (const key of keys) {
        if (payload?.[key] !== undefined && payload?.[key] !== null) {
            return payload[key];
        }
    }

    return undefined;
};

const parseHexRegisterValue = (value) => {
    if (value === undefined || value === null) {
        return null;
    }

    if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
    }

    const normalizedValue = String(value).trim();
    if (!normalizedValue) {
        return null;
    }

    const sanitizedValue = normalizedValue.startsWith('0x') || normalizedValue.startsWith('0X')
        ? normalizedValue.slice(2)
        : normalizedValue;

    if (!/^[0-9a-fA-F]+$/.test(sanitizedValue)) {
        return Number.isFinite(Number(normalizedValue)) ? Number(normalizedValue) : null;
    }

    return Number.parseInt(sanitizedValue, 16);
};

const isNormalRegisterValue = (value) => {
    const decimalValue = parseHexRegisterValue(value);

    if (decimalValue === null) {
        return true;
    }

    return decimalValue === 0;
};

const toUpperHexCode = (value) => {
    const numericValue = parseHexRegisterValue(value);

    if (!Number.isFinite(numericValue)) {
        return String(value).trim();
    }

    return `0x${numericValue.toString(16).toUpperCase()}`;
};

const getRegister29AlertMessage = (value) => {
    const numericValue = parseHexRegisterValue(value);

    if (!Number.isFinite(numericValue)) {
        return '';
    }

    return REGISTER_29_ALERT_MESSAGES[numericValue] ?? '';
};

const getRegister30AlertMessage = (value) => {
    const numericValue = parseHexRegisterValue(value);

    if (!Number.isFinite(numericValue)) {
        return '';
    }

    return REGISTER_30_ALERT_MESSAGES[numericValue] ?? '';
};

const getRegisterAlertDecimalValue = (value) => {
    const numericValue = parseHexRegisterValue(value);

    return Number.isFinite(numericValue) ? numericValue : null;
};

function AppContent() {
    const {t} = useLanguage();
    const [activeTab, setActiveTab] = useState('dashboard');
    const [selectedGroup, setSelectedGroup] = useState(null);
    const [selectedDevice, setSelectedDevice] = useState(null);
    const [inputAlertToasts, setInputAlertToasts] = useState([]);
    const devicesRef = useRef([]);
    const activeAlertsByDeviceRef = useRef(new Map());
    const toastTimeoutsRef = useRef(new Map());
    const tabLabels = {
        dashboard: t('tab.dashboard'),
        groups: t('tab.groups'),
        alerts: t('tab.alerts'),
        history: t('tab.history'),
        logs: t('tab.logs'),
        control: t('tab.control'),
        industrialControl: t('tab.industrialControl')
    };

    const [groups] = useState([]);

    useEffect(() => () => {
        toastTimeoutsRef.current.forEach((timeoutId) => clearTimeout(timeoutId));
        toastTimeoutsRef.current.clear();
    }, []);

    const removeToast = (toastId) => {
        setInputAlertToasts((prev) => prev.filter((toast) => toast.id !== toastId));

        const timeoutId = toastTimeoutsRef.current.get(toastId);
        if (timeoutId) {
            clearTimeout(timeoutId);
            toastTimeoutsRef.current.delete(toastId);
        }
    };

    const pushToast = (message) => {
        const toastId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
        setInputAlertToasts((prev) => [...prev, {id: toastId, message}]);

        const timeoutId = setTimeout(() => {
            setInputAlertToasts((prev) => prev.filter((toast) => toast.id !== toastId));
            toastTimeoutsRef.current.delete(toastId);
        }, 10000);

        toastTimeoutsRef.current.set(toastId, timeoutId);
    };

    useEffect(() => {
        let isMounted = true;

        const fetchDevices = async () => {
            try {
                const response = await fetch('/api/devices', {method: 'GET'});

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }

                const data = await response.json();
                const nextDevices = Array.isArray(data) ? data : [];

                if (!isMounted) {
                    return;
                }

                devicesRef.current = nextDevices;

                const nextIdentifiers = new Set(nextDevices.map(getDeviceIdentifier).filter(Boolean));
                Array.from(activeAlertsByDeviceRef.current.keys()).forEach((identifier) => {
                    if (!nextIdentifiers.has(identifier)) {
                        activeAlertsByDeviceRef.current.delete(identifier);
                    }
                });
            } catch (error) {
                console.error('取得設備清單失敗:', error);
            }
        };

        fetchDevices();
        const intervalId = setInterval(fetchDevices, DEVICE_REFRESH_INTERVAL_MS);

        return () => {
            isMounted = false;
            clearInterval(intervalId);
        };
    }, []);

    useEffect(() => {
        let isPolling = false;
        let isDisposed = false;

        const pollInputRegisters = async () => {
            if (isPolling || isDisposed) {
                return;
            }

            const devices = devicesRef.current.filter((device) => getDeviceIdentifier(device));
            if (!devices.length) {
                return;
            }

            isPolling = true;

            try {
                const results = await Promise.allSettled(
                    devices.map(async (device) => {
                        const deviceIdentifier = getDeviceIdentifier(device);
                        const response = await fetch(`/api/modbus/input/${encodeURIComponent(deviceIdentifier)}`, {
                            method: 'GET',
                        });

                        if (!response.ok) {
                            throw new Error(`HTTP ${response.status}`);
                        }

                        const data = await response.json();
                        return {deviceIdentifier, data};
                    })
                );

                if (isDisposed) {
                    return;
                }

                results.forEach((result) => {
                    if (result.status !== 'fulfilled') {
                        return;
                    }

                    const {deviceIdentifier, data} = result.value;
                    const register29Value = readFirstAvailableValue(data, INPUT_REGISTER_KEYS.register29);
                    const register30Value = readFirstAvailableValue(data, INPUT_REGISTER_KEYS.register30);
                    const nextActiveAlerts = new Set();
                    const previousActiveAlerts = activeAlertsByDeviceRef.current.get(deviceIdentifier) ?? new Set();

                    if (!isNormalRegisterValue(register29Value)) {
                        const abnormalMessage = getRegister29AlertMessage(register29Value);

                        if (!abnormalMessage) {
                            return;
                        }

                        const abnormalCode = getRegisterAlertDecimalValue(register29Value);
                        const alertKey = `29:${abnormalCode}`;
                        nextActiveAlerts.add(alertKey);

                        if (!previousActiveAlerts.has(alertKey)) {
                            pushToast(`${deviceIdentifier} ${abnormalMessage}`);
                        }
                    }

                    if (!isNormalRegisterValue(register30Value)) {
                        const abnormalMessage = getRegister30AlertMessage(register30Value);

                        if (!abnormalMessage) {
                            return;
                        }

                        const abnormalCode = getRegisterAlertDecimalValue(register30Value);
                        const alertKey = `30:${abnormalCode}`;
                        nextActiveAlerts.add(alertKey);

                        if (!previousActiveAlerts.has(alertKey)) {
                            pushToast(`${deviceIdentifier} ${abnormalMessage}`);
                        }
                    }

                    activeAlertsByDeviceRef.current.set(deviceIdentifier, nextActiveAlerts);
                });
            } finally {
                isPolling = false;
            }
        };

        pollInputRegisters();
        const intervalId = setInterval(pollInputRegisters, DEFAULT_POLLING_INTERVAL_MS);

        return () => {
            isDisposed = true;
            clearInterval(intervalId);
        };
    }, []);

    const handleEditGroup = (group) => {
        setSelectedGroup(group);
        setActiveTab('control');
    };

    const handleOpenDevice = (device) => {
        setSelectedDevice(device);
        setActiveTab('industrialControl');
    };

    const renderContent = () => {
        if (activeTab === 'control' && selectedGroup) {
            return (
                <GroupControl
                    group={selectedGroup}
                    onBack={() => {
                        setActiveTab('groups');
                        setSelectedGroup(null);
                    }}
                />
            );
        }

        if (activeTab === 'industrialControl' && selectedDevice) {
            return (
                <IndustrialControl
                    device={selectedDevice}
                    onBack={() => {
                        setActiveTab('dashboard');
                        setSelectedDevice(null);
                    }}
                />
            );
        }

        switch (activeTab) {
            case 'dashboard':
                return <Dashboard onSelectDevice={handleOpenDevice}/>;
            case 'alerts':
                return <Alarm/>;
            case 'history':
                return <HistoryList/>;
            case 'groups':
                return <GroupSettings groups={groups} onEditGroup={handleEditGroup}/>;
            default:
                return (
                    <div className="p-8 flex items-center justify-center h-[calc(100vh-64px)]">
                        <p className="text-slate-400 italic">{tabLabels[activeTab] ?? activeTab} {t('common.info')}...</p>
                    </div>
                );
        }
    };

    return (
        <div className="flex min-h-screen bg-background-light">
            <Sidebar activeTab={activeTab === 'control' ? 'groups' : activeTab} setActiveTab={setActiveTab}/>

            <main className="flex-1 flex flex-col min-w-0">
                <Header title={tabLabels[activeTab === 'control' ? 'control' : activeTab] ?? t('tab.dashboard')}/>

                <div className="flex-1 overflow-y-auto">
                    {renderContent()}
                </div>
            </main>

            <div className="pointer-events-none fixed right-4 top-4 z-50 flex w-[min(420px,calc(100vw-2rem))] flex-col gap-3">
                {inputAlertToasts.map((toast) => (
                    <div
                        key={toast.id}
                        className="pointer-events-auto rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 shadow-lg"
                    >
                        <div className="flex items-start gap-3">
                            <div className="flex-1 break-words">{toast.message}</div>
                            <button
                                type="button"
                                onClick={() => removeToast(toast.id)}
                                className="shrink-0 text-red-500 transition-colors hover:text-red-700"
                            >
                                ×
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default function App() {
    return (
        <LanguageProvider>
            <AppContent/>
        </LanguageProvider>
    );
}
