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
const API_HOST = '';
const FALLBACK_VALUE = '--';
const DEFAULT_POLLING_INTERVAL_MS = 1000;

const SCALE_4096 = 4096;
const MAX_VALVE_100 = 100;
const MAX_TEMP_100 = 100;
const MAX_FREQ_60 = 60;
const MAX_PID_100 = 100;
const MAX_PID_10 = 10;
const MAX_PRESSURE_1000 = 1000;
const FAN_MAX_RPM_3570 = 3570;

const toDisplay = (modbusValue, maxRange) => {
    if (modbusValue === undefined || modbusValue === null || Number.isNaN(Number(modbusValue))) {
        return 0;
    }
    const val = (Number(modbusValue) / SCALE_4096) * maxRange;
    // console.log('toDisplay', val.toFixed(1));
    // 確保數值最多只有一位小數
    return parseFloat(val.toFixed(1));
};

const toModbus = (displayValue, maxRange) => {
    const val = Number(displayValue);
    if (Number.isNaN(val)) return 0;
    // console.log('toModbus', Math.round((val / maxRange) * SCALE_4096));
    return Math.round((val / maxRange) * SCALE_4096);
};

const toPidDisplay = (modbusValue) => {
    if (modbusValue === undefined || modbusValue === null || Number.isNaN(Number(modbusValue))) {
        return 0;
    }
    const val = Number(modbusValue) / 1000;
    // 確保數值最多只有兩位小數 (因為 step=0.01)
    return parseFloat(val.toFixed(2));
};

const toPidModbus = (displayValue) => {
    const val = Number(displayValue);
    if (Number.isNaN(val)) return 0;
    return Math.round(val * 1000);
};
// const TELEMETRY_SENSOR_ORDER = [
//     'inletWaterTemp',
//     'inletWaterPressure',
//     'outletWaterTemp',
//     'outletWaterPressure',
//     'returnWaterTemp',
//     'returnWaterPressure',
//     'inletAirTemp',
//     'inletAirHumidity',
//     'outletAirTemp',
//     'outletAirHumidity',
//     'coolingL1',
//     'coolingL2',
//     'coolingR1',
//     'coolingR2',
//     'rpm',
//     'hz',
//     'flowRate',
//     'heatExchange',
//     'pidP',
//     'pidI',
// ];


const TELEMETRY_SENSOR_ORDER = [
    'inletWaterTemp', //S1
    'inletWaterPressure', //S2
    'returnWaterTemp', //S3
    'returnWaterPressure', //S4
    'outletWaterTemp', //S5
    'outletWaterPressure', //S6
    'coolingL1', //S7
    'coolingL2', //S8
    'coolingR1', //S9
    'coolingR2', //S10
    'inletAirTemp', //S11
    'inletAirHumidity', //S12
    'flowRate', //S13
    'outletWaterPV', //S14
    'returnWaterPV', //S15
    'fanAutoSpeed', //S16 no show on UI
    'outletAirTemp', //S17
    'pressureDifference', //S18
    'TBD', //S19 to be defined
    'heatExchange', //S20
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
    if (Number.isNaN(numericValue)) return FALLBACK_VALUE;

    // 格式化為最多一位小數，並移除末尾不必要的零
    return parseFloat(numericValue.toFixed(1)).toString();
};

const buildFansFromHolding = (holdingPayload) => Array.from({ length: 9 }, (_, index) => {
    const fanNumber = index + 1;
    const id = String(fanNumber).padStart(2, '0');
    const modbusPv = Number(holdingPayload?.[`cooling_fan${fanNumber}_pv`] ?? 0);
    const modbusSv = Number(holdingPayload?.[`cooling_fan${fanNumber}_sv`] ?? 0);

    const displayPvPercent = toDisplay(modbusPv, 100);
    const displaySvPercent = toDisplay(modbusSv, 100);
    const displayPvRpm = toDisplay(modbusPv, FAN_MAX_RPM_3570);

    const isActive = modbusSv > 0;

    return {
        id,
        status: isActive ? 'running' : 'stopped',
        pvPercent: displayPvPercent,
        pvRpm: displayPvRpm,
        svRpm: displaySvPercent,
        lastActiveSvRpm: displaySvPercent > 0 ? displaySvPercent : displayPvPercent,
        isActive,
    };
});

const buildAllFansTargetFromHolding = (holdingPayload) => {
    const fanSvValues = Array.from({ length: 9 }, (_, index) => String(holdingPayload?.[`cooling_fan${index + 1}_sv`] ?? ''));

    return fanSvValues.every((value) => value === fanSvValues[0]) ? fanSvValues[0] : '';
};

