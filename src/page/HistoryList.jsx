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
const EMPTY_STATE = {
    IDLE: 'idle',
    NO_DATA: 'no-data',
    NO_MATCH: 'no-match',
};

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
    const [holdingColumns, setHoldingColumns] = useState([]);
    const [fromDateTime, setFromDateTime] = useState(() => formatDateTimeLocalInput(getStartOfToday()));
    const [toDateTime, setToDateTime] = useState('');
    const [tableData, setTableData] = useState([]);
    const [appliedDevice, setAppliedDevice] = useState('');
    const [appliedDateRange, setAppliedDateRange] = useState(() => getEffectiveDateRange(formatDateTimeLocalInput(getStartOfToday()), ''));
    const [emptyState, setEmptyState] = useState(EMPTY_STATE.IDLE);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Pagination states
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(20);
    const [totalPages, setTotalPages] = useState(0);
    const [totalCount, setTotalCount] = useState(0);
    const [hasNextPage, setHasNextPage] = useState(false);
    const [hasPreviousPage, setHasPreviousPage] = useState(false);
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

    const applyQueryMetadata = (deviceName, dateRange, pageInfo = {}) => {
        setAppliedDevice(deviceName);
        setAppliedDateRange(dateRange);
        if (pageInfo.currentPage !== undefined) setCurrentPage(pageInfo.currentPage);
        if (pageInfo.totalPages !== undefined) setTotalPages(pageInfo.totalPages);
        if (pageInfo.totalCount !== undefined) setTotalCount(pageInfo.totalCount);
        if (pageInfo.hasNextPage !== undefined) setHasNextPage(pageInfo.hasNextPage);
        if (pageInfo.hasPreviousPage !== undefined) setHasPreviousPage(pageInfo.hasPreviousPage);
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
            console.log(`Fetched sensor settings for device "${deviceName}":`, columns);
            return columns;
        } catch (err) {
            console.error('Error fetching sensor settings:', err);
            const fallbackColumns = SENSOR_KEYS.map((key) => ({ key, label: key }));
            setSensorColumns(fallbackColumns);
            return fallbackColumns;
        }
    };

    // Fetch data from API
    const fetchSensorData = async (deviceName, columns, fromValue, toValue, page = currentPage, pageSize = itemsPerPage) => {
        if (!deviceName) {
            setError('請選擇設備');
            return;
        }

        setLoading(true);
        setError(null);
        setEmptyState(EMPTY_STATE.IDLE);

        try {
            const queryDateRange = getEffectiveDateRange(fromValue, toValue);
            const { fromIso, toIso, fromDate, toDate } = queryDateRange;

            // API URLs - Updated to rangeDateTimePage
            const sensorUrl = `${API_HOST}/api/sensor/rangeDateTimePage/${encodeURIComponent(deviceName)}?from=${encodeURIComponent(fromIso)}&to=${encodeURIComponent(toIso)}&page=${page}&pageSize=${pageSize}`;
            const holdingUrl = `${API_HOST}/api/holding/rangeDateTimePage/${encodeURIComponent(deviceName)}?from=${encodeURIComponent(fromIso)}&to=${encodeURIComponent(toIso)}&page=${page}&pageSize=${pageSize}`;

            console.log('Fetching sensor from:', sensorUrl);
            console.log('Fetching holding from:', holdingUrl);

            // Fetch both concurrently
            const [sensorResponse, holdingResponse] = await Promise.all([
                fetch(sensorUrl),
                fetch(holdingUrl).catch(err => {
                    console.error('Error fetching holding data:', err);
                    return { ok: false, status: 'error' };
                })
            ]);

            if (sensorResponse.status === 503) {
                setTableData([]);
                applyQueryMetadata(deviceName, queryDateRange, {
                    currentPage: 1,
                    totalPages: 0,
                    totalCount: 0,
                    hasNextPage: false,
                    hasPreviousPage: false
                });
                setEmptyState(EMPTY_STATE.NO_DATA);
                return;
            }

            if (!sensorResponse.ok) {
                throw new Error(`HTTP error fetching sensors! status: ${sensorResponse.status}`);
            }

            const sensorResData = await sensorResponse.json();
            const holdingResData = holdingResponse.ok ? await holdingResponse.json() : { items: [] };

            const sensorItems = sensorResData.items || [];
            const holdingItems = holdingResData.items || [];

            console.log('Received sensor items:', sensorItems.length);
            console.log('Received holding items:', holdingItems.length);

            // Calculate time range for filtering (though API already filters, we keep for consistency in merging)
            const fromTimestamp = fromDate.getTime() / 1000;
            const toTimestamp = toDate.getTime() / 1000;

            const normalizedSensorColumns = Array.isArray(columns) && columns.length > 0
                ? columns
                : SENSOR_KEYS.map((key) => ({ key, label: key }));

            // Collect all unique keys from holding register data for dynamic columns
            const holdingKeysSet = new Set();
            if (Array.isArray(holdingItems)) {
                holdingItems.forEach(item => {
                    Object.keys(item).forEach(key => {
                        if (key !== 'ts' && key !== 'deviceid' && key !== 'id') {
                            holdingKeysSet.add(key);
                        }
                    });
                });
            }

            // Convert to column definitions and sort them (e.g., h1, h2, h10...)
            const nextHoldingColumns = Array.from(holdingKeysSet)
                .sort((a, b) => {
                    const aNum = parseInt(a.replace(/\D/g, ''), 10);
                    const bNum = parseInt(b.replace(/\D/g, ''), 10);
                    if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum;
                    return a.localeCompare(b);
                })
                .map(key => ({ key, label: key }));

            setHoldingColumns(nextHoldingColumns);

            // Create a map of holding data indexed by ts
            const holdingMap = new Map();
            if (Array.isArray(holdingItems)) {
                holdingItems.forEach(record => {
                    const ts = Number(record.ts);
                    if (Number.isFinite(ts)) {
                        // 如果同一秒有多筆，我們將其存為陣列，或是在這裡做某種處理
                        // 為了簡化，目前假設如果是同一秒，前端暫時只取一筆，但我們需要確保資料不遺失
                        if (!holdingMap.has(ts)) {
                            holdingMap.set(ts, []);
                        }
                        holdingMap.get(ts).push(record);
                    }
                });
            }

            // Also map sensor data by ts to find all timestamps
            const sensorMap = new Map();
            if (Array.isArray(sensorItems)) {
                sensorItems.forEach(record => {
                    const ts = Number(record.ts);
                    if (Number.isFinite(ts) && ts >= fromTimestamp && ts <= toTimestamp) {
                        if (!sensorMap.has(ts)) {
                            sensorMap.set(ts, []);
                        }
                        sensorMap.get(ts).push(record);
                    }
                });
            }

            // 合併邏輯改進：
            // 由於 API 回傳的 sensorItems 和 holdingItems 是分頁後的，且可能包含重複 ts
            // 我們應該以 sensorItems 為主（或兩者的聯集），並盡量對齊
            const transformedData = [];

            // 建立所有出現過的 timestamp 集合，但我們會針對每個出現的 record 進行處理
            const processedTimestamps = new Set();

            // 輔助函式：從 Map 中取出並消耗一筆資料
            const getAndConsume = (map, ts) => {
                const list = map.get(ts);
                if (list && list.length > 0) {
                    return list.shift();
                }
                return null;
            };

            // 1. 先處理 sensorItems
            if (Array.isArray(sensorItems)) {
                sensorItems.forEach((sensorRecord, index) => {
                    const ts = Number(sensorRecord.ts);
                    if (ts >= fromTimestamp && ts <= toTimestamp) {
                        const holdingRecord = getAndConsume(holdingMap, ts);

                        const row = {
                            id: `s-${deviceName}-${ts}-${index}`,
                            time: formatTableTime(ts),
                            deviceid: deviceName,
                            timestamp: ts,
                        };

                        normalizedSensorColumns.forEach((column) => {
                            row[column.key] = sensorRecord?.[column.key] ?? '--';
                        });

                        nextHoldingColumns.forEach((column) => {
                            row[column.key] = holdingRecord?.[column.key] ?? '--';
                        });

                        transformedData.push(row);
                    }
                });
            }

            // 2. 處理剩餘的 holdingItems (如果有 sensor 沒對應到的)
            if (Array.isArray(holdingItems)) {
                holdingItems.forEach((holdingRecord, index) => {
                    const ts = Number(holdingRecord.ts);
                    // 檢查 map 中是否還有剩餘（沒被 consume 完的）
                    const remainingList = holdingMap.get(ts);
                    if (ts >= fromTimestamp && ts <= toTimestamp && remainingList && remainingList.includes(holdingRecord)) {
                        // 消耗掉
                        const idx = remainingList.indexOf(holdingRecord);
                        remainingList.splice(idx, 1);

                        const row = {
                            id: `h-${deviceName}-${ts}-${index}`,
                            time: formatTableTime(ts),
                            deviceid: deviceName,
                            timestamp: ts,
                        };

                        normalizedSensorColumns.forEach((column) => {
                            row[column.key] = '--';
                        });

                        nextHoldingColumns.forEach((column) => {
                            row[column.key] = holdingRecord?.[column.key] ?? '--';
                        });

                        transformedData.push(row);
                    }
                });
            }

            // 最後依照時間排序（降序）
            transformedData.sort((a, b) => b.timestamp - a.timestamp);

            console.log(`Merged ${transformedData.length} records within time range: ${new Date(fromTimestamp * 1000).toLocaleString('zh-TW')} ~ ${new Date(toTimestamp * 1000).toLocaleString('zh-TW')}`);

            setTableData(transformedData);
            applyQueryMetadata(deviceName, queryDateRange, {
                currentPage: sensorResData.page || page,
                totalPages: sensorResData.totalPages || 0,
                totalCount: sensorResData.totalCount || 0,
                hasNextPage: sensorResData.hasNextPage || false,
                hasPreviousPage: sensorResData.hasPreviousPage || false
            });
            setEmptyState(transformedData.length === 0 ? EMPTY_STATE.NO_MATCH : EMPTY_STATE.IDLE);
        } catch (err) {
            setError(`載入數據失敗: ${err.message}`);
            setEmptyState(EMPTY_STATE.IDLE);
            console.error('Error fetching data:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleQuery = async (
        deviceName = selectedDevice,
        fromValue = fromDateTime,
        toValue = toDateTime,
        page = 1,
        pageSize = itemsPerPage
    ) => {
        if (!deviceName) {
            setError('請選擇設備');
            return;
        }

        const columns = await fetchSensorSettings(deviceName);
        await fetchSensorData(deviceName, columns, fromValue, toValue, page, pageSize);
    };

    const handleDeviceChange = async (event) => {
        const nextDevice = event.target.value;
        setSelectedDevice(nextDevice);

        if (nextDevice) {
            await handleQuery(nextDevice, fromDateTime, toDateTime);
        } else {
            setTableData([]);
            setError(null);
            setEmptyState(EMPTY_STATE.IDLE);
        }
    };

    const handleExportCsv = () => {
        if (tableData.length === 0) {
            return;
        }

        const headerRow = [
            t('time'),
            t('device_id'),
            ...sensorColumns.map((column) => column.label),
            ...holdingColumns.map((column) => column.label)
        ];
        const dataRows = tableData.map((row) => ([
            row.time,
            row.deviceid,
            ...sensorColumns.map((column) => formatApiNumber(row[column.key])),
            ...holdingColumns.map((column) => formatApiNumber(row[column.key])),
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

    // Calculate pagination labels
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + tableData.length;
    const currentData = tableData;
    const tableColSpan = sensorColumns.length + holdingColumns.length + 2;
    const emptyStateMessage = emptyState === EMPTY_STATE.NO_DATA
        ? t('history.no_data_found')
        : emptyState === EMPTY_STATE.NO_MATCH
            ? t('history.no_matching_data')
            : null;

    // Pagination handlers
    const handlePreviousPage = () => {
        if (hasPreviousPage) {
            handleQuery(appliedDevice, appliedDateRange.fromDate, appliedDateRange.toDate, currentPage - 1, itemsPerPage);
        }
    };

    const handleNextPage = () => {
        if (hasNextPage) {
            handleQuery(appliedDevice, appliedDateRange.fromDate, appliedDateRange.toDate, currentPage + 1, itemsPerPage);
        }
    };

    const handlePageJump = () => {
        const pageNum = Number.parseInt(jumpToPage, 10);
        if (pageNum >= 1 && pageNum <= totalPages) {
            handleQuery(appliedDevice, appliedDateRange.fromDate, appliedDateRange.toDate, pageNum, itemsPerPage);
            setJumpToPage('');
        }
    };

    const handleItemsPerPageChange = (e) => {
        const nextItemsPerPage = Number.parseInt(e.target.value, 10);
        setItemsPerPage(nextItemsPerPage);
        handleQuery(appliedDevice, appliedDateRange.fromDate, appliedDateRange.toDate, 1, nextItemsPerPage);
    };

    const handlePageClick = (pageNum) => {
        handleQuery(appliedDevice, appliedDateRange.fromDate, appliedDateRange.toDate, pageNum, itemsPerPage);
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
                                {t('history.export')} CSV
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
                                    {totalCount} {t('records')}
                                </span>
                            </div>
                        )}
                        <div className="overflow-x-auto">
                            <table className="min-w-full border-collapse text-left" style={{ minWidth: `${Math.max(4, sensorColumns.length + holdingColumns.length + 2) * 140}px` }}>
                                <thead>
                                <tr className="bg-slate-50 text-slate-500 uppercase text-[11px] font-bold tracking-widest border-b border-slate-200">
                                    <th className="px-6 py-4 whitespace-nowrap sticky left-0 bg-slate-50 z-10 min-w-[180px]">{t('time')}</th>
                                    <th className="px-6 py-4 whitespace-nowrap sticky left-[180px] bg-slate-50 z-10 min-w-[160px]">{t('device_id')}</th>
                                    {sensorColumns.map((column) => (
                                        <th key={column.key} className="px-6 py-4 whitespace-nowrap min-w-[140px]">{column.label}</th>
                                    ))}
                                    {holdingColumns.map((column) => (
                                        <th key={column.key} className="px-6 py-4 whitespace-nowrap min-w-[140px]">{column.label}</th>
                                    ))}
                                </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-sm">
                                {loading ? (
                                    <tr>
                                        <td colSpan={tableColSpan} className="px-6 py-12 text-center text-slate-400">
                                            <div className="flex items-center justify-center gap-2">
                                                <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                                                {t('loading_data')}
                                            </div>
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
                                            {holdingColumns.map((column) => (
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
                        {!loading && currentData.length === 0 && (
                            <div className="px-6 py-12 text-center text-slate-400">
                                <Database size={48} className="mx-auto mb-2 opacity-30" />
                                <p className="text-sm font-medium">{emptyStateMessage ?? t('please_set_filter')}</p>
                            </div>
                        )}

                        {/* Pagination */}
                        {tableData.length > 0 && (
                            <div
                                className="p-4 border-t border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
                                <div className="flex items-center gap-4">
                                    <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">
                                        {t('showing')} {totalCount > 0 ? startIndex + 1 : 0} {t('to')} {endIndex} {t('of')} {totalCount} {t('entries')}
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <label className="text-xs text-slate-500 font-medium">{t('items_per_page')}:</label>
                                        <select
                                            value={itemsPerPage}
                                            onChange={handleItemsPerPageChange}
                                            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                        >
                                            <option value={10}>10 {t('items')}</option>
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
                                            disabled={!hasPreviousPage || totalPages === 0}
                                            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                        >
                                            <ChevronLeft size={18} />
                                        </button>

                                        <div className="flex items-center gap-1">
                                            {currentPage > 2 && (
                                                <>
                                                    <button
                                                        onClick={() => handlePageClick(1)}
                                                        className="w-8 h-8 rounded-lg hover:bg-slate-100 text-xs font-bold transition-colors"
                                                    >
                                                        1
                                                    </button>
                                                    {currentPage > 3 && <span className="px-2 text-slate-400">...</span>}
                                                </>
                                            )}

                                            {currentPage > 1 && (
                                                <button
                                                    onClick={() => handlePageClick(currentPage - 1)}
                                                    className="w-8 h-8 rounded-lg hover:bg-slate-100 text-xs font-bold transition-colors"
                                                >
                                                    {currentPage - 1}
                                                </button>
                                            )}

                                            {totalPages > 0 && (
                                                <button
                                                    className="w-8 h-8 rounded-lg bg-primary text-white text-xs font-bold">
                                                    {currentPage}
                                                </button>
                                            )}

                                            {currentPage < totalPages && (
                                                <button
                                                    onClick={() => handlePageClick(currentPage + 1)}
                                                    className="w-8 h-8 rounded-lg hover:bg-slate-100 text-xs font-bold transition-colors"
                                                >
                                                    {currentPage + 1}
                                                </button>
                                            )}

                                            {currentPage < totalPages - 1 && (
                                                <>
                                                    {currentPage < totalPages - 2 && <span className="px-2 text-slate-400">...</span>}
                                                    <button
                                                        onClick={() => handlePageClick(totalPages)}
                                                        className="w-8 h-8 rounded-lg hover:bg-slate-100 text-xs font-bold transition-colors"
                                                    >
                                                        {totalPages}
                                                    </button>
                                                </>
                                            )}
                                        </div>

                                        <button
                                            onClick={handleNextPage}
                                            disabled={!hasNextPage || totalPages === 0}
                                            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                        >
                                            <ChevronRight size={18} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
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
