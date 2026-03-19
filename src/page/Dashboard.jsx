/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, {useEffect, useState} from 'react';
import {
    TriangleAlert,
    MoreVertical,
    Radio,
    ChevronDown
} from 'lucide-react';
import {motion, AnimatePresence} from 'motion/react';
import {useLanguage} from '../contexts/LanguageContext';
import {formatApiNumber} from '../utils/formatApiNumber';

const ALL_GROUP_OPTION = {id: 'all', name: 'ALL_DEVICES_PLACEHOLDER', devices: []};
const SENSOR_FIELD_ORDER = [
    'inletWaterTemp',
    'inletWaterPressure',
    'outletWaterTemp',
    'outletWaterPressure',
    'returnWaterTemp',
    'returnWaterPressure',
    'inletAirTemp',
    'inletAirHumidity',
    'outletAirTemp',
    'outletAirHumidity',
    'coolingL1',
    'coolingL2',
    'coolingR1',
    'coolingR2',
    'rpm',
    'hz',
    'flowRate',
    'heatExchange',
    'pidP',
    'pidI',
];

const formatMetric = (value, unit = '') => {
    const formattedValue = formatApiNumber(value);

    if (formattedValue === '--') {
        return '--';
    }

    return unit ? `${formattedValue}${unit}` : formattedValue;
};

const formatCombinedMetric = (primaryValue, primaryUnit, secondaryValue, secondaryUnit) => {
    const primary = formatMetric(primaryValue, primaryUnit);
    const secondary = formatMetric(secondaryValue, secondaryUnit);

    if (primary === '--' && secondary === '--') {
        return '--';
    }

    if (secondary === '--') {
        return primary;
    }

    if (primary === '--') {
        return secondary;
    }

    return `${primary} / ${secondary}`;
};

const isDisconnectedSensorPayload = (sensorPayload) => {
    const statusCode = Number(sensorPayload?.status);

    return Number.isFinite(statusCode) && statusCode === 503;
};

const normalizeDeviceStatus = (status, sensorPayload) => {
    if (isDisconnectedSensorPayload(sensorPayload)) {
        return 'offline';
    }

    if (!status) {
        return 'online';
    }

    const normalized = String(status).toLowerCase();

    if (['alert', 'critical', 'warning', 'offline', 'online', 'running'].includes(normalized)) {
        return normalized;
    }

    return 'online';
};

const mapSensorValues = (sensorPayload) => {
    const mappedValues = {};

    SENSOR_FIELD_ORDER.forEach((fieldName, index) => {
        mappedValues[fieldName] = sensorPayload?.[`s${index + 1}`] ?? '--';
    });

    return mappedValues;
};

const normalizeDevice = (device, index, sensorPayload) => {
    // console.log('Normalizing device', {device, sensorPayload});
    const name = device?.name ?? device?.deviceName ?? `Device ${index + 1}`;
    const id = String(device?.id ?? device?.deviceId ?? name);
    const sensorValues = mapSensorValues(sensorPayload);

    return {
        ...device,
        ...sensorValues,
        id,
        name,
        status: normalizeDeviceStatus(device?.status, sensorPayload),
        water: {
            in: device?.water?.in ?? formatCombinedMetric(sensorValues.inletWaterTemp ?? device?.inletWaterTemp, '°C', sensorValues.inletWaterPressure ?? device?.inletWaterPressure, 'b'),
            out: device?.water?.out ?? formatCombinedMetric(sensorValues.outletWaterTemp ?? device?.outletWaterTemp, '°C', sensorValues.outletWaterPressure ?? device?.outletWaterPressure, 'b'),
            return: device?.water?.return ?? formatCombinedMetric(sensorValues.returnWaterTemp ?? device?.returnWaterTemp, '°C', sensorValues.returnWaterPressure ?? device?.returnWaterPressure, 'b'),
        },
        air: {
            in: device?.air?.in ?? formatCombinedMetric(sensorValues.inletAirTemp ?? device?.inletAirTemp, '°C', sensorValues.inletAirHumidity ?? device?.inletAirHumidity, '%'),
            out: device?.air?.out ?? formatCombinedMetric(sensorValues.outletAirTemp ?? device?.outletAirTemp, '°C', sensorValues.outletAirHumidity ?? device?.outletAirHumidity, '%'),
        },
        cooling: {
            l1: device?.cooling?.l1 ?? sensorValues.coolingL1 ?? device?.coolingL1 ?? '--',
            l2: device?.cooling?.l2 ?? sensorValues.coolingL2 ?? device?.coolingL2 ?? '--',
            r1: device?.cooling?.r1 ?? sensorValues.coolingR1 ?? device?.coolingR1 ?? '--',
            r2: device?.cooling?.r2 ?? sensorValues.coolingR2 ?? device?.coolingR2 ?? '--',
        },
        power: {
            rpm: device?.power?.rpm ?? sensorValues.rpm ?? device?.rpm ?? '--',
            hz: device?.power?.hz ?? sensorValues.hz ?? device?.hz ?? '--',
        },
        system: {
            flowRate: sensorValues.flowRate ?? device?.flowRate ?? '--',
            heatExchange: sensorValues.heatExchange ?? device?.heatExchange ?? '--',
            pidP: sensorValues.pidP ?? device?.pidP ?? '--',
            pidI: sensorValues.pidI ?? device?.pidI ?? '--',
        },
    };
};

