/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, {useEffect, useState} from 'react';
import { motion } from 'motion/react';
import {ArrowLeft} from "lucide-react";

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
];

const mapSensorValues = (sensorPayload) => {
    const sensorEntries = Object.entries(sensorPayload ?? {}).filter(([key]) => /^s\d+$/.test(key));
    const mappedValues = {};

    TELEMETRY_SENSOR_ORDER.forEach((fieldName, index) => {
        mappedValues[fieldName] = sensorEntries[index]?.[1] ?? '--';
    });

    return mappedValues;
};


// --- Components ---


const TelemetryCard = ({ data }) => (
    <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <p className={`text-[16px] font-bold ${data.colorClass} mb-3`}>{data.label}</p>
        <div className="grid grid-cols-1 gap-2 text-xs">
            {data.metrics.map((m, i) => (
                <div key={i} className="flex justify-between">
                    <span>{m.name}:</span>
                    <span className="font-bold">{m.value} <span className="text-slate-400">{m.unit}</span></span>
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
            onChange={(e) => onChange?.(e.target.checked)}
        />
        <div className="relative h-5 w-10 rounded-full bg-slate-200 dark:bg-slate-700 transition-colors duration-200 peer-checked:bg-primary after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:bg-white after:shadow-sm after:transition-transform after:duration-200 peer-checked:after:translate-x-5"></div>
    </label>
);



const ValveControl = () => {
    const [percentage, setPercentage] = useState(75);
    const [outletPidMonitoringEnabled, setOutletPidMonitoringEnabled] = useState(true);
    const [outletCorrectionEnabled, setOutletCorrectionEnabled] = useState(true);
    return (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm h-full flex flex-col">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                <h2 className="text-[16px] font-bold flex items-center gap-2">
                    出水閥控制
                </h2>
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
                    <span className="text-xs font-normal text-slate-400">PV: 0 </span>
                    <div className="relative">
                        <input
                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm font-bold text-primary focus:ring-2 focus:ring-primary/20 outline-none"
                            type="number"
                            value={percentage}
                            onChange={(e) => setPercentage(parseInt(e.target.value))}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] text-slate-400 font-bold">%</span>
                    </div>
                </div>
                <div className="grid grid-cols-3 gap-4 text-[14px]">
                    <PIDInput label="P:" defaultValue="1.2" />
                    <PIDInput label="I:" defaultValue="0.5" />
                    <PIDInput label="D:" defaultValue="0.1" />
                </div>
                <button className="w-full py-2 border border-primary text-primary font-bold rounded-lg bg-white hover:bg-primary hover:text-white hover:shadow-lg hover:shadow-primary/20 transition-all text-xs mt-auto">確定</button>
            </div>
        </div>
    );
};

const PIDInput = ({ label, defaultValue }) => (
    <div className="space-y-1.5 space-x-1.5">
        <label className="text-s font-bold text-slate-500 uppercase">{label}</label>
        <span className="text-xs font-normal text-slate-400">PV: 0 </span>
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
                <h2 className="text-[16px] font-bold flex items-center gap-2">
                    混水閥控制
                </h2>
            </div>
            <div className="p-6 flex-1 flex flex-col gap-4">
                <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-1.5 space-x-1.5">
                        <label className="text-[14px] font-bold text-slate-500 uppercase">開度比例</label>
                        <span className="text-xs font-normal text-slate-400">PV: 0 </span>
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
                    <div className="space-y-1.5 space-x-1.5">
                        <label className="text-[16px] font-bold text-slate-500 uppercase">設定數值</label>
                        <span className="text-xs font-normal text-slate-400">PV: 0 </span>
                        <input
                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none"
                            type="number"
                            value={targetValue}
                            onChange={(e) => setTargetValue(Number(e.target.value))}
                        />
                    </div>
                </div>
                <button className="w-full py-2 border border-primary text-primary font-bold rounded-lg bg-white hover:bg-primary hover:text-white hover:shadow-lg hover:shadow-primary/20 transition-all text-xs mt-auto">確定</button>
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
                    <h2 className="text-[16px] font-bold flex items-center gap-2">
                        混水泵浦控制
                    </h2>
                    <Toggle checked={enabled} onChange={setEnabled} />
                </div>
            </div>
            <div className="p-6 ">
                <div className="grid grid-cols-1 gap-6">

                    <div className="flex-1 space-y-1.5 space-x-1.5">
                        <label className="text-[14px] font-bold text-slate-500 uppercase">目標頻率</label>
                        <span className="text-xs font-normal text-slate-400">PV: 0 </span>
                        <div className="flex flex-1 gap-2">
                        <div className="relative flex-1">
                            <input
                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-3 text-lg font-bold focus:ring-2 focus:ring-primary/20 outline-none disabled:opacity-50"
                                type="number"
                                defaultValue="50.0"
                                disabled={!enabled}
                            />


                            <span className="absolute right-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">Hz</span>

                        </div>
                        <button className="bg-primary/10 text-primary px-4 py-2 rounded-lg text-xs font-bold border border-primary/20 hover:bg-primary hover:text-white transition-all">確定</button>
                    </div>
                </div>
                    <div className="px-6 py-3 bg-primary/5 rounded-xl border border-primary/10">
                        <p className="text-[12px] font-bold text-primary uppercase">當前水流量</p>
                        <p className="text-xl font-extrabold text-primary leading-tight">120.4 <span className="text-xs font-medium">公升/分</span></p>
                    </div>
                    <div className="px-6 py-3 bg-primary/5 rounded-xl border border-primary/10">
                        <p className="text-[12px] font-bold text-primary uppercase">當前熱交換</p>
                        <p className="text-xl font-extrabold text-primary leading-tight">120.4 <span className="text-xs font-medium">kW</span></p>
                    </div>
                </div>
            </div>
        </div>
    );
};



const FanUnitCard = ({ fan, onToggle }) => (
    <div className={`bg-white dark:bg-slate-900 border ${fan.status === 'fault' ? 'border-red-200 dark:border-red-900/50 bg-red-50/10' : 'border-slate-200 dark:border-slate-800'} rounded-xl p-5 shadow-sm hover:border-primary/50 transition-colors flex flex-col justify-between h-full`}>
        <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
                <h5 className="text-[16px] font-bold text-slate-800 dark:text-slate-100">{fan.name}</h5>
                {fan.status === 'fault' && <span className="material-symbols-outlined text-red-500 text-sm">error</span>}
            </div>
            <Toggle checked={fan.isOn} onChange={() => onToggle?.(fan.id)} />
        </div>
        <div className="space-y-1.5 space-x-1.5">
            <label className="text-[14px] font-bold text-slate-400 uppercase">目標轉速</label>
            <span className="text-xs font-normal text-slate-400">PV: {fan.pv} </span>
            <div className="relative">
                <input
                    className={`w-full bg-slate-50 dark:bg-slate-800 border ${fan.status === 'fault' ? 'border-red-100 dark:border-red-900/30' : 'border-slate-200 dark:border-slate-700'} rounded-lg px-3 py-2 text-sm font-bold focus:ring-1 focus:ring-primary/30 outline-none`}
                    type="number"
                    defaultValue={fan.sv}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] text-slate-400 font-bold">轉/分</span>
            </div>
        </div>
    </div>
);

