/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Check, Settings } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { formatApiNumber } from '../utils/formatApiNumber';

import ConnectSetting from '../components/ConnectSetting.jsx';
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
    const formattedValue = formatApiNumber(value, FALLBACK_VALUE);

    if (formattedValue === FALLBACK_VALUE) {
        return FALLBACK_VALUE;
    }

    const numericValue = Number(formattedValue);
    return Number.isNaN(numericValue) ? FALLBACK_VALUE : numericValue.toFixed(1);
};

const buildFansFromHolding = (holdingPayload) => Array.from({ length: 9 }, (_, index) => {
    const fanNumber = index + 1;
    const id = String(fanNumber).padStart(2, '0');
    const pvValue = Number(holdingPayload?.[`cooling_fan${fanNumber}_pv`] ?? 0);
    const svValue = Number(holdingPayload?.[`cooling_fan${fanNumber}_sv`] ?? 0);
    const safePvValue = Number.isNaN(pvValue) ? 0 : pvValue;
    const safeSvValue = Number.isNaN(svValue) ? 0 : svValue;
    const isActive = safePvValue > 0 || safeSvValue > 0;

    return {
        id,
        status: isActive ? 'Running' : 'Stopped',
        pvPercent: safePvValue,
        pvRpm: safePvValue,
        svRpm: safeSvValue,
        isActive,
    };
});

const buildAllFansTargetFromHolding = (holdingPayload) => {
    const fanSvValues = Array.from({ length: 9 }, (_, index) => String(holdingPayload?.[`cooling_fan${index + 1}_sv`] ?? ''));

    return fanSvValues.every((value) => value === fanSvValues[0]) ? fanSvValues[0] : '';
};

const POLLING_INTERVAL_MS = 30000;

const TelemetryCard = ({ data }) => (
    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
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
        <div className="relative h-5 w-10 rounded-full bg-slate-200 transition-colors duration-200 peer-checked:bg-primary after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:bg-white after:shadow-sm after:transition-transform after:duration-200 peer-checked:after:translate-x-5"></div>
    </label>
);

const PVText = ({ value, unit = '' }) => (
    <span className="text-xs font-normal text-slate-400">
        PV: {formatDisplayValue(value)} {unit}
    </span>
);

const PIDInput = ({ label, pvValue, value, onChange }) => (
    <div className="space-y-1.5 space-x-1.5">
        <label className="text-s font-bold text-slate-500 uppercase">{label}</label>
        <PVText value={pvValue} />
        <input
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
            step="0.1"
            type="number"
            value={value}
            onChange={onChange}
            placeholder={FALLBACK_VALUE}
        />
    </div>
);

const ValveControl = ({
    holdingData,
    percentage,
    onPercentageChange,
    onSubmit,
    isSubmitting,
    pidValues,
    onPidChange,
}) => {
    const { t } = useLanguage();
    const [outletPidMonitoringEnabled, setOutletPidMonitoringEnabled] = useState(true);
    const [outletCorrectionEnabled, setOutletCorrectionEnabled] = useState(true);

    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm h-full flex flex-col">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center">
                <h2 className="text-[16px] font-bold flex items-center gap-2">{t('industrial.outletValveControl')}</h2>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-slate-500 uppercase">{t('industrial.pidEnabled')}</span>
                        <Toggle checked={outletPidMonitoringEnabled} onChange={setOutletPidMonitoringEnabled} />
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-slate-500 uppercase">{t('industrial.forwardCorrection')}</span>
                        <Toggle checked={outletCorrectionEnabled} onChange={setOutletCorrectionEnabled} />
                    </div>
                </div>
            </div>
            <div className="p-6 flex-1 flex flex-col gap-6">
                <div className="space-y-2 space-x-1.5">
                    <label className="text-xs text-[14px] font-semibold text-slate-600 ">{t('industrial.openingRatio')}</label>
                    <PVText value={holdingData?.outlet_electric_valve_opening_pv} unit="%" />
                    <div className="relative">
                        <input
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-primary focus:ring-2 focus:ring-primary/20 outline-none"
                            type="number"
                            value={percentage}
                            onChange={(event) => onPercentageChange?.(event.target.value)}
                            placeholder={FALLBACK_VALUE}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] text-slate-400 font-bold">%</span>
                    </div>
                </div>
                <div className="grid grid-cols-3 gap-4 text-[14px]">
                    <PIDInput
                        label="P:"
                        pvValue={holdingData?.group2_pid_p_pv}
                        value={pidValues.p}
                        onChange={(event) => onPidChange?.('p', event.target.value)}
                    />
                    <PIDInput
                        label="I:"
                        pvValue={holdingData?.group2_pid_i_pv}
                        value={pidValues.i}
                        onChange={(event) => onPidChange?.('i', event.target.value)}
                    />
                    <PIDInput
                        label="D:"
                        pvValue={holdingData?.group2_pid_d_pv}
                        value={pidValues.d}
                        onChange={(event) => onPidChange?.('d', event.target.value)}
                    />
                </div>
                <button
                    type="button"
                    onClick={onSubmit}
                    disabled={isSubmitting}
                    className="w-full py-2 border border-primary text-primary font-bold rounded-lg bg-white hover:bg-primary hover:text-white hover:shadow-lg hover:shadow-primary/20 transition-all text-xs mt-auto disabled:opacity-50"
                >
                    {t('common.confirm')}
                </button>
            </div>
        </div>
    );
};