const getDeviceIdentifierSet = (group) => {
    const devices = Array.isArray(group?.devices) ? group.devices : [];

    return new Set(
        devices.flatMap((device) => {
            if (typeof device === 'string') {
                return [device];
            }

            if (device && typeof device === 'object') {
                return [device.id, device.name].filter(Boolean);
            }

            return [];
        })
    );
};

const normalizeConnectionStatusMap = (statusPayload) => {
    if (!statusPayload || typeof statusPayload !== 'object' || Array.isArray(statusPayload)) {
        return {};
    }

    return Object.entries(statusPayload).reduce((accumulator, [deviceName, isConnected]) => {
        accumulator[String(deviceName)] = Boolean(isConnected);
        return accumulator;
    }, {});
};

const getDeviceConnectionState = (device, connectionStatusMap) => {
    const identifiers = [
        device?.name,
        device?.deviceName,
        device?.id,
        device?.deviceId,
    ].filter(Boolean);

    for (const identifier of identifiers) {
        const normalizedIdentifier = String(identifier);

        if (Object.prototype.hasOwnProperty.call(connectionStatusMap, normalizedIdentifier)) {
            return connectionStatusMap[normalizedIdentifier];
        }
    }

    return true;
};

// 在 DeviceCard 函式上方加入
const cardVariants = {
    hidden: { opacity: 0, y: 24, scale: 0.97 },
    visible: (i) => ({
        opacity: 1,
        y: 0,
        scale: 1,
        transition: {
            delay: i * 0.06,               // 每張錯開 60ms
            duration: 0.35,
            ease: [0.25, 0.46, 0.45, 0.94], // easeOutQuart：快進慢停
        },
    }),
    exit: {
        opacity: 0,
        scale: 0.96,
        y: -8,
        transition: { duration: 0.2, ease: 'easeIn' },
    },
};