// --- Main App ---

export function IndustrialControl({device, onBack}) {
    const [allFansEnabled, setAllFansEnabled] = useState(false);
    const [pidMonitoringEnabled, setPidMonitoringEnabled] = useState(true);
    const [fansCorrectionEnabled, setFansCorrectionEnabled] = useState(true);
    const [sensorData, setSensorData] = useState({});
    const deviceIdentifier = device?.name ?? device?.deviceName ?? device?.id ?? device?.deviceId;
    const sensorValues = mapSensorValues(sensorData);
    const telemetry = [
        {
            label: '入水數據',
            colorClass: 'text-primary',
            metrics: [
                {name: '溫度', value: sensorValues.inletWaterTemp, unit: '°C'},
                {name: '壓力', value: sensorValues.inletWaterPressure, unit: 'pa'}
            ]
        },
        {
            label: '出水數據',
            colorClass: 'text-orange-500',
            metrics: [
                {name: '溫度', value: sensorValues.outletWaterTemp, unit: '°C'},
                {name: '壓力', value: sensorValues.outletWaterPressure, unit: 'pa'}
            ]
        },
        {
            label: '回水數據',
            colorClass: 'text-indigo-500',
            metrics: [
                {name: '溫度', value: sensorValues.returnWaterTemp, unit: '°C'},
                {name: '壓力', value: sensorValues.returnWaterPressure, unit: 'pa'}
            ]
        },
        {
            label: '盤管水溫監控',
            colorClass: 'text-emerald-600',
            metrics: [
                {name: '左 入', value: sensorValues.coolingL1, unit: '°C'},
                {name: '左 出', value: sensorValues.coolingL2, unit: '°C'},
                {name: '右 入', value: sensorValues.coolingR1, unit: '°C'},
                {name: '右 出', value: sensorValues.coolingR2, unit: '°C'}
            ]
        },
        {
            label: '入風溫濕度',
            colorClass: 'text-sky-500',
            metrics: [
                {name: '溫度', value: sensorValues.inletAirTemp, unit: '°C'},
                {name: '濕度', value: sensorValues.inletAirHumidity, unit: '%RH'}
            ]
        },
    ];
    useEffect(() => {
        if (!deviceIdentifier) {
            setSensorData([]);
            return;
        }

        const fetchDeviceSensor = () => {
            fetch(`/api/sensor/last/${encodeURIComponent(deviceIdentifier)}`, {
                method: 'GET',
            })
                .then(res => res.json())
                .then(data => {
                    setSensorData(data ?? {});
                })
                .catch(err => console.error('設備感測資料獲取失敗:', err));
        };

        fetchDeviceSensor();
    }, [deviceIdentifier]);


    const [fans, setFans] = useState([
        {id: '1', name: '風扇 01', pv: 0, sv: 1250, status: 'online', isOn: true},
        {id: '2', name: '風扇 02', pv: 0, sv: 1250, status: 'online', isOn: true},
        {id: '3', name: '風扇 03', pv: 0, sv: 0, status: 'standby', isOn: false},
        {id: '4', name: '風扇 04', pv: 0, sv: 1200, status: 'online', isOn: true},
        {id: '5', name: '風扇 05', pv: 0, sv: 0, status: 'standby', isOn: true},
        {id: '6', name: '風扇 06', pv: 0, sv: 1200, status: 'online', isOn: true},
        {id: '7', name: '風扇 07', pv: 0, sv: 1100, status: 'online', isOn: true},
        {id: '8', name: '風扇 08', pv: 0, sv: 1100, status: 'online', isOn: true},
        {id: '9', name: '風扇 09', pv: 0, sv: 1100, status: 'online', isOn: true},
    ]);

    const handleToggleFan = (fanId) => {
        setFans((prev) =>
            prev.map((fan) =>
                fan.id === fanId && fan.status !== 'fault'
                    ? {...fan, isOn: !fan.isOn}
                    : fan
            )
        );
    };

    const handleToggleAllFans = (enabled) => {
        setAllFansEnabled(enabled);
        setFans((prev) =>
            prev.map((fan) =>
                fan.status === 'fault' ? fan : {...fan, isOn: enabled}
            )
        );
    };

    const statusText = {
        running: '系統正常',
        alert: '異常警示',
        online: '系統正常',
        warning: '需要注意',
        critical: '異常警示',
        offline: '設備離線'
    };

    const statusClass = {
        running: 'text-emerald-600 dark:text-emerald-400',
        alert: 'text-red-600 dark:text-red-400',
        online: 'text-emerald-600 dark:text-emerald-400',
        warning: 'text-amber-600 dark:text-amber-400',
        critical: 'text-red-600 dark:text-red-400',
        offline: 'text-slate-500 dark:text-slate-400'
    };

    return (
        <div
            className="min-h-full bg-slate-50/50 dark:bg-background-dark/50 text-slate-900 dark:text-slate-100 p-8 overflow-y-auto">
            {/* Header */}
            <header className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">

                    <button
                        onClick={onBack}
                        className="p-2 hover:bg-white border border-transparent hover:border-slate-200 rounded-lg transition-all text-slate-500"
                    >
                        <ArrowLeft size={20}/>
                    </button>
                    <div>
                        <h2 className="text-xl font-bold tracking-tight">設備 {device?.id}</h2>
                        <div className="flex items-center gap-2">
                                <span className={`flex h-2 w-2 rounded-full ${
                                    device?.status === 'alert' || device?.status === 'critical' ? 'bg-red-500' :
                                        device?.status === 'warning' ? 'bg-amber-500' :
                                            device?.status === 'offline' ? 'bg-slate-400' : 'bg-emerald-500'
                                }`}></span>
                            <span
                                className={`text-xs font-medium ${statusClass[device?.status] ?? statusClass.online}`}>
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
                    <TelemetryCard key={i} data={t}/>
                ))}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm ">
                    <p className="text-[18px] font-bold text-cyan-600 mb-3">出風溫度</p>
                    <div className="flex justify-between items-center text-xs mb-2">
                        <span className="text-slate-500">溫度:</span>
                        <span className="font-bold">10 <span className="text-slate-400 font-normal">°C</span></span>
                    </div>
                    <div className="pt-2 border-t border-slate-100 space-y-2">
                        <div className="flex items-center gap-2">
                            <span className="text-xs  text-slate-500 shrink-0">目標溫度</span>
                            <input
                                className="w-full h-7 text-[12px] border border-slate-200 rounded px-1 focus:ring-1 focus:ring-primary outline-none"
                                type="number"
                                defaultValue={0}
                            />
                            <span className="text-[16px] text-slate-400">°C</span>
                        </div>
                        <button className="w-full px-2 py-1 bg-primary text-white text-[12px] font-bold rounded">確定
                        </button>
                    </div>
                </div>
            </section>

            {/* Core Control Grid */}
            <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
                <ValveControl/>
                <ReturnValveControl/>
                <MotorControl/>
            </section>

            {/* Fan Matrix Section */}
            <section className="space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-8">
                        <h2 className="text-[20px] font-bold flex items-center gap-2">
                            風扇控制
                        </h2>

                        <div className="flex items-center gap-3">
                            <span className="text-xs font-bold text-slate-500 uppercase">PID 啟動監控</span>
                            <Toggle checked={pidMonitoringEnabled} onChange={setPidMonitoringEnabled}/>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-xs font-bold text-slate-500 uppercase">正向修正</span>
                            <Toggle checked={fansCorrectionEnabled} onChange={setFansCorrectionEnabled}/>
                        </div>
                    </div>

                </div>

                {/* Global Control Bar */}
                <div
                    className="bg-slate-50/50 p-6 rounded-xl border border-slate-200 mb-8 grid grid-cols-1 xl:grid-cols-3 gap-8">
                    <div className="space-y-4 items-center gap-2">
                        <div className="flex space-x-4">
                            <h3 className=" uppercase tracking-wider font-bold text-slate-400">一鍵開啟全部</h3>
                            <Toggle checked={allFansEnabled} onChange={handleToggleAllFans}/>
                            <span className="text-xs font-normal text-slate-400">PV: 0 </span>
                        </div>

                        <div className="flex items-center gap-4">

                            <div className="flex-1 flex gap-2">
                                <div className="relative flex-1">
                                    <input
                                        type="number"
                                        defaultValue="1800"
                                        className="w-full bg-white border-none rounded-lg px-3 py-2 text-sm ring-1 ring-slate-200 focus:ring-primary outline-none"
                                    />
                                    <span
                                        className="absolute right-3 top-2.5 text-[10px] text-slate-400 font-bold">RPM</span>
                                </div>
                                <button
                                    className="bg-primary/10 text-primary px-4 py-2 rounded-lg text-xs font-bold border border-primary/20 hover:bg-primary hover:text-white transition-all">確定
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4 border-l border-slate-200 xl:pl-8">
                        <h3 className=" uppercase tracking-wider font-bold text-slate-400">壓差控制</h3>
                        <div className="flex items-center gap-4">
                            <div className="flex flex-col">
                                <span className="text-[12px] text-slate-400 font-bold">CV</span>
                                <span className="text-s font-bold text-slate-700">232 Pa</span>
                            </div>
                            <div className="flex-1 flex gap-2">
                                <div className="relative flex-1">
                                    <input
                                        type="number"
                                        defaultValue="250"
                                        className="w-full bg-white border-none rounded-lg px-3 py-2 text-sm ring-1 ring-slate-200 focus:ring-primary outline-none"
                                    />
                                    <span
                                        className="absolute right-3 top-2.5 text-[10px] text-slate-400 font-bold">Pa</span>
                                </div>
                                <button
                                    className="bg-primary/10 text-primary px-4 py-2 rounded-lg text-xs font-bold border border-primary/20 hover:bg-primary hover:text-white transition-all">確定
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4 border-l border-slate-200 xl:pl-8">
                        <h3 className=" uppercase tracking-wider font-bold text-slate-400 ">PID 設定</h3>
                        <div className="flex items-end gap-3">
                            <div className="grid grid-cols-3 gap-2 flex-1 text-xs">
                                {['P', 'I', 'D'].map((label, i) => (
                                    <div key={label} >
                                        <label
                                            className="text- text-slate-400 block mb-1 font-bold">{label}</label>
                                        <span className="text-xs font-normal text-slate-400">PV: 0 </span>
                                        <input
                                            type="number"
                                            defaultValue={[0.85, 0.22, 0.05][i]}
                                            step="0.01"
                                            className="w-full bg-white border-none rounded-lg text-xs px-2 py-1.5 ring-1 ring-slate-200 focus:ring-primary outline-none"
                                        />
                                    </div>
                                ))}
                            </div>
                            <button
                                className="bg-primary/10 text-primary px-4 py-2 rounded-lg text-xs font-bold border border-primary/20 hover:bg-primary hover:text-white transition-all">確定
                            </button>
                        </div>
                    </div>
                </div>

                <motion.div
                    initial={{opacity: 0, y: 20}}
                    animate={{opacity: 1, y: 0}}
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
                >
                    {fans.map((fan) => (
                        <FanUnitCard key={fan.id} fan={fan} onToggle={handleToggleFan}/>
                    ))}
                </motion.div>

            </section>
        </div>
    );
}
