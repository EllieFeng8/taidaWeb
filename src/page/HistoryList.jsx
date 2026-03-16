import React, { useEffect, useState } from 'react';
import {
    Filter,
    Calendar,
    Search,
    ChevronLeft,
    ChevronRight,
    Database,
    Download
} from 'lucide-react';
import { motion } from 'motion/react';
import { useLanguage } from '../contexts/LanguageContext';
import { formatApiNumber } from '../utils/formatApiNumber';

// 使用空字符串，讓請求通過 Vite proxy (vite.config.js 中的 /api -> http://127.0.0.1:8081)
const API_HOST = '';
const SENSOR_KEYS = Array.from({ length: 20 }, (_, index) => `s${index + 1}`);

const padNumber = (value) => String(value).padStart(2, '0');

const formatDateTimeLocalInput = (date) => {
    const safeDate = date instanceof Date ? date : new Date(date);

    return `${safeDate.getFullYear()}-${padNumber(safeDate.getMonth() + 1)}-${padNumber(safeDate.getDate())}T${padNumber(safeDate.getHours())}:${padNumber(safeDate.getMinutes())}`;
};

const formatDateTimeLabel = (date) => {
    const safeDate = date instanceof Date ? date : new Date(date);

    return `${safeDate.getFullYear()}-${padNumber(safeDate.getMonth() + 1)}-${padNumber(safeDate.getDate())} ${padNumber(safeDate.getHours())}:${padNumber(safeDate.getMinutes())}:${padNumber(safeDate.getSeconds())}`;
};

const formatDateTimeFileNamePart = (date) => {
    const safeDate = date instanceof Date ? date : new Date(date);

    return `${safeDate.getFullYear()}-${padNumber(safeDate.getMonth() + 1)}-${padNumber(safeDate.getDate())}_${padNumber(safeDate.getHours())}-${padNumber(safeDate.getMinutes())}-${padNumber(safeDate.getSeconds())}`;
};

const getStartOfToday = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
};

const getEndOfToday = () => {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    return today;
};

const getEffectiveDateRange = (fromValue, toValue) => {
    const fromDate = fromValue ? new Date(fromValue) : getStartOfToday();
    const toDate = toValue ? new Date(toValue) : getEndOfToday();

    return {
        fromDate,
        toDate,
        fromIso: fromDate.toISOString(),
        toIso: toDate.toISOString(),
        fromLabel: formatDateTimeLabel(fromDate),
        toLabel: formatDateTimeLabel(toDate),
    };
};

const formatTableTime = (timestamp) => new Date(timestamp * 1000).toLocaleString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
});

const buildSensorColumns = (data) => {
    if (!Array.isArray(data)) {
        return SENSOR_KEYS.map((key) => ({ key, label: key }));
    }

    const orderedColumns = data
        .filter((sensor) => sensor?.key && SENSOR_KEYS.includes(sensor.key))
        .sort((left, right) => Number(left.key.slice(1)) - Number(right.key.slice(1)))
        .map((sensor) => ({
            key: sensor.key,
            label: sensor.name?.trim() || sensor.key,
        }));

    return orderedColumns.length > 0
        ? orderedColumns
        : SENSOR_KEYS.map((key) => ({ key, label: key }));
};

