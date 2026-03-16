/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
    Factory,
    LayoutDashboard,
    Boxes,
    Bell,
    BarChart3,
    Settings,
    User,
    Download,
    Calendar,
    Search,
    Eye,
    ChevronLeft,
    ChevronRight,
    AlertCircle,
    AlertTriangle,
    ClipboardCheck
} from 'lucide-react';
import { motion } from 'motion/react';
import { useLanguage } from '../contexts/LanguageContext';

const alarmData = [
    {
        id: '1',
        timestamp: '2023-10-27 14:32:01',
        deviceId: 'DEV-AX-001',
        description: '引擎溫度嚴重過熱',
        severity: 'CRITICAL',
    },
    {
        id: '2',
        timestamp: '2023-10-27 13:15:44',
        deviceId: 'DEV-AX-004',
        description: '通訊連線間歇不穩',
        severity: 'WARNING',
    },
    {
        id: '3',
        timestamp: '2023-10-27 12:05:10',
        deviceId: 'DEV-BT-092',
        description: '電池電量過低（低於 15%）',
        severity: 'INFO',
    },
    {
        id: '4',
        timestamp: '2023-10-27 10:45:22',
        deviceId: 'DEV-AX-001',
        description: '感測器需要重新校正',
        severity: 'INFO',
    },
    {
        id: '5',
        timestamp: '2023-10-27 09:12:33',
        deviceId: 'DEV-GZ-552',
        description: '緊急停止按鈕已觸發',
        severity: 'CRITICAL',
    },
];

export default function Alarm() {
    const [activeTab, setActiveTab] = useState('警報');

    return (
        <div className="flex h-screen overflow-hidden bg-background-light font-display text-slate-900">

            {/* Main Content */}
            <main className="flex-1 flex flex-col overflow-hidden">
                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-8 space-y-6">
                    {/* Filter Section */}
                    <motion.section
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm"
                    >
                        <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-4 items-end">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">開始日期/時間</label>
                                <div className="relative">
                                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 size-4" />
                                    <input
                                        type="text"
                                        placeholder="mm/dd/yyyy, --:--"
                                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border-none rounded-lg text-sm focus:ring-2 focus:ring-primary/50 placeholder:text-slate-300"
                                    />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">結束日期/時間</label>
                                <div className="relative">
                                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 size-4" />
                                    <input
                                        type="text"
                                        placeholder="mm/dd/yyyy, --:--"
                                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border-none rounded-lg text-sm focus:ring-2 focus:ring-primary/50 placeholder:text-slate-300"
                                    />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">設備 ID 搜尋</label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 size-4" />
                                    <input
                                        type="text"
                                        placeholder="例如：SN-9921"
                                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border-none rounded-lg text-sm focus:ring-2 focus:ring-primary/50"
                                    />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">嚴重程度</label>
                                <select className="w-full px-4 py-2 bg-slate-50 border-none rounded-lg text-sm focus:ring-2 focus:ring-primary/50 appearance-none">
                                    <option>全部等級</option>
                                    <option>嚴重</option>
                                    <option>警告</option>
                                    <option>資訊</option>
                                </select>
                            </div>
                            <button className="w-full py-2 bg-slate-900 text-white text-sm font-bold rounded-lg hover:bg-slate-800 transition-colors">
                                套用篩選
                            </button>
                        </div>
                    </motion.section>

                    {/* Table Section */}
                    <motion.section
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
                    >
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                <tr className="bg-slate-50/50 border-b border-slate-200">
                                    <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">時間戳記</th>
                                    <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">設備 ID</th>
                                    <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">異常說明</th>
                                    <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">嚴重程度</th>
                                    <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-right">操作</th>
                                </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                {alarmData.map((alarm) => (
                                    <tr key={alarm.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-6 py-4 text-sm font-medium text-slate-600">{alarm.timestamp}</td>
                                        <td className="px-6 py-4 text-sm font-bold text-primary">{alarm.deviceId}</td>
                                        <td className="px-6 py-4 text-sm text-slate-600">{alarm.description}</td>
                                        <td className="px-6 py-4">
                                            <SeverityBadge severity={alarm.severity} />
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button className="p-1.5 text-slate-400 hover:bg-primary/10 hover:text-primary rounded-md transition-colors">
                                                <Eye className="size-5" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-200 flex items-center justify-between">
                            <p className="text-xs text-slate-500 font-medium">顯示第 1 到 5 筆，共 124 筆結果</p>
                            <div className="flex items-center gap-1">
                                <button className="size-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-white transition-colors">
                                    <ChevronLeft className="size-4" />
                                </button>
                                <button className="size-8 flex items-center justify-center rounded-lg bg-primary text-white text-xs font-bold shadow-sm shadow-primary/20">1</button>
                                <button className="size-8 flex items-center justify-center rounded-lg border border-slate-200 text-xs font-bold hover:bg-white transition-colors">2</button>
                                <button className="size-8 flex items-center justify-center rounded-lg border border-slate-200 text-xs font-bold hover:bg-white transition-colors">3</button>
                                <span className="px-2 text-slate-400 text-xs font-bold">...</span>
                                <button className="size-8 flex items-center justify-center rounded-lg border border-slate-200 text-xs font-bold hover:bg-white transition-colors">25</button>
                                <button className="size-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-white transition-colors">
                                    <ChevronRight className="size-4" />
                                </button>
                            </div>
                        </div>
                    </motion.section>

                    {/* Summary Cards */}
                    <motion.section
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="grid grid-cols-1 md:grid-cols-3 gap-6"
                    >
                        <SummaryCard
                            icon={<AlertCircle className="size-6" />}
                            label="目前嚴重警報"
                            value="08"
                            color="red"
                        />
                        <SummaryCard
                            icon={<AlertTriangle className="size-6" />}
                            label="待處理警告"
                            value="14"
                            color="amber"
                        />
                        <SummaryCard
                            icon={<ClipboardCheck className="size-6" />}
                            label="今日已確認"
                            value="102"
                            color="blue"
                        />
                    </motion.section>
                </div>
            </main>
        </div>
    );
}

function SidebarLink({ icon, label, active, onClick }) {
    return (
        <button
            onClick={onClick}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                active
                    ? 'bg-primary text-white shadow-md shadow-primary/20'
                    : 'text-slate-600 hover:bg-primary/5 hover:text-primary'
            }`}
        >
            {icon}
            <span className="text-sm font-bold">{label}</span>
        </button>
    );
}

function SeverityBadge({ severity }) {
    const styles = {
        CRITICAL: 'bg-red-50 text-red-700 border-red-100',
        WARNING: 'bg-amber-50 text-amber-700 border-amber-100',
        INFO: 'bg-blue-50 text-blue-700 border-blue-100',
    };
    const labels = {
        CRITICAL: '嚴重',
        WARNING: '警告',
        INFO: '資訊',
    };

    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-[10px] font-bold border ${styles[severity]}`}>
      {labels[severity] ?? severity}
    </span>
    );
}

function SummaryCard({ icon, label, value, color }) {
    const colorStyles = {
        red: 'bg-red-50 text-red-600 border-red-100',
        amber: 'bg-amber-50 text-amber-600 border-amber-100',
        blue: 'bg-blue-50 text-primary border-blue-100',
    };

    return (
        <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center gap-5">
            <div className={`size-14 rounded-2xl flex items-center justify-center border ${colorStyles[color]}`}>
                {icon}
            </div>
            <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
                <p className="text-3xl font-bold text-slate-900 mt-0.5">{value}</p>
            </div>
        </div>
    );
}