const ReturnValveControl = ({ holdingData, openingRatio, onOpeningRatioChange, onSubmit, isSubmitting }) => {
    const { t } = useLanguage();

    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm h-full flex flex-col">
            <div className="p-5 border-b border-slate-100">
                <h2 className="text-[16px] font-bold flex items-center gap-2">{t('industrial.mixingValveControl')}</h2>
            </div>
            <div className="p-6 flex-1 flex flex-col gap-4">
                <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-1.5 space-x-1.5">
                        <label className="text-[14px] font-bold text-slate-500 uppercase">{t('industrial.openingRatio')}</label>
                        <PVText value={holdingData?.outlet_electric_valve_opening_pv} unit="%" />
                        <div className="relative">
                            <input
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-primary focus:ring-2 focus:ring-primary/20 outline-none"
                                type="number"
                                value={openingRatio}
                                onChange={(event) => onOpeningRatioChange?.(event.target.value)}
                                placeholder={FALLBACK_VALUE}
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-bold">%</span>
                        </div>
                    </div>

                </div>
                <button
                    type="button"
                    onClick={onSubmit}
                    disabled={isSubmitting}
                    className="w-full py-2 border border-primary text-primary font-bold rounded-lg bg-white hover:bg-primary hover:text-white hover:shadow-lg hover:shadow-primary/20 transition-all text-xs mt-auto disabled:opacity-50"
                >
                    {t('common.confirm')}
                </button>
            </div>
        </div>
    );
};