// --- Components ---
const DeviceCard = ({device, onSelect, isConnected, index}) => {
    const {t} = useLanguage();
    const isDisconnected = !isConnected;

    return (
        <motion.button
            type="button"
            layout
            custom={index}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            layoutTransition={{ duration: 0.3, ease: 'easeOut' }}
            onClick={() => onSelect?.(device)}
            WhileHover={{ y: -4, transition: { duration: 0.2, ease: 'easeOut' } }}
            whileTap={{ scale: 0.993, transition: { duration: 0.1 } }}
            className={`group w-full cursor-pointer overflow-hidden rounded-xl border bg-white text-left shadow-sm transition-shadow duration-200 hover:shadow-lg ${
                isDisconnected
                    ? 'border-slate-200 shadow-lg shadow-red-500/10 hover:shadow-red-500/20'
                    : 'border-slate-200 hover:border-primary/40 hover:shadow-primary/10'
            } focus:outline-none focus:ring-2 focus:ring-primary/30`}
        >
            <div
                className={`${isDisconnected ? 'bg-red-500 text-white' : 'border-b border-slate-200 bg-slate-50 group-hover:bg-primary/5'} px-4 py-3 flex justify-between items-center transition-colors`}>
                <div className="flex items-center gap-3">
                    {isDisconnected ? <TriangleAlert size={18}/> : <Radio size={18} className="text-primary"/>}
                    <h3 className="font-bold">{device.name}</h3>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        isDisconnected ? 'bg-white text-red-600 animate-pulse' : 'bg-green-100 text-green-700'
                    }`}>
            {isDisconnected ? t('dashboard.deviceCard.disconnectedBadge') : t('dashboard.deviceCard.connectedBadge')}
          </span>
                </div>
                <span className={isDisconnected ? 'text-white/80' : 'text-slate-400'}>
            {/*<MoreVertical size={18}/>*/}
          </span>
            </div>

            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Column 1: Water & Air */}
                <div className="space-y-3">
                    <div className={`p-3 rounded-lg ${isDisconnected ? 'bg-red-50' : 'bg-slate-50'}`}>
                        <p className={`text-[10px] font-bold uppercase mb-1 text-slate-400`}>{t('dashboard.deviceCard.waterSection.title')}</p>
                        <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                                <span className="text-slate-500">{t('dashboard.deviceCard.waterSection.in')}</span>
                                <span
                                    className={`font-mono ${isDisconnected ? 'text-red-600 font-bold' : ''}`}>{device.water.in}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">{t('dashboard.deviceCard.waterSection.out')}</span>
                                <span className="font-mono">{device.water.out}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">{t('dashboard.deviceCard.waterSection.return')}</span>
                                <span className="font-mono">{device.water.return}</span>
                            </div>
                        </div>
                    </div>
                    <div className={`p-3 rounded-lg ${isDisconnected ? 'bg-red-50' : 'bg-slate-50'}`}>
                        <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">{t('dashboard.deviceCard.airSection.title')}</p>
                        <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                                <span className="text-slate-500">{t('dashboard.deviceCard.airSection.in')}</span>
                                <span className="font-mono text-primary">{device.air.in}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">{t('dashboard.deviceCard.airSection.out')}</span>
                                <span className="font-mono">{device.air.out}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Column 2: Cooling & Power */}
                <div className="space-y-3">
                    <div className={`p-3 rounded-lg ${isDisconnected ? 'bg-red-50' : 'bg-slate-50'}`}>
                        <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">{t('dashboard.deviceCard.coolingSection.title')}</p>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className={`p-1.5 rounded border bg-white border-slate-100`}>
                                {t('dashboard.deviceCard.coolingSection.leftIn')}: <span
                                className="font-mono font-bold text-[14px]">{formatMetric(device.cooling.l1, '°C')}</span>
                            </div>
                            <div className={`p-1.5 rounded border bg-white border-slate-100`}>
                                {t('dashboard.deviceCard.coolingSection.leftOut')}: <span
                                className="font-mono font-bold text-[14px]">{formatMetric(device.cooling.l2, '°C')}</span>
                            </div>
                            <div className="bg-white p-1.5 rounded border border-slate-100">
                                {t('dashboard.deviceCard.coolingSection.rightIn')}: <span
                                className="font-mono font-bold text-[14px]">{formatMetric(device.cooling.r1, '°C')}</span>
                            </div>
                            <div className="bg-white p-1.5 rounded border border-slate-100">
                                {t('dashboard.deviceCard.coolingSection.rightOut')}: <span
                                className="font-mono font-bold text-[14px]">{formatMetric(device.cooling.r2, '°C')}</span>
                            </div>
                        </div>
                    </div>
                    <div className={`p-3 rounded-lg ${isDisconnected ? 'bg-red-50' : 'bg-slate-50'}`}>
                        <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">{t('dashboard.deviceCard.powerSection.title')}</p>
                        <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                                <span className="text-slate-500">{t('dashboard.deviceCard.powerSection.rpm')}</span>
                                <span
                                    className={`font-mono ${isDisconnected && device.power.rpm > 1800 ? 'text-red-500 font-bold' : ''}`}>{formatMetric(device.power.rpm, ' RPM')}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">{t('dashboard.deviceCard.powerSection.hz')}</span>
                                <span className="font-mono">{formatMetric(device.power.hz, ' Hz')}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Column 3: Efficiency & Graph */}
                {/*<div className={`flex flex-col items-center justify-center p-4 rounded-xl border border-dashed ${*/}
                {/*    isDisconnected ? 'bg-red-500/5 border-red-500/20' : 'bg-primary/5 border-primary/20'*/}
                {/*}`}>*/}
                {/*  <div className={`${isDisconnected ? 'text-red-500' : 'text-primary'} font-bold text-3xl mb-1`}>*/}
                {/*    {device.efficiency}%*/}
                {/*  </div>*/}
                {/*  <div className="text-[10px] text-slate-500 font-bold">運行效率</div>*/}
                {/*  <div className="mt-4 w-full aspect-video bg-white rounded-lg overflow-hidden flex items-center justify-center">*/}
                {/*    <div className={`w-full h-full bg-gradient-to-tr ${*/}
                {/*        isDisconnected ? 'from-red-500/10 to-red-500/30' : 'from-primary/10 to-primary/30'*/}
                {/*    }`}></div>*/}
                {/*  </div>*/}
                {/*</div><div className={`flex flex-col items-center justify-center p-4 rounded-xl border border-dashed ${*/}
                {/*    isDisconnected ? 'bg-red-500/5 border-red-500/20' : 'bg-primary/5 border-primary/20'*/}
                {/*}`}>*/}
                {/*  <div className={`${isDisconnected ? 'text-red-500' : 'text-primary'} font-bold text-3xl mb-1`}>*/}
                {/*    {device.efficiency}%*/}
                {/*  </div>*/}
                {/*  <div className="text-[10px] text-slate-500 font-bold">運行效率</div>*/}
                {/*  <div className="mt-4 w-full aspect-video bg-white rounded-lg overflow-hidden flex items-center justify-center">*/}
                {/*    <div className={`w-full h-full bg-gradient-to-tr ${*/}
                {/*        isDisconnected ? 'from-red-500/10 to-red-500/30' : 'from-primary/10 to-primary/30'*/}
                {/*    }`}></div>*/}
                {/*  </div>*/}
                {/*</div>*/}
            </div>
        </motion.button>
    );
};
export const Dashboard = ({onSelectDevice}) => {
    const {t} = useLanguage();
    const [selectedGroupId, setSelectedGroupId] = useState('all');
    const searchQuery = '';
    const [groups, setGroups] = useState([]);
    const [devices, setDevices] = useState([]);
    const [connectionStatusMap, setConnectionStatusMap] = useState({});


    useEffect(() => {
        const fetchGroups = () => {
            fetch(`/api/groups`, {
                method: 'GET',
            })
                .then((res) => res.json())
                .then((data) => {
                    setGroups(Array.isArray(data) ? data : []);
                })
                .catch((err) => console.error('群組獲取失敗:', err));
        };

        fetchGroups();
        const interval = setInterval(fetchGroups, 1000);

        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const fetchDevices = async () => {
            try {
                const response = await fetch('/api/devices', {
                    method: 'GET',
                });
                const data = await response.json();
                const deviceList = Array.isArray(data) ? data : [];
                const normalizedDevices = await Promise.all(
                    deviceList.map(async (device, index) => {
                        const deviceIdentifier = device?.name ?? device?.deviceName ?? device?.id ?? device?.deviceId;

                        if (!deviceIdentifier) {
                            return normalizeDevice(device, index);
                        }

                        try {
                            const sensorResponse = await fetch(`/api/sensor/last/${encodeURIComponent(deviceIdentifier)}`, {
                                method: 'GET',
                            });
                            const sensorData = await sensorResponse.json();

                            return normalizeDevice(device, index, sensorData);
                        } catch (error) {
                            console.error(`設備 ${deviceIdentifier} 感測資料獲取失敗:`, error);
                            return normalizeDevice(device, index);
                        }
                    })
                );

                setDevices(normalizedDevices);
            } catch (err) {
                console.error('設備獲取失敗:', err);
                setDevices([]);
            }
        };

        fetchDevices();
        const interval = setInterval(fetchDevices, 1000);

        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const fetchConnectionStatuses = async () => {
            try {
                const response = await fetch('/api/devices/connection/status', {
                    method: 'GET',
                });
                const data = await response.json();
                setConnectionStatusMap(normalizeConnectionStatusMap(data));
            } catch (error) {
                console.error('設備連線狀態獲取失敗:', error);
                setConnectionStatusMap({});
            }
        };

        fetchConnectionStatuses();
        const interval = setInterval(fetchConnectionStatuses, 1000);

        return () => clearInterval(interval);
    }, []);

    const groupOptions = [{...ALL_GROUP_OPTION, name: t('dashboard.allDevicesOption')}, ...groups];
    const selectedGroup = groupOptions.find((group) => String(group.id) === selectedGroupId) ?? ALL_GROUP_OPTION;
    const selectedGroupDevices = getDeviceIdentifierSet(selectedGroup);

    const filteredDevices = devices.filter(device => {
        if (
            selectedGroupId !== 'all' &&
            !selectedGroupDevices.has(device.id) &&
            !selectedGroupDevices.has(device.name)
        ) {
            return false;
        }

        if (searchQuery && !device.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        return true;
    });

    return (
        <div className="flex h-screen w-full flex-col overflow-hidden bg-background-light">

            <div className="flex flex-1 overflow-hidden">

                {/* Main Content */}
                <main className="flex-1 overflow-y-auto p-6">
                    <div className="flex-1 overflow-y-auto p-8 space-y-10">
                        {/*<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">*/}
                        {/*  <div>*/}
                        {/*    <p className="text-sm text-slate-500"></p>*/}
                        {/*  </div>*/}
                        {/*  <div className="flex gap-2">*/}
                        {/*    <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-slate-200 text-sm font-medium hover:bg-slate-50 transition-colors">*/}
                        {/*      <Filter size={18} />*/}
                        {/*      篩選*/}
                        {/*    </button>*/}
                        {/*    <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-blue-600 transition-colors">*/}
                        {/*      <Plus size={18} />*/}
                        {/*      新增設備*/}
                        {/*    </button>*/}
                        {/*  </div>*/}
                        {/*</div>*/}

                        {/*<div*/}
                        {/*    className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">*/}
                        {/*    <div>*/}
                        {/*        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">{t('dashboard.groupTitle')}</p>*/}
                        {/*        <p className="mt-1 text-sm text-slate-500">*/}
                        {/*            {t('dashboard.groupDescription1')} <span*/}
                        {/*            className="font-bold text-slate-700">{selectedGroup.name}</span> {t('dashboard.groupDescription2')}*/}
                        {/*        </p>*/}
                        {/*    </div>*/}
                        {/*    <div className="relative w-full sm:w-64">*/}
                        {/*        <select*/}
                        {/*            value={selectedGroupId}*/}
                        {/*            onChange={(e) => setSelectedGroupId(e.target.value)}*/}
                        {/*            className="w-full appearance-none rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 pr-10 text-sm font-semibold text-slate-700 outline-none transition-all hover:border-primary/40 focus:border-primary focus:ring-2 focus:ring-primary/20"*/}
                        {/*        >*/}
                        {/*            {groupOptions.map((group) => (*/}
                        {/*                <option key={group.id} value={String(group.id)}>*/}
                        {/*                    {group.name}*/}
                        {/*                </option>*/}
                        {/*            ))}*/}
                        {/*        </select>*/}
                        {/*        <ChevronDown*/}
                        {/*            size={18}*/}
                        {/*            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"*/}
                        {/*        />*/}
                        {/*    </div>*/}
                        {/*</div>*/}

                        {/* Grid */}
                        <motion.div
                            className="grid grid-cols-1 xl:grid-cols-2 gap-6"
                            initial="hidden"
                            animate="visible"
                        >
                            <AnimatePresence mode="popLayout">
                                {filteredDevices.map((device,index) => (
                                    <DeviceCard
                                        key={device.id}
                                        index={index}
                                        device={device}
                                        isConnected={getDeviceConnectionState(device, connectionStatusMap)}
                                        onSelect={onSelectDevice}
                                    />
                                ))}
                            </AnimatePresence>
                        </motion.div>
                        {filteredDevices.length === 0 && (
                            <div
                                className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center text-sm text-slate-500">
                                {selectedGroup.name} {t('dashboard.noMatchingDevices')}
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
};
