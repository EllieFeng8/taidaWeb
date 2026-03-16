/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft } from 'lucide-react';
import ConnectSetting from '../components/ConnectSetting.jsx';
import {
    Settings,
    Bell,
    Thermometer,
    Zap,
    Clock,
    Router,
    X,
    Info,
    Cpu,
    Check,
    ChevronRight,
    Power
} from 'lucide-react';
const FALLBACK_VALUE = '--';
const TELEMETRY_SENSOR_ORDER = [
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

const mapSensorValues = (sensorPayload) => {
    const mappedValues = {};

    TELEMETRY_SENSOR_ORDER.forEach((fieldName, index) => {
        mappedValues[fieldName] = sensorPayload?.[`s${index + 1}`] ?? FALLBACK_VALUE;
    });

    return mappedValues;
};

const formatDisplayValue = (value) => {
    if (value === null || value === undefined || value === '') {
        return FALLBACK_VALUE;
    }

    return String(value);
};

const TelemetryCard = ({ data }) => (
    <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <p className={`text-[16px] font-bold ${data.colorClass} mb-3`}>{data.label}</p>
        <div className="grid grid-cols-1 gap-2 text-xs">
            {data.metrics.map((metric) => (
                <div key={metric.name} className="flex justify-between">
                    <span>{metric.name}:</span>
                    <span className="font-bold">
                        {formatDisplayValue(metric.value)} <span className="text-slate-400">{metric.unit}</span>
                    </span>
                </div>
            ))}
        </div>
    </div>
);

const Toggle = ({ checked, onChange }) => (
    <label className="relative inline-flex items-center cursor-pointer">
        <input
            type="checkbox"
            className="sr-only peer"
            checked={checked}
            onChange={(event) => onChange?.(event.target.checked)}
        />
        <div className="relative h-5 w-10 rounded-full bg-slate-200 dark:bg-slate-700 transition-colors duration-200 peer-checked:bg-primary after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:bg-white after:shadow-sm after:transition-transform after:duration-200 peer-checked:after:translate-x-5"></div>
    </label>
);

const PVText = ({ value, unit = '' }) => (
    <span className="text-xs font-normal text-slate-400">
        PV: {formatDisplayValue(value)} {unit}
    </span>
);

const PIDInput = ({ label, pvValue }) => (
    <div className="space-y-1.5 space-x-1.5">
        <label className="text-s font-bold text-slate-500 uppercase">{label}</label>
        <PVText value={pvValue} />
        <input
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
            step="0.1"
            type="number"
            placeholder={FALLBACK_VALUE}
        />
    </div>
);

const ValveControl = ({ sensorValues }) => {
    const [percentage, setPercentage] = useState('');
    const [outletPidMonitoringEnabled, setOutletPidMonitoringEnabled] = useState(true);
    const [outletCorrectionEnabled, setOutletCorrectionEnabled] = useState(true);

    return (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm h-full flex flex-col">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                <h2 className="text-[16px] font-bold flex items-center gap-2">出水閥控制</h2>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-slate-500 uppercase">PID 已啟用</span>
                        <Toggle checked={outletPidMonitoringEnabled} onChange={setOutletPidMonitoringEnabled} />
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-slate-500 uppercase">正向修正</span>
                        <Toggle checked={outletCorrectionEnabled} onChange={setOutletCorrectionEnabled} />
                    </div>
                </div>
            </div>
            <div className="p-6 flex-1 flex flex-col gap-6">
                <div className="space-y-2 space-x-1.5">
                    <label className="text-xs text-[14px] font-semibold text-slate-600 dark:text-slate-400">開度比例</label>
                    <PVText value={sensorValues.outletWaterTemp} unit="°C" />
                    <div className="relative">
                        <input
                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm font-bold text-primary focus:ring-2 focus:ring-primary/20 outline-none"
                            type="number"
                            value={percentage}
                            onChange={(event) => setPercentage(event.target.value)}
                            placeholder={FALLBACK_VALUE}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] text-slate-400 font-bold">%</span>
                    </div>
                </div>
                <div className="grid grid-cols-3 gap-4 text-[14px]">
                    <PIDInput label="P:" pvValue={FALLBACK_VALUE} />
                    <PIDInput label="I:" pvValue={FALLBACK_VALUE} />
                    <PIDInput label="D:" pvValue={FALLBACK_VALUE} />
                </div>
                <button className="w-full py-2 border border-primary text-primary font-bold rounded-lg bg-white hover:bg-primary hover:text-white hover:shadow-lg hover:shadow-primary/20 transition-all text-xs mt-auto">
                    確定
                </button>
            </div>
        </div>
    );
};

