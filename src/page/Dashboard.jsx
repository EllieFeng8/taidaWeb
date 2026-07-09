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

// Fallback mapping, will be overridden by API
const DEFAULT_SENSOR_FIELD_ORDER = [
    { key: 's1', name: 'InletWaterTemp' },
    { key: 's2', name: 'InletWaterPressure' },
    { key: 's3', name: 'OutletWaterTemp' },
    { key: 's4', name: 'OutletWaterPressure' },
    { key: 's5', name: 'InletPumpTemp' },
    { key: 's6', name: 'InletPumpPressure' },
    { key: 's7', name: 'InletLeftCoilTemp' },
    { key: 's8', name: 'OutletLeftCoilTemp' },
    { key: 's9', name: 'InletRightCoilTemp' },
    { key: 's10', name: 'OutletRightCoilTemp' },
    { key: 's11', name: 'InletAirTemp' },
    { key: 's12', name: 'InletAirHumidity' },
    { key: 's13', name: 'FlowRate' },
    { key: 's14', name: 'OutletWaterSV' },
    { key: 's15', name: 'OutletWaterPV' },
    { key: 's16', name: 'MixWaterSV' },
    { key: 's17', name: 'MixWaterPV' },
    { key: 's18', name: 'FanSV' },
    { key: 's19', name: 'FanPV' },
    { key: 's20', name: 'OutletAirTemp' },
    { key: 's21', name: 'DifferentialPressureSV' },
    { key: 's22', name: 'DifferentialPressurePV' },
    { key: 's23', name: 'HeatLoad' },
    { key: 's24', name: 'AutoFanControl' },
    { key: 's25', name: 'AutoTempControl' },
    { key: 's26', name: 'PumpSV' },
    { key: 's27', name: 'PumpPV' },
];

