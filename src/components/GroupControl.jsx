 import React, { useEffect, useState } from 'react';
import { 
  Power, 
  Activity, 
  Fan, 
  ArrowLeft, 
  RotateCcw,
  CheckCircle2,
  TriangleAlert
} from 'lucide-react';
import { motion } from 'motion/react';
import { useLanguage } from '../contexts/LanguageContext';

export const GroupControl = ({ group, onBack }) => {
  const { t } = useLanguage();
  const [masterPower, setMasterPower] = useState(true);
  const [samplingFreq, setSamplingFreq] = useState(100);
  const [showSavedToast, setShowSavedToast] = useState(false);
  
  const [fans, setFans] = useState(() => 
    Array.from({ length: 9 }, (_, i) => ({
      // id: `F1-0${i + 1}`,
      speed: i === 2 ? 0 : 2100 + (Math.floor(Math.random() * 500)),
      active: i !== 2 && i !== 4,
      fault: i === 4
    }))
  );

  const toggleFan = (id) => {
    setFans(prev => prev.map(f => f.id === id ? { ...f, active: !f.active } : f));
  };

  useEffect(() => {
    if (!showSavedToast) {
      return undefined;
    }

    const timeoutId = setTimeout(() => {
      setShowSavedToast(false);
    }, 2000);

    return () => clearTimeout(timeoutId);
  }, [showSavedToast]);

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto pb-32">
      {showSavedToast && (
        <div className="fixed bottom-24 right-8 z-40 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700 shadow-lg shadow-emerald-100">
          {t('groupControl.saved')}
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
                {group.name}
              </span>
            </div>
            <p className="text-sm text-slate-500">{t('groupControl.manageGroup', { name: group.name })}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('groupControl.systemStatus')}</div>
            <div className="text-sm font-bold text-green-500 flex items-center justify-end gap-1.5">
              <span className="size-2 rounded-full bg-green-500 animate-pulse"></span>
              {t('groupControl.running')}
            </div>
          </div>
        </div>
      </div>

      {/* Global Controls */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Master Switch */}
        <motion.div 
          whileHover={{ y: -2 }}
          className="bg-white p-6 rounded-2xl border border-slate-200 flex items-center justify-between shadow-sm"
        >
          <div className="flex items-center gap-4">
            <div className={`size-12 rounded-2xl flex items-center justify-center transition-colors ${masterPower ? 'bg-primary/10 text-primary' : 'bg-slate-100 text-slate-400'}`}>
              <Power size={24} />
            </div>
            <div>
              <p className="font-bold text-slate-900">{t('groupControl.masterPowerTitle')}</p>
              <p className="text-xs text-slate-500">{t('groupControl.masterPowerDescription')}</p>
            </div>
          </div>
          <button 
            onClick={() => setMasterPower(!masterPower)}
            className={`relative w-14 h-7 rounded-full transition-colors duration-200 focus:outline-none ${masterPower ? 'bg-primary' : 'bg-slate-200'}`}
          >
            <div className={`absolute top-1 left-1 size-5 bg-white rounded-full transition-transform duration-200 shadow-sm ${masterPower ? 'translate-x-7' : 'translate-x-0'}`}></div>
          </button>
        </motion.div>

        {/* Sampling Frequency */}
        <motion.div 
          whileHover={{ y: -2 }}
          className="bg-white p-6 rounded-2xl border border-slate-200 flex items-center justify-between shadow-sm"
        >
          <div className="flex items-center gap-4">
            <div className="size-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
              <Activity size={24} />
            </div>
            <div>
              <p className="font-bold text-slate-900">{t('groupControl.samplingFrequency')}</p>
              <p className="text-xs text-slate-500">{t('groupControl.samplingFrequencyDescription')}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <input 
              className="w-24 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-right font-mono font-bold text-primary focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all" 
              type="number" 
              value={samplingFreq}
              onChange={(e) => setSamplingFreq(parseInt(e.target.value))}
            />
            <span className="text-xs font-bold text-slate-400">{t('groupControl.milliseconds')}</span>
          </div>
        </motion.div>
      </section>

      {/* Individual Fan Controls */}
      <section className="space-y-6">
        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <Fan className="text-primary" size={20} />
          {t('groupControl.individualFanControl')}
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {fans.map((fan, index) => (
            <motion.div 
              key={fan.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`bg-white p-6 rounded-2xl border transition-all shadow-sm ${fan.fault ? 'border-red-200 bg-red-50/10' : 'border-slate-200 hover:border-primary/30'}`}
            >
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-3">
                  <div className={`size-10 rounded-xl flex items-center justify-center ${(fan.active && masterPower) ? 'bg-primary/10 text-primary' : 'bg-slate-100 text-slate-400'}`}>
                    <Fan size={20} className={(fan.active && masterPower) ? 'animate-spin-slow' : ''} />
                  </div>
                  <div>
                    <span className="font-bold text-slate-900">{t('groupControl.fanName',
                        // { id: fan.id }
                    )}</span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {fan.fault ? (
                        <span className="text-[10px] font-bold text-red-500 flex items-center gap-1">
                          <TriangleAlert size={10} /> {t('groupControl.fault')}
                        </span>
                      ) : (fan.active && masterPower) ? (
                        <span className="text-[10px] font-bold text-green-500 flex items-center gap-1">
                          <CheckCircle2 size={10} /> {t('groupControl.operating')}
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-slate-400 uppercase">{t('groupControl.standby')}</span>
                      )}
                    </div>
                  </div>
                </div>
                
                <button 
                  disabled={fan.fault}
                  onClick={() => toggleFan(fan.id)}
                  className={`relative w-10 h-5 rounded-full transition-colors duration-200 focus:outline-none ${fan.fault ? 'bg-slate-100 opacity-50 cursor-not-allowed' : fan.active ? 'bg-primary' : 'bg-slate-200'}`}
                >
                  <div className={`absolute top-0.5 left-0.5 size-4 bg-white rounded-full transition-transform duration-200 shadow-sm ${fan.active ? 'translate-x-5' : 'translate-x-0'}`}></div>
                </button>
              </div>
              
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">{t('groupControl.setFanSpeed')}</label>
                <div className="flex items-center gap-3">
                  <input 
                    disabled={!fan.active || fan.fault}
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-lg py-2.5 px-4 font-mono font-bold text-slate-700 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all disabled:opacity-50" 
                    type="number" 
                    defaultValue={fan.speed}
                  />
                  <span className="text-xs font-bold text-slate-400">{t('groupControl.rpmUnit')}</span>
                </div>
              </div>

              {fan.fault && (
                <button className="w-full mt-4 py-2 bg-red-100 text-red-600 text-[10px] font-bold rounded-lg uppercase tracking-widest hover:bg-red-200 transition-colors">
                  {t('groupControl.manualResetRequired')}
                </button>
              )}
            </motion.div>
          ))}
        </div>
      </section>

      {/* Bottom Action Bar */}
      <div className="fixed bottom-0 left-64 right-0 bg-white/80 backdrop-blur-md border-t border-slate-200 p-6 flex justify-end gap-4 z-20">
        <button className="px-6 py-2.5 border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-all">
          {t('groupControl.discardChanges')}
        </button>
        <button
          onClick={() => setShowSavedToast(true)}
          className="px-10 py-2.5 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 flex items-center gap-2"
        >
          <RotateCcw size={18} />
          {t('groupControl.applyChanges')}
        </button>
      </div>
    </div>
  );
};