const ReturnValveControl = ({ sensorValues }) => {
    const [openingRatio, setOpeningRatio] = useState('');
    const [targetValue, setTargetValue] = useState('');

    return (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm h-full flex flex-col">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800">
                <h2 className="text-[16px] font-bold flex items-center gap-2">混水閥控制</h2>
            </div>
            <div className="p-6 flex-1 flex flex-col gap-4">
                <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-1.5 space-x-1.5">
                        <label className="text-[14px] font-bold text-slate-500 uppercase">開度比例</label>
                        <PVText value={sensorValues.returnWaterTemp} unit="°C" />
                        <div className="relative">
                            <input
                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm font-bold text-primary focus:ring-2 focus:ring-primary/20 outline-none"
                                type="number"
                                value={openingRatio}
                                onChange={(event) => setOpeningRatio(event.target.value)}
                                placeholder={FALLBACK_VALUE}
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-bold">%</span>
                        </div>
                    </div>
                    <div className="space-y-1.5 space-x-1.5">
                        <label className="text-[16px] font-bold text-slate-500 uppercase">設定數值</label>
                        <PVText value={sensorValues.returnWaterPressure} unit="pa" />
                        <input
                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none"
                            type="number"
                            value={targetValue}
                            onChange={(event) => setTargetValue(event.target.value)}
                            placeholder={FALLBACK_VALUE}
                        />
                    </div>
                </div>
                <button className="w-full py-2 border border-primary text-primary font-bold rounded-lg bg-white hover:bg-primary hover:text-white hover:shadow-lg hover:shadow-primary/20 transition-all text-xs mt-auto">
                    確定
                </button>
            </div>
        </div>
    );
};