const escapeCsvValue = (value) => {
    const normalizedValue = value ?? '';
    const text = String(normalizedValue).replace(/"/gu, '""');

    return `"${text}"`;
};

export default function HistoryList() {
    const { t } = useLanguage();

    // State management
    const [devices, setDevices] = useState([]);
    const [selectedDevice, setSelectedDevice] = useState('');
    const [sensorColumns, setSensorColumns] = useState(() => SENSOR_KEYS.map((key) => ({ key, label: key })));
    const [fromDateTime, setFromDateTime] = useState(() => formatDateTimeLocalInput(getStartOfToday()));
    const [toDateTime, setToDateTime] = useState('');
    const [tableData, setTableData] = useState([]);
    const [appliedDevice, setAppliedDevice] = useState('');
    const [appliedDateRange, setAppliedDateRange] = useState(() => getEffectiveDateRange(formatDateTimeLocalInput(getStartOfToday()), ''));
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

    // Fetch devices list from API
    const fetchDevices = async () => {
        try {
            const response = await fetch(`${API_HOST}/api/devices`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            const deviceList = Array.isArray(data) ? data : [];
            setDevices(deviceList);

            if (deviceList.length > 0) {
                const preferredDevice = deviceList.find((device) => device?.name === 'Device 1') ?? deviceList[0];
                const preferredDeviceName = preferredDevice?.name ?? '';

                setSelectedDevice(preferredDeviceName);

                if (preferredDeviceName) {
                    await handleQuery(preferredDeviceName, fromDateTime, '');
                }
            }
        } catch (err) {
            console.error('Error fetching devices:', err);
            setError(`載入設備列表失敗: ${err.message}`);
        }
    };

    // Fetch sensor settings for selected device
    const fetchSensorSettings = async (deviceName) => {
        if (!deviceName) {
            const fallbackColumns = SENSOR_KEYS.map((key) => ({ key, label: key }));
            setSensorColumns(fallbackColumns);
            return fallbackColumns;
        }

        try {
            const response = await fetch(`${API_HOST}/api/settings/sensors/${encodeURIComponent(deviceName)}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            const columns = buildSensorColumns(data);
            setSensorColumns(columns);
            return columns;
        } catch (err) {
            console.error('Error fetching sensor settings:', err);
            const fallbackColumns = SENSOR_KEYS.map((key) => ({ key, label: key }));
            setSensorColumns(fallbackColumns);
            return fallbackColumns;
        }
    };

    // Fetch data from API
    const fetchSensorData = async (deviceName, columns, fromValue, toValue) => {
        if (!deviceName) {
            setError('請選擇設備');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const { fromIso, toIso, fromDate, toDate } = getEffectiveDateRange(fromValue, toValue);

            // API #16: 根據設備名稱與日期時間查詢數據
            const url = `${API_HOST}/api/sensor/rangeDateTime/${encodeURIComponent(deviceName)}?from=${encodeURIComponent(fromIso)}&to=${encodeURIComponent(toIso)}`;

            console.log('Fetching from URL:', url);

            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('Received data:', data);

            // Calculate time range for filtering
            const fromTimestamp = fromDate.getTime() / 1000;
            const toTimestamp = toDate.getTime() / 1000;

            const normalizedColumns = Array.isArray(columns) && columns.length > 0
                ? columns
                : SENSOR_KEYS.map((key) => ({ key, label: key }));

            const transformedData = Array.isArray(data)
                ? data
                    .filter((record) => {
                        const timestamp = Number(record?.ts);
                        return Number.isFinite(timestamp) && timestamp >= fromTimestamp && timestamp <= toTimestamp;
                    })
                    .map((record, index) => {
                        const timestamp = Number(record.ts);
                        const row = {
                            id: `${deviceName}-${timestamp}-${index}`,
                            time: formatTableTime(timestamp),
                            deviceid: deviceName,
                            timestamp,
                        };

                        normalizedColumns.forEach((column) => {
                            row[column.key] = record?.[column.key] ?? '--';
                        });

                        return row;
                    })
                : [];

            console.log(`Filtered ${transformedData.length} records within time range: ${new Date(fromTimestamp * 1000).toLocaleString('zh-TW')} ~ ${new Date(toTimestamp * 1000).toLocaleString('zh-TW')}`);

            setTableData(transformedData);
            setAppliedDevice(deviceName);
            setAppliedDateRange({
                fromDate,
                toDate,
                fromIso,
                toIso,
                fromLabel: formatDateTimeLabel(fromDate),
                toLabel: formatDateTimeLabel(toDate),
            });
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

    const handleQuery = async (
        deviceName = selectedDevice,
        fromValue = fromDateTime,
        toValue = toDateTime,
    ) => {
        if (!deviceName) {
            setError('請選擇設備');
            return;
        }

        const columns = await fetchSensorSettings(deviceName);
        await fetchSensorData(deviceName, columns, fromValue, toValue);
    };

    const handleDeviceChange = async (event) => {
        const nextDevice = event.target.value;
        setSelectedDevice(nextDevice);

        if (nextDevice) {
            await handleQuery(nextDevice, fromDateTime, toDateTime);
        } else {
            setTableData([]);
        }
    };

    const handleExportCsv = () => {
        if (tableData.length === 0) {
            return;
        }

        const headerRow = [t('time'), t('device_id'), ...sensorColumns.map((column) => column.label)];
        const dataRows = tableData.map((row) => ([
            row.time,
            row.deviceid,
            ...sensorColumns.map((column) => formatApiNumber(row[column.key])),
        ]));

        const csvContent = [headerRow, ...dataRows]
            .map((row) => row.map(escapeCsvValue).join(','))
            .join('\r\n');

        const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
        const downloadUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const exportDeviceName = appliedDevice || selectedDevice || '設備';
        const safeDeviceName = exportDeviceName.replace(/[\\/:*?"<>|]/gu, '_');
        const startDateTime = formatDateTimeFileNamePart(appliedDateRange.fromDate);
        const endDateTime = formatDateTimeFileNamePart(appliedDateRange.toDate);

        link.href = downloadUrl;
        link.download = `${safeDeviceName}_${startDateTime}_${endDateTime}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(downloadUrl);
    };

    // Calculate pagination
    const totalPages = Math.ceil(tableData.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentData = tableData.slice(startIndex, endIndex);
    const tableColSpan = sensorColumns.length + 2;

    // Pagination handlers
    const handlePreviousPage = () => {
        setCurrentPage((prev) => Math.max(1, prev - 1));
    };

    const handleNextPage = () => {
        setCurrentPage((prev) => Math.min(totalPages, prev + 1));
    };

    const handlePageJump = () => {
        const pageNum = Number.parseInt(jumpToPage, 10);
        if (pageNum >= 1 && pageNum <= totalPages) {
            setCurrentPage(pageNum);
            setJumpToPage('');
        }
    };

    const handleItemsPerPageChange = (e) => {
        setItemsPerPage(Number.parseInt(e.target.value, 10));
        setCurrentPage(1); // Reset to first page
    };

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
                            <Filter size={18} className="text-primary"/>
                            {t('filter_conditions')}
                        </h3>
                        {error && (
                            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                                {error}
                            </div>
                        )}


                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('select_device')}</label>
                                <div className="relative">
                                    <Database className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                    <select
                                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all appearance-none cursor-pointer"
                                        value={selectedDevice}
                                        onChange={handleDeviceChange}
                                    >
                                        <option value="">{t('please_select_device')}</option>
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
                                    {t('start_datetime')} <span className="text-slate-400 font-normal">({t('optional')}, {t('default')}: {formatDateTimeLabel(getStartOfToday())})</span>
                                </label>
                                <div className="relative">
                                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
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
                                    {t('end_datetime')} <span className="text-slate-400 font-normal">({t('optional')}, {t('default')}: {formatDateTimeLabel(getEndOfToday())})</span>
                                </label>
                                <div className="relative">
                                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
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
                        <div className="mt-6 flex flex-wrap justify-end gap-3">
                            <button
                                onClick={handleExportCsv}
                                disabled={loading || tableData.length === 0}
                                className="px-6 py-2.5 bg-white text-slate-700 border border-slate-200 rounded-lg text-sm font-semibold hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                            >
                                <Download size={16} />
                                匯出 CSV
                            </button>
                            <button
                                onClick={() => handleQuery()}
                                disabled={loading}
                                className="px-6 py-2.5 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                            >
                                {loading ? (
                                    <>
                                        <div
                                            className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        {t('querying')}
                                    </>
                                ) : (
                                    <>
                                        <Search size={16} />
                                        {t('query_data')}
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
                                        <span className="font-semibold text-slate-700">{t('device')}：</span>
                                        {appliedDevice || selectedDevice}
                                    </span>
                                    <span className="text-slate-400">|</span>
                                    <span className="text-slate-600">
                                        <span className="font-semibold text-slate-700">{t('time_range')}：</span>
                                        {appliedDateRange.fromLabel} ~ {appliedDateRange.toLabel}
                                    </span>
                                </div>
                                <span className="text-slate-600">
                                    <span className="font-semibold text-primary">{t('total')}：</span>
                                    {tableData.length} {t('records')}
                                </span>
                            </div>
                        )}
                        <div className="overflow-x-auto">
                            <table className="min-w-full border-collapse text-left" style={{ minWidth: `${Math.max(4, sensorColumns.length + 2) * 140}px` }}>
                                <thead>
                                <tr className="bg-slate-50 text-slate-500 uppercase text-[11px] font-bold tracking-widest border-b border-slate-200">
                                    <th className="px-6 py-4 whitespace-nowrap sticky left-0 bg-slate-50 z-10 min-w-[180px]">{t('time')}</th>
                                    <th className="px-6 py-4 whitespace-nowrap sticky left-[180px] bg-slate-50 z-10 min-w-[160px]">{t('device_id')}</th>
                                    {sensorColumns.map((column) => (
                                        <th key={column.key} className="px-6 py-4 whitespace-nowrap min-w-[140px]">{column.label}</th>
                                    ))}
                                </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-sm">
                                {loading ? (
                                    <tr>
                                        <td colSpan={tableColSpan} className="px-6 py-12 text-center text-slate-400">
                                            <div className="flex items-center justify-center gap-2">
                                                <div
                                                    className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                                                {t('loading_data')}
                                            </div>
                                        </td>
                                    </tr>
                                ) : currentData.length === 0 ? (
                                    <tr>
                                        <td colSpan={tableColSpan} className="px-6 py-12 text-center text-slate-400">
                                            <Database size={48} className="mx-auto mb-2 opacity-30" />
                                            <p className="text-sm font-medium">{t('no_data')}</p>
                                            <p className="text-xs mt-1">{t('please_set_filter')}</p>
                                        </td>
                                    </tr>
                                ) : (
                                    currentData.map((row) => (
                                        <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap text-slate-600 sticky left-0 bg-white min-w-[180px]">{row.time}</td>
                                            <td className="px-6 py-4 whitespace-nowrap sticky left-[180px] bg-white min-w-[160px]">{row.deviceid}</td>
                                            {sensorColumns.map((column) => (
                                                <td key={`${row.id}-${column.key}`} className="px-6 py-4 font-mono font-semibold whitespace-nowrap min-w-[140px]">
                                                    {formatApiNumber(row[column.key])}
                                                </td>
                                            ))}
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
                                    {t('showing')} {tableData.length > 0 ? startIndex + 1 : 0} {t('to')} {Math.min(endIndex, tableData.length)} {t('of')} {tableData.length} {t('entries')}
                                </p>
                                <div className="flex items-center gap-2">
                                    <label className="text-xs text-slate-500 font-medium">{t('items_per_page')}:</label>
                                    <select
                                        value={itemsPerPage}
                                        onChange={handleItemsPerPageChange}
                                        className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                    >
                                        <option value={20}>20 {t('items')}</option>
                                        <option value={50}>50 {t('items')}</option>
                                        <option value={100}>100 {t('items')}</option>
                                    </select>
                                </div>
                            </div>

                            <div className="flex items-center gap-4">
                                {/* Page Jump Input */}
                                <div className="flex items-center gap-2">
                                    <label
                                        className="text-xs text-slate-500 font-medium whitespace-nowrap">{t('jump_to_page')}:</label>
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
                                        {t('go')}
                                    </button>
                                </div>

                                {/* Page Navigation */}
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={handlePreviousPage}
                                        disabled={currentPage === 1 || totalPages === 0}
                                        className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <ChevronLeft size={18} />
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
                                        <ChevronRight size={18} />
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
