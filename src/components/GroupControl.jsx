import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Droplets,
  Wind,
  Zap,
  Check,
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { formatApiNumber } from '../utils/formatApiNumber';

const API_HOST = '';
const FALLBACK_VALUE = '--';
const DEFAULT_POLLING_INTERVAL_MS = 1000;

const SCALE_4096 = 4095;
const SCALE_65535 = 10000;
const MAX_VALVE_100 = 100;
const MAX_TEMP_100 = 100;
const MAX_FREQ_60 = 60;
const MAX_PID_100 = 100;
const MAX_PID_10 = 10;
const MAX_PRESSURE_1000 = 1000;
const FAN_MAX_RPM_3570 = 3570;
const VALVE_OPENING_MIN_PERCENT_FOR_PUMP = 20;

const toDisplay = (modbusValue, maxRange) => {
  if (modbusValue === undefined || modbusValue === null || Number.isNaN(Number(modbusValue))) {
    return 0;
  }
  const val = (Number(modbusValue) / SCALE_4096) * maxRange;
  // console.log('toDisplay', val.toFixed(1));
  // 確保數值最多只有一位小數
  return parseFloat(val.toFixed(1));
};

const toDisplay16 = (modbusValue, maxRange) => {
  if (modbusValue === undefined || modbusValue === null || Number.isNaN(Number(modbusValue))) {
    return 0;
  }
  const val = (Number(modbusValue) / SCALE_65535) * maxRange;
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

const toModbus16 = (displayValue, maxRange) => {
  const val = Number(displayValue);
  if (Number.isNaN(val)) return 0;
  // console.log('toModbus', Math.round((val / maxRange) * SCALE_4096));
  return Math.round((val / maxRange) * SCALE_65535);
};

const SCALE_MIN = SCALE_4096 * 0.2;
const SCALE_MAX = SCALE_4096 * 0.95;

const fromOpeningRatio = (modbusValue, maxRange) => {
  const val = Number(modbusValue);

  if (!Number.isFinite(val)) {
    return null;
  }

  const ratio = ((val - SCALE_MIN) / (SCALE_MAX - SCALE_MIN)) * maxRange;
  const clampedRatio = Math.max(0, Math.min(ratio, maxRange));

  return parseFloat(clampedRatio.toFixed(1));
};

const clampPumpFrequencyValue = (value) => {
  if (Number.isNaN(Number(value))) {
    return 0;
  }

  return Math.min(MAX_FREQ_60, Math.max(0, Number(value)));
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


const formatDisplayValue = (value) => {
  const formattedValue = formatApiNumber(value, FALLBACK_VALUE);

  if (formattedValue === FALLBACK_VALUE) {
    return FALLBACK_VALUE;
  }

  const numericValue = Number(formattedValue);
  return Number.isNaN(numericValue) ? FALLBACK_VALUE : numericValue.toFixed(1);
};

const handleEnterSubmit = (event, onSubmit) => {
  if (event.key !== 'Enter') {
    return;
  }

  event.preventDefault();
  onSubmit?.();
};

const getValveOpeningRatio = (holdingPayload, pvKey, svKey) => {
  const pvValue = Number(holdingPayload?.[pvKey]);

  if (Number.isFinite(pvValue)) {
    return pvValue <= MAX_VALVE_100 ? pvValue : toDisplay(pvValue, MAX_VALVE_100);
  }

  const svRatio = fromOpeningRatio(holdingPayload?.[svKey], MAX_VALVE_100);

  return svRatio;
};

export const GroupControl = ({ group, onBack }) => {
  const { t } = useLanguage();
  const [pidOn, setPidOn] = useState(false);
  const [fanPidOn, setFanPidOn] = useState(false);
  const [allOn, setAllOn] = useState(false);
  const [groupDetail, setGroupDetail] = useState(null);
  const [holdingData, setHoldingData] = useState({});
  const [tempDefaultValue, setTempDefaultValue] = useState('');
  const [targetPressureDefaultValue, setTargetPressureDefaultValue] = useState('');
  const [cvOutputDefaultValue, setCvOutputDefaultValue] = useState('');
  const [pumpFrequencyDefaultValue, setPumpFrequencyDefaultValue] = useState('');
  const isEditingTempRef = useRef(false);
  const isEditingTargetPressureRef = useRef(false);
  const isEditingCvOutputRef = useRef(false);
  const isEditingPumpFrequencyRef = useRef(false);
  const tempInputRef = useRef(null);
  const targetPressureInputRef = useRef(null);
  const cvOutputInputRef = useRef(null);
  const pumpFrequencyInputRef = useRef(null);
  const toastRef = useRef(null);
  const toastTimeoutRef = useRef(null);
  const [valveEmergency, setValveEmergency] = useState(false);
  const [fanEmergency, setFanEmergency] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success');
  const [isSubmittingToggle, setIsSubmittingToggle] = useState(false);
  const [isSubmittingPumpFrequency, setIsSubmittingPumpFrequency] = useState(false);
  const [pumpGuardDialog, setPumpGuardDialog] = useState({
    open: false,
    devices: [],
  });

  useEffect(() => () => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
  }, []);

  const fetchGroupDetail = async () => {
    const groupId = group?.id;
    if (!groupId) {
      return null;
    }

    console.log('API Request [GET]:', `${API_HOST}/api/groups/${encodeURIComponent(groupId)}`);
    const response = await fetch(`${API_HOST}/api/groups/${encodeURIComponent(groupId)}`, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    console.log('API Response:', data);
    return data;
  };

  const getGroupDeviceIdentifiers = (nextGroupDetail) => (
    (nextGroupDetail?.devices ?? [])
      .map((device) => device?.name ?? device?.deviceName ?? device?.id ?? device?.deviceId)
      .filter(Boolean)
  );

  const fetchDeviceHoldingData = async (deviceIdentifier) => {
    console.log('API Request [GET]:', `${API_HOST}/api/modbus/holding/${encodeURIComponent(deviceIdentifier)}`);
    const response = await fetch(`${API_HOST}/api/modbus/holding/${encodeURIComponent(deviceIdentifier)}`, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    console.log('API Response:', data);
    return data ?? {};
  };

  useEffect(() => {
    let isActive = true;

    if (!group?.id) {
      setGroupDetail(null);
      setHoldingData({});
      return () => {
        isActive = false;
      };
    }

    const fetchGroupHoldingData = async () => {
      try {
        const nextGroupDetail = await fetchGroupDetail();
        const devices = Array.isArray(nextGroupDetail?.devices) ? nextGroupDetail.devices : [];
        const firstDevice = devices[0];
        const deviceIdentifier = firstDevice?.name ?? firstDevice?.deviceName ?? firstDevice?.id ?? firstDevice?.deviceId;

        if (!isActive) {
          return;
        }

        setGroupDetail(nextGroupDetail ?? null);

        if (!deviceIdentifier) {
          setHoldingData({});
          return;
        }

        const nextHoldingData = await fetchDeviceHoldingData(deviceIdentifier);

        if (!isActive) {
          return;
        }

        setHoldingData(nextHoldingData ?? {});

        // 同步狀態
        setPidOn(Number(nextHoldingData?.pid2_switch) === 1);
        setFanPidOn(Number(nextHoldingData?.pid1_switch) === 1);
        setValveEmergency(Number(nextHoldingData?.pump_start) === 1);
        setFanEmergency(Number(nextHoldingData?.fan_power_start) === 1);

        if (!isEditingTempRef.current) {
          const nextTempValue = String(toDisplay16(nextHoldingData?.outlet_target_temp_sv, MAX_TEMP_100) ?? '');
          setTempDefaultValue(nextTempValue);
          if (tempInputRef.current) {
            tempInputRef.current.value = nextTempValue;
          }
        }
        if (!isEditingTargetPressureRef.current) {
          const nextTargetPressureValue = String(toDisplay16(nextHoldingData?.target_pressure_diff_sv, MAX_PRESSURE_1000) ?? '');
          setTargetPressureDefaultValue(nextTargetPressureValue);
          if (targetPressureInputRef.current) {
            targetPressureInputRef.current.value = nextTargetPressureValue;
          }
        }
        if (!isEditingCvOutputRef.current) {
          const nextCvOutputValue = String(toDisplay(nextHoldingData?.cooling_fan1_sv, MAX_VALVE_100) ?? '');
          setCvOutputDefaultValue(nextCvOutputValue);
          if (cvOutputInputRef.current) {
            cvOutputInputRef.current.value = nextCvOutputValue;
          }
        }
        if (!isEditingPumpFrequencyRef.current) {
          const nextPumpFrequencyValue = String(toDisplay(nextHoldingData?.circulating_pump_sv, MAX_FREQ_60) ?? '');
          setPumpFrequencyDefaultValue(nextPumpFrequencyValue);
          if (pumpFrequencyInputRef.current) {
            pumpFrequencyInputRef.current.value = nextPumpFrequencyValue;
          }
        }
      } catch (error) {
        console.error('載入群組設備資料失敗:', error);
        if (isActive) {
          setGroupDetail(null);
          setHoldingData({});
        }
      }
    };

    const refreshGroupHoldingData = () => {
      fetchGroupHoldingData();
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshGroupHoldingData();
      }
    };

    refreshGroupHoldingData();
    const intervalId = setInterval(refreshGroupHoldingData, DEFAULT_POLLING_INTERVAL_MS);
    window.addEventListener('focus', refreshGroupHoldingData);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isActive = false;
      clearInterval(intervalId);
      window.removeEventListener('focus', refreshGroupHoldingData);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [group?.id]);

  const buildSvPayload = (overrides = {}) => ({
    // circulating_pump_sv: Number(holdingData?.circulating_pump_sv) || 0,
    cooling_fan1_sv: Number(holdingData?.cooling_fan1_sv) || 0,
    cooling_fan2_sv: Number(holdingData?.cooling_fan2_sv) || 0,
    cooling_fan3_sv: Number(holdingData?.cooling_fan3_sv) || 0,
    cooling_fan4_sv: Number(holdingData?.cooling_fan4_sv) || 0,
    cooling_fan5_sv: Number(holdingData?.cooling_fan5_sv) || 0,
    cooling_fan6_sv: Number(holdingData?.cooling_fan6_sv) || 0,
    cooling_fan7_sv: Number(holdingData?.cooling_fan7_sv) || 0,
    cooling_fan8_sv: Number(holdingData?.cooling_fan8_sv) || 0,
    cooling_fan9_sv: Number(holdingData?.cooling_fan9_sv) || 0,
    // return_electric_valve_opening_sv: Number(holdingData?.return_electric_valve_opening_sv) || 0,
    // group1_pid_p_sv: Number(holdingData?.group1_pid_p_sv) || 0,
    // group1_pid_i_sv: Number(holdingData?.group1_pid_i_sv) || 0,
    // group1_pid_d_sv: Number(holdingData?.group1_pid_d_sv) || 0,
    ...overrides,
  });

  const showToast = (message, type = 'success') => {
    if (!toastRef.current) {
      return;
    }

    setToastMessage(message);
    setToastType(type);
    toastRef.current.classList.remove('hidden');

    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }

    toastTimeoutRef.current = setTimeout(() => {
      toastRef.current?.classList.add('hidden');
    }, 2000);
  };

  const showSavedToast = () => {
    showToast(t('groupControl.saved'), 'success');
  };

  const submitToGroupDevices = async (payload) => {
    const nextGroupDetail = await fetchGroupDetail();
    const groupDeviceIdentifiers = getGroupDeviceIdentifiers(nextGroupDetail);

    if (!groupDeviceIdentifiers.length) {
      return;
    }

    await Promise.all(groupDeviceIdentifiers.map(async (deviceIdentifier) => {
      console.log('API Request [POST]:', `${API_HOST}/api/modbus/sv-with-coils/${encodeURIComponent(deviceIdentifier)}`, 'Payload:', payload);
      const response = await fetch(`${API_HOST}/api/modbus/sv-with-coils/${encodeURIComponent(deviceIdentifier)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      try{
        const responseData = await response.json();
        console.log('API Response:', responseData);
      }catch (error) {
        console.log(response);
      }

    }));

    setGroupDetail(nextGroupDetail ?? null);
  };

  const submitSvToGroupDevices = async (payload) => {
    const nextGroupDetail = await fetchGroupDetail();
    const groupDeviceIdentifiers = getGroupDeviceIdentifiers(nextGroupDetail);

    if (!groupDeviceIdentifiers.length) {
      return;
    }

    await Promise.all(groupDeviceIdentifiers.map(async (deviceIdentifier) => {
      console.log('API Request [POST]:', `${API_HOST}/api/modbus/sv/${encodeURIComponent(deviceIdentifier)}`, 'Payload:', payload);
      const response = await fetch(`${API_HOST}/api/modbus/sv/${encodeURIComponent(deviceIdentifier)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      try{
        const responseData = await response.json();
        console.log('API Response:', responseData);
      }catch (error) {
        console.log(response);
      }

    }));

    setGroupDetail(nextGroupDetail ?? null);
  };

  const submitControlKeyToGroupDevices = async (key, value) => {
    const nextGroupDetail = await fetchGroupDetail();
    const groupDeviceIdentifiers = getGroupDeviceIdentifiers(nextGroupDetail);

    if (!groupDeviceIdentifiers.length) {
      return;
    }

    await Promise.all(groupDeviceIdentifiers.map(async (deviceIdentifier) => {
      const payload = {
        value,
      };
      console.log(
        'API Request [POST]:',
        `${API_HOST}/api/modbus/control/${encodeURIComponent(deviceIdentifier)}/key/${encodeURIComponent(key)}`,
        'Payload:',
        payload
      );
      const response = await fetch(
        `${API_HOST}/api/modbus/control/${encodeURIComponent(deviceIdentifier)}/key/${encodeURIComponent(key)}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const responseData = await response.json();
      console.log('API Response:', responseData);
    }));

    setGroupDetail(nextGroupDetail ?? null);
  };

  const getPumpFrequencyBlockedDevices = async () => {
    const nextGroupDetail = await fetchGroupDetail();
    const groupDeviceIdentifiers = getGroupDeviceIdentifiers(nextGroupDetail);

    if (!groupDeviceIdentifiers.length) {
      return [];
    }

    const valveStatuses = await Promise.all(groupDeviceIdentifiers.map(async (deviceIdentifier) => {
      const nextHoldingData = await fetchDeviceHoldingData(deviceIdentifier);
      const outletValveRatio = getValveOpeningRatio(
        nextHoldingData,
        'outlet_electric_valve_opening_pv',
        'outlet_electric_valve_opening_sv'
      );
      const mixingValveRatio = getValveOpeningRatio(
        nextHoldingData,
        'return_electric_valve_opening_pv',
        'return_electric_valve_opening_sv'
      );

      return {
        deviceIdentifier,
        outletValveRatio,
        mixingValveRatio,
      };
    }));

    return valveStatuses.filter(({ outletValveRatio, mixingValveRatio }) => (
      (Number.isFinite(outletValveRatio) && outletValveRatio < VALVE_OPENING_MIN_PERCENT_FOR_PUMP)
      || (Number.isFinite(mixingValveRatio) && mixingValveRatio < VALVE_OPENING_MIN_PERCENT_FOR_PUMP)
    ));
  };

  const handleToggleValue = async (key, checked, setter) => {
    if (isSubmittingToggle) return;

    const previousValue = !checked;
    const payload = { [key]: checked ? 1 : 0 };

    setter(checked);
    setIsSubmittingToggle(true);

    try {
      await submitSvToGroupDevices(payload);
      showSavedToast();
    } catch (error) {
      console.error(`設定 ${key} 失敗:`, error);
      setter(previousValue);
      showToast(t('common.error'), 'error');
    } finally {
      setIsSubmittingToggle(false);
    }
  };

  const handleSubmitTargetTemp = async () => {
    const nextValue = Number(tempInputRef.current?.value ?? '');
    
    if (nextValue < 0 || nextValue > 100 || Number.isNaN(nextValue)) {
      showToast(t('groupControl.tempRange'), 'error');
      return;
    }

    const normalizedValue = nextValue;
    const modbusValue = toModbus16(normalizedValue, MAX_TEMP_100);

    try {
      await submitControlKeyToGroupDevices('outlet_target_temp_sv', modbusValue);
      setTempDefaultValue(String(normalizedValue));
      isEditingTempRef.current = false;
      showSavedToast();
    } catch (error) {
      console.error('群組目標溫度設定失敗:', error);
    }
  };

  const handleSubmitTargetPressure = async () => {
    const nextValue = Number(targetPressureInputRef.current?.value ?? '');

    if (nextValue < 0 || nextValue > 1000 || Number.isNaN(nextValue)) {
      showToast(t('groupControl.pressureRange'), 'error');
      return;
    }

    const normalizedValue = nextValue;
    const modbusValue = toModbus16(normalizedValue, MAX_PRESSURE_1000);

    try {
      await submitControlKeyToGroupDevices('target_pressure_diff_sv', modbusValue);
      setTargetPressureDefaultValue(String(normalizedValue));
      isEditingTargetPressureRef.current = false;
      showSavedToast();
    } catch (error) {
      console.error('群組壓差設定失敗:', error);
    }
  };

  const handleSubmitFanOutput = async () => {
    const nextValue = Number(cvOutputInputRef.current?.value ?? '');

    if (nextValue < 0 || nextValue > 100 || Number.isNaN(nextValue)) {
      showToast(t('groupControl.fanRange'), 'error');
      return;
    }

    const normalizedValue = nextValue;
    const modbusValue = toModbus(normalizedValue, MAX_VALVE_100);

    try {
      await submitToGroupDevices(buildSvPayload({
        cooling_fan1_sv: modbusValue,
        cooling_fan2_sv: modbusValue,
        cooling_fan3_sv: modbusValue,
        cooling_fan4_sv: modbusValue,
        cooling_fan5_sv: modbusValue,
        cooling_fan6_sv: modbusValue,
        cooling_fan7_sv: modbusValue,
        cooling_fan8_sv: modbusValue,
        cooling_fan9_sv: modbusValue,
      }));
      setCvOutputDefaultValue(String(normalizedValue));
      isEditingCvOutputRef.current = false;
      showSavedToast();
    } catch (error) {
      console.error('群組風扇輸出設定失敗:', error);
    }
  };

  const handleSubmitPumpFrequency = async () => {
    const nextValue = Number(pumpFrequencyInputRef.current?.value ?? '');

    if (nextValue < 0 || nextValue > MAX_FREQ_60 || Number.isNaN(nextValue)) {
      showToast(t('groupControl.pumpFrequencyRange'), 'error');
      return;
    }

    const normalizedValue = clampPumpFrequencyValue(nextValue);
    const modbusValue = toModbus(normalizedValue, MAX_FREQ_60);

    setIsSubmittingPumpFrequency(true);

    try {
      const blockedDevices = await getPumpFrequencyBlockedDevices();

      if (blockedDevices.length) {
        setPumpGuardDialog({
          open: true,
          devices: blockedDevices,
        });
        return;
      }

      await submitControlKeyToGroupDevices('circulating_pump_sv', modbusValue);
      setPumpFrequencyDefaultValue(String(normalizedValue));
      isEditingPumpFrequencyRef.current = false;
      showSavedToast();
    } catch (error) {
      console.error('群組混水泵浦頻率設定失敗:', error);
      showToast(t('common.error'), 'error');
    } finally {
      setIsSubmittingPumpFrequency(false);
    }
  };

  const Toggle = ({ checked, onChange }) => (
    <button
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
        checked ? 'bg-primary' : 'bg-slate-200'
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
          checked ? 'translate-x-5.5' : 'translate-x-0.5'
        }`}
      />
    </button>
  );
  const ToggleSwitch = ({ checked, onChange, color = 'bg-blue-600' }) => (
      <button
          onClick={() => onChange(!checked)}
          className={`relative w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none ${
              checked ? color : 'bg-slate-200 bg-slate-700'
          }`}
      >
        <div
            className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform duration-200 ${
                checked ? 'translate-x-5' : 'translate-x-0'
            }`}
        />
      </button>
  );
  const EmergencyStop = ({ active, onToggle }) => (
    <div className="flex items-center gap-3">
      <button className="px-4 py-2 bg-white/50 bg-red-900/40 text-red-600 text-red-400 hover:bg-white hover:text-red-700 hover:border-red-200 hover:shadow-sm active:scale-95 active:bg-red-100 active:shadow-none rounded-lg font-bold text-sm transition-all border border-red-100 border-red-900/30">
        {t('groupControl.reset')}
      </button>
      <div className="flex items-center gap-3 px-4 py-1.5 bg-red-50 bg-red-900/20 rounded-full border border-red-100 border-red-900/30">
        <span className="text-xs font-bold text-red-600 text-red-400">
          {active ? t('groupControl.emergencyOn') : t('groupControl.emergencyOff')}
        </span>
        <ToggleSwitch checked={active} onChange={onToggle} color="bg-red-600" />
      </div>
    </div>
  );
  const FansEmergencyStop = ({ active, onToggle }) => (
      <div className="flex items-center gap-3 px-4 py-1.5 bg-red-50 bg-red-900/20 rounded-full border border-red-100 border-red-900/30">
        <span className="text-xs font-bold text-red-600 text-red-400">{active ? t('groupControl.emergencyOn') : t('groupControl.emergencyOff')}</span>
        <ToggleSwitch checked={active} onChange={onToggle} color="bg-red-600" />
      </div>
  );

  const ControlSection = ({ title, icon: Icon, headerRight = null, children }) => (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h3 className="flex items-center gap-2 text-lg font-bold text-slate-800">
          <Icon size={20} className="text-primary" />
          {title}
        </h3>
        {headerRight}
      </div>
      {children}
    </section>
  );

  const currentDeviceLabel =
    groupDetail?.devices?.[0]?.name ??
    groupDetail?.devices?.[0]?.deviceName ??
    groupDetail?.devices?.[0]?.id ??
    FALLBACK_VALUE;

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto pb-32">
      <div
        ref={toastRef}
        className={`fixed top-8 right-8 z-[100] hidden rounded-xl border px-4 py-3 text-sm font-bold shadow-lg ${
          toastType === 'success'
            ? 'border-emerald-200 bg-emerald-50 text-emerald-700 shadow-emerald-100'
            : 'border-red-200 bg-red-50 text-red-700 shadow-red-100'
        }`}
      >
        {toastMessage}
      </div>

      {pumpGuardDialog.open && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/40 px-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="pump-guard-title"
            className="w-full max-w-lg rounded-2xl border border-red-100 bg-white p-6 shadow-2xl shadow-slate-900/20"
          >
            <div className="space-y-3">
              <h2 id="pump-guard-title" className="text-xl font-extrabold text-slate-900">
                {t('groupControl.pumpFrequencyBlockedTitle')}
              </h2>
              <p className="text-sm font-medium leading-6 text-slate-600">
                {t('groupControl.pumpFrequencyBlockedMessage')}
              </p>
              <div className="max-h-56 overflow-y-auto rounded-xl border border-slate-100 bg-slate-50">
                {pumpGuardDialog.devices.map((device) => (
                  <div
                    key={device.deviceIdentifier}
                    className="flex items-center justify-between gap-4 border-b border-slate-100 px-4 py-3 last:border-b-0"
                  >
                    <span className="text-sm font-bold text-slate-700">{device.deviceIdentifier}</span>
                    <span className="text-xs font-bold text-red-600">
                      {t('industrial.outletValveControl')}: {Number.isFinite(device.outletValveRatio) ? `${device.outletValveRatio}%` : FALLBACK_VALUE}
                      {' / '}
                      {t('industrial.mixingValveControl')}: {Number.isFinite(device.mixingValveRatio) ? `${device.mixingValveRatio}%` : FALLBACK_VALUE}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setPumpGuardDialog({ open: false, devices: [] })}
                className="rounded-xl bg-primary px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-primary/20 transition-all hover:bg-primary/90 active:scale-95"
              >
                {t('common.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-white border border-transparent hover:border-slate-200 rounded-lg transition-all text-slate-500"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-extrabold text-slate-900">{t('groupControl.title')}</h1>
              <span className="px-2 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider">
                {group?.name ?? group?.groupName}
              </span>
              <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                {currentDeviceLabel}
              </span>
            </div>
            <p className="text-sm text-slate-500">{t('groupControl.manageGroup', { name: group?.name ?? group?.groupName ?? '' })}</p>
          </div>
        </div>
      </div>

      <div className="p-8 space-y-10 max-w-6xl mx-auto w-full">
        {/* Outlet Valve Control */}

        <ControlSection
          title={t('industrial.outletValveControl')}
          icon={Droplets}

          headerRight={<EmergencyStop active={valveEmergency} onToggle={(checked) => handleToggleValue('pump_start', checked, setValveEmergency)} />}
        >
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <div className="flex flex-col gap-6">
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 text-primary rounded-lg">
                    <Zap size={18} />
                  </div>
                  <span className="font-bold text-slate-700">{t('groupControl.pidOn')}</span>
                </div>
                <Toggle checked={pidOn} onChange={(checked) => handleToggleValue('pid2_switch', checked, setPidOn)} />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-bold text-slate-500">{t('groupControl.targetTemperature')}</label>
                  <div className="flex items-center gap-3">

                  </div>
                </div>
                <div className="flex gap-3">
                  <input
                    ref={tempInputRef}
                    type="text"
                    defaultValue={tempDefaultValue}
                    onChange={() => {
                      isEditingTempRef.current = true;
                    }}
                    onKeyDown={(event) => handleEnterSubmit(event, handleSubmitTargetTemp)}
                    className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-3 font-medium text-slate-700 outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/5"
                  />
                  <button
                    onClick={handleSubmitTargetTemp}
                    className="px-8 py-3 bg-primary text-white hover:bg-primary/90 rounded-xl font-bold transition-all shadow-lg shadow-primary/20 active:scale-95"
                  >
                    {t('common.confirm')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </ControlSection>

        {/* Mixing Pump Control */}
        <ControlSection
          title={t('industrial.mixingPumpControl')}
          icon={Droplets}
        >
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-500">{t('industrial.targetFrequency')}</label>
                <p className="text-xs font-bold text-slate-400">
                  PV: {formatDisplayValue(toDisplay(holdingData?.circulating_pump_pv, MAX_FREQ_60))} Hz
                </p>
              </div>
              <div className="flex w-full gap-3 md:w-auto">
                <div className="relative flex-1 md:w-40">
                  <input
                    ref={pumpFrequencyInputRef}
                    type="text"
                    defaultValue={pumpFrequencyDefaultValue}
                    onChange={() => {
                      isEditingPumpFrequencyRef.current = true;
                    }}
                    onKeyDown={(event) => handleEnterSubmit(event, handleSubmitPumpFrequency)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 pr-10 text-sm font-bold text-slate-700 outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/5 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={isSubmittingPumpFrequency}
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">Hz</span>
                </div>
                <button
                  type="button"
                  onClick={handleSubmitPumpFrequency}
                  disabled={isSubmittingPumpFrequency}
                  className="px-8 py-3 bg-primary text-white hover:bg-primary/90 rounded-xl font-bold transition-all shadow-lg shadow-primary/20 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmittingPumpFrequency ? t('common.saving') : t('common.confirm')}
                </button>
              </div>
            </div>
          </div>
        </ControlSection>

        {/* Fan Matrix Control */}
        <ControlSection
            title={t('groupControl.fanMatrixControl')}
            icon={Wind}
            headerRight={<FansEmergencyStop active={fanEmergency} onToggle={(checked) => handleToggleValue('fan_power_start', checked, setFanEmergency)} />}
        >
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Status Card */}
              <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{t('groupControl.operationStatus')}</p>
                  <h4 className="font-bold text-slate-700">{t('groupControl.pidMonitoring')}</h4>
                </div>
                <Toggle checked={fanPidOn} onChange={(checked) => handleToggleValue('pid1_switch', checked, setFanPidOn)} />
              </div>



              {/* Target Pressure Card */}
              <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-3 hover:shadow-md transition-shadow">
                <div>
                  <h4 className="font-bold text-slate-700">{t('groupControl.targetPressure')}</h4>
                </div>
                <div className="flex gap-2">
                  <input
                    ref={targetPressureInputRef}
                    type="text"
                    placeholder={t('groupControl.enterValue')}
                    defaultValue={targetPressureDefaultValue}
                    onChange={() => {
                      isEditingTargetPressureRef.current = true;
                    }}
                    onKeyDown={(event) => handleEnterSubmit(event, handleSubmitTargetPressure)}
                    className="flex-1 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                  <button
                    onClick={handleSubmitTargetPressure}
                    className="p-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-all shadow-md shadow-primary/10 active:scale-90"
                  >
                    {t('common.confirm')}
                  </button>
                </div>
              </div>
            </div>

            {/* Global Control Panel */}
            <div className="bg-primary/5 rounded-3xl border border-primary/10 p-8 shadow-inner">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                <div className="flex items-center gap-5">
                  <div className="w-14 h-14 rounded-2xl bg-primary text-white flex items-center justify-center shadow-xl shadow-primary/30">
                    <Zap size={28} />
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-slate-800">{t('groupControl.enableAll')}</h4>
                    <p className="text-sm text-slate-500 font-medium">{t('groupControl.enableAllDescription')}</p>
                  </div>
                  <div className="ml-4">
                    {/*<Toggle checked={allOn} onChange={setAllOn} />*/}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-10">


                  <div className="flex flex-col gap-2">
                    <span className="text-[10px] font-black text-primary uppercase tracking-widest">{t('groupControl.controlOutput')}</span>
                    <div className="flex gap-3">
                      <div className="relative">
                        <input
                          ref={cvOutputInputRef}
                          type="text"
                          defaultValue={cvOutputDefaultValue}
                          onChange={() => {
                            isEditingCvOutputRef.current = true;
                          }}
                          onKeyDown={(event) => handleEnterSubmit(event, handleSubmitFanOutput)}
                          className="w-28 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/5"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">%</span>
                      </div>
                      <button
                        onClick={handleSubmitFanOutput}
                        className="px-6 py-2.5 bg-primary text-white rounded-xl hover:bg-primary/90 transition-all font-bold text-sm shadow-lg shadow-primary/10 active:scale-95"
                      >
                        {t('common.confirm')}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </ControlSection>
      </div>
    </div>
  );
};