const TelemetryCard = ({ data }) => (
    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <p className={`text-[16px] font-bold ${data.colorClass} mb-3`}>{data.label}</p>
        <div className="grid grid-cols-1 gap-2 text-[14px]">
            {data.metrics.map((metric) => (
                <div key={metric.name} className="flex justify-between">
                    <span>{metric.name}:</span>
                    <span className="font-bold">
                        {formatDisplayValue(metric.value)}
                        <span className="text-slate-400">{metric.unit}</span>
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
const ToggleEmer = ({ checked, onChange, disabled = false }) => (
    <label className={`relative inline-flex items-center ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}>
        <input
            type="checkbox"
            className="sr-only peer"
            checked={checked}
            onChange={(event) => onChange?.(event.target.checked)}
            disabled={disabled}
        />
        <div className="w-9 h-5 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-red-500"></div>
    </label>
);

const PVText = ({ value, unit = '' }) => (
    <span className="text-[14px] text-slate-400 font-black">
        PV: {formatDisplayValue(value)} {unit}
    </span>
);

const PIDInput = ({ label, pvValue, value, onChange, onFocus, onBlur, isModified, error }) => (
    <div className="space-y-1.5 space-x-1.5">
        <label className="text-[14px] font-bold text-slate-500 uppercase">{label}</label>
        <PVText value={toPidDisplay(pvValue)} />
        <div className="relative">
            <input
                className={`text-left w-full border rounded-lg px-3 py-2 text-[12px] focus:ring-2 focus:ring-primary/20 outline-none transition-colors ${
                    isModified || error
                        ? 'bg-red-50 border-red-500'
                        : 'bg-slate-50 border-slate-200'
                }`}
                step="0.01"
                min="0"
                max="10.00"
                type="number"
                value={value}
                onChange={onChange}
                onFocus={onFocus}
                onBlur={onBlur}
                placeholder={FALLBACK_VALUE}
            />
            {error && <span className="absolute -top-4 right-0 text-[10px] font-bold text-red-500">{error}</span>}
        </div>
    </div>
);

const ValveControl = ({
                          sensorValues,
                          holdingData,
                          percentage,
                          onPercentageChange,
                          onPercentageFocus,
                          onPercentageBlur,
                          onSubmit,
                          isSubmitting,
                          pidValues,
                          onPidChange,
                          onPidFocus,
                          onPidBlur,
                          modifiedPidFields,
                          pidMonitoringEnabled,
                          onPidMonitoringChange,
                          correctionEnabled,
                          onCorrectionChange,
                          error,
                      }) => {
    const {t} = useLanguage();

    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm h-full flex flex-col">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center">
                <h2 className="text-[16px] font-bold flex items-center gap-2">{t('industrial.outletValveControl')}</h2>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-slate-500 uppercase">{t('industrial.pidEnabled')}</span>
                        <Toggle checked={pidMonitoringEnabled} onChange={onPidMonitoringChange} />
                    </div>
                    {/*<div className="flex items-center gap-3">*/}
                    {/*    <span className="text-xs font-bold text-slate-500 uppercase">*/}
                    {/*        {t(correctionEnabled ? 'industrial.forwardCorrection' : 'industrial.reverseCorrection')}*/}
                    {/*    </span>*/}
                    {/*    <Toggle checked={correctionEnabled} onChange={onCorrectionChange} />*/}
                    {/*</div>*/}
                </div>
            </div>
            <div className="p-6 flex-1 flex flex-col gap-6">
                <div className="space-y-2 space-x-1.5">
                    <label className="text-xs text-[14px] font-semibold text-slate-600 ">{t('industrial.openingRatio')}</label>
                    <PVText value={sensorValues.outletWaterPV} unit="%" />
                    <div className="relative">
                        <input
                            className={`text-left w-full border rounded-lg px-3 py-2 text-[14px] font-bold text-primary focus:ring-2 focus:ring-primary/20 outline-none transition-colors ${
                                (modifiedPidFields?.opening || error)
                                    ? 'bg-red-50 border-red-500'
                                    : 'bg-slate-50 border-slate-200'
                            }`}
                            type="number"
                            value={percentage}
                            onChange={(event) => onPercentageChange?.(event.target.value)}
                            onFocus={onPercentageFocus}
                            onBlur={onPercentageBlur}
                            placeholder={FALLBACK_VALUE}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] text-slate-400 font-bold">%</span>
                        {error && <span className="absolute -top-4 right-0 text-[10px] font-bold text-red-500">{error}</span>}
                    </div>
                </div>
                <div className="grid grid-cols-3 gap-4 text-[14px]">
                    <PIDInput
                        label="P:"
                        pvValue={holdingData?.group2_pid_p_pv}
                        value={pidValues.p}
                        onChange={(event) => onPidChange?.('p', event.target.value)}
                        onFocus={() => onPidFocus?.('p')}
                        onBlur={() => onPidBlur?.('p')}
                        isModified={modifiedPidFields?.p}
                        error={error}
                    />
                    <PIDInput
                        label="I:"
                        pvValue={holdingData?.group2_pid_i_pv}
                        value={pidValues.i}
                        onChange={(event) => onPidChange?.('i', event.target.value)}
                        onFocus={() => onPidFocus?.('i')}
                        onBlur={() => onPidBlur?.('i')}
                        isModified={modifiedPidFields?.i}
                        error={error}
                    />
                    <PIDInput
                        label="D:"
                        pvValue={holdingData?.group2_pid_d_pv}
                        value={pidValues.d}
                        onChange={(event) => onPidChange?.('d', event.target.value)}
                        onFocus={() => onPidFocus?.('d')}
                        onBlur={() => onPidBlur?.('d')}
                        isModified={modifiedPidFields?.d}
                        error={error}
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

const ReturnValveControl = ({
                                sensorValues,
                                holdingData,
                                openingRatio,
                                onOpeningRatioChange,
                                onOpeningRatioFocus,
                                onOpeningRatioBlur,
                                onSubmit,
                                isSubmitting,
                                error,
                            }) => {
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
                        <PVText value={sensorValues.returnWaterPV} unit="%" />
                        <div className="relative">
                            <input
                                className={`text-left w-full border rounded-lg px-3 py-2 text-[14px] font-bold text-primary focus:ring-2 focus:ring-primary/20 outline-none transition-colors ${
                                    error ? 'bg-red-50 border-red-500' : 'bg-slate-50 border-slate-200'
                                }`}
                                type="number"
                                value={openingRatio}
                                onChange={(event) => onOpeningRatioChange?.(event.target.value)}
                                onFocus={onOpeningRatioFocus}
                                onBlur={onOpeningRatioBlur}
                                placeholder={FALLBACK_VALUE}
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-bold">%</span>
                            {error && <span className="absolute -top-4 right-0 text-[10px] font-bold text-red-500">{error}</span>}
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
                          deviceIdentifier,
                          sensorValues,
                          holdingData,
                          targetFrequency,
                          onTargetFrequencyChange,
                          onTargetFrequencyFocus,
                          onTargetFrequencyBlur,
                          onSubmit,
                          isSubmitting,
                          error,
                      }) => {
    const { t } = useLanguage();
    const [enabled, setEnabled] = useState(false);
    const [isSubmittingPumpStart, setIsSubmittingPumpStart] = useState(false);
    const [isSubmittingAbnormalReset, setIsSubmittingAbnormalReset] = useState(false);
    const pumpStartOverrideRef = useRef(null);

    useEffect(() => {
        if (!deviceIdentifier) {
            pumpStartOverrideRef.current = null;
            setEnabled(false);
            return;
        }

        const fetchPumpStartStatus = async () => {
            try {
                const response = await fetch(`/api/modbus/holding/${encodeURIComponent(deviceIdentifier)}`, {
                    method: 'GET',
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }

                const data = await response.json();
                if (pumpStartOverrideRef.current !== null) {
                    return;
                }
                setEnabled(Number(data?.pump_start) === 1);
            } catch (error) {
                console.error('取得泵浦啟停狀態失敗:', error);
            }
        };

        fetchPumpStartStatus();
    }, [deviceIdentifier]);

    useEffect(() => {
        const nextPumpStartValue = Number(holdingData?.pump_start);

        if (!Number.isFinite(nextPumpStartValue)) {
            return;
        }

        if (pumpStartOverrideRef.current !== null) {
            if (pumpStartOverrideRef.current === nextPumpStartValue) {
                pumpStartOverrideRef.current = null;
            } else {
                return;
            }
        }

        if (isSubmittingPumpStart) {
            return;
        }

        setEnabled(nextPumpStartValue === 1);
    }, [holdingData, isSubmittingPumpStart]);

    const handleTogglePumpStart = async (checked) => {
        if (!deviceIdentifier || isSubmittingPumpStart) {
            return;
        }

        const previousValue = enabled;
        const payload = {
            pump_start: checked ? 1 : 0,
        };

        pumpStartOverrideRef.current = checked ? 1 : 0;
        setEnabled(checked);
        setIsSubmittingPumpStart(true);

        try {
            console.log('Pump start request:', {
                deviceIdentifier,
                payload,
            });

            const response = await fetch(`/api/modbus/sv-with-coils/${encodeURIComponent(deviceIdentifier)}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            console.log('Pump start response:', {
                status: response.status,
                ok: response.ok,
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
        } catch (error) {
            console.error('泵浦啟停設定失敗:', error);
            pumpStartOverrideRef.current = null;
            setEnabled(previousValue);
        } finally {
            setIsSubmittingPumpStart(false);
        }
    };

    const handleAbnormalReset = async () => {
        if (!deviceIdentifier || isSubmittingAbnormalReset) {
            return;
        }

        const payload = {
            abnormal_reset: 1,
        };

        setIsSubmittingAbnormalReset(true);

        try {
            console.log('Abnormal reset request:', {
                deviceIdentifier,
                payload,
            });

            const response = await fetch(`/api/modbus/sv-with-coils/${encodeURIComponent(deviceIdentifier)}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            console.log('Abnormal reset response:', {
                status: response.status,
                ok: response.ok,
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
        } catch (error) {
            console.error('異常復歸設定失敗:', error);
        } finally {
            setIsSubmittingAbnormalReset(false);
        }
    };

    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="p-5 border-b border-slate-100">
                <div className="flex justify-between items-center w-full">
                    <h2 className="text-[16px] font-bold flex items-center gap-2">{t('industrial.mixingPumpControl')}</h2>
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={handleAbnormalReset}
                            disabled={isSubmittingAbnormalReset}
                            className="px-3 py-1 bg-red-50 border border-red-100 rounded-lg text-[10px] font-bold text-red-600 hover:bg-red-100 transition-all shadow-sm disabled:opacity-50"
                        >
                            {t('industrial.reset')}
                        </button>
                        <ToggleEmer checked={enabled} onChange={handleTogglePumpStart} disabled={isSubmittingPumpStart} />
                    </div>
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
                                    className={`text-left w-full border rounded-lg px-3 py-3 text-[14px] font-bold focus:ring-2 focus:ring-primary/20 outline-none disabled:opacity-50 transition-colors ${
                                        error ? 'bg-red-50 border-red-500' : 'bg-slate-50 border-slate-200'
                                    }`}
                                    type="number"
                                    value={targetFrequency ?? ''}
                                    onChange={(event) => onTargetFrequencyChange?.(event.target.value)}
                                    onFocus={onTargetFrequencyFocus}
                                    onBlur={onTargetFrequencyBlur}
                                    placeholder={FALLBACK_VALUE}
                                    // disabled={!enabled}
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">Hz</span>
                                {error && <span className="absolute -top-4 right-0 text-[10px] font-bold text-red-500">{error}</span>}
                            </div>
                            <button
                                type="button"
                                onClick={onSubmit}
                                // disabled={!enabled || isSubmitting}
                                disabled={isSubmitting}
                                className="bg-primary/10 text-primary px-4 py-2 rounded-lg text-xs font-bold border border-primary/20 hover:bg-primary hover:text-white transition-all disabled:opacity-50"
                            >
                                {t('common.confirm')}
                            </button>
                        </div>
                    </div>
                    <div className="px-6 py-3 bg-primary/5 rounded-xl border border-primary/10">
                        <p className="text-[12px] font-bold text-primary uppercase">{t('industrial.currentFlowRate')}</p>
                        <p className="text-[14px] font-extrabold text-primary leading-tight">
                            {formatDisplayValue(sensorValues.flowRate)} <span className="text-xs font-medium">{t('industrial.flowUnit')}</span>
                        </p>
                    </div>
                    <div className="px-6 py-3 bg-primary/5 rounded-xl border border-primary/10">
                        <p className="text-[12px] font-bold text-primary uppercase">{t('industrial.currentHeatExchange')}</p>
                        <p className="text-[14px] font-extrabold text-primary leading-tight">
                            {formatDisplayValue(sensorValues.heatExchange)} <span className="text-xs font-medium">kW</span>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

const FanUnitCard = ({ fan, onSvChange, onSvFocus, onSvBlur, onSubmit, onToggle, isSubmitting, error }) => {
    const { t } = useLanguage();
    const statusColors = {
        running: 'text-emerald-500',
        stopped: 'text-rose-500',
        warning: 'text-amber-500',
        optimal: 'text-blue-500',
    };

    return (
        <div className={`border rounded-2xl p-5 transition-all ${
            fan.isPrimary
                ? 'border-blue-200 bg-blue-50/30 ring-2 ring-blue-100 shadow-lg shadow-blue-50'
                : 'border-slate-200 bg-slate-50/50'
        }`}>
            <div className="flex justify-between items-start mb-5">
                <div>
                    <h5 className="text-[14px] font-bold flex items-center gap-2">
                        {t('industrial.fanLabel')} <span className="text-slate-400">{fan.id}</span>
                        {fan.isPrimary && <span className="text-[10px] bg-blue-600 text-white px-1.5 py-0.5 rounded ml-1">{t('industrial.primary')}</span>}
                    </h5>
                    <p className={`text-[10px] font-bold uppercase tracking-wider mt-1 ${statusColors[fan.status]}`}>
                        {t(`industrial.status.${fan.status}Short`)}
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => onToggle?.(fan.id)}
                    disabled={isSubmitting}
                    className={`w-10 h-5 rounded-full relative transition-colors disabled:opacity-50 ${fan.isActive ? 'bg-blue-600' : 'bg-slate-300'}`}
                >
                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${fan.isActive ? 'left-5.5' : 'left-0.5'}`} />
                </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">{t('industrial.pvLabel')}</p>
                    <div className="space-y-1.5">
                        <div className="flex text-left justify-between  rounded-xl px-3 py-1.5 shadow-sm">
                            <span className="flex-4/5 text-left text-[14px] font-bold">{formatDisplayValue(fan.pvPercent)}</span>
                            <span className="flex-1/6 text-[10px] text-slate-400 font-bold">%</span>
                        </div>
                        <div className="flex items-center justify-between  rounded-xl px-3 py-1.5 shadow-sm">
                            <span className="flex-4/5 text-left text-[14px] font-bold">{formatDisplayValue(fan.pvRpm)}</span>
                            <span className="flex-1/6 text-[10px] text-slate-400 font-bold">RPM</span>
                        </div>
                    </div>
                </div>
                <div className="space-y-2">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">{t('industrial.svLabel')} (%) </p>

                    {/*<div className="flex flex-col gap-1">*/}
                    <div className={`flex h-full max-h-[72px] border rounded-xl overflow-hidden bg-white shadow-sm focus-within:ring-2 focus-within:ring-blue-100 transition-all ${error ? 'border-red-500 ring-2 ring-red-100' : 'border-slate-200'}`}>

                        <input
                            type="number"
                            value={fan.svRpm}
                            onChange={(event) => onSvChange?.(fan.id, event.target.value)}
                            onFocus={() => onSvFocus?.(fan.id)}
                            onBlur={() => onSvBlur?.(fan.id)}
                            className="text-left w-full border-none bg-transparent text-lg font-bold px-3 focus:ring-0"

                        />

                        <button
                            type="button"
                            onClick={() => onSubmit?.(fan.id)}
                            disabled={isSubmitting}
                            className="bg-slate-50 px-3 flex items-center justify-center border-l border-slate-100 transition-colors disabled:opacity-50"
                        >
                            <Check size={18} className="text-slate-400" />
                        </button>
                        {error && <span className="self-center px-3 text-right text-[10px] font-bold text-red-500 bg-transparent whitespace-nowrap">{error}</span>}
                    </div>


                    {/*</div>*/}
                </div>
            </div>
        </div>
    );
};
export function IndustrialControl({ device, onBack }) {
    const { t } = useLanguage();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [allFansEnabled, setAllFansEnabled] = useState(false);
    const [outletPidMonitoringEnabled, setOutletPidMonitoringEnabled] = useState(false);
    const [outletCorrectionEnabled, setOutletCorrectionEnabled] = useState(false);
    const [pidMonitoringEnabled, setPidMonitoringEnabled] = useState(false);
    const [fansCorrectionEnabled, setFansCorrectionEnabled] = useState(false);
    const [isSubmittingPidSwitch, setIsSubmittingPidSwitch] = useState(false);
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
    const [modifiedPidFields, setModifiedPidFields] = useState({ p: false, i: false, d: false });
    const [modifiedValvePidFields, setModifiedValvePidFields] = useState({ p: false, i: false, d: false, opening: false });
    const [submittingFanId, setSubmittingFanId] = useState(null);
    const [tempError, setTempError] = useState('');
    const [pumpError, setPumpError] = useState('');
    const [outletValveError, setOutletValveError] = useState('');
    const [returnValveError, setReturnValveError] = useState('');
    const [pressureError, setPressureError] = useState('');
    const [pidError, setPidError] = useState('');
    const [valvePidError, setValvePidError] = useState('');
    const [isSubmittingPid, setIsSubmittingPid] = useState(false);
    const [isSubmittingValvePid, setIsSubmittingValvePid] = useState(false);
    const [isSubmittingAllFans, setIsSubmittingAllFans] = useState(false);
    const [isSubmittingOutletTargetTemp, setIsSubmittingOutletTargetTemp] = useState(false);
    const [isSubmittingOutletValveOpening, setIsSubmittingOutletValveOpening] = useState(false);
    const [isSubmittingPressureTarget, setIsSubmittingPressureTarget] = useState(false);
    const [isSubmittingReturnValveOpening, setIsSubmittingReturnValveOpening] = useState(false);
    const [isSubmittingPumpFrequency, setIsSubmittingPumpFrequency] = useState(false);
    const [allFansError, setAllFansError] = useState('');
    const [fanErrors, setFanErrors] = useState({});
    const [isEmergencyEnabled, setIsEmergencyEnabled] = useState(false);
    const [isSubmittingEmergency, setIsSubmittingEmergency] = useState(false);
    const emergencyOverrideRef = useRef(null);
    const isEditingAllFansRpmTargetRef = useRef(false);
    const isEditingCirculatingPumpSvRef = useRef(false);
    const isEditingOutletTargetTempRef = useRef(false);
    const isEditingOutletValveOpeningRef = useRef(false);
    const isEditingPressureTargetRef = useRef(false);
    const isEditingReturnValveOpeningRef = useRef(false);
    const isEditingPidValuesRef = useRef(false);
    const isEditingValvePidValuesRef = useRef(false);
    const isModifiedOutletTargetTempRef = useRef(false);
    const isSubmittingPidRef = useRef(false);
    const isSubmittingValvePidRef = useRef(false);
    const isSubmittingOutletValveOpeningRef = useRef(false);
    const isSubmittingPumpFrequencyRef = useRef(false);
    const isSubmittingPidSwitchRef = useRef(false);
    const isSubmittingAllFansRef = useRef(false);
    const isSubmittingPressureTargetRef = useRef(false);
    const isSubmittingOutletTargetTempRef = useRef(false);
    const submittingFanIdRef = useRef(null);
    const modifiedPidFieldsRef = useRef({ p: false, i: false, d: false });
    const modifiedValvePidFieldsRef = useRef({ p: false, i: false, d: false, opening: false });
    const editingFanIdsRef = useRef(new Set());

    const deviceIdentifier = device?.name ?? device?.deviceName ?? device?.id ?? device?.deviceId;
    const sensorValues = mapSensorValues(sensorData);

    useEffect(() => { isSubmittingPidRef.current = isSubmittingPid; }, [isSubmittingPid]);
    useEffect(() => { isSubmittingValvePidRef.current = isSubmittingValvePid; }, [isSubmittingValvePid]);
    useEffect(() => { isSubmittingOutletValveOpeningRef.current = isSubmittingOutletValveOpening; }, [isSubmittingOutletValveOpening]);
    useEffect(() => { isSubmittingPumpFrequencyRef.current = isSubmittingPumpFrequency; }, [isSubmittingPumpFrequency]);
    useEffect(() => { isSubmittingPidSwitchRef.current = isSubmittingPidSwitch; }, [isSubmittingPidSwitch]);
    useEffect(() => { isSubmittingAllFansRef.current = isSubmittingAllFans; }, [isSubmittingAllFans]);
    useEffect(() => { isSubmittingPressureTargetRef.current = isSubmittingPressureTarget; }, [isSubmittingPressureTarget]);
    useEffect(() => { isSubmittingOutletTargetTempRef.current = isSubmittingOutletTargetTemp; }, [isSubmittingOutletTargetTemp]);
    useEffect(() => { submittingFanIdRef.current = submittingFanId; }, [submittingFanId]);
    useEffect(() => { modifiedPidFieldsRef.current = modifiedPidFields; }, [modifiedPidFields]);
    useEffect(() => { modifiedValvePidFieldsRef.current = modifiedValvePidFields; }, [modifiedValvePidFields]);

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
        setAllFansEnabled(fans.length > 0 && fans.every((fan) => fan.status === 'fault' || fan.isActive));
    }, [fans]);

    useEffect(() => {
        const nextEmergencyValue = Number(holdingData?.fan_power_start);

        if (emergencyOverrideRef.current !== null) {
            return;
        }

        if (!Number.isFinite(nextEmergencyValue)) {
            return;
        }

        if (!isSubmittingEmergency) {
            setIsEmergencyEnabled(nextEmergencyValue === 1);
        }
    }, [holdingData, isSubmittingEmergency]);

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
        const intervalId = setInterval(fetchDeviceSensor, DEFAULT_POLLING_INTERVAL_MS);

        return () => clearInterval(intervalId);
    }, [deviceIdentifier, t]);

    const fetchFanHoldingData = () => {
        if (!deviceIdentifier) {
            setFans([]);
            setHoldingData({});
            emergencyOverrideRef.current = null;
            setIsEmergencyEnabled(false);
            return;
        }

        fetch(`/api/modbus/holding/${encodeURIComponent(deviceIdentifier)}`, {
            method: 'GET',
        })
            .then((response) => response.json())
            .then((data) => {
                setHoldingData(data ?? {});
                setFans((prev) => {
                    const nextFans = buildFansFromHolding(data ?? {});

                    return nextFans.map((nextFan) => {
                        const currentFan = prev.find((fan) => fan.id === nextFan.id);
                        const isEditingFan = editingFanIdsRef.current.has(nextFan.id);
                        const isSubmittingFan = submittingFanIdRef.current === nextFan.id;
                        const shouldPreserveInactiveSv = Boolean(
                            currentFan && !nextFan.isActive && currentFan.lastActiveSvRpm
                        );

                        if (!currentFan) {
                            return nextFan;
                        }

                        return {
                            ...nextFan,
                            svRpm: isEditingFan || isSubmittingFan || shouldPreserveInactiveSv
                                ? currentFan.svRpm
                                : nextFan.svRpm,
                            lastActiveSvRpm: currentFan.lastActiveSvRpm ?? nextFan.lastActiveSvRpm,
                        };
                    });
                });
                if (!isEditingAllFansRpmTargetRef.current && !isSubmittingAllFansRef.current) {
                    const allFansDisplay = toDisplay(buildAllFansTargetFromHolding(data ?? {}), MAX_VALVE_100);
                    setAllFansRpmTarget(allFansDisplay >= 0 ? String(allFansDisplay) : '');
                }
                if (!isEditingOutletTargetTempRef.current && !isSubmittingOutletTargetTempRef.current && !isModifiedOutletTargetTempRef.current) {
                    setOutletTargetTempSv(String(toDisplay(data?.outlet_target_temp_sv, MAX_TEMP_100) || ''));
                }
                if (!isEditingCirculatingPumpSvRef.current && !isSubmittingPumpFrequencyRef.current) {
                    setCirculatingPumpSv(String(toDisplay(data?.circulating_pump_sv, MAX_FREQ_60) || ''));
                }
                if (!isEditingOutletValveOpeningRef.current && !isSubmittingOutletValveOpeningRef.current && !modifiedValvePidFieldsRef.current.opening) {
                    setOutletValveOpening(String(toDisplay(data?.outlet_electric_valve_opening_sv, MAX_VALVE_100) || ''));
                }
                if (!isEditingReturnValveOpeningRef.current) {
                    setReturnValveOpening(String(toDisplay(data?.return_electric_valve_opening_sv, MAX_VALVE_100) || ''));
                }
                if (!isEditingPressureTargetRef.current && !isSubmittingPressureTargetRef.current) {
                    setPressureTarget(String(toDisplay(data?.target_pressure_diff_sv, MAX_PRESSURE_1000) || ''));
                }
                if (!isEditingPidValuesRef.current && !isSubmittingPidRef.current && !Object.values(modifiedPidFieldsRef.current).some(Boolean)) {
                    setPidValues({
                        p: String(toPidDisplay(data?.group1_pid_p_sv) || ''),
                        i: String(toPidDisplay(data?.group1_pid_i_sv) || ''),
                        d: String(toPidDisplay(data?.group1_pid_d_sv) || ''),
                    });
                }
                if (!isEditingValvePidValuesRef.current && !isSubmittingValvePidRef.current && !Object.values(modifiedValvePidFieldsRef.current).some(Boolean)) {
                    setValvePidValues({
                        p: String(toPidDisplay(data?.group2_pid_p_sv) || ''),
                        i: String(toPidDisplay(data?.group2_pid_i_sv) || ''),
                        d: String(toPidDisplay(data?.group2_pid_d_sv) || ''),
                    });
                }
                if (!isSubmittingPidSwitchRef.current) {
                    setOutletPidMonitoringEnabled(data?.pid2_switch === 1);
                    setOutletCorrectionEnabled(data?.pid2_direction === 1);
                    setPidMonitoringEnabled(data?.pid1_switch === 1);
                    setFansCorrectionEnabled(data?.pid1_direction === 1);
                }
                // console.log('Fetched holding data:', data);
            })
            .catch((error) => {
                console.error(t('industrial.error.fetchSensor'), error);
                setHoldingData({});
                setFans([]);
            });
    };

    useEffect(() => {
        if (!deviceIdentifier) {
            return;
        }

        fetchFanHoldingData();
        const intervalId = setInterval(fetchFanHoldingData, DEFAULT_POLLING_INTERVAL_MS);

        return () => clearInterval(intervalId);
    }, [deviceIdentifier, submittingFanId, t]);

    const handleUpdatePidSwitch = async (key, enabled) => {
        if (!deviceIdentifier) {
            return;
        }

        const value = enabled ? 1 : 0;
        console.log('[PID Switch] 開始更新 ${key} 為 ${value} (enabled: ${enabled})');
        setIsSubmittingPidSwitch(true);
        isSubmittingPidSwitchRef.current = true;

        try {
            const response = await fetch(`/api/modbus/sv-with-coils/${encodeURIComponent(deviceIdentifier)}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    [key]: value,
                }),
            });

            console.log(`[PID Switch] 收到回應: ${response.status} ${response.statusText}`);

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }

            // Update local state immediately for better UX
            if (key === 'pid2_switch') setOutletPidMonitoringEnabled(enabled);
            if (key === 'pid2_direction') setOutletCorrectionEnabled(enabled);
            if (key === 'pid1_switch') setPidMonitoringEnabled(enabled);
            if (key === 'pid1_direction') setFansCorrectionEnabled(enabled);
            console.log(`[PID Switch] ${key} 更新成功`);
            fetchFanHoldingData();
        } catch (error) {
            console.error(`更新 ${key} 失敗:`, error);
        } finally {
            setIsSubmittingPidSwitch(false);
            isSubmittingPidSwitchRef.current = false;
        }
    };

    const handleToggleFan = async (fanId) => {
        if (!deviceIdentifier) {
            return;
        }

        const fanNumber = Number(fanId);
        if (Number.isNaN(fanNumber)) {
            return;
        }

        const targetFan = fans.find((fan) => fan.id === fanId);
        if (!targetFan || targetFan.status === 'fault') {
            return;
        }

        const fallbackRestoreValue = Number(allFansRpmTarget) || Number(targetFan.pvRpm) || 0;
        const restoredValue = Number(targetFan.lastActiveSvRpm) || fallbackRestoreValue;
        const nextIsActive = !targetFan.isActive;
        const nextValue = nextIsActive ? restoredValue : 0;
        const normalizedValue = Number.isNaN(nextValue) ? 0 : nextValue;

        setSubmittingFanId(fanId);
        submittingFanIdRef.current = fanId;

        try {
            const response = await fetch(
                `/api/modbus/control/${encodeURIComponent(deviceIdentifier)}/key/${encodeURIComponent(`cooling_fan${fanNumber}_sv`)}`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        value: normalizedValue,
                    }),
                }
            );

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            setFans((prev) =>
                prev.map((fan) => (
                    fan.id === fanId
                        ? {
                            ...fan,
                            svRpm: normalizedValue,
                            lastActiveSvRpm: nextIsActive ? normalizedValue : (fan.lastActiveSvRpm || restoredValue),
                            isActive: nextIsActive,
                            status: nextIsActive ? 'running' : 'stopped',
                        }
                        : fan
                ))
            );
        } catch (error) {
            console.error(`風扇 ${fanId} 開關設定失敗:`, error);
        } finally {
            setSubmittingFanId(null);
            submittingFanIdRef.current = null;
        }
    };

    const handleToggleAllFans = async (enabled) => {
        if (!deviceIdentifier) {
            return;
        }

        const normalizedAllFansTarget = Number(allFansRpmTarget);
        const nextFans = fans.map((fan) =>
            fan.status === 'fault'
                ? fan
                : {
                    ...fan,
                    svRpm: enabled
                        ? (Number.isNaN(normalizedAllFansTarget) ? (fan.lastActiveSvRpm || fan.svRpm || fan.pvRpm || 0) : normalizedAllFansTarget)
                        : 0,
                    lastActiveSvRpm: enabled
                        ? (Number.isNaN(normalizedAllFansTarget) ? (fan.lastActiveSvRpm || fan.svRpm || fan.pvRpm || 0) : normalizedAllFansTarget)
                        : (fan.lastActiveSvRpm || fan.svRpm || fan.pvRpm || 0),
                    isActive: enabled,
                    status: enabled ? 'running' : 'stopped',
                }
        );
        const nextFanPayloadValue = enabled
            ? (Number.isNaN(normalizedAllFansTarget) ? 0 : normalizedAllFansTarget)
            : 0;

        setIsSubmittingAllFans(true);
        isSubmittingAllFansRef.current = true;
        isEditingAllFansRpmTargetRef.current = true;

        const payload = {
            // circulating_pump_sv: Number(circulatingPumpSv) || 0,
            cooling_fan1_sv: toModbus(nextFanPayloadValue,100),
            cooling_fan2_sv: toModbus(nextFanPayloadValue,100),
            cooling_fan3_sv: toModbus(nextFanPayloadValue,100),
            cooling_fan4_sv: toModbus(nextFanPayloadValue,100),
            cooling_fan5_sv: toModbus(nextFanPayloadValue,100),
            cooling_fan6_sv: toModbus(nextFanPayloadValue,100),
            cooling_fan7_sv: toModbus(nextFanPayloadValue,100),
            cooling_fan8_sv: toModbus(nextFanPayloadValue,100),
            cooling_fan9_sv: toModbus(nextFanPayloadValue,100),
            // return_electric_valve_opening_sv: Number(returnValveOpening) || 0,
            // group1_pid_p_sv: Number(pidValues.p) || 0,
            // group1_pid_i_sv: Number(pidValues.i) || 0,
            // group1_pid_d_sv: Number(pidValues.d) || 0,
        }
        const requestUrl = `/api/modbus/sv/${encodeURIComponent(deviceIdentifier)}`;

        console.log('[All Fans Toggle] request url:', requestUrl);
        console.log('[All Fans Toggle] payload:', payload);

        try {
            const response = await fetch(requestUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });
            const responseText = await response.clone().text();
            console.log('[All Fans Toggle] response body:', responseText || '(empty)');

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            setFans(nextFans);
            if (enabled && !Number.isNaN(normalizedAllFansTarget)) {
                // 如果是開啟且有有效數值，同步到 input
                setAllFansRpmTarget(String(normalizedAllFansTarget));
            } else if (!enabled) {
                // 關閉時清空 input (placeholder 顯示 0)
                setAllFansRpmTarget('');
            }
            fetchFanHoldingData();
        } catch (error) {
            console.error('全部風扇開關設定失敗:', error);
        } finally {
            setIsSubmittingAllFans(false);
            isSubmittingAllFansRef.current = false;
            isEditingAllFansRpmTargetRef.current = false;
        }
    };

    const handleFanSvChange = (fanId, value) => {
        editingFanIdsRef.current.add(fanId);
        setFans((prev) =>
            prev.map((fan) => (
                fan.id === fanId
                    ? {
                        ...fan,
                        svRpm: value,
                        lastActiveSvRpm: Number(value) > 0 ? Number(value) : fan.lastActiveSvRpm,
                    }
                    : fan
            ))
        );
    };

    const handleFanSvFocus = (fanId) => {
        editingFanIdsRef.current.add(fanId);
    };

    const handleFanSvBlur = (fanId) => {
        editingFanIdsRef.current.delete(fanId);
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

        if (nextValue < 0 || nextValue > 100) {
            setFanErrors((prev) => ({ ...prev, [fanId]: '0 ~ 100' }));
            return;
        }
        setFanErrors((prev) => ({ ...prev, [fanId]: '' }));

        setSubmittingFanId(fanId);
        submittingFanIdRef.current = fanId;

        const payload = {value: toModbus(nextValue, 100),}

        const requestUrl = `/api/modbus/control/${encodeURIComponent(deviceIdentifier)}/key/${encodeURIComponent(`cooling_fan${fanNumber}_sv`)}`;
        console.log(`[Fan ${fanId} SV Submit] request url:`, requestUrl);
        console.log(`[Fan ${fanId} SV Submit] payload:`, payload);
        try {
            const response = await fetch(requestUrl,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(payload),
                }
            );
            const responseText = await response.clone().text();
            console.log(`[Fan ${fanId} SV Submit] response body:`, responseText || '(empty)');

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            setFans((prev) =>
                prev.map((fan) => (
                    fan.id === fanId
                        ? {
                            ...fan,
                            svRpm: Number.isNaN(nextValue) ? 0 : nextValue,
                            lastActiveSvRpm: Number.isNaN(nextValue) || nextValue <= 0 ? fan.lastActiveSvRpm : nextValue,
                            isActive: !Number.isNaN(nextValue) && nextValue > 0,
                            status: !Number.isNaN(nextValue) && nextValue > 0 ? 'running' : 'stopped',
                        }
                        : fan
                ))
            );
            editingFanIdsRef.current.delete(fanId);
        } catch (error) {
            console.error(`風扇 ${fanId} SV 設定失敗:`, error);
        } finally {
            setSubmittingFanId(null);
            submittingFanIdRef.current = null;
        }
    };

    const buildSvPayload = (currentFans, currentPidValues, currentValvePidValues, currentPumpSv, currentReturnValveOpening) => ({
        circulating_pump_sv: toModbus(currentPumpSv ?? circulatingPumpSv, MAX_FREQ_60),
        cooling_fan1_sv: toModbus((currentFans ?? fans).find((fan) => fan.id === '01')?.svRpm, 100),
        cooling_fan2_sv: toModbus((currentFans ?? fans).find((fan) => fan.id === '02')?.svRpm, 100),
        cooling_fan3_sv: toModbus((currentFans ?? fans).find((fan) => fan.id === '03')?.svRpm, 100),
        cooling_fan4_sv: toModbus((currentFans ?? fans).find((fan) => fan.id === '04')?.svRpm, 100),
        cooling_fan5_sv: toModbus((currentFans ?? fans).find((fan) => fan.id === '05')?.svRpm, 100),
        cooling_fan6_sv: toModbus((currentFans ?? fans).find((fan) => fan.id === '06')?.svRpm, 100),
        cooling_fan7_sv: toModbus((currentFans ?? fans).find((fan) => fan.id === '07')?.svRpm, 100),
        cooling_fan8_sv: toModbus((currentFans ?? fans).find((fan) => fan.id === '08')?.svRpm, 100),
        cooling_fan9_sv: toModbus((currentFans ?? fans).find((fan) => fan.id === '09')?.svRpm, 100),
        return_electric_valve_opening_sv: toModbus(currentReturnValveOpening ?? returnValveOpening, MAX_VALVE_100),
        group1_pid_p_sv: toPidModbus((currentPidValues ?? pidValues).p),
        group1_pid_i_sv: toPidModbus((currentPidValues ?? pidValues).i),
        group1_pid_d_sv: toPidModbus((currentPidValues ?? pidValues).d),
        group2_pid_p_sv: toPidModbus((currentValvePidValues ?? valvePidValues).p),
        group2_pid_i_sv: toPidModbus((currentValvePidValues ?? valvePidValues).i),
        group2_pid_d_sv: toPidModbus((currentValvePidValues ?? valvePidValues).d),
    });

    const handlePidChange = (key, value) => {
        isEditingPidValuesRef.current = true;
        setPidValues((prev) => ({
            ...prev,
            [key]: value,
        }));
        setModifiedPidFields((prev) => {
            const next = {
                ...prev,
                [key]: true,
            };
            modifiedPidFieldsRef.current = next;
            return next;
        });
    };

    const handleValvePidChange = (key, value) => {
        isEditingValvePidValuesRef.current = true;
        setValvePidValues((prev) => ({
            ...prev,
            [key]: value,
        }));
        setModifiedValvePidFields((prev) => {
            const next = {
                ...prev,
                [key]: true,
            };
            modifiedValvePidFieldsRef.current = next;
            return next;
        });
    };

    const handleOutletValveOpeningChange = (value) => {
        isEditingOutletValveOpeningRef.current = true;
        setOutletValveOpening(value);
        setModifiedValvePidFields((prev) => {
            const next = {
                ...prev,
                opening: true,
            };
            modifiedValvePidFieldsRef.current = next;
            return next;
        });
    };

    const handleSubmitPidValues = async () => {
        if (!deviceIdentifier) {
            return;
        }

        const pVal = Number(pidValues.p);
        const iVal = Number(pidValues.i);
        const dVal = Number(pidValues.d);

        if ([pVal, iVal, dVal].some(v => v < 0 || v > 10)) {
            setPidError('0 ~ 10.00');
            return;
        }
        setPidError('');

        setIsSubmittingPid(true);
        isSubmittingPidRef.current = true;

        const pValLatest = Number(pidValues.p);
        const iValLatest = Number(pidValues.i);
        const dValLatest = Number(pidValues.d);

        const currentPidValues = {
            p: String(pValLatest),
            i: String(iValLatest),
            d: String(dValLatest),
        };

        const payload = {
            // ...buildSvPayload(null, currentPidValues),
            group1_pid_p_sv: toPidModbus(pValLatest),
            group1_pid_i_sv: toPidModbus(iValLatest),
            group1_pid_d_sv: toPidModbus(dValLatest),
        };
        console.log('[PID Fans] 開始更新 PID 數值, payload:', payload);

        try {
            const response = await fetch(`/api/modbus/sv-with-coils/${encodeURIComponent(deviceIdentifier)}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            console.log(`[PID Fans] 收到回應: ${response.status} ${response.statusText}`);

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }

            // 同步本地狀態，確保在輪詢更新前 UI 保持一致
            setPidValues({
                p: String(pValLatest),
                i: String(iValLatest),
                d: String(dValLatest),
            });
            setModifiedPidFields({ p: false, i: false, d: false });
            modifiedPidFieldsRef.current = { p: false, i: false, d: false };
            isEditingPidValuesRef.current = false;
            fetchFanHoldingData();
            console.log('[PID Fans] 更新成功');
        } catch (error) {
            console.error('PID 設定失敗:', error);
        } finally {
            setIsSubmittingPid(false);
            isSubmittingPidRef.current = false;
        }
    };

    const handleSubmitAllFansSv = async () => {
        if (!deviceIdentifier) {
            return;
        }

        const nextValue = Number(allFansRpmTarget);
        if (nextValue < 0 || nextValue > 100) {
            setAllFansError('0 ~ 100');
            return;
        }
        setAllFansError('');

        const normalizedValue = Number.isNaN(nextValue) ? 0 : nextValue;
        const nextFans = fans.map((fan) => ({
            ...fan,
            svRpm: normalizedValue,
            lastActiveSvRpm: normalizedValue > 0 ? normalizedValue : fan.lastActiveSvRpm,
            isActive: normalizedValue > 0,
            status: normalizedValue > 0 ? 'running' : 'stopped',
        }));

        setIsSubmittingAllFans(true);
        isSubmittingAllFansRef.current = true;

        const payload = {
            // ...buildSvPayload(nextFans),
            cooling_fan1_sv: toModbus(normalizedValue, 100),
            cooling_fan2_sv: toModbus(normalizedValue, 100),
            cooling_fan3_sv: toModbus(normalizedValue, 100),
            cooling_fan4_sv: toModbus(normalizedValue, 100),
            cooling_fan5_sv: toModbus(normalizedValue, 100),
            cooling_fan6_sv: toModbus(normalizedValue, 100),
            cooling_fan7_sv: toModbus(normalizedValue, 100),
            cooling_fan8_sv: toModbus(normalizedValue, 100),
            cooling_fan9_sv: toModbus(normalizedValue, 100),
        };

        console.log('[All Fans SV] 開始更新全部風扇 SV, payload:', payload);

        try {
            const response = await fetch(`/api/modbus/sv-with-coils/${encodeURIComponent(deviceIdentifier)}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            console.log(`[All Fans SV] 收到回應: ${response.status} ${response.statusText}`);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            setFans(nextFans);
            isEditingAllFansRpmTargetRef.current = false;
            fetchFanHoldingData();
        } catch (error) {
            console.error('全部風扇 SV 設定失敗:', error);
        } finally {
            setIsSubmittingAllFans(false);
            isSubmittingAllFansRef.current = false;
        }
    };

    const handleSubmitOutletTargetTemp = async () => {
        if (!deviceIdentifier) {
            return;
        }

        const nextValue = Number(outletTargetTempSv);
        if (nextValue < 0 || nextValue > 100) {
            setTempError('0 ~ 100');
            return;
        }
        setTempError('');

        setIsSubmittingOutletTargetTemp(true);
        isSubmittingOutletTargetTempRef.current = true;

        const payload = {
            value: toModbus(nextValue, MAX_TEMP_100),
        };
        const requestUrl = `/api/modbus/control/${encodeURIComponent(deviceIdentifier)}/key/${encodeURIComponent('outlet_target_temp_sv')}`;

        console.log('[Outlet Target Temp] request url:', requestUrl);
        console.log('[Outlet Target Temp] request body:', payload);

        try {
            const response = await fetch(
                requestUrl,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(payload),
                }
            );

            const responseText = await response.clone().text();
            console.log('[Outlet Target Temp] response body:', responseText || '(empty)');

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            setOutletTargetTempSv(String(nextValue));
            isEditingOutletTargetTempRef.current = false;
            isModifiedOutletTargetTempRef.current = false;
            fetchFanHoldingData();
        } catch (error) {
            console.error('出風目標溫度設定失敗:', error);
        } finally {
            setIsSubmittingOutletTargetTemp(false);
            isSubmittingOutletTargetTempRef.current = false;
        }
    };

    const handleSubmitPumpFrequency = async () => {
        if (!deviceIdentifier) {
            return;
        }

        const nextValue = Number(circulatingPumpSv);
        if (nextValue < 0 || nextValue > 60) {
            setPumpError('0 ~ 60');
            return;
        }
        setPumpError('');

        setIsSubmittingPumpFrequency(true);
        isSubmittingPumpFrequencyRef.current = true;

        const payload = {
            value: toModbus(nextValue, MAX_FREQ_60),
        }

        const requestUrl =`/api/modbus/control/${encodeURIComponent(deviceIdentifier)}/key/${encodeURIComponent('circulating_pump_sv')}`;
        console.log('[Circulating Pump SV] request url:', requestUrl);
        console.log('[Circulating Pump SV] request body:', payload);


        try {
            const response = await fetch(requestUrl,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(payload),
                }
            );

            const responseText = await response.clone().text();
            console.log('[Circulating Pump SV] response body:', responseText || '(empty)');


            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            setCirculatingPumpSv(String(nextValue));
            isEditingCirculatingPumpSvRef.current = false;
            fetchFanHoldingData();
        } catch (error) {
            console.error('循環泵設定失敗:', error);
        } finally {
            setIsSubmittingPumpFrequency(false);
            isSubmittingPumpFrequencyRef.current = false;
        }
    };

    const handleSubmitOutletValveOpening = async () => {
        if (!deviceIdentifier) {
            return;
        }

        const nextValue = Number(outletValveOpening);
        const pVal = Number(valvePidValues.p);
        const iVal = Number(valvePidValues.i);
        const dVal = Number(valvePidValues.d);

        if (nextValue < 0 || nextValue > 100 || pVal < 0 || pVal > 10 || iVal < 0 || iVal > 10 || dVal < 0 || dVal > 10) {
            setValvePidError(nextValue < 0 || nextValue > 100 ? '0 ~ 100' : '0 ~ 10.00');
            return;
        }
        setValvePidError('');

        const currentValvePidValues = {
            p: String(pVal),
            i: String(iVal),
            d: String(dVal),
        };

        const payload = {
            // ...buildSvPayload(null, null, currentValvePidValues),
            outlet_electric_valve_opening_sv: toModbus(nextValue, MAX_VALVE_100),
            group2_pid_p_sv: toPidModbus(pVal),
            group2_pid_i_sv: toPidModbus(iVal),
            group2_pid_d_sv: toPidModbus(dVal),
        };

        console.log('[PID Outlet] 開始更新出水閥開度及 PID, payload:', payload);
        setIsSubmittingOutletValveOpening(true);
        isSubmittingOutletValveOpeningRef.current = true;
        setIsSubmittingValvePid(true);
        isSubmittingValvePidRef.current = true;

        try {
            const response = await fetch(`/api/modbus/sv-with-coils/${encodeURIComponent(deviceIdentifier)}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            console.log(`[PID Outlet] 收到回應: ${response.status} ${response.statusText}`);

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }

            // 同步本地狀態
            setValvePidValues({
                p: String(pVal),
                i: String(iVal),
                d: String(dVal),
            });
            setOutletValveOpening(String(nextValue));
            setModifiedValvePidFields({ p: false, i: false, d: false, opening: false });
            modifiedValvePidFieldsRef.current = { p: false, i: false, d: false, opening: false };
            console.log('[PID Outlet] 更新成功');

            isEditingOutletValveOpeningRef.current = false;
            isEditingValvePidValuesRef.current = false;
            fetchFanHoldingData();
        } catch (error) {
            console.error('出水閥開度及 PID 設定失敗:', error);
        } finally {
            setIsSubmittingOutletValveOpening(false);
            isSubmittingOutletValveOpeningRef.current = false;
            setIsSubmittingValvePid(false);
            isSubmittingValvePidRef.current = false;
        }
    };

    const handleSubmitPressureTarget = async () => {
        if (!deviceIdentifier) {
            return;
        }

        const nextValue = Number(pressureTarget);
        if (nextValue < 0 || nextValue > 1000) {
            setPressureError('0 ~ 1000');
            return;
        }
        setPressureError('');

        setIsSubmittingPressureTarget(true);
        isSubmittingPressureTargetRef.current = true;

        const payload = {
            value: toModbus(nextValue, MAX_PRESSURE_1000),
        };
        const requestUrl = `/api/modbus/control/${encodeURIComponent(deviceIdentifier)}/key/${encodeURIComponent('target_pressure_diff_sv')}`;
        console.log('[Pressure Target] request url:', requestUrl);
        console.log('[Pressure Target] request body:', payload);

        try {
            const response = await fetch(requestUrl,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(payload),
                }
            );
            const responseText = await response.clone().text();
            console.log('[Pressure Target] response text:', responseText);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            setPressureTarget(String(nextValue));
            isEditingPressureTargetRef.current = false;
            fetchFanHoldingData();
        } catch (error) {
            console.error('壓差控制設定失敗:', error);
        } finally {
            setIsSubmittingPressureTarget(false);
            isSubmittingPressureTargetRef.current = false;
        }
    };

    const handleSubmitReturnValveOpening = async () => {
        if (!deviceIdentifier) {
            return;
        }

        const nextValue = Number(returnValveOpening);
        if (nextValue < 0 || nextValue > 100) {
            setReturnValveError('0 ~ 100');
            return;
        }
        setReturnValveError('');

        setIsSubmittingReturnValveOpening(true);

        const payload = {
            value: toModbus(nextValue, MAX_VALVE_100),
        };
        const requestUrl = `/api/modbus/control/${encodeURIComponent(deviceIdentifier)}/key/${encodeURIComponent('return_electric_valve_opening_sv')}`;
        console.log('[return_electric_valve_opening_sv] request url:', requestUrl);
        console.log('[return_electric_valve_opening_sv] request body:', payload);

        try {
            const response = await fetch(
                requestUrl,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(payload),
                }
            );
            const responseText = await response.clone().text();
            console.log('[return_electric_valve_opening_sv] response status:', responseText || '(empty)');

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            isEditingReturnValveOpeningRef.current = false;
            fetchFanHoldingData();
        } catch (error) {
            console.error('混水閥開度設定失敗:', error);
        } finally {
            setIsSubmittingReturnValveOpening(false);
        }
    };

    const handleToggleEmergency = async (enabled) => {
        if (!deviceIdentifier || isSubmittingEmergency) {
            return;
        }

        const nextValue = enabled ? 1 : 0;
        const previousValue = isEmergencyEnabled;
        const payload = {
            fan_power_start: nextValue,
        };

        emergencyOverrideRef.current = nextValue;
        setIsEmergencyEnabled(enabled);
        setIsSubmittingEmergency(true);

        try {
            console.log('Emergency switch request:', {
                deviceIdentifier,
                enabled,
                payload,
            });

            const response = await fetch(`/api/modbus/sv-with-coils/${encodeURIComponent(deviceIdentifier)}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            console.log('Emergency switch response:', {
                status: response.status,
                ok: response.ok,
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
        } catch (error) {
            console.error('緊急開關設定失敗:', error);
            emergencyOverrideRef.current = null;
            setIsEmergencyEnabled(previousValue);
        } finally {
            setIsSubmittingEmergency(false);
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
                        <h2 className="text-xl font-bold tracking-tight">{device?.name ?? ''}</h2>
                        <div className="flex items-center gap-2">
                            <span className={`flex h-2 w-2 rounded-full ${
                                device?.status === 'alert' || device?.status === 'offline' ? 'bg-red-500' :
                                    'bg-emerald-500'
                            }`}></span>
                            <span className={`text-xs font-medium ${statusClass[device?.status] ?? statusClass.online}`}>
                                {statusText[device?.status] ?? statusText.online}
                            </span>
                            {/*<span className="text-xs text-slate-400 px-2">•</span>*/}
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
                    <p className="text-[16px] font-bold text-cyan-600 mb-3">{t('industrial.telemetry.outletAirTemperature')}</p>
                    <div className="flex justify-between items-center text-xs mb-2">
                        <span className="text-[14px]">{t('industrial.temperature')}:</span>
                        <span className="font-bold text-[14px]">
                            {formatDisplayValue(sensorValues.outletAirTemp)}
                            <span className="text-slate-400 font-normal">°C</span>
                        </span>
                    </div>
                    <div className="pt-2 border-t border-slate-100 space-y-2">
                        <PVText value={holdingData?.outlet_target_temp_pv} unit="°C" />
                        <div className="flex items-center gap-2">
                            <span className="text-[16px] font-bold text-slate-500 shrink-0">{t('industrial.targetTemperature')}</span>
                            <div className="relative flex-1">
                                <input
                                    className={`text-left w-full h-7 text-[12px] border rounded px-1 outline-none transition-colors ${
                                        tempError ? 'bg-red-50 border-red-500 focus:ring-red-200' : 'bg-white border-slate-200 focus:ring-1 focus:ring-primary'
                                    }`}
                                    type="number"
                                    value={outletTargetTempSv}
                                    onFocus={() => {
                                        isEditingOutletTargetTempRef.current = true;
                                    }}
                                    onBlur={() => {
                                        isEditingOutletTargetTempRef.current = false;
                                    }}
                                    onChange={(event) => {
                                        isEditingOutletTargetTempRef.current = true;
                                        isModifiedOutletTargetTempRef.current = true;
                                        setOutletTargetTempSv(event.target.value);
                                    }}
                                    placeholder={FALLBACK_VALUE}
                                />
                                {tempError && <span className="absolute -top-4 right-0 text-[10px] font-bold text-red-500">{tempError}</span>}
                            </div>
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
                    sensorValues={sensorValues}
                    holdingData={holdingData}
                    percentage={outletValveOpening}
                    onPercentageChange={handleOutletValveOpeningChange}
                    onPercentageFocus={() => {
                        isEditingOutletValveOpeningRef.current = true;
                    }}
                    onPercentageBlur={() => {
                        isEditingOutletValveOpeningRef.current = false;
                    }}
                    onSubmit={handleSubmitOutletValveOpening}
                    isSubmitting={isSubmittingOutletValveOpening}
                    pidValues={valvePidValues}
                    onPidChange={handleValvePidChange}
                    onPidFocus={() => {
                        isEditingValvePidValuesRef.current = true;
                    }}
                    onPidBlur={() => {
                        isEditingValvePidValuesRef.current = false;
                    }}
                    modifiedPidFields={modifiedValvePidFields}
                    pidMonitoringEnabled={outletPidMonitoringEnabled}
                    onPidMonitoringChange={(enabled) => handleUpdatePidSwitch('pid2_switch', enabled)}
                    correctionEnabled={outletCorrectionEnabled}
                    onCorrectionChange={(enabled) => handleUpdatePidSwitch('pid2_direction', enabled)}
                    error={valvePidError}
                />
                <ReturnValveControl
                    sensorValues={sensorValues}
                    holdingData={holdingData}
                    openingRatio={returnValveOpening}
                    onOpeningRatioChange={(value) => {
                        isEditingReturnValveOpeningRef.current = true;
                        setReturnValveOpening(value);
                    }}
                    onOpeningRatioFocus={() => {
                        isEditingReturnValveOpeningRef.current = true;
                    }}
                    onOpeningRatioBlur={() => {
                        isEditingReturnValveOpeningRef.current = false;
                    }}
                    onSubmit={handleSubmitReturnValveOpening}
                    isSubmitting={isSubmittingReturnValveOpening}
                    error={returnValveError}
                />
                <MotorControl
                    deviceIdentifier={deviceIdentifier}
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
                    error={pumpError}
                />
            </section>

            <section className="space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex w-full items-center gap-8">
                        <h2 className="text-[20px] font-bold flex items-center gap-2">{t('industrial.fanControl')}</h2>
                        <div className="flex items-center gap-3">
                            <span className="text-xs font-bold text-slate-500 uppercase">{t('industrial.pidStartMonitoring')}</span>
                            <Toggle checked={pidMonitoringEnabled} onChange={(enabled) => handleUpdatePidSwitch('pid1_switch', enabled)} />
                        </div>
                        {/*<div className="flex items-center gap-3">*/}
                        {/*    <span className="text-xs font-bold text-slate-500 uppercase">*/}
                        {/*        {t(fansCorrectionEnabled ? 'industrial.forwardCorrection' : 'industrial.reverseCorrection')}*/}
                        {/*    </span>*/}
                        {/*    <Toggle checked={fansCorrectionEnabled} onChange={(enabled) => handleUpdatePidSwitch('pid1_direction', enabled)} />*/}
                        {/*</div>*/}
                        <div className="ml-auto flex items-center justify-between gap-4 bg-red-50 px-5 py-2.5 rounded-xl border border-red-100 shadow-sm">
                            <span className="text-sm font-black text-red-600 uppercase tracking-tight">{t('industrial.emergencySwitch')}</span>
                            <div className="ml-auto">
                                <ToggleEmer
                                    checked={isEmergencyEnabled}
                                    onChange={handleToggleEmergency}
                                    disabled={isSubmittingEmergency}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-slate-50/50 p-6 rounded-xl border border-slate-200 mb-8 grid grid-cols-1 xl:grid-cols-3 gap-8">
                    <div className="space-y-4 items-center gap-2">
                        <div className="flex space-x-4">
                            <h3 className="uppercase tracking-wider font-bold text-slate-400">{t('industrial.oneClickEnableAll')}</h3>
                            <Toggle checked={allFansEnabled} onChange={handleToggleAllFans} />
                            {/*<PVText value={sensorValues.rpm} />*/}
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
                                        className={`text-left w-full bg-white border-none rounded-lg px-3 py-2 text-[14px] ring-1 focus:ring-primary outline-none ${allFansError ? 'ring-red-500' : 'ring-slate-200'}`}
                                    />
                                    <span className="absolute right-3 top-2.5 text-[10px] text-slate-400 font-bold">%</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={handleSubmitAllFansSv}
                                        disabled={isSubmittingAllFans}
                                        className="bg-primary/10 text-primary px-4 py-2 rounded-lg text-xs font-bold border border-primary/20 hover:bg-primary hover:text-white transition-all disabled:opacity-50"
                                    >
                                        {t('common.confirm')}
                                    </button>
                                    {allFansError && <span className="text-[12px] text-red-500 font-bold whitespace-nowrap">{allFansError}</span>}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4 border-l border-slate-200 xl:pl-8">
                        <h3 className="uppercase tracking-wider font-bold text-slate-400">{t('industrial.differentialPressureControl')}</h3>
                        <div className="flex items-center gap-4">
                            <div className="flex flex-col">
                                <span className="text-[12px] text-slate-400 font-bold">PV</span>
                                <span className="text-s font-bold text-slate-700">
                                    {formatDisplayValue(sensorValues.pressureDifference)} Pa
                                </span>
                            </div>
                            <div className="flex-1 flex gap-2">
                                <div className="relative flex-1">
                                    <input
                                        type="number"
                                        step="1"
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
                                        className={`text-left w-full border-none rounded-lg px-3 py-2 text-[14px] ring-1 outline-none transition-colors ${
                                            pressureError ? 'bg-red-50 ring-red-500' : 'bg-white ring-slate-200 focus:ring-primary'
                                        }`}
                                    />
                                    <span className="absolute right-3 top-2.5 text-[10px] text-slate-400 font-bold">Pa</span>
                                    {pressureError && <span className="absolute -top-4 right-0 text-[10px] font-bold text-red-500">{pressureError}</span>}
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
                                            value={toPidDisplay(
                                                item.key === 'p'
                                                    ? holdingData?.group1_pid_p_pv
                                                    : item.key === 'i'
                                                        ? holdingData?.group1_pid_i_pv
                                                        : holdingData?.group1_pid_d_pv
                                            )}
                                        />
                                        <div className="relative">
                                            <input
                                                type="number"
                                                value={pidValues[item.key]}
                                                onFocus={() => {
                                                    isEditingPidValuesRef.current = true;
                                                }}
                                                onBlur={() => {
                                                    isEditingPidValuesRef.current = false;
                                                }}
                                                onChange={(event) => {
                                                    isEditingPidValuesRef.current = true;
                                                    handlePidChange(item.key, event.target.value);
                                                }}
                                                step="0.01"
                                                min="0"
                                                max="10.00"
                                                placeholder={FALLBACK_VALUE}
                                                className={`text-left w-full border-none rounded-lg text-xs px-2 py-1.5 ring-1 outline-none transition-colors ${
                                                    modifiedPidFields[item.key] || pidError
                                                        ? 'bg-red-50 ring-red-500'
                                                        : 'bg-white ring-slate-200 focus:ring-primary'
                                                }`}
                                            />
                                            {pidError && <span className="absolute -top-4 right-0 text-[10px] font-bold text-red-500">{pidError}</span>}
                                        </div>
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
                            onSvFocus={handleFanSvFocus}
                            onSvBlur={handleFanSvBlur}
                            onSubmit={handleSubmitFanSv}
                            onToggle={handleToggleFan}
                            isSubmitting={submittingFanId === fan.id}
                            error={fanErrors[fan.id]}
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