const MotorControl = ({
    sensorValues,
    holdingData,
    targetFrequency,
    onTargetFrequencyChange,
    onTargetFrequencyFocus,
    onTargetFrequencyBlur,
    onSubmit,
    isSubmitting,
}) => {
    const { t } = useLanguage();
    const [enabled, setEnabled] = useState(true);

    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="p-5 border-b border-slate-100">
                <div className="flex justify-between items-center w-full">
                    <h2 className="text-[16px] font-bold flex items-center gap-2">{t('industrial.mixingPumpControl')}</h2>
                    <Toggle checked={enabled} onChange={setEnabled} />
                </div>
            </div>
            <div className="p-6">
                <div className="grid grid-cols-1 gap-6">
                    <div className="flex-1 space-y-1.5 space-x-1.5">
                        <label className="text-[14px] font-bold text-slate-500 uppercase">{t('industrial.targetFrequency')}</label>
                        <PVText value={holdingData?.circulating_pump_pv} unit="Hz" />
                        <div className="flex flex-1 gap-2">
                            <div className="relative flex-1">
                                <input
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-3 text-lg font-bold focus:ring-2 focus:ring-primary/20 outline-none disabled:opacity-50"
                                    type="number"
                                    value={targetFrequency ?? ''}
                                    onChange={(event) => onTargetFrequencyChange?.(event.target.value)}
                                    onFocus={onTargetFrequencyFocus}
                                    onBlur={onTargetFrequencyBlur}
                                    placeholder={FALLBACK_VALUE}
                                    disabled={!enabled}
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">Hz</span>
                            </div>
                            <button
                                type="button"
                                onClick={onSubmit}
                                disabled={!enabled || isSubmitting}
                                className="bg-primary/10 text-primary px-4 py-2 rounded-lg text-xs font-bold border border-primary/20 hover:bg-primary hover:text-white transition-all disabled:opacity-50"
                            >
                                {t('common.confirm')}
                            </button>
                        </div>
                    </div>
                    <div className="px-6 py-3 bg-primary/5 rounded-xl border border-primary/10">
                        <p className="text-[12px] font-bold text-primary uppercase">{t('industrial.currentFlowRate')}</p>
                        <p className="text-xl font-extrabold text-primary leading-tight">
                            {formatDisplayValue(sensorValues.flowRate)} <span className="text-xs font-medium">{t('industrial.flowUnit')}</span>
                        </p>
                    </div>
                    <div className="px-6 py-3 bg-primary/5 rounded-xl border border-primary/10">
                        <p className="text-[12px] font-bold text-primary uppercase">{t('industrial.currentHeatExchange')}</p>
                        <p className="text-xl font-extrabold text-primary leading-tight">
                            {formatDisplayValue(sensorValues.heatExchange)} <span className="text-xs font-medium">kW</span>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

const FanUnitCard = ({ fan, onSvChange, onSubmit, isSubmitting }) => {
    const { t } = useLanguage();
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
                        {t('industrial.fanLabel')} <span className="text-slate-400">{fan.id}</span>
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
                            <span className="text-sm font-bold">{formatDisplayValue(fan.pvPercent)}</span>
                            <span className="text-[10px] text-slate-400 font-bold">%</span>
                        </div>
                        <div className="flex items-center justify-between bg-white border border-slate-200 rounded-xl px-3 py-1.5 shadow-sm">
                            <span className="text-sm font-bold">{formatDisplayValue(fan.pvRpm)}</span>
                            <span className="text-[10px] text-slate-400 font-bold">RPM</span>
                        </div>
                    </div>
                </div>
                <div className="space-y-2">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">SV</p>
                    <div className="flex h-full max-h-[72px] border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                        <input
                            type="number"
                            value={fan.svRpm}
                            onChange={(event) => onSvChange?.(fan.id, event.target.value)}
                            className="w-full border-none bg-transparent text-lg font-bold px-3 focus:ring-0"
                        />
                        <button
                            type="button"
                            onClick={() => onSubmit?.(fan.id)}
                            disabled={isSubmitting}
                            className="bg-slate-50 px-3 flex items-center justify-center border-l border-slate-100 transition-colors disabled:opacity-50"
                        >
                            <Check size={18} className="text-slate-400" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
export function IndustrialControl({ device, onBack }) {
    const { t } = useLanguage();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [allFansEnabled, setAllFansEnabled] = useState(false);
    const [pidMonitoringEnabled, setPidMonitoringEnabled] = useState(true);
    const [fansCorrectionEnabled, setFansCorrectionEnabled] = useState(true);
    const [sensorData, setSensorData] = useState({});
    const [holdingData, setHoldingData] = useState({});
    const [fans, setFans] = useState([]);
    const [allFansRpmTarget, setAllFansRpmTarget] = useState('');
    const [outletTargetTempSv, setOutletTargetTempSv] = useState('');
    const [circulatingPumpSv, setCirculatingPumpSv] = useState('');
    const [outletValveOpening, setOutletValveOpening] = useState('');
    const [pressureTarget, setPressureTarget] = useState('');
    const [returnValveOpening, setReturnValveOpening] = useState('');
    const [pidValues, setPidValues] = useState({ p: '', i: '', d: '' });
    const [valvePidValues, setValvePidValues] = useState({ p: '', i: '', d: '' });
    const [submittingFanId, setSubmittingFanId] = useState(null);
    const [isSubmittingPid, setIsSubmittingPid] = useState(false);
    const [isSubmittingAllFans, setIsSubmittingAllFans] = useState(false);
    const [isSubmittingOutletTargetTemp, setIsSubmittingOutletTargetTemp] = useState(false);
    const [isSubmittingOutletValveOpening, setIsSubmittingOutletValveOpening] = useState(false);
    const [isSubmittingPressureTarget, setIsSubmittingPressureTarget] = useState(false);
    const [isSubmittingReturnValveOpening, setIsSubmittingReturnValveOpening] = useState(false);
    const [isSubmittingPumpFrequency, setIsSubmittingPumpFrequency] = useState(false);
    const isEditingAllFansRpmTargetRef = useRef(false);
    const isEditingCirculatingPumpSvRef = useRef(false);
    const isEditingOutletTargetTempRef = useRef(false);
    const isEditingOutletValveOpeningRef = useRef(false);
    const isEditingPressureTargetRef = useRef(false);
    const isEditingReturnValveOpeningRef = useRef(false);

    const deviceIdentifier = device?.name ?? device?.deviceName ?? device?.id ?? device?.deviceId;
    const sensorValues = mapSensorValues(sensorData);
    const telemetry = [
        {
            label: t('industrial.telemetry.inletWaterData'),
            colorClass: 'text-primary',
            metrics: [
                { name: t('industrial.temperature'), value: sensorValues.inletWaterTemp, unit: '°C' },
                { name: t('industrial.pressure'), value: sensorValues.inletWaterPressure, unit: 'pa' },
            ],
        },
        {
            label: t('industrial.telemetry.outletWaterData'),
            colorClass: 'text-orange-500',
            metrics: [
                { name: t('industrial.temperature'), value: sensorValues.outletWaterTemp, unit: '°C' },
                { name: t('industrial.pressure'), value: sensorValues.outletWaterPressure, unit: 'pa' },
            ],
        },
        {
            label: t('industrial.telemetry.returnWaterData'),
            colorClass: 'text-indigo-500',
            metrics: [
                { name: t('industrial.temperature'), value: sensorValues.returnWaterTemp, unit: '°C' },
                { name: t('industrial.pressure'), value: sensorValues.returnWaterPressure, unit: 'pa' },
            ],
        },
        {
            label: t('industrial.telemetry.coilWaterMonitoring'),
            colorClass: 'text-emerald-600',
            metrics: [
                { name: t('industrial.metric.leftIn'), value: sensorValues.coolingL1, unit: '°C' },
                { name: t('industrial.metric.leftOut'), value: sensorValues.coolingL2, unit: '°C' },
                { name: t('industrial.metric.rightIn'), value: sensorValues.coolingR1, unit: '°C' },
                { name: t('industrial.metric.rightOut'), value: sensorValues.coolingR2, unit: '°C' },
            ],
        },
        {
            label: t('industrial.telemetry.inletAirTempHumidity'),
            colorClass: 'text-sky-500',
            metrics: [
                { name: t('industrial.temperature'), value: sensorValues.inletAirTemp, unit: '°C' },
                { name: t('industrial.metric.humidity'), value: sensorValues.inletAirHumidity, unit: '%RH' },
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
                    console.error(t('industrial.error.fetchSensor'), error);
                    setSensorData({});
                });
        };

        fetchDeviceSensor();
        const intervalId = setInterval(fetchDeviceSensor, POLLING_INTERVAL_MS);

        return () => clearInterval(intervalId);
    }, [deviceIdentifier, t]);

    useEffect(() => {
        if (!deviceIdentifier) {
            setFans([]);
            setHoldingData({});
            return;
        }

        const fetchFanHoldingData = () => {
            fetch(`/api/modbus/holding/${encodeURIComponent(deviceIdentifier)}`, {
                method: 'GET',
            })
                .then((response) => response.json())
                .then((data) => {
                    setHoldingData(data ?? {});
                    setFans(buildFansFromHolding(data ?? {}));
                    if (!isEditingAllFansRpmTargetRef.current) {
                        setAllFansRpmTarget(buildAllFansTargetFromHolding(data ?? {}));
                    }
                    if (!isEditingOutletTargetTempRef.current) {
                        setOutletTargetTempSv(String(data?.outlet_target_temp_sv ?? ''));
                    }
                    if (!isEditingCirculatingPumpSvRef.current) {
                        setCirculatingPumpSv(String(data?.circulating_pump_sv ?? ''));
                    }
                    if (!isEditingOutletValveOpeningRef.current) {
                        setOutletValveOpening(String(data?.outlet_electric_valve_opening_sv ?? ''));
                    }
                    if (!isEditingReturnValveOpeningRef.current) {
                        setReturnValveOpening(String(data?.return_electric_valve_opening_sv ?? ''));
                    }
                    if (!isEditingPressureTargetRef.current) {
                        setPressureTarget(String(data?.target_pressure_diff_sv ?? ''));
                    }
                    setPidValues({
                        p: String(data?.group1_pid_p_sv ?? ''),
                        i: String(data?.group1_pid_i_sv ?? ''),
                        d: String(data?.group1_pid_d_sv ?? ''),
                    });
                    setValvePidValues({
                        p: String(data?.group2_pid_p_sv ?? ''),
                        i: String(data?.group2_pid_i_sv ?? ''),
                        d: String(data?.group2_pid_d_sv ?? ''),
                    });
                })
                .catch((error) => {
                    console.error(t('industrial.error.fetchSensor'), error);
                    setHoldingData({});
                    setFans([]);
                });
        };

        fetchFanHoldingData();
        const intervalId = setInterval(fetchFanHoldingData, POLLING_INTERVAL_MS);

        return () => clearInterval(intervalId);
    }, [deviceIdentifier, t]);

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

    const handleFanSvChange = (fanId, value) => {
        setFans((prev) =>
            prev.map((fan) => (
                fan.id === fanId ? { ...fan, svRpm: value } : fan
            ))
        );
    };

    const handleSubmitFanSv = async (fanId) => {
        if (!deviceIdentifier) {
            return;
        }

        const fanNumber = Number(fanId);
        if (Number.isNaN(fanNumber)) {
            return;
        }

        const targetFan = fans.find((fan) => fan.id === fanId);
        const nextValue = Number(targetFan?.svRpm);

        setSubmittingFanId(fanId);

        try {
            const response = await fetch(
                `/api/modbus/control/${encodeURIComponent(deviceIdentifier)}/key/${encodeURIComponent(`cooling_fan${fanNumber}_sv`)}`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        value: Number.isNaN(nextValue) ? 0 : nextValue,
                    }),
                }
            );

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            setFans((prev) =>
                prev.map((fan) => (
                    fan.id === fanId
                        ? { ...fan, svRpm: Number.isNaN(nextValue) ? 0 : nextValue }
                        : fan
                ))
            );
        } catch (error) {
            console.error(`風扇 ${fanId} SV 設定失敗:`, error);
        } finally {
            setSubmittingFanId(null);
        }
    };

    const buildSvPayload = () => ({
        circulating_pump_sv: Number(circulatingPumpSv) || 0,
        cooling_fan1_sv: Number(fans.find((fan) => fan.id === '01')?.svRpm) || 0,
        cooling_fan2_sv: Number(fans.find((fan) => fan.id === '02')?.svRpm) || 0,
        cooling_fan3_sv: Number(fans.find((fan) => fan.id === '03')?.svRpm) || 0,
        cooling_fan4_sv: Number(fans.find((fan) => fan.id === '04')?.svRpm) || 0,
        cooling_fan5_sv: Number(fans.find((fan) => fan.id === '05')?.svRpm) || 0,
        cooling_fan6_sv: Number(fans.find((fan) => fan.id === '06')?.svRpm) || 0,
        cooling_fan7_sv: Number(fans.find((fan) => fan.id === '07')?.svRpm) || 0,
        cooling_fan8_sv: Number(fans.find((fan) => fan.id === '08')?.svRpm) || 0,
        cooling_fan9_sv: Number(fans.find((fan) => fan.id === '09')?.svRpm) || 0,
        return_electric_valve_opening_sv: Number(returnValveOpening) || 0,
        group1_pid_p_sv: Number(pidValues.p) || 0,
        group1_pid_i_sv: Number(pidValues.i) || 0,
        group1_pid_d_sv: Number(pidValues.d) || 0,
        group2_pid_p_sv: Number(valvePidValues.p) || 0,
        group2_pid_i_sv: Number(valvePidValues.i) || 0,
        group2_pid_d_sv: Number(valvePidValues.d) || 0,
    });

    const handleSubmitPidValues = async () => {
        if (!deviceIdentifier) {
            return;
        }

        setIsSubmittingPid(true);

        try {
            const response = await fetch(`/api/modbus/sv/${encodeURIComponent(deviceIdentifier)}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(buildSvPayload()),
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
        } catch (error) {
            console.error('PID 設定失敗:', error);
        } finally {
            setIsSubmittingPid(false);
        }
    };

    const handleSubmitAllFansSv = async () => {
        if (!deviceIdentifier) {
            return;
        }

        const nextValue = Number(allFansRpmTarget);
        const normalizedValue = Number.isNaN(nextValue) ? 0 : nextValue;
        const nextFans = fans.map((fan) => ({ ...fan, svRpm: normalizedValue }));

        setIsSubmittingAllFans(true);

        try {
            const response = await fetch(`/api/modbus/sv/${encodeURIComponent(deviceIdentifier)}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    circulating_pump_sv: Number(circulatingPumpSv) || 0,
                    cooling_fan1_sv: normalizedValue,
                    cooling_fan2_sv: normalizedValue,
                    cooling_fan3_sv: normalizedValue,
                    cooling_fan4_sv: normalizedValue,
                    cooling_fan5_sv: normalizedValue,
                    cooling_fan6_sv: normalizedValue,
                    cooling_fan7_sv: normalizedValue,
                    cooling_fan8_sv: normalizedValue,
                    cooling_fan9_sv: normalizedValue,
                    return_electric_valve_opening_sv: Number(returnValveOpening) || 0,
                    group1_pid_p_sv: Number(pidValues.p) || 0,
                    group1_pid_i_sv: Number(pidValues.i) || 0,
                    group1_pid_d_sv: Number(pidValues.d) || 0,
                }),
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            setFans(nextFans);
        } catch (error) {
            console.error('全部風扇 SV 設定失敗:', error);
        } finally {
            isEditingAllFansRpmTargetRef.current = false;
            setIsSubmittingAllFans(false);
        }
    };

    const handleSubmitOutletTargetTemp = async () => {
        if (!deviceIdentifier) {
            return;
        }

        const nextValue = Number(outletTargetTempSv);
        setIsSubmittingOutletTargetTemp(true);

        try {
            const response = await fetch(
                `/api/modbus/control/${encodeURIComponent(deviceIdentifier)}/key/${encodeURIComponent('outlet_target_temp_sv')}`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        value: Number.isNaN(nextValue) ? 0 : nextValue,
                    }),
                }
            );

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
        } catch (error) {
            console.error('出風目標溫度設定失敗:', error);
        } finally {
            isEditingOutletTargetTempRef.current = false;
            setIsSubmittingOutletTargetTemp(false);
        }
    };

    const handleSubmitPumpFrequency = async () => {
        if (!deviceIdentifier) {
            return;
        }

        const nextValue = Number(circulatingPumpSv);
        setIsSubmittingPumpFrequency(true);

        try {
            const response = await fetch(
                `/api/modbus/control/${encodeURIComponent(deviceIdentifier)}/key/${encodeURIComponent('circulating_pump_sv')}`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        value: Number.isNaN(nextValue) ? 0 : nextValue,
                    }),
                }
            );

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
        } catch (error) {
            console.error('循環泵設定失敗:', error);
        } finally {
            isEditingCirculatingPumpSvRef.current = false;
            setIsSubmittingPumpFrequency(false);
        }
    };

    const handleSubmitOutletValveOpening = async () => {
        if (!deviceIdentifier) {
            return;
        }

        const nextValue = Number(outletValveOpening);
        setIsSubmittingOutletValveOpening(true);

        try {
            const response = await fetch(`/api/modbus/sv/${encodeURIComponent(deviceIdentifier)}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ...buildSvPayload(),
                    outlet_electric_valve_opening_sv: Number.isNaN(nextValue) ? 0 : nextValue,
                    group2_pid_p_sv: Number(valvePidValues.p) || 0,
                    group2_pid_i_sv: Number(valvePidValues.i) || 0,
                    group2_pid_d_sv: Number(valvePidValues.d) || 0,
                }),
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
        } catch (error) {
            console.error('出水閥開度設定失敗:', error);
        } finally {
            isEditingOutletValveOpeningRef.current = false;
            setIsSubmittingOutletValveOpening(false);
        }
    };

    const handleSubmitPressureTarget = async () => {
        if (!deviceIdentifier) {
            return;
        }

        const nextValue = Number(pressureTarget);
        setIsSubmittingPressureTarget(true);

        try {
            const response = await fetch(
                `/api/modbus/control/${encodeURIComponent(deviceIdentifier)}/key/${encodeURIComponent('target_pressure_diff_sv')}`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        value: Number.isNaN(nextValue) ? 0 : nextValue,
                    }),
                }
            );

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
        } catch (error) {
            console.error('壓差控制設定失敗:', error);
        } finally {
            isEditingPressureTargetRef.current = false;
            setIsSubmittingPressureTarget(false);
        }
    };

    const handleSubmitReturnValveOpening = async () => {
        if (!deviceIdentifier) {
            return;
        }

        const nextValue = Number(returnValveOpening);
        setIsSubmittingReturnValveOpening(true);

        try {
            const response = await fetch(
                `/api/modbus/control/${encodeURIComponent(deviceIdentifier)}/key/${encodeURIComponent('return_electric_valve_opening_sv')}`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        value: Number.isNaN(nextValue) ? 0 : nextValue,
                    }),
                }
            );

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
        } catch (error) {
            console.error('混水閥開度設定失敗:', error);
        } finally {
            isEditingReturnValveOpeningRef.current = false;
            setIsSubmittingReturnValveOpening(false);
        }
    };

    const statusText = {
        running: t('industrial.status.normal'),
        alert: t('industrial.status.alert'),
        online: t('industrial.status.normal'),
        warning: t('industrial.status.warning'),
        critical: t('industrial.status.alert'),
        offline: t('industrial.status.offline'),
    };

    const statusClass = {
        running: 'text-emerald-600',
        alert: 'text-red-600',
        online: 'text-emerald-600',
        warning: 'text-amber-600',
        critical: 'text-red-600',
        offline: 'text-slate-500',
    };

    return (
        <div className="min-h-full bg-slate-50/50 text-slate-900 p-8 overflow-y-auto">
            <header className="flex items-center justify-between mb-8 w-full">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onBack}
                        className="p-2 hover:bg-white border border-transparent hover:border-slate-200 rounded-lg transition-all text-slate-500"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h2 className="text-xl font-bold tracking-tight">{t('industrial.deviceTitle', { id: device?.id ?? '' })}</h2>
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
                            {/*<span className="text-xs text-slate-500 font-medium">{t('industrial.deviceSerial', { id: device?.id ?? '' })}</span>*/}
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
                    <p className="text-[18px] font-bold text-cyan-600 mb-3">{t('industrial.telemetry.outletAirTemperature')}</p>
                    <div className="flex justify-between items-center text-xs mb-2">
                        <span className="text-slate-500">{t('industrial.temperature')}:</span>
                        <span className="font-bold">
                            {formatDisplayValue(sensorValues.outletAirTemp)} <span className="text-slate-400 font-normal">°C</span>
                        </span>
                    </div>
                    <div className="pt-2 border-t border-slate-100 space-y-2">
                        <PVText value={holdingData?.outlet_target_temp_pv} unit="°C" />
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-500 shrink-0">{t('industrial.targetTemperature')}</span>
                            <input
                                className="w-full h-7 text-[12px] border border-slate-200 rounded px-1 focus:ring-1 focus:ring-primary outline-none"
                                type="number"
                                value={outletTargetTempSv}
                                onChange={(event) => {
                                    isEditingOutletTargetTempRef.current = true;
                                    setOutletTargetTempSv(event.target.value);
                                }}
                                placeholder={FALLBACK_VALUE}
                            />
                            <span className="text-[16px] text-slate-400">°C</span>
                        </div>
                        <button
                            type="button"
                            onClick={handleSubmitOutletTargetTemp}
                            disabled={isSubmittingOutletTargetTemp}
                            className="w-full px-2 py-1 bg-primary text-white text-[12px] font-bold rounded disabled:opacity-50"
                        >
                            {t('common.confirm')}
                        </button>
                    </div>
                </div>
            </section>

            <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
                <ValveControl
                    holdingData={holdingData}
                    percentage={outletValveOpening}
                    onPercentageChange={(value) => {
                        isEditingOutletValveOpeningRef.current = true;
                        setOutletValveOpening(value);
                    }}
                    onSubmit={handleSubmitOutletValveOpening}
                    isSubmitting={isSubmittingOutletValveOpening}
                    pidValues={valvePidValues}
                    onPidChange={(key, value) =>
                        setValvePidValues((prev) => ({
                            ...prev,
                            [key]: value,
                        }))
                    }
                />
                <ReturnValveControl
                    holdingData={holdingData}
                    openingRatio={returnValveOpening}
                    onOpeningRatioChange={(value) => {
                        isEditingReturnValveOpeningRef.current = true;
                        setReturnValveOpening(value);
                    }}
                    onSubmit={handleSubmitReturnValveOpening}
                    isSubmitting={isSubmittingReturnValveOpening}
                />
                <MotorControl
                    sensorValues={sensorValues}
                    holdingData={holdingData}
                    targetFrequency={circulatingPumpSv}
                    onTargetFrequencyChange={(value) => {
                        isEditingCirculatingPumpSvRef.current = true;
                        setCirculatingPumpSv(value);
                    }}
                    onTargetFrequencyFocus={() => {
                        isEditingCirculatingPumpSvRef.current = true;
                    }}
                    onTargetFrequencyBlur={() => {
                        isEditingCirculatingPumpSvRef.current = false;
                    }}
                    onSubmit={handleSubmitPumpFrequency}
                    isSubmitting={isSubmittingPumpFrequency}
                />
            </section>

            <section className="space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-8">
                        <h2 className="text-[20px] font-bold flex items-center gap-2">{t('industrial.fanControl')}</h2>
                        <div className="flex items-center gap-3">
                            <span className="text-xs font-bold text-slate-500 uppercase">{t('industrial.pidStartMonitoring')}</span>
                            <Toggle checked={pidMonitoringEnabled} onChange={setPidMonitoringEnabled} />
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-xs font-bold text-slate-500 uppercase">{t('industrial.forwardCorrection')}</span>
                            <Toggle checked={fansCorrectionEnabled} onChange={setFansCorrectionEnabled} />
                        </div>
                    </div>
                </div>

                <div className="bg-slate-50/50 p-6 rounded-xl border border-slate-200 mb-8 grid grid-cols-1 xl:grid-cols-3 gap-8">
                    <div className="space-y-4 items-center gap-2">
                        <div className="flex space-x-4">
                            <h3 className="uppercase tracking-wider font-bold text-slate-400">{t('industrial.oneClickEnableAll')}</h3>
                            <Toggle checked={allFansEnabled} onChange={handleToggleAllFans} />
                            <PVText value={sensorValues.rpm} />
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="flex-1 flex gap-2">
                                <div className="relative flex-1">
                                    <input
                                        type="number"
                                        value={allFansRpmTarget ?? ''}
                                        onChange={(event) => {
                                            isEditingAllFansRpmTargetRef.current = true;
                                            setAllFansRpmTarget(event.target.value);
                                        }}
                                        onFocus={() => {
                                            isEditingAllFansRpmTargetRef.current = true;
                                        }}
                                        onBlur={() => {
                                            isEditingAllFansRpmTargetRef.current = false;
                                        }}
                                        placeholder={FALLBACK_VALUE}
                                        className="w-full bg-white border-none rounded-lg px-3 py-2 text-sm ring-1 ring-slate-200 focus:ring-primary outline-none"
                                    />
                                    <span className="absolute right-3 top-2.5 text-[10px] text-slate-400 font-bold">RPM</span>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleSubmitAllFansSv}
                                    disabled={isSubmittingAllFans}
                                    className="bg-primary/10 text-primary px-4 py-2 rounded-lg text-xs font-bold border border-primary/20 hover:bg-primary hover:text-white transition-all disabled:opacity-50"
                                >
                                    {t('common.confirm')}
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4 border-l border-slate-200 xl:pl-8">
                        <h3 className="uppercase tracking-wider font-bold text-slate-400">{t('industrial.differentialPressureControl')}</h3>
                        <div className="flex items-center gap-4">
                            <div className="flex flex-col">
                                <span className="text-[12px] text-slate-400 font-bold">PV</span>
                                <span className="text-s font-bold text-slate-700">
                                    {formatDisplayValue(holdingData?.target_pressure_diff_pv)} Pa
                                </span>
                            </div>
                            <div className="flex-1 flex gap-2">
                                <div className="relative flex-1">
                                    <input
                                        type="number"
                                        value={pressureTarget}
                                        onChange={(event) => {
                                            isEditingPressureTargetRef.current = true;
                                            setPressureTarget(event.target.value);
                                        }}
                                        onFocus={() => {
                                            isEditingPressureTargetRef.current = true;
                                        }}
                                        onBlur={() => {
                                            isEditingPressureTargetRef.current = false;
                                        }}
                                        placeholder={FALLBACK_VALUE}
                                        className="w-full bg-white border-none rounded-lg px-3 py-2 text-sm ring-1 ring-slate-200 focus:ring-primary outline-none"
                                    />
                                    <span className="absolute right-3 top-2.5 text-[10px] text-slate-400 font-bold">Pa</span>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleSubmitPressureTarget}
                                    disabled={isSubmittingPressureTarget}
                                    className="bg-primary/10 text-primary px-4 py-2 rounded-lg text-xs font-bold border border-primary/20 hover:bg-primary hover:text-white transition-all disabled:opacity-50"
                                >
                                    {t('common.confirm')}
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4 border-l border-slate-200 xl:pl-8">
                        <h3 className="uppercase tracking-wider font-bold text-slate-400">{t('industrial.pidSettings')}</h3>
                        <div className="flex items-end gap-3">
                            <div className="grid grid-cols-3 gap-2 flex-1 text-xs">
                                {[
                                    { key: 'p', label: 'P' },
                                    { key: 'i', label: 'I' },
                                    { key: 'd', label: 'D' },
                                ].map((item) => (
                                    <div key={item.key}>
                                        <label className="text-slate-400 block mb-1 font-bold">{item.label}</label>
                                        <PVText
                                            value={
                                                item.key === 'p'
                                                    ? holdingData?.group1_pid_p_pv
                                                    : item.key === 'i'
                                                        ? holdingData?.group1_pid_i_pv
                                                        : holdingData?.group1_pid_d_pv
                                            }
                                        />
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
                            <button
                                type="button"
                                onClick={handleSubmitPidValues}
                                disabled={isSubmittingPid}
                                className="bg-primary/10 text-primary px-4 py-2 rounded-lg text-xs font-bold border border-primary/20 hover:bg-primary hover:text-white transition-all disabled:opacity-50"
                            >
                                {t('common.confirm')}
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
                        <FanUnitCard
                            key={fan.id}
                            fan={fan}
                            onSvChange={handleFanSvChange}
                            onSubmit={handleSubmitFanSv}
                            isSubmitting={submittingFanId === fan.id}
                        />
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
