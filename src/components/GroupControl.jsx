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

const formatDisplayValue = (value) => {
  const formattedValue = formatApiNumber(value, FALLBACK_VALUE);

  if (formattedValue === FALLBACK_VALUE) {
    return FALLBACK_VALUE;
  }

  const numericValue = Number(formattedValue);
  return Number.isNaN(numericValue) ? FALLBACK_VALUE : numericValue.toFixed(1);
};

export const GroupControl = ({ group, onBack }) => {
  const { t } = useLanguage();
  const [pidOn, setPidOn] = useState(true);
  const [fanPidOn, setFanPidOn] = useState(true);
  const [allOn, setAllOn] = useState(false);
  const [groupDetail, setGroupDetail] = useState(null);
  const [holdingData, setHoldingData] = useState({});
  const [tempDefaultValue, setTempDefaultValue] = useState('');
  const [targetPressureDefaultValue, setTargetPressureDefaultValue] = useState('');
  const [cvOutputDefaultValue, setCvOutputDefaultValue] = useState('');
  const isEditingTempRef = useRef(false);
  const isEditingTargetPressureRef = useRef(false);
  const isEditingCvOutputRef = useRef(false);
  const tempInputRef = useRef(null);
  const targetPressureInputRef = useRef(null);
  const cvOutputInputRef = useRef(null);
  const toastRef = useRef(null);
  const toastTimeoutRef = useRef(null);
  const [valveEmergency, setValveEmergency] = useState(false);
  const [fanEmergency, setFanEmergency] = useState(false);

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

    const response = await fetch(`${API_HOST}/api/groups/${encodeURIComponent(groupId)}`, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return response.json();
  };

  const getGroupDeviceIdentifiers = (nextGroupDetail) => (
    (nextGroupDetail?.devices ?? [])
      .map((device) => device?.name ?? device?.deviceName ?? device?.id ?? device?.deviceId)
      .filter(Boolean)
  );

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

        const holdingResponse = await fetch(`${API_HOST}/api/modbus/holding/${encodeURIComponent(deviceIdentifier)}`, {
          method: 'GET',
        });

        if (!holdingResponse.ok) {
          throw new Error(`HTTP ${holdingResponse.status}`);
        }

        const nextHoldingData = await holdingResponse.json();

        if (!isActive) {
          return;
        }

        setHoldingData(nextHoldingData ?? {});
        if (!isEditingTempRef.current) {
          const nextTempValue = String(nextHoldingData?.outlet_target_temp_sv ?? '');
          setTempDefaultValue(nextTempValue);
          if (tempInputRef.current) {
            tempInputRef.current.value = nextTempValue;
          }
        }
        if (!isEditingTargetPressureRef.current) {
          const nextTargetPressureValue = String(nextHoldingData?.target_pressure_diff_sv ?? '');
          setTargetPressureDefaultValue(nextTargetPressureValue);
          if (targetPressureInputRef.current) {
            targetPressureInputRef.current.value = nextTargetPressureValue;
          }
        }
        if (!isEditingCvOutputRef.current) {
          const nextCvOutputValue = String(nextHoldingData?.cooling_fan1_sv ?? '');
          setCvOutputDefaultValue(nextCvOutputValue);
          if (cvOutputInputRef.current) {
            cvOutputInputRef.current.value = nextCvOutputValue;
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

    fetchGroupHoldingData();

    return () => {
      isActive = false;
    };
  }, [group?.id]);

  const buildSvPayload = (overrides = {}) => ({
    circulating_pump_sv: Number(holdingData?.circulating_pump_sv) || 0,
    cooling_fan1_sv: Number(holdingData?.cooling_fan1_sv) || 0,
    cooling_fan2_sv: Number(holdingData?.cooling_fan2_sv) || 0,
    cooling_fan3_sv: Number(holdingData?.cooling_fan3_sv) || 0,
    cooling_fan4_sv: Number(holdingData?.cooling_fan4_sv) || 0,
    cooling_fan5_sv: Number(holdingData?.cooling_fan5_sv) || 0,
    cooling_fan6_sv: Number(holdingData?.cooling_fan6_sv) || 0,
    cooling_fan7_sv: Number(holdingData?.cooling_fan7_sv) || 0,
    cooling_fan8_sv: Number(holdingData?.cooling_fan8_sv) || 0,
    cooling_fan9_sv: Number(holdingData?.cooling_fan9_sv) || 0,
    return_electric_valve_opening_sv: Number(holdingData?.return_electric_valve_opening_sv) || 0,
    group1_pid_p_sv: Number(holdingData?.group1_pid_p_sv) || 0,
    group1_pid_i_sv: Number(holdingData?.group1_pid_i_sv) || 0,
    group1_pid_d_sv: Number(holdingData?.group1_pid_d_sv) || 0,
    ...overrides,
  });

  const showSavedToast = () => {
    if (!toastRef.current) {
      return;
    }

    toastRef.current.classList.remove('hidden');

    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }

    toastTimeoutRef.current = setTimeout(() => {
      toastRef.current?.classList.add('hidden');
    }, 2000);
  };

  const submitToGroupDevices = async (payload) => {
    const nextGroupDetail = await fetchGroupDetail();
    const groupDeviceIdentifiers = getGroupDeviceIdentifiers(nextGroupDetail);

    if (!groupDeviceIdentifiers.length) {
      return;
    }

    await Promise.all(groupDeviceIdentifiers.map(async (deviceIdentifier) => {
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
      const response = await fetch(
        `${API_HOST}/api/modbus/control/${encodeURIComponent(deviceIdentifier)}/key/${encodeURIComponent(key)}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            value,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
    }));

    setGroupDetail(nextGroupDetail ?? null);
  };

  const handleSubmitTargetTemp = async () => {
    const nextValue = Number(tempInputRef.current?.value ?? '');
    const normalizedValue = Number.isNaN(nextValue) ? 0 : nextValue;

    try {
      await submitControlKeyToGroupDevices('outlet_target_temp_sv', normalizedValue);
      setTempDefaultValue(String(normalizedValue));
      isEditingTempRef.current = false;
      showSavedToast();
    } catch (error) {
      console.error('群組目標溫度設定失敗:', error);
    }
  };

  const handleSubmitTargetPressure = async () => {
    const nextValue = Number(targetPressureInputRef.current?.value ?? '');
    const normalizedValue = Number.isNaN(nextValue) ? 0 : nextValue;

    try {
      await submitControlKeyToGroupDevices('target_pressure_diff_sv', normalizedValue);
      setTargetPressureDefaultValue(String(normalizedValue));
      isEditingTargetPressureRef.current = false;
      showSavedToast();
    } catch (error) {
      console.error('群組壓差設定失敗:', error);
    }
  };

  const handleSubmitFanOutput = async () => {
    const nextValue = Number(cvOutputInputRef.current?.value ?? '');
    const normalizedValue = Number.isNaN(nextValue) ? 0 : nextValue;

    try {
      await submitToGroupDevices(buildSvPayload({
        cooling_fan1_sv: normalizedValue,
        cooling_fan2_sv: normalizedValue,
        cooling_fan3_sv: normalizedValue,
        cooling_fan4_sv: normalizedValue,
        cooling_fan5_sv: normalizedValue,
        cooling_fan6_sv: normalizedValue,
        cooling_fan7_sv: normalizedValue,
        cooling_fan8_sv: normalizedValue,
        cooling_fan9_sv: normalizedValue,
      }));
      setCvOutputDefaultValue(String(normalizedValue));
      isEditingCvOutputRef.current = false;
      showSavedToast();
    } catch (error) {
      console.error('群組風扇輸出設定失敗:', error);
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
              checked ? color : 'bg-slate-200 dark:bg-slate-700'
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
      <button className="px-4 py-2 bg-white/50 dark:bg-red-900/40 text-red-600 dark:text-red-400 hover:bg-white hover:text-red-700 hover:border-red-200 hover:shadow-sm active:scale-95 active:bg-red-100 active:shadow-none rounded-lg font-bold text-sm transition-all border border-red-100 dark:border-red-900/30">
        重設
      </button>
      <div className="flex items-center gap-3 px-4 py-1.5 bg-red-50 dark:bg-red-900/20 rounded-full border border-red-100 dark:border-red-900/30">
        <span className="text-xs font-bold text-red-600 dark:text-red-400">緊急關閉</span>
        <ToggleSwitch checked={active} onChange={onToggle} color="bg-red-600" />
      </div>
    </div>
  );
  const FansEmergencyStop = ({ active, onToggle }) => (
      <div className="flex items-center gap-3 px-4 py-1.5 bg-red-50 dark:bg-red-900/20 rounded-full border border-red-100 dark:border-red-900/30">
        <span className="text-xs font-bold text-red-600 dark:text-red-400">緊急關閉</span>
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
        className="fixed bottom-24 right-8 z-40 hidden rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700 shadow-lg shadow-emerald-100"
      >
        {t('groupControl.saved')}
      </div>

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

          headerRight={<EmergencyStop active={valveEmergency} onToggle={setValveEmergency} />}
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
                <Toggle checked={pidOn} onChange={setPidOn} />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-bold text-slate-500">{t('groupControl.targetTemperature')}</label>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-black text-primary uppercase tracking-widest">{t('groupControl.currentTemperaturePv')}</span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-black text-slate-900">{formatDisplayValue(holdingData?.outlet_target_temp_pv)}</span>
                      <span className="text-xs font-bold text-slate-400">°C</span>
                    </div>
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

        {/* Fan Matrix Control */}
        <ControlSection
            title={t('groupControl.fanMatrixControl')}
            icon={Wind}
            headerRight={<FansEmergencyStop active={fanEmergency} onToggle={setFanEmergency} />}
        >
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Status Card */}
              <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{t('groupControl.operationStatus')}</p>
                  <h4 className="font-bold text-slate-700">{t('groupControl.pidMonitoring')}</h4>
                </div>
                <Toggle checked={fanPidOn} onChange={setFanPidOn} />
              </div>

              {/* Pressure Card */}
              <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
                <div>
                  <h3 className="font-bold text-slate-700">{t('groupControl.pressure')}</h3>
                </div>
                <div className="text-right">
                  <span className="text-3xl font-black text-primary">{formatDisplayValue(holdingData?.target_pressure_diff_pv)}</span>
                  <span className="text-xs font-bold text-slate-400 ml-1">PA</span>
                </div>
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
                    <Toggle checked={allOn} onChange={setAllOn} />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-10">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">{t('groupControl.realtimeSpeed')}</span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-black text-slate-900">{formatDisplayValue(holdingData?.cooling_fan1_pv)}</span>
                      <span className="text-sm font-bold text-slate-400">RPM</span>
                    </div>
                  </div>

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
                          className="w-28 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/5"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">RPM</span>
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
