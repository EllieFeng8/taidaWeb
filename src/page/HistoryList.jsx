import React from 'react';
import {
    Filter,
    Calendar,
    Search,
    ChevronLeft,
    ChevronRight,
    Database,
    Activity,
    Timer,
    TrendingUp,
    BarChart3
} from 'lucide-react';
import { motion } from 'motion/react';

const SidebarItem = ({ icon: Icon, label, active = false }) => (
    <a
        href="#"
        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
            active
                ? 'bg-primary/10 text-primary'
                : 'text-slate-600 hover:bg-primary/10 hover:text-primary'
        }`}
    >
        <Icon size={20} />
        <span className="text-sm font-medium">{label}</span>
    </a>
);

const StatCard = ({ title, value, change, icon: Icon, iconColor }) => (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-start justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">{title}</span>
            <div className={`p-2 rounded-lg ${iconColor}`}>
                <Icon size={18} />
            </div>
        </div>
        <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold">{value}</span>
            {change && (
                <span className="text-emerald-500 text-xs font-bold flex items-center">
          <TrendingUp size={14} className="mr-1" /> {change}
        </span>
            )}
        </div>
    </div>
);

export default function HistoryList() {
    const tableData = [
        { time: '2023-11-20 14:30:05', deviceid:'Device_1', metric: '入水溫度', value: '25.4 °C' },
        { time: '2023-11-20 14:28:12', deviceid:'Device_1', metric: '輸出壓力', value: '1.24 MPa' },
        { time: '2023-11-20 14:25:55', deviceid:'Device_1', metric: '馬達轉速', value: '1,450 rpm'},
        { time: '2023-11-20 14:22:30', deviceid:'Device_1', metric: '環境濕度', value: '45.2 %' },
        { time: '2023-11-20 14:18:10', deviceid:'Device_1', metric: '入水溫度', value: '28.9 °C' },
    ];

    return (
        <div className="flex min-h-screen font-sans">
            {/* Main Content */}
            <main className="flex-1 flex flex-col min-w-0">

                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-8 space-y-6 max-w-[1400px] mx-auto w-full"
                >
                    {/* Filters */}
                    <section className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                        <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                            <Filter size={18} className="text-primary" />
                            篩選條件
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">開始日期時間</label>
                                <div className="relative">
                                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                    <input className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all" placeholder="YYYY-MM-DD HH:mm" type="text" />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">結束日期時間</label>
                                <div className="relative">
                                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                    <input className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all" placeholder="YYYY-MM-DD HH:mm" type="text" />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">設備編號</label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                    <input className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all" placeholder="輸入設備 ID" type="text" />
                                </div>
                            </div>

                        </div>
                    </section>

                    {/* Table */}
                    <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                <tr className="bg-slate-50 text-slate-500 uppercase text-[11px] font-bold tracking-widest border-b border-slate-200">
                                    <th className="px-6 py-4">時間</th>
                                    <th className="px-6 py-4">Devise ID</th>

                                    <th className="px-6 py-4">sensor</th>
                                    <th className="px-6 py-4">數值</th>

                                </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-sm">
                                {tableData.map((row, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap text-slate-600">{row.time}</td>
                                        <td className="px-6 py-4">{row.deviceid}</td>
                                        <td className="px-6 py-4">{row.metric}</td>
                                        <td className="px-6 py-4 font-mono font-semibold">{row.value}</td>

                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        <div className="p-4 border-t border-slate-200 flex items-center justify-between">
                            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Showing 1 to 5 of 2,840 results</p>
                            <div className="flex items-center gap-2">
                                <button className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50 transition-colors">
                                    <ChevronLeft size={18} />
                                </button>
                                <div className="flex items-center gap-1">
                                    <button className="w-8 h-8 rounded-lg bg-primary text-white text-xs font-bold">1</button>
                                    <button className="w-8 h-8 rounded-lg hover:bg-slate-100 text-xs font-bold transition-colors">2</button>
                                    <button className="w-8 h-8 rounded-lg hover:bg-slate-100 text-xs font-bold transition-colors">3</button>
                                    <span className="px-2 text-slate-400">...</span>
                                    <button className="w-8 h-8 rounded-lg hover:bg-slate-100 text-xs font-bold transition-colors">568</button>
                                </div>
                                <button className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors">
                                    <ChevronRight size={18} />
                                </button>
                            </div>
                        </div>
                    </section>


                </motion.div>

                <footer className="mt-auto py-6 px-8 text-center">
                    <p className="text-xs text-slate-400">© 2023 Industrial Intelligence System. All data streams monitored.</p>
                </footer>
            </main>
        </div>
    );
}
