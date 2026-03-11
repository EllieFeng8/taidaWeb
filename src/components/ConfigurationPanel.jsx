import React, { useEffect, useState } from 'react';
import { Edit3, Info, Search, CheckCircle2, AlertTriangle } from 'lucide-react';

export default function ConfigurationPanel({ onClose }) {
    const [showSavedToast, setShowSavedToast] = useState(false);

    const devices = [
        { id: 'PLC-CTRL-4401', brand: 'Siemens S7-1200', status: 'online', mac: '00:1A:2B', checked: true },
        { id: 'SEN-TMP-992', brand: 'Omron 熱電偶', status: 'online', mac: '00:3C:9D', checked: true },
        { id: 'MOT-DRV-022', brand: 'ABB 變頻器', status: 'warning', mac: '00:EF:11', checked: false },
    ];

    useEffect(() => {
        if (!showSavedToast) {
            return undefined;
        }

        const closeTimer = setTimeout(() => {
            onClose();
        }, 1000);

        return () => clearTimeout(closeTimer);
    }, [onClose, showSavedToast]);

    const handleSave = () => {
        setShowSavedToast(true);
    };

    return (
        <section className="relative bg-white border border-slate-200 rounded-xl p-8 shadow-sm">
            {showSavedToast && (
                <div className="absolute right-6 top-6 z-10 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700 shadow-lg shadow-emerald-100">
                    儲存成功
                </div>
            )}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
                <div>
                    <h3 className="text-xl font-bold flex items-center gap-2 text-slate-800">
                        <Edit3 className="text-primary" size={24} />
                        群組設定
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">修改「群組 1」的設定</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
                    >
                        取消
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-6 py-2 text-sm font-bold text-white bg-primary rounded-lg shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all hover:scale-[1.02] active:scale-[0.98]"
                    >
                        儲存變更
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                {/* Left Column: Basic Info */}
                <div className="space-y-6">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">群組名稱</label>
                        <input
                            className="w-full bg-slate-50 border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                            type="text"
                            defaultValue="群組 1"
                        />
                        <p className="text-[11px] text-slate-500 mt-2 italic">標準命名格式：單元-區段-類型</p>
                    </div>

                    <div className="p-4 rounded-xl bg-primary/5 border border-primary/10">
                        <h4 className="text-sm font-bold text-primary mb-2 flex items-center gap-2">
                            <Info size={16} />
                            設定提示
                        </h4>
                        <p className="text-xs text-slate-600 leading-relaxed">
                            群組可讓你同時對多個設備下達廣播指令。請確認群組內所有成員的硬體版本彼此相容。
                        </p>
                    </div>
                </div>

                {/* Right Column: Device Selection */}
                <div className="lg:col-span-2">
                    <label className="block text-sm font-bold text-slate-700 mb-4">設備選擇</label>
                    <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-white">
                        <div className="bg-slate-50 px-4 py-3 flex items-center justify-between border-b border-slate-200">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">可用設備</span>
                            <div className="relative">
                                <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                <input
                                    className="pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none w-48 transition-all"
                                    placeholder="搜尋 ID..."
                                    type="text"
                                />
                            </div>
                        </div>

                        <div className="max-h-[320px] overflow-y-auto divide-y divide-slate-100">
                            {devices.map((device) => (
                                <label
                                    key={device.id}
                                    className="flex items-center justify-between px-4 py-4 cursor-pointer hover:bg-primary/5 transition-colors group"
                                >
                                    <div className="flex items-center gap-4">
                                        <input
                                            defaultChecked={device.checked}
                                            className="size-4 rounded text-primary border-slate-300 focus:ring-primary transition-all cursor-pointer"
                                            type="checkbox"
                                        />
                                        <div>
                                            <p className="text-sm font-bold text-slate-800">{device.id}</p>
                                            <p className="text-[11px] text-slate-500 uppercase font-medium">{device.brand}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        {device.status === 'online' ? (
                                            <CheckCircle2 className="text-emerald-500" size={20} />
                                        ) : (
                                            <AlertTriangle className="text-amber-500" size={20} />
                                        )}
                                        <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-md uppercase tracking-tight">
                      MAC: {device.mac}
                    </span>
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between px-1">
                        <p className="text-xs text-slate-500 font-medium italic">目前顯示此群組可用設備 12 台中的 3 台。</p>
                        <button className="text-primary text-xs font-bold hover:underline transition-all">查看所有相容設備</button>
                    </div>
                </div>
            </div>
        </section>
    );
}
