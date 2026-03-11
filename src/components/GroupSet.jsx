/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
    ArrowLeft,
    Check,
    Save
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { motion } from 'motion/react';

const INITIAL_DEVICES = [
    { id: 'PLC-001', selected: true },
    { id: 'SENS-082', selected: true },
    { id: 'MTR-045', selected: false },
    { id: 'PLC-002', selected: true },
    { id: 'SENS-091', selected: false },
];

export default function GroupSet({ group, onBack }) {
    const [devices, setDevices] = useState(INITIAL_DEVICES);
    const [showSavedToast, setShowSavedToast] = useState(false);

    const toggleDevice = (id) => {
        setDevices(prev => prev.map(d => d.id === id ? { ...d, selected: !d.selected } : d));
    };

    useEffect(() => {
        if (!showSavedToast) {
            return undefined;
        }

        const backTimer = setTimeout(() => {
            onBack();
        }, 1000);

        return () => clearTimeout(backTimer);
    }, [onBack, showSavedToast]);

    const handleSave = () => {
        setShowSavedToast(true);
    };

    return (
        <div className="flex h-screen overflow-hidden font-sans">
            {showSavedToast && (
                <div className="fixed bottom-24 right-8 z-40 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700 shadow-lg shadow-emerald-100">
                    儲存成功
                </div>
            )}


            {/* 主要內容區 */}
            <main className="flex-1 flex flex-col overflow-hidden bg-background-light">

                {/* 可捲動內容 */}
                <div className="flex-1 overflow-y-auto p-10">
                    <div className="max-w-4xl mx-auto space-y-8">
                        {/* 標題區塊 */}
                        <div className="space-y-3">
                            <div className="flex items-center gap-4">
                                <button
                                    type="button"
                                    onClick={onBack}
                                    className="p-2 hover:bg-white border border-transparent hover:border-slate-200 rounded-lg transition-all text-slate-500"
                                >
                                    <ArrowLeft size={20} />
                                </button>
                                <div>
                                    <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">群組設備管理</h1>
                                    <p className="text-sm text-primary font-bold mt-1">{group?.name ?? '群組'}</p>
                                </div>
                            </div>
                            <p className="text-slate-500 leading-relaxed max-w-2xl">
                                選擇應在此特定集群中共同監控的設備。您可以選擇 PLC、傳感器或馬達進行邏輯分組。
                            </p>
                        </div>

                        {/* 設備列表 */}
                        <motion.section
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm"
                        >
                            <div className="p-6 border-b border-slate-100">
                                <h3 className="text-lg font-bold text-slate-800">可用設備</h3>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                    <tr className="bg-slate-50/50">
                                        <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 w-24 text-center">選擇</th>
                                        <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">設備 ID</th>
                                    </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                    {devices.map((device) => (
                                        <tr key={device.id} className="hover:bg-slate-50/50 transition-colors group">
                                            <td className="px-6 py-5 text-center">
                                                <button
                                                    onClick={() => toggleDevice(device.id)}
                                                    className={`mx-auto w-6 h-6 rounded-lg border flex items-center justify-center transition-all ${
                                                        device.selected
                                                            ? 'bg-primary border-primary text-white'
                                                            : 'border-slate-300 bg-white group-hover:border-primary'
                                                    }`}
                                                >
                                                    {device.selected && <Check size={16} strokeWidth={3} />}
                                                </button>
                                            </td>
                                            <td className="px-6 py-5 font-bold text-slate-700 text-lg">{device.id}</td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="px-6 py-4 bg-slate-50/30 border-t border-slate-100">
                                <p className="text-sm text-slate-400 font-medium">顯示 5 個設備中的 5 個</p>
                            </div>
                        </motion.section>
                    </div>
                </div>

                {/* 底部操作列 (Footer) */}
                <footer className="p-6 border-t border-slate-200 bg-white">
                    <div className="max-w-4xl mx-auto flex justify-end items-center gap-4">
                        <button onClick={onBack} className="px-6 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors">
                            取消
                        </button>
                        <button onClick={handleSave} className="px-8 py-2.5 rounded-xl bg-primary text-white text-sm font-bold shadow-lg shadow-blue-500/20 hover:bg-blue-600 transition-all flex items-center gap-2">
                            <Save size={18} />
                            儲存群組設定
                        </button>
                    </div>
                </footer>
            </main>
        </div>
    );
}

function SidebarItem({ icon, label, active = false }) {
    return (
        <a
            href="#"
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                active
                    ? 'bg-primary text-white shadow-md shadow-blue-500/20'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
            }`}
        >
            {icon}
            <span className="text-sm font-bold tracking-tight">{label}</span>
        </a>
    );
}
