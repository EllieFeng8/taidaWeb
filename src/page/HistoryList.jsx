import React, {useState, useEffect} from 'react';
import {
    Filter,
    Calendar,
    Search,
    ChevronLeft,
    ChevronRight,
    Database
} from 'lucide-react';
import {motion} from 'motion/react';

// 使用空字符串，讓請求通過 Vite proxy (vite.config.js 中的 /api -> http://127.0.0.1:8081)
const API_HOST = '';

export default function HistoryList() {
    // State management
    const [devices, setDevices] = useState([]);
    const [selectedDevice, setSelectedDevice] = useState('');
    const [sensorSettings, setSensorSettings] = useState({});
    const [fromDateTime, setFromDateTime] = useState('');
    const [toDateTime, setToDateTime] = useState('');
    const [tableData, setTableData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Pagination states
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(20);
    const [jumpToPage, setJumpToPage] = useState('');

    // Fetch devices list on mount
    useEffect(() => {
        fetchDevices();
    }, []);

    // Fetch sensor settings when device is selected
    useEffect(() => {
        if (selectedDevice) {
            fetchSensorSettings();
        }
    }, [selectedDevice]);

    // Fetch devices list from API
    const fetchDevices = async () => {
        try {
            const response = await fetch(`${API_HOST}/api/devices`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            setDevices(data || []);
            // Auto-select first device if available
            if (data && data.length > 0) {
                setSelectedDevice(data[0].name);
            }
        } catch (err) {
            console.error('Error fetching devices:', err);
            setError(`載入設備列表失敗: ${err.message}`);
        }
    };

    // Fetch sensor settings for selected device
    const fetchSensorSettings = async () => {
        if (!selectedDevice) return;

        try {
            const response = await fetch(`${API_HOST}/api/settings/sensors/${encodeURIComponent(selectedDevice)}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            // Convert array to object for easy lookup: { s1: "Sensor A temp", s2: "Sensor B press", ... }
            const settingsMap = {};
            if (Array.isArray(data)) {
                data.forEach(sensor => {
                    settingsMap[sensor.key] = sensor.name;
                });
            }
            setSensorSettings(settingsMap);
        } catch (err) {
            console.error('Error fetching sensor settings:', err);
        }
    };

    // Fetch data from API
    const fetchSensorData = async () => {
        if (!selectedDevice) {
            setError('請選擇設備');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            // Handle default dates
            let fromDt = fromDateTime;
            let toDt = toDateTime;

            // If fromDt is not selected, use 2025/01/01
            if (!fromDt) {
                fromDt = '2025-01-01T00:00:00';
            }

            // If toDt is not selected, use today's date (end of day)
            if (!toDt) {
                const today = new Date();
                today.setHours(23, 59, 59, 999);
                toDt = today.toISOString().slice(0, 19);
            }

            // Convert to ISO format
            const fromISO = new Date(fromDt).toISOString();
            const toISO = new Date(toDt).toISOString();

            // API #16: 根據設備名稱與日期時間查詢數據
            const url = `${API_HOST}/api/sensor/rangeDateTime/${encodeURIComponent(selectedDevice)}?from=${fromISO}&to=${toISO}`;

            console.log('Fetching from URL:', url);

            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('Received data:', data);

            // Calculate time range for filtering
            const fromTimestamp = new Date(fromISO).getTime() / 1000;
            const toTimestamp = new Date(toISO).getTime() / 1000;

            // Transform API data to table format
            const transformedData = [];
            
            if (Array.isArray(data)) {
                data.forEach(record => {
                    const timestamp = record.ts;
                    
                    // Filter: Only include records within the selected time range
                    if (timestamp >= fromTimestamp && timestamp <= toTimestamp) {
                        const time = new Date(timestamp * 1000).toLocaleString('zh-TW', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                            hour12: false
                        });

                        // Process all sensor keys (s1, s2, s3, ... s20)
                        Object.keys(record).forEach(key => {
                            if (key !== 'ts' && key.startsWith('s')) {
                                const sensorName = sensorSettings[key] || key;
                                transformedData.push({
                                    time: time,
                                    deviceid: selectedDevice,
                                    metric: sensorName,
                                    value: record[key],
                                    timestamp: timestamp
                                });
                            }
                        });
                    }
                });
            }
            
            console.log(`Filtered ${transformedData.length} records within time range: ${new Date(fromTimestamp * 1000).toLocaleString('zh-TW')} ~ ${new Date(toTimestamp * 1000).toLocaleString('zh-TW')}`);

            setTableData(transformedData);
            setCurrentPage(1); // Reset to first page

            if (transformedData.length === 0) {
                setError('查詢成功，但沒有找到符合條件的數據');
            }
        } catch (err) {
            setError(`載入數據失敗: ${err.message}`);
            console.error('Error fetching sensor data:', err);
        } finally {
            setLoading(false);
        }
    };

    // Calculate pagination
    const totalPages = Math.ceil(tableData.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentData = tableData.slice(startIndex, endIndex);

    // Pagination handlers
    const handlePreviousPage = () => {
        setCurrentPage(prev => Math.max(1, prev - 1));
    };

    const handleNextPage = () => {
        setCurrentPage(prev => Math.min(totalPages, prev + 1));
    };

    const handlePageJump = () => {
        const pageNum = parseInt(jumpToPage);
        if (pageNum >= 1 && pageNum <= totalPages) {
            setCurrentPage(pageNum);
            setJumpToPage('');
        }
    };

    const handleItemsPerPageChange = (e) => {
        setItemsPerPage(parseInt(e.target.value));
        setCurrentPage(1); // Reset to first page
    };

    return (
        <div className="flex min-h-screen font-sans">
            {/* Main Content */}
            <main className="flex-1 flex flex-col min-w-0">

                <motion.div
                    initial={{opacity: 0, y: 10}}
                    animate={{opacity: 1, y: 0}}
                    className="p-8 space-y-6 max-w-[1400px] mx-auto w-full"
                >
                    {/* Filters */}
                    <section className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                        <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                            <Filter size={18} className="text-primary"/>
                            篩選條件
                        </h3>
                        {error && (
                            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                                {error}
                            </div>
                        )}


                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">選擇設備</label>
                                <div className="relative">
                                    <Database className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
                                    <select
                                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all appearance-none cursor-pointer"
                                        value={selectedDevice}
                                        onChange={(e) => setSelectedDevice(e.target.value)}
                                    >
                                        <option value="">請選擇設備</option>
                                        {devices.map((device) => (
                                            <option key={device.id} value={device.name}>
                                                {device.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                    開始日期時間 <span className="text-slate-400 font-normal">(選填，預設: 2025/01/01)</span>
                                </label>
                                <div className="relative">
                                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
                                    <input
                                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                        type="datetime-local"
                                        value={fromDateTime}
                                        onChange={(e) => setFromDateTime(e.target.value)}
                                        placeholder="2025-01-01T00:00"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                    結束日期時間 <span className="text-slate-400 font-normal">(選填，預設: 今日)</span>
                                </label>
                                <div className="relative">
                                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
                                    <input
                                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                        type="datetime-local"
                                        value={toDateTime}
                                        onChange={(e) => setToDateTime(e.target.value)}
                                        placeholder="今日"
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="mt-6 flex justify-end">
                            <button
                                onClick={fetchSensorData}
                                disabled={loading}
                                className="px-6 py-2.5 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                            >
                                {loading ? (
                                    <>
                                        <div
                                            className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        查詢中...
                                    </>
                                ) : (
                                    <>
                                        <Search size={16}/>
                                        查詢數據
                                    </>
                                )}
                            </button>
                        </div>
                    </section>

                    {/* Table */}
                    <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        {tableData.length > 0 && (
                            <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
                                <div className="flex items-center gap-4">
                                    <span className="text-slate-600">
                                        <span className="font-semibold text-slate-700">設備：</span>
                                        {selectedDevice}
                                    </span>
                                    <span className="text-slate-400">|</span>
                                    <span className="text-slate-600">
                                        <span className="font-semibold text-slate-700">時間範圍：</span>
                                        {fromDateTime || '2025-01-01 00:00'} ~ {toDateTime || new Date().toISOString().slice(0, 16).replace('T', ' ')}
                                    </span>
                                </div>
                                <span className="text-slate-600">
                                    <span className="font-semibold text-primary">總計：</span>
                                    {tableData.length} 筆記錄
                                </span>
                            </div>
                        )}
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                <tr className="bg-slate-50 text-slate-500 uppercase text-[11px] font-bold tracking-widest border-b border-slate-200">
                                    <th className="px-6 py-4">時間</th>
                                    <th className="px-6 py-4">Device ID</th>
                                    <th className="px-6 py-4">Sensor</th>
                                    <th className="px-6 py-4">數值</th>
                                </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-sm">
                                {loading ? (
                                    <tr>
                                        <td colSpan="4" className="px-6 py-12 text-center text-slate-400">
                                            <div className="flex items-center justify-center gap-2">
                                                <div
                                                    className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                                                載入數據中...
                                            </div>
                                        </td>
                                    </tr>
                                ) : currentData.length === 0 ? (
                                    <tr>
                                        <td colSpan="4" className="px-6 py-12 text-center text-slate-400">
                                            <Database size={48} className="mx-auto mb-2 opacity-30"/>
                                            <p className="text-sm font-medium">無數據</p>
                                            <p className="text-xs mt-1">請設定篩選條件並查詢</p>
                                        </td>
                                    </tr>
                                ) : (
                                    currentData.map((row, idx) => (
                                        <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap text-slate-600">{row.time}</td>
                                            <td className="px-6 py-4">{row.deviceid}</td>
                                            <td className="px-6 py-4">{row.metric}</td>
                                            <td className="px-6 py-4 font-mono font-semibold">{row.value}</td>
                                        </tr>
                                    ))
                                )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        <div
                            className="p-4 border-t border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">
                                    顯示 {tableData.length > 0 ? startIndex + 1 : 0} 到 {Math.min(endIndex, tableData.length)} 筆，共 {tableData.length} 筆數據
                                </p>
                                <div className="flex items-center gap-2">
                                    <label className="text-xs text-slate-500 font-medium">每頁顯示:</label>
                                    <select
                                        value={itemsPerPage}
                                        onChange={handleItemsPerPageChange}
                                        className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                    >
                                        <option value={20}>20 筆</option>
                                        <option value={50}>50 筆</option>
                                        <option value={100}>100 筆</option>
                                    </select>
                                </div>
                            </div>

                            <div className="flex items-center gap-4">
                                {/* Page Jump Input */}
                                <div className="flex items-center gap-2">
                                    <label
                                        className="text-xs text-slate-500 font-medium whitespace-nowrap">跳至頁:</label>
                                    <input
                                        type="number"
                                        min="1"
                                        max={totalPages}
                                        value={jumpToPage}
                                        onChange={(e) => setJumpToPage(e.target.value)}
                                        onKeyPress={(e) => {
                                            if (e.key === 'Enter') {
                                                handlePageJump();
                                            }
                                        }}
                                        placeholder={currentPage.toString()}
                                        className="w-16 px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-center font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                    />
                                    <button
                                        onClick={handlePageJump}
                                        disabled={!jumpToPage || totalPages === 0}
                                        className="px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-semibold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                    >
                                        前往
                                    </button>
                                </div>

                                {/* Page Navigation */}
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={handlePreviousPage}
                                        disabled={currentPage === 1 || totalPages === 0}
                                        className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <ChevronLeft size={18}/>
                                    </button>

                                    <div className="flex items-center gap-1">
                                        {/* First Page */}
                                        {currentPage > 2 && (
                                            <>
                                                <button
                                                    onClick={() => setCurrentPage(1)}
                                                    className="w-8 h-8 rounded-lg hover:bg-slate-100 text-xs font-bold transition-colors"
                                                >
                                                    1
                                                </button>
                                                {currentPage > 3 && <span className="px-2 text-slate-400">...</span>}
                                            </>
                                        )}

                                        {/* Previous Page */}
                                        {currentPage > 1 && (
                                            <button
                                                onClick={() => setCurrentPage(currentPage - 1)}
                                                className="w-8 h-8 rounded-lg hover:bg-slate-100 text-xs font-bold transition-colors"
                                            >
                                                {currentPage - 1}
                                            </button>
                                        )}

                                        {/* Current Page */}
                                        {totalPages > 0 && (
                                            <button
                                                className="w-8 h-8 rounded-lg bg-primary text-white text-xs font-bold">
                                                {currentPage}
                                            </button>
                                        )}

                                        {/* Next Page */}
                                        {currentPage < totalPages && (
                                            <button
                                                onClick={() => setCurrentPage(currentPage + 1)}
                                                className="w-8 h-8 rounded-lg hover:bg-slate-100 text-xs font-bold transition-colors"
                                            >
                                                {currentPage + 1}
                                            </button>
                                        )}

                                        {/* Last Page */}
                                        {currentPage < totalPages - 1 && (
                                            <>
                                                {currentPage < totalPages - 2 &&
                                                    <span className="px-2 text-slate-400">...</span>}
                                                <button
                                                    onClick={() => setCurrentPage(totalPages)}
                                                    className="w-8 h-8 rounded-lg hover:bg-slate-100 text-xs font-bold transition-colors"
                                                >
                                                    {totalPages}
                                                </button>
                                            </>
                                        )}
                                    </div>

                                    <button
                                        onClick={handleNextPage}
                                        disabled={currentPage === totalPages || totalPages === 0}
                                        className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <ChevronRight size={18}/>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </section>


                </motion.div>

                <footer className="mt-auto py-6 px-8 text-center">
                    <p className="text-xs text-slate-400">© 2023 Industrial Intelligence System. All data streams
                        monitored.</p>
                </footer>
            </main>
        </div>
    );
}