const formatMetric = (value, unit = '') => {
    const formattedValue = formatApiNumber(value);

    if (formattedValue === '--') {
        return '--';
    }

    const numericValue = Number(formattedValue);
    const displayValue = Number.isNaN(numericValue) ? formattedValue : numericValue.toFixed(2);

    return unit ? `${displayValue}${unit}` : displayValue;
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

const mapSensorValues = (sensorPayload, sensorMapping = DEFAULT_SENSOR_FIELD_ORDER) => {
    const mappedValues = {};

    DEFAULT_SENSOR_FIELD_ORDER.forEach(({ key, name }) => {
        mappedValues[name] = sensorPayload?.[key] ?? '--';
    });

    // Create legacy field name aliases for backward compatibility with UI
    // mappedValues.inletWaterTemp = mappedValues.InletWaterTemp;
    // mappedValues.inletWaterPressure = mappedValues.InletWaterPressure;
    // mappedValues.outletWaterTemp = mappedValues.OutletWaterTemp;
    // mappedValues.outletWaterPressure = mappedValues.OutletWaterPressure;
    // mappedValues.inletAirTemp = mappedValues.InletAirTemp;
    // mappedValues.inletAirHumidity = mappedValues.InletAirHumidity;
    // mappedValues.outletAirTemp = mappedValues.OutletAirTemp;
    // mappedValues.flowRate = mappedValues.FlowRate;
    // mappedValues.pressureDifference = mappedValues.DifferentialPressurePV;
    // mappedValues.coolingL1 = mappedValues.InletLeftCoilTemp;
    // mappedValues.coolingL2 = mappedValues.OutletLeftCoilTemp;
    // mappedValues.coolingR1 = mappedValues.InletRightCoilTemp;
    // mappedValues.coolingR2 = mappedValues.OutletRightCoilTemp;
    // mappedValues.outletWaterPV = mappedValues.OutletWaterPV;
    // mappedValues.returnWaterPV = mappedValues.MixWaterPV;

    return mappedValues;
};

const normalizeDevice = (device, index, sensorPayload, sensorMapping = DEFAULT_SENSOR_FIELD_ORDER) => {
    // console.log('Normalizing device', {device, sensorPayload});
    const name = device?.name ?? device?.deviceName ?? `Device ${index + 1}`;
    const id = String(device?.id ?? device?.deviceId ?? name);
    const sensorValues = mapSensorValues(sensorPayload, sensorMapping);
    // console.log('Normalized sensor values:', sensorValues);

    return {
        ...device,
        ...sensorValues,
        id,
        name,
        status: normalizeDeviceStatus(device?.status, sensorPayload),
        water: {
            in: formatCombinedMetric(sensorValues.InletWaterTemp, '°C', sensorValues.InletWaterPressure, 'pa'),
            out: formatCombinedMetric(sensorValues.InletPumpTemp, '°C', sensorValues.InletPumpPressure, 'pa'),
            return: formatCombinedMetric(sensorValues.OutletWaterTemp, '°C', sensorValues.OutletWaterPressure, 'pa'),
        },
        air: {
            in: formatCombinedMetric(sensorValues.InletAirTemp, '°C', sensorValues.InletAirHumidity, '%'),
            out: formatCombinedMetric(sensorValues.OutletAirTemp, '°C', '--', ''),
        },
        cooling: {
            l1: sensorValues.InletLeftCoilTemp ?? '--',
            l2: sensorValues.OutletLeftCoilTemp ?? '--',
            r1: sensorValues.InletRightCoilTemp ?? '--',
            r2: sensorValues.OutletRightCoilTemp ?? '--',
        },
        power: {
            fanAutoSpeed: sensorValues.FanPV ?? '--',
            hz: sensorValues.PumpPV ?? '--',
        },
        system: {
            pressureDifference: sensorValues.DifferentialPressurePV ?? '--',
            flowRate: sensorValues.FlowRate ?? '--',
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
                                <span className="text-slate-500">{t('dashboard.deviceCard.powerSection.pressureDifference')}</span>
                                <span
                                    className="font-mono">{formatMetric(device.system.pressureDifference, ' Pa')}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">{t('dashboard.deviceCard.powerSection.flowRate')}</span>
                                <span className="font-mono">{formatMetric(device.system.flowRate, ' L/min')}</span>
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
    const [sensorMapping, setSensorMapping] = useState(DEFAULT_SENSOR_FIELD_ORDER);

    // Fetch sensor configuration from API
    useEffect(() => {
        const fetchSensorMapping = async () => {
            try {
                // Try to fetch from any device first
                const devResponse = await fetch('/api/devices', { method: 'GET' });
                const deviceList = await devResponse.json();
                if (Array.isArray(deviceList) && deviceList.length > 0) {
                    const deviceId = deviceList[0]?.name ?? deviceList[0]?.deviceName ?? deviceList[0]?.id;
                    if (deviceId) {
                        const sensorResponse = await fetch(`/api/settings/sensors/${encodeURIComponent(deviceId)}`, {
                            method: 'GET',
                        });
                        if (sensorResponse.ok) {
                            const mapping = await sensorResponse.json();
                            if (Array.isArray(mapping) && mapping.length > 0) {
                                setSensorMapping(mapping);
                                // console.log('Fetched sensor mapping from API:', mapping);
                                return;
                            }
                        }
                    }
                }
            } catch (error) {
                console.error('Error fetching sensor mapping:', error);
            }
            // Fall back to default
            setSensorMapping(DEFAULT_SENSOR_FIELD_ORDER);
        };

        fetchSensorMapping();
    }, []);


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
                // 先獲取連線狀態，確保我們有最新的狀態來決定是否 call sensor api
                const statusResponse = await fetch('/api/devices/connection/status', {
                    method: 'GET',
                });
                const statusData = await statusResponse.json();
                const currentConnectionStatusMap = normalizeConnectionStatusMap(statusData);
                setConnectionStatusMap(currentConnectionStatusMap);

                const response = await fetch('/api/devices', {
                    method: 'GET',
                });
                const data = await response.json();
                const deviceList = Array.isArray(data) ? data : [];
                const normalizedDevices = await Promise.all(
                    deviceList.map(async (device, index) => {
                        const deviceIdentifier = device?.name ?? device?.deviceName ?? device?.id ?? device?.deviceId;

                        if (!deviceIdentifier) {
                            return normalizeDevice(device, index, null, sensorMapping);
                        }

                        // 如果連線狀態為 false，則不 call sensor api
                        const isConnected = currentConnectionStatusMap[String(deviceIdentifier)] ?? true;
                        if (!isConnected) {
                            return normalizeDevice(device, index, null, sensorMapping);
                        }

                        try {
                            const sensorResponse = await fetch(`/api/sensor/last/${encodeURIComponent(deviceIdentifier)}`, {
                                method: 'GET',
                            });
                            const sensorData = await sensorResponse.json();
                            // console.log('sensorData:', sensorData);

                            return normalizeDevice(device, index, sensorData, sensorMapping);
                        } catch (error) {
                            console.error(`設備 ${deviceIdentifier} 感測資料獲取失敗:`, error);
                            return normalizeDevice(device, index, null, sensorMapping);
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
    }, [sensorMapping]);

    // 移除重複的 fetchConnectionStatuses useEffect，已整合進 fetchDevices

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

                        <div
                            className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">{t('dashboard.groupTitle')}</p>
                                <p className="mt-1 text-sm text-slate-500">
                                    {t('dashboard.groupDescription1')} <span
                                    className="font-bold text-slate-700">{selectedGroup.name}</span> {t('dashboard.groupDescription2')}
                                </p>
                            </div>
                            <div className="relative w-full sm:w-64">
                                <select
                                    value={selectedGroupId}
                                    onChange={(e) => setSelectedGroupId(e.target.value)}
                                    className="w-full appearance-none rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 pr-10 text-sm font-semibold text-slate-700 outline-none transition-all hover:border-primary/40 focus:border-primary focus:ring-2 focus:ring-primary/20"
                                >
                                    {groupOptions.map((group) => (
                                        <option key={group.id} value={String(group.id)}>
                                            {group.name}
                                        </option>
                                    ))}
                                </select>
                                <ChevronDown
                                    size={18}
                                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                                />
                            </div>
                        </div>

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
