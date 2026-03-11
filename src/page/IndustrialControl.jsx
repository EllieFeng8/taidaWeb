/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import {ArrowLeft} from "lucide-react";


// --- Components ---
const NavItem = ({ icon, label, active = false }) => (
    <a
        href="#"
        className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
            active
                ? 'bg-primary/10 text-primary'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
        }`}
    >
        <span className={`material-symbols-outlined ${active ? 'fill-1' : ''}`}>{icon}</span>
        <span className="text-sm font-medium">{label}</span>
    </a>
);

const TelemetryCard = ({ data }) => (
    <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <p className={`text-sm font-bold ${data.colorClass} mb-3`}>{data.label}</p>
        <div className="grid grid-cols-2 gap-2 text-xs">
            {data.metrics.map((m, i) => (
                <div key={i} className="flex justify-between">
                    <span>{m.name}:</span>
                    <span className="font-bold">{m.value} <span className="text-slate-400">{m.unit}</span></span>
                </div>
            ))}
        </div>
    </div>
);

const ValveControl = () => {
    const [percentage, setPercentage] = useState(75);
    return (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm h-full flex flex-col">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                <h3 className="font-bold flex items-center gap-2">
                    出水閥控制
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-900/30 text-primary font-bold uppercase tracking-wider">PID 已啟用</span>
            </div>
            <div className="p-6 flex-1 flex flex-col gap-6">
                <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-600 dark:text-slate-400">開度比例</label>
                    <div className="relative">
                        <input
                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm font-bold text-primary focus:ring-2 focus:ring-primary/20 outline-none"
                            type="number"
                            value={percentage}
                            onChange={(e) => setPercentage(parseInt(e.target.value))}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-bold">%</span>
                    </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                    <PIDInput label="P:" defaultValue="1.2" />
                    <PIDInput label="I:" defaultValue="0.5" />
                    <PIDInput label="D:" defaultValue="0.1" />
                </div>
                <button className="w-full py-2 border border-primary text-primary font-bold rounded-lg bg-white hover:bg-primary hover:text-white hover:shadow-lg hover:shadow-primary/20 transition-all text-sm mt-auto">確認出水參數</button>
            </div>
        </div>
    );
};

const PIDInput = ({ label, defaultValue }) => (
    <div className="space-y-1.5">
        <label className="text-xs font-bold text-slate-500 uppercase">{label}</label>
        <input
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
            step="0.1"
            type="number"
            defaultValue={defaultValue}
        />
    </div>
);

const ReturnValveControl = () => {
    const [openingRatio, setOpeningRatio] = useState(45);
    const [targetValue, setTargetValue] = useState(45);

    return (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm h-full flex flex-col">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800">
                <h3 className="font-bold flex items-center gap-2">
                    回水閥控制
                </h3>
            </div>
            <div className="p-6 flex-1 flex flex-col gap-4">
                <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase">開度比例</label>
                        <div className="relative">
                            <input
                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm font-bold text-primary focus:ring-2 focus:ring-primary/20 outline-none"
                                type="number"
                                value={openingRatio}
                                onChange={(e) => setOpeningRatio(Number(e.target.value))}
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-bold">%</span>
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase">設定數值</label>
                        <input
                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none"
                            type="number"
                            value={targetValue}
                            onChange={(e) => setTargetValue(Number(e.target.value))}
                        />
                    </div>
                </div>
                <button className="w-full py-2 border border-primary text-primary font-bold rounded-lg bg-white hover:bg-primary hover:text-white hover:shadow-lg hover:shadow-primary/20 transition-all text-sm mt-auto">確認回水參數</button>
            </div>
        </div>
    );
};

const MotorControl = () => {
    const [enabled, setEnabled] = useState(true);

    return (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800">
                <div className="flex justify-between items-center w-full">
                    <h3 className="font-bold flex items-center gap-2">
                        馬達頻率控制
                    </h3>
                    <Toggle checked={enabled} onChange={setEnabled} />
                </div>
            </div>
            <div className="p-6 ">
                <div className="grid grid-cols-1 gap-6">
                    <div className="flex-1 space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase">目標頻率</label>
                        <div className="relative">
                            <input
                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-3 text-lg font-bold focus:ring-2 focus:ring-primary/20 outline-none disabled:opacity-50"
                                type="number"
                                defaultValue="50.0"
                                disabled={!enabled}
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">赫茲</span>
                        </div>
                    </div>
                    <div className="px-6 py-3 bg-primary/5 rounded-xl border border-primary/10">
                        <p className="text-[10px] font-bold text-primary uppercase">目前流量</p>
                        <p className="text-xl font-extrabold text-primary leading-tight">120.4 <span className="text-xs font-medium">公升/分</span></p>
                    </div>
                </div>
            </div>
        </div>
    );
};

const Toggle = ({ checked, onChange }) => (
    <label className="relative inline-flex items-center cursor-pointer">
        <input
            type="checkbox"
            className="sr-only peer"
            checked={checked}
            onChange={(e) => onChange?.(e.target.checked)}
        />
        <div className="relative h-5 w-10 rounded-full bg-slate-200 dark:bg-slate-700 transition-colors duration-200 peer-checked:bg-primary after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:bg-white after:shadow-sm after:transition-transform after:duration-200 peer-checked:after:translate-x-5"></div>
    </label>
);

const FanUnitCard = ({ fan, onToggle }) => (
    <div className={`bg-white dark:bg-slate-900 border ${fan.status === 'fault' ? 'border-red-200 dark:border-red-900/50 bg-red-50/10' : 'border-slate-200 dark:border-slate-800'} rounded-xl p-5 shadow-sm hover:border-primary/50 transition-colors flex flex-col justify-between h-full`}>
        <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
                <h4 className="font-bold text-slate-800 dark:text-slate-100">{fan.name}</h4>
                {fan.status === 'fault' && <span className="material-symbols-outlined text-red-500 text-sm">error</span>}
            </div>
            <Toggle checked={fan.isOn} onChange={() => onToggle?.(fan.id)} />
        </div>
        <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase">目標轉速</label>
            <div className="relative">
                <input
                    className={`w-full bg-slate-50 dark:bg-slate-800 border ${fan.status === 'fault' ? 'border-red-100 dark:border-red-900/30' : 'border-slate-200 dark:border-slate-700'} rounded-lg px-3 py-2 text-sm font-bold focus:ring-1 focus:ring-primary/30 outline-none`}
                    type="number"
                    defaultValue={fan.targetRpm}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-bold">轉/分</span>
            </div>
        </div>
    </div>
);

// --- Main App ---

export default function IndustrialControl({ device, onBack }) {
    const [allFansEnabled, setAllFansEnabled] = useState(false);
    const [pidMonitoringEnabled, setPidMonitoringEnabled] = useState(true);
    const telemetry = [
        { label: '入水數據', colorClass: 'text-primary', metrics: [{ name: '溫度', value: '10', unit: '°C' }, { name: '壓力', value: '10', unit: 'pa' }] },
        { label: '出水數據', colorClass: 'text-orange-500', metrics: [{ name: '溫度', value: '10', unit: '°C' }, { name: '壓力', value: '10', unit: 'pa' }] },
        { label: '回水數據', colorClass: 'text-indigo-500', metrics: [{ name: '溫度', value: '10', unit: '°C' }, { name: '壓力', value: '10', unit: 'pa' }] },
        { label: '冷排溫度監控', colorClass: 'text-emerald-600', metrics: [{ name: '左 1', value: '10', unit: '°C' }, { name: '右 1', value: '10', unit: '°C' }, { name: '左 2', value: '10', unit: '°C' }, { name: '右 2', value: '10', unit: '°C' }] },
        { label: '入風溫濕度', colorClass: 'text-sky-500', metrics: [{ name: '溫度', value: '10', unit: '°C' }, { name: '濕度', value: '10', unit: '%RH' }] },
        { label: '出風溫度', colorClass: 'text-cyan-600', metrics: [{ name: '溫度', value: '10', unit: '°C' }] },
    ];

    const [fans, setFans] = useState([
        { id: '1', name: '風扇機組 01', targetRpm: 1250, status: 'online', isOn: true },
        { id: '2', name: '風扇機組 02', targetRpm: 1250, status: 'online', isOn: true },
        { id: '3', name: '風扇機組 03', targetRpm: 0, status: 'standby', isOn: false },
        { id: '4', name: '風扇機組 04', targetRpm: 1200, status: 'online', isOn: true },
        { id: '5', name: '風扇機組 05', targetRpm: 0, status: 'fault', isOn: false },
        { id: '6', name: '風扇機組 06', targetRpm: 1200, status: 'online', isOn: true },
        { id: '7', name: '風扇機組 07', targetRpm: 1100, status: 'online', isOn: true },
        { id: '8', name: '風扇機組 08', targetRpm: 1100, status: 'online', isOn: true },
        { id: '9', name: '風扇機組 09', targetRpm: 1100, status: 'online', isOn: true },
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
        online: '系統正常',
        warning: '需要注意',
        critical: '異常警示',
        offline: '設備離線'
    };

    const statusClass = {
        online: 'text-emerald-600 dark:text-emerald-400',
        warning: 'text-amber-600 dark:text-amber-400',
        critical: 'text-red-600 dark:text-red-400',
        offline: 'text-slate-500 dark:text-slate-400'
    };

    return (
        <div className="min-h-full bg-slate-50/50 dark:bg-background-dark/50 text-slate-900 dark:text-slate-100 p-8 overflow-y-auto">
                {/* Header */}
                <header className="flex items-center justify-between mb-8">
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
                                    device?.status === 'critical' ? 'bg-red-500' :
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
                    <div className="flex items-center gap-4">

                    </div>
                </header>

                {/* Telemetry Section */}
                <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
                    {telemetry.map((t, i) => (
                        <TelemetryCard key={i} data={t} />
                    ))}
                </section>

                {/* Core Control Grid */}
                <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
                    <ValveControl />
                    <ReturnValveControl />
                    <MotorControl />
                </section>

                {/* Fan Matrix Section */}
                <section className="space-y-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-8">
                            <h3 className="text-lg font-bold flex items-center gap-2">
                                風扇控制矩陣
                            </h3>
                            <div className="flex items-center gap-3">
                                <span className="text-xs font-bold text-slate-500 uppercase">一鍵開啟全部</span>
                                <Toggle checked={allFansEnabled} onChange={handleToggleAllFans} />
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-xs font-bold text-slate-500 uppercase">PID 啟動監控</span>
                                <Toggle checked={pidMonitoringEnabled} onChange={setPidMonitoringEnabled} />
                            </div>
                        </div>
                        <div className="flex gap-4 text-xs font-medium text-slate-500">
                            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> 運行中</span>
                            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-slate-300"></span> 待命</span>
                            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500"></span> 故障</span>
                        </div>
                    </div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
                    >
                        {fans.map((fan) => (
                            <FanUnitCard key={fan.id} fan={fan} onToggle={handleToggleFan} />
                        ))}
                    </motion.div>
                </section>
        </div>
    );
}
