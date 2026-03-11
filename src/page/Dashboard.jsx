/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  LayoutDashboard,
  Users,
  ListTodo,
  LogOut,
  Factory,
  Plus,
  Search,
  Bell,
  X,
  AlertCircle,
  Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// --- Mock Data ---

const INITIAL_DEVICES = [
  { id: '1', group: '主幫浦站', status: 'online', temp: '45.2°C', flow: '12.5 公升/秒', press: '42 PSI' },
  { id: '2', group: '次級閥門', status: 'offline', temp: '--', flow: '--', press: '--' },
  { id: '3', group: '主馬達機組', status: 'warning', temp: '82.1°C', flow: '8.1 公升/秒', press: '31 PSI' },
  { id: '4', group: '冷卻陣列', status: 'online', temp: '22.8°C', flow: '4.2 公升/秒', press: '18 PSI' },

];

const ALERTS = [
  { id: 1, type: 'critical', title: '嚴重警報：設備 1', message: '偵測到零流量，需要立即檢查。', time: '2 分鐘前' },
  { id: 2, type: 'warning', title: '溫度警告：設備 103', message: '馬達溫度超過門檻值（82°C）。', time: '12 分鐘前' },
  { id: 3, type: 'info', title: '連線中斷：設備 102', message: '機組已離線，正在嘗試自動重新連線...', time: '45 分鐘前' },
  { id: 4, type: 'success', title: '維護完成', message: '設備 098 韌體更新並驗證完成。', time: '1 小時前' },

];

// --- Components ---
const StatusBadge = ({ status }) => {
  const styles = {
    online: 'bg-emerald-100 text-emerald-700',
    offline: 'bg-slate-100 text-slate-500',
    warning: 'bg-amber-100 text-amber-700',
    critical: 'bg-rose-100 text-rose-700',
  };
  const labels = {
    online: '運行中',
    offline: '離線',
    warning: '警告',
    critical: '嚴重',
  };
  return (
      <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${styles[status]}`}>
      {labels[status] ?? status}
    </span>
  );
};

const DeviceCard = ({ device, onSelect }) => {
  const isWarning = device.status === 'warning';
  const isCritical = device.status === 'critical';
  const isOffline = device.status === 'offline';

  return (
      <button
        type="button"
        onClick={() => onSelect(device)}
        className="bg-white p-5 rounded-xl border border-slate-200 flex flex-col gap-4 hover:shadow-md hover:border-primary/40 transition-all text-left cursor-pointer"
      >
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-bold text-lg">設備 {device.id}</h3>
            <p className="text-[10px] text-slate-500 uppercase font-semibold tracking-wider">群組：{device.group}</p>
          </div>
          <StatusBadge status={device.status} />
        </div>

        <div className={`grid grid-cols-3 gap-2 ${isOffline ? 'opacity-50' : ''}`}>
          <div className={`p-2 rounded-lg ${isWarning ? 'bg-amber-50 border border-amber-100' : 'bg-slate-50'}`}>
            <p className={`text-[10px] font-medium ${isWarning ? 'text-amber-600' : 'text-slate-500'}`}>溫度</p>
            <p className={`text-sm font-bold ${isWarning ? 'text-amber-700' : 'text-slate-900'}`}>{device.temp}</p>
          </div>
          <div className={`p-2 rounded-lg ${isCritical ? 'bg-rose-50 border border-rose-100' : 'bg-slate-50'}`}>
            <p className={`text-[10px] font-medium ${isCritical ? 'text-rose-600' : 'text-slate-500'}`}>流量</p>
            <p className={`text-sm font-bold ${isCritical ? 'text-rose-700' : 'text-slate-900'}`}>{device.flow}</p>
          </div>
          <div className="p-2 bg-slate-50 rounded-lg">
            <p className="text-[10px] text-slate-500 font-medium">壓力</p>
            <p className="text-sm font-bold text-slate-900">{device.press}</p>
          </div>
        </div>
      </button>
  );
};

export const Dashboard = ({ onSelectDevice }) => {
  const [showNotification, setShowNotification] = useState(true);

  return (
      <div className="flex h-screen bg-[#f8fafc] text-slate-900 font-sans overflow-hidden">


        {/* Main Content */}
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <div className="flex-1 flex overflow-hidden">
            {/* Scrollable Area */}
            <div className="flex-1 overflow-y-auto p-8">
              {/* Filters */}
              <div className="flex flex-wrap items-center gap-3 mb-8">
                <button className="px-4 py-1.5 rounded-full bg-blue-600 text-white text-xs font-bold">全部機組（124）</button>
                <button className="px-4 py-1.5 rounded-full bg-white text-slate-600 border border-slate-200 text-xs font-medium flex items-center gap-2 hover:border-slate-300">
                  運行中 <span className="size-2 bg-emerald-500 rounded-full"></span>
                </button>
                <button className="px-4 py-1.5 rounded-full bg-white text-slate-600 border border-slate-200 text-xs font-medium flex items-center gap-2 hover:border-slate-300">
                  警告 <span className="size-2 bg-amber-500 rounded-full"></span>
                </button>
                <button className="px-4 py-1.5 rounded-full bg-white text-slate-600 border border-slate-200 text-xs font-medium flex items-center gap-2 hover:border-slate-300">
                  嚴重 <span className="size-2 bg-rose-500 rounded-full"></span>
                </button>
              </div>

              {/* Device Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                {INITIAL_DEVICES.map(device => (
                    <DeviceCard key={device.id} device={device} onSelect={onSelectDevice} />
                ))}

              </div>
            </div>
          </div>
        </main>

        {/* Floating Notification */}
        <AnimatePresence>
          {showNotification && (
              <motion.div
                  initial={{ opacity: 0, y: 50, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="fixed bottom-6 right-6 z-50 w-80 bg-rose-50 border-l-4 border-rose-500 p-4 rounded-lg shadow-2xl"
              >
                <div className="flex justify-between items-start mb-1">
                  <div className="flex items-center gap-2">
                    <AlertCircle size={14} className="text-rose-600" />
                    <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest">嚴重錯誤：</p>
                  </div>
                  <button
                      onClick={() => setShowNotification(false)}
                      className="text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>
                <p className="text-xs font-bold text-slate-800">設備 1：偵測到零流量</p>
                <p className="text-[10px] text-slate-500 mt-1">需要立即檢查，以避免設備損壞。</p>
              </motion.div>
          )}
        </AnimatePresence>
      </div>
  );
};