const MotorControl = ({ sensorValues }) => {
    const [enabled, setEnabled] = useState(true);
    const [targetFrequency, setTargetFrequency] = useState('');

    return (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800">
                <div className="flex justify-between items-center w-full">
                    <h2 className="text-[16px] font-bold flex items-center gap-2">混水泵浦控制</h2>
                    <Toggle checked={enabled} onChange={setEnabled} />
                </div>
            </div>
            <div className="p-6">
                <div className="grid grid-cols-1 gap-6">
                    <div className="flex-1 space-y-1.5 space-x-1.5">
                        <label className="text-[14px] font-bold text-slate-500 uppercase">目標頻率</label>
                        <PVText value={sensorValues.hz} unit="Hz" />
                        <div className="flex flex-1 gap-2">
                            <div className="relative flex-1">
                                <input
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-3 text-lg font-bold focus:ring-2 focus:ring-primary/20 outline-none disabled:opacity-50"
                                    type="number"
                                    value={targetFrequency}
                                    onChange={(event) => setTargetFrequency(event.target.value)}
                                    placeholder={FALLBACK_VALUE}
                                    disabled={!enabled}
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">Hz</span>
                            </div>
                            <button className="bg-primary/10 text-primary px-4 py-2 rounded-lg text-xs font-bold border border-primary/20 hover:bg-primary hover:text-white transition-all">
                                確定
                            </button>
                        </div>
                    </div>
                    <div className="px-6 py-3 bg-primary/5 rounded-xl border border-primary/10">
                        <p className="text-[12px] font-bold text-primary uppercase">當前水流量</p>
                        <p className="text-xl font-extrabold text-primary leading-tight">
                            {formatDisplayValue(sensorValues.flowRate)} <span className="text-xs font-medium">公升/分</span>
                        </p>
                    </div>
                    <div className="px-6 py-3 bg-primary/5 rounded-xl border border-primary/10">
                        <p className="text-[12px] font-bold text-primary uppercase">當前熱交換</p>
                        <p className="text-xl font-extrabold text-primary leading-tight">
                            {formatDisplayValue(sensorValues.heatExchange)} <span className="text-xs font-medium">kW</span>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

const FanUnitCard = ({ fan }) => {
    const statusColors = {
        Running: 'text-emerald-500',
        Stopped: 'text-rose-500',
        Warning: 'text-amber-500',
        Optimal: 'text-blue-500',
    };

    return (
        <div className={`border rounded-2xl p-5 transition-all ${
            fan.isPrimary
                ? 'border-blue-200 bg-blue-50/30 ring-2 ring-blue-100 shadow-lg shadow-blue-50'
                : 'border-slate-200 bg-slate-50/50'
        }`}>
            <div className="flex justify-between items-start mb-5">
                <div>
                    <h5 className="text-sm font-bold flex items-center gap-2">
                        Fan Unit <span className="text-slate-400">{fan.id}</span>
                        {fan.isPrimary && <span className="text-[10px] bg-blue-600 text-white px-1.5 py-0.5 rounded ml-1">Primary</span>}
                    </h5>
                    <p className={`text-[10px] font-bold uppercase tracking-wider mt-1 ${statusColors[fan.status]}`}>
                        {fan.status}
                    </p>
                </div>
                <button className={`w-10 h-5 rounded-full relative transition-colors ${fan.isActive ? 'bg-blue-600' : 'bg-slate-300'}`}>
                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${fan.isActive ? 'left-5.5' : 'left-0.5'}`} />
                </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">PV</p>
                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between bg-white border border-slate-200 rounded-xl px-3 py-1.5 shadow-sm">
                            <span className="text-sm font-bold">{fan.pvPercent}</span>
                            <span className="text-[10px] text-slate-400 font-bold">%</span>
                        </div>
                        <div className="flex items-center justify-between bg-white border border-slate-200 rounded-xl px-3 py-1.5 shadow-sm">
                            <span className="text-sm font-bold">{fan.pvRpm}</span>
                            <span className="text-[10px] text-slate-400 font-bold">RPM</span>
                        </div>
                    </div>
                </div>
                <div className="space-y-2">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">SV</p>
                    <div className="flex h-full max-h-[72px] border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                        <input
                            type="number"
                            defaultValue={fan.svRpm}
                            className="w-full border-none bg-transparent text-lg font-bold px-3 focus:ring-0"
                        />
                        <button className="bg-slate-50 px-3 flex items-center justify-center border-l border-slate-100 hover:bg-slate-100 transition-colors">
                            <Check size={18} className="text-slate-400" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
export function IndustrialControl({ device, onBack }) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [allFansEnabled, setAllFansEnabled] = useState(false);
    const [pidMonitoringEnabled, setPidMonitoringEnabled] = useState(true);
    const [fansCorrectionEnabled, setFansCorrectionEnabled] = useState(true);
    const [sensorData, setSensorData] = useState({});
    const [allFansRpmTarget, setAllFansRpmTarget] = useState('');
    const [pressureTarget, setPressureTarget] = useState('');
    const [pidValues, setPidValues] = useState({ p: '', i: '', d: '' });

    const deviceIdentifier = device?.name ?? device?.deviceName ?? device?.id ?? device?.deviceId;
    const sensorValues = mapSensorValues(sensorData);
    const telemetry = [
        {
            label: '入水數據',
            colorClass: 'text-primary',
            metrics: [
                { name: '溫度', value: sensorValues.inletWaterTemp, unit: '°C' },
                { name: '壓力', value: sensorValues.inletWaterPressure, unit: 'pa' },
            ],
        },
        {
            label: '出水數據',
            colorClass: 'text-orange-500',
            metrics: [
                { name: '溫度', value: sensorValues.outletWaterTemp, unit: '°C' },
                { name: '壓力', value: sensorValues.outletWaterPressure, unit: 'pa' },
            ],
        },
        {
            label: '回水數據',
            colorClass: 'text-indigo-500',
            metrics: [
                { name: '溫度', value: sensorValues.returnWaterTemp, unit: '°C' },
                { name: '壓力', value: sensorValues.returnWaterPressure, unit: 'pa' },
            ],
        },
        {
            label: '盤管水溫監控',
            colorClass: 'text-emerald-600',
            metrics: [
                { name: '左 入', value: sensorValues.coolingL1, unit: '°C' },
                { name: '左 出', value: sensorValues.coolingL2, unit: '°C' },
                { name: '右 入', value: sensorValues.coolingR1, unit: '°C' },
                { name: '右 出', value: sensorValues.coolingR2, unit: '°C' },
            ],
        },
        {
            label: '入風溫濕度',
            colorClass: 'text-sky-500',
            metrics: [
                { name: '溫度', value: sensorValues.inletAirTemp, unit: '°C' },
                { name: '濕度', value: sensorValues.inletAirHumidity, unit: '%RH' },
            ],
        },
    ];

    useEffect(() => {
        if (!deviceIdentifier) {
            setSensorData({});
            return;
        }

        const fetchDeviceSensor = () => {
            fetch(`/api/sensor/last/${encodeURIComponent(deviceIdentifier)}`, {
                method: 'GET',
            })
                .then((response) => response.json())
                .then((data) => {
                    setSensorData(data ?? {});
                })
                .catch((error) => {
                    console.error('設備感測資料獲取失敗:', error);
                    setSensorData({});
                });
        };

        fetchDeviceSensor();
    }, [deviceIdentifier]);

    const [fans, setFans] = useState([
        { id: '01', status: 'Running', pvPercent: 85, pvRpm: 1800, svRpm: 1800, isActive: true },
        { id: '02', status: 'Running', pvPercent: 85, pvRpm: 1800, svRpm: 1800, isActive: true },
        { id: '03', status: 'Stopped', pvPercent: 0, pvRpm: 0, svRpm: 0, isActive: false },
        { id: '04', status: 'Running', pvPercent: 85, pvRpm: 1800, svRpm: 1800, isActive: true },
        { id: '05', status: 'Optimal', pvPercent: 92, pvRpm: 2100, svRpm: 2100, isActive: true, isPrimary: true },
        { id: '06', status: 'Running', pvPercent: 85, pvRpm: 1800, svRpm: 1800, isActive: true },
        { id: '07', status: 'Running', pvPercent: 85, pvRpm: 1800, svRpm: 1800, isActive: true },
        { id: '08', status: 'Warning', pvPercent: 72, pvRpm: 1550, svRpm: 1800, isActive: true },
        { id: '09', status: 'Running', pvPercent: 85, pvRpm: 1800, svRpm: 1800, isActive: true },
    ]);

    const handleToggleFan = (fanId) => {
        setFans((prev) =>
            prev.map((fan) =>
                fan.id === fanId && fan.status !== 'fault'
                    ? { ...fan, isOn: !fan.isOn }
                    : fan
            )
        );
    };

    const handleToggleAllFans = (enabled) => {
        setAllFansEnabled(enabled);
        setFans((prev) =>
            prev.map((fan) =>
                fan.status === 'fault' ? fan : { ...fan, isOn: enabled }
            )
        );
    };

    const statusText = {
        running: '系統正常',
        alert: '異常警示',
        online: '系統正常',
        warning: '需要注意',
        critical: '異常警示',
        offline: '設備離線',
    };

    const statusClass = {
        running: 'text-emerald-600 dark:text-emerald-400',
        alert: 'text-red-600 dark:text-red-400',
        online: 'text-emerald-600 dark:text-emerald-400',
        warning: 'text-amber-600 dark:text-amber-400',
        critical: 'text-red-600 dark:text-red-400',
        offline: 'text-slate-500 dark:text-slate-400',
    };

    return (
        <div className="min-h-full bg-slate-50/50 dark:bg-background-dark/50 text-slate-900 dark:text-slate-100 p-8 overflow-y-auto">
            <header className="flex items-center justify-between mb-8 w-full">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onBack}
                        className="p-2 hover:bg-white border border-transparent hover:border-slate-200 rounded-lg transition-all text-slate-500"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h2 className="text-xl font-bold tracking-tight">設備 {device?.id}</h2>
                        <div className="flex items-center gap-2">
                            <span className={`flex h-2 w-2 rounded-full ${
                                device?.status === 'alert' || device?.status === 'critical' ? 'bg-red-500' :
                                    device?.status === 'warning' ? 'bg-amber-500' :
                                        device?.status === 'offline' ? 'bg-slate-400' : 'bg-emerald-500'
                            }`}></span>
                            <span className={`text-xs font-medium ${statusClass[device?.status] ?? statusClass.online}`}>
                                {statusText[device?.status] ?? statusText.online}
                            </span>
                            <span className="text-xs text-slate-400 px-2">•</span>
                            <span className="text-xs text-slate-500 font-medium">編號：DEV-{device?.id}</span>
                        </div>
                    </div>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center justify-center rounded-xl h-10 w-10 bg-blue-600 text-white shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all"
                >
                    <Settings size={20} />
                </button>
            </header>

            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
                {telemetry.map((item) => (
                    <TelemetryCard key={item.label} data={item} />
                ))}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-[18px] font-bold text-cyan-600 mb-3">出風溫度</p>
                    <div className="flex justify-between items-center text-xs mb-2">
                        <span className="text-slate-500">溫度:</span>
                        <span className="font-bold">
                            {formatDisplayValue(sensorValues.outletAirTemp)} <span className="text-slate-400 font-normal">°C</span>
                        </span>
                    </div>
                    <div className="pt-2 border-t border-slate-100 space-y-2">
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-500 shrink-0">目標溫度</span>
                            <input
                                className="w-full h-7 text-[12px] border border-slate-200 rounded px-1 focus:ring-1 focus:ring-primary outline-none"
                                type="number"
                                placeholder={FALLBACK_VALUE}
                            />
                            <span className="text-[16px] text-slate-400">°C</span>
                        </div>
                        <button className="w-full px-2 py-1 bg-primary text-white text-[12px] font-bold rounded">確定</button>
                    </div>
                </div>
            </section>

            <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
                <ValveControl sensorValues={sensorValues} />
                <ReturnValveControl sensorValues={sensorValues} />
                <MotorControl sensorValues={sensorValues} />
            </section>

            <section className="space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-8">
                        <h2 className="text-[20px] font-bold flex items-center gap-2">風扇控制</h2>
                        <div className="flex items-center gap-3">
                            <span className="text-xs font-bold text-slate-500 uppercase">PID 啟動監控</span>
                            <Toggle checked={pidMonitoringEnabled} onChange={setPidMonitoringEnabled} />
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-xs font-bold text-slate-500 uppercase">正向修正</span>
                            <Toggle checked={fansCorrectionEnabled} onChange={setFansCorrectionEnabled} />
                        </div>
                    </div>
                </div>

                <div className="bg-slate-50/50 p-6 rounded-xl border border-slate-200 mb-8 grid grid-cols-1 xl:grid-cols-3 gap-8">
                    <div className="space-y-4 items-center gap-2">
                        <div className="flex space-x-4">
                            <h3 className="uppercase tracking-wider font-bold text-slate-400">一鍵開啟全部</h3>
                            <Toggle checked={allFansEnabled} onChange={handleToggleAllFans} />
                            <PVText value={sensorValues.rpm} />
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="flex-1 flex gap-2">
                                <div className="relative flex-1">
                                    <input
                                        type="number"
                                        value={allFansRpmTarget}
                                        onChange={(event) => setAllFansRpmTarget(event.target.value)}
                                        placeholder={FALLBACK_VALUE}
                                        className="w-full bg-white border-none rounded-lg px-3 py-2 text-sm ring-1 ring-slate-200 focus:ring-primary outline-none"
                                    />
                                    <span className="absolute right-3 top-2.5 text-[10px] text-slate-400 font-bold">RPM</span>
                                </div>
                                <button className="bg-primary/10 text-primary px-4 py-2 rounded-lg text-xs font-bold border border-primary/20 hover:bg-primary hover:text-white transition-all">
                                    確定
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4 border-l border-slate-200 xl:pl-8">
                        <h3 className="uppercase tracking-wider font-bold text-slate-400">壓差控制</h3>
                        <div className="flex items-center gap-4">
                            <div className="flex flex-col">
                                <span className="text-[12px] text-slate-400 font-bold">CV</span>
                                <span className="text-s font-bold text-slate-700">
                                    {formatDisplayValue(sensorValues.inletWaterPressure)} Pa
                                </span>
                            </div>
                            <div className="flex-1 flex gap-2">
                                <div className="relative flex-1">
                                    <input
                                        type="number"
                                        value={pressureTarget}
                                        onChange={(event) => setPressureTarget(event.target.value)}
                                        placeholder={FALLBACK_VALUE}
                                        className="w-full bg-white border-none rounded-lg px-3 py-2 text-sm ring-1 ring-slate-200 focus:ring-primary outline-none"
                                    />
                                    <span className="absolute right-3 top-2.5 text-[10px] text-slate-400 font-bold">Pa</span>
                                </div>
                                <button className="bg-primary/10 text-primary px-4 py-2 rounded-lg text-xs font-bold border border-primary/20 hover:bg-primary hover:text-white transition-all">
                                    確定
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4 border-l border-slate-200 xl:pl-8">
                        <h3 className="uppercase tracking-wider font-bold text-slate-400">PID 設定</h3>
                        <div className="flex items-end gap-3">
                            <div className="grid grid-cols-3 gap-2 flex-1 text-xs">
                                {[
                                    { key: 'p', label: 'P' },
                                    { key: 'i', label: 'I' },
                                    { key: 'd', label: 'D' },
                                ].map((item) => (
                                    <div key={item.key}>
                                        <label className="text-slate-400 block mb-1 font-bold">{item.label}</label>
                                        <PVText value={item.key === 'p' ? sensorValues.pidP : item.key === 'i' ? sensorValues.pidI : FALLBACK_VALUE} />
                                        <input
                                            type="number"
                                            value={pidValues[item.key]}
                                            onChange={(event) =>
                                                setPidValues((prev) => ({
                                                    ...prev,
                                                    [item.key]: event.target.value,
                                                }))
                                            }
                                            step="0.01"
                                            placeholder={FALLBACK_VALUE}
                                            className="w-full bg-white border-none rounded-lg text-xs px-2 py-1.5 ring-1 ring-slate-200 focus:ring-primary outline-none"
                                        />
                                    </div>
                                ))}
                            </div>
                            <button className="bg-primary/10 text-primary px-4 py-2 rounded-lg text-xs font-bold border border-primary/20 hover:bg-primary hover:text-white transition-all">
                                確定
                            </button>
                        </div>
                    </div>
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
                >
                    {fans.map((fan) => (
                        <FanUnitCard key={fan.id} fan={fan}  />
                    ))}
                </motion.div>
            </section>

            <ConnectSetting
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                device={device}
            />
        </div>
    );
}
