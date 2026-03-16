/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { motion } from 'motion/react';
import { useLanguage } from '../contexts/LanguageContext';

const API_HOST = '';
const DEFAULT_PAGE_SIZE = 10;
const SORT_PARAM = 'occurrenceTime,desc';
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

const DEFAULT_PAGE_INFO = {
    empty: true,
    first: true,
    last: true,
    number: 0,
    numberOfElements: 0,
    size: DEFAULT_PAGE_SIZE,
    totalElements: 0,
    totalPages: 0,
};

const formatOccurrenceTime = (value, language = 'zh') => {
    if (!value) {
        return '--';
    }

    const parsedDate = new Date(value);

    if (Number.isNaN(parsedDate.getTime())) {
        return value;
    }

    return parsedDate.toLocaleString(language === 'en' ? 'en-US' : 'zh-TW', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
    });
};

const normalizeAlarmItem = (alarm, language) => ({
    id: alarm?.id ?? `${alarm?.device?.name ?? 'device'}-${alarm?.occurrenceTime ?? 'time'}`,
    reason: alarm?.reason ?? '--',
    occurrenceTime: alarm?.occurrenceTime ?? '',
    formattedOccurrenceTime: formatOccurrenceTime(alarm?.occurrenceTime, language),
    deviceName: alarm?.device?.name ?? '--',
    deviceIp: alarm?.device?.ip ?? '--',
});

const buildPageItems = (currentPage, totalPages) => {
    if (totalPages <= 0) {
        return [];
    }

    if (totalPages <= 7) {
        return Array.from({ length: totalPages }, (_, index) => index + 1);
    }

    const currentUiPage = currentPage + 1;
    const items = [1];
    const start = Math.max(2, currentUiPage - 1);
    const end = Math.min(totalPages - 1, currentUiPage + 1);

    if (start > 2) {
        items.push('start-ellipsis');
    }

    for (let page = start; page <= end; page += 1) {
        items.push(page);
    }

    if (end < totalPages - 1) {
        items.push('end-ellipsis');
    }

    items.push(totalPages);

    return items;
};

export default function Alarm() {
    const { t, language } = useLanguage();
    const [alarms, setAlarms] = useState([]);
    const [pageInfo, setPageInfo] = useState(DEFAULT_PAGE_INFO);
    const [currentPage, setCurrentPage] = useState(0);
    const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [jumpToPage, setJumpToPage] = useState('');

    useEffect(() => {
        const fetchAlarms = async () => {
            setLoading(true);
            setError('');

            try {
                const query = new URLSearchParams({
                    page: String(currentPage),
                    size: String(pageSize),
                    sort: SORT_PARAM,
                });
                const response = await fetch(`${API_HOST}/api/alarms?${query.toString()}`);

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const data = await response.json();
                const normalizedContent = Array.isArray(data?.content)
                    ? [...data.content]
                        .sort((left, right) => new Date(right?.occurrenceTime ?? 0) - new Date(left?.occurrenceTime ?? 0))
                        .map((alarm) => normalizeAlarmItem(alarm, language))
                    : [];

                setAlarms(normalizedContent);
                setPageInfo({
                    empty: Boolean(data?.empty ?? normalizedContent.length === 0),
                    first: Boolean(data?.first ?? currentPage === 0),
                    last: Boolean(data?.last ?? true),
                    number: Number.isFinite(data?.number) ? data.number : currentPage,
                    numberOfElements: Number.isFinite(data?.numberOfElements) ? data.numberOfElements : normalizedContent.length,
                    size: Number.isFinite(data?.size) ? data.size : pageSize,
                    totalElements: Number.isFinite(data?.totalElements) ? data.totalElements : normalizedContent.length,
                    totalPages: Number.isFinite(data?.totalPages) ? data.totalPages : (normalizedContent.length > 0 ? 1 : 0),
                });
            } catch (fetchError) {
                console.error('Error fetching alarms:', fetchError);
                setAlarms([]);
                setPageInfo((previous) => ({
                    ...previous,
                    empty: true,
                    number: currentPage,
                    numberOfElements: 0,
                    totalElements: 0,
                    totalPages: 0,
                    first: currentPage === 0,
                    last: true,
                }));
                setError(t('alarm.fetchError', { message: fetchError.message }));
            } finally {
                setLoading(false);
            }
        };

        fetchAlarms();
    }, [currentPage, pageSize, language, t]);

    const visiblePages = useMemo(
        () => buildPageItems(pageInfo.number, pageInfo.totalPages),
        [pageInfo.number, pageInfo.totalPages],
    );

    const displayRange = useMemo(() => {
        if (pageInfo.totalElements === 0 || pageInfo.numberOfElements === 0) {
            return { start: 0, end: 0 };
        }

        const start = pageInfo.number * pageInfo.size + 1;
        const end = start + pageInfo.numberOfElements - 1;

        return { start, end };
    }, [pageInfo.number, pageInfo.numberOfElements, pageInfo.size, pageInfo.totalElements]);

    const handlePageChange = (pageNumber) => {
        if (loading) {
            return;
        }

        const maxPage = Math.max(pageInfo.totalPages - 1, 0);
        const nextPage = Math.min(Math.max(pageNumber, 0), maxPage);

        if (nextPage !== currentPage) {
            setCurrentPage(nextPage);
        }
    };

    const handleJumpToPage = (event) => {
        event.preventDefault();

        if (!jumpToPage.trim() || pageInfo.totalPages <= 0) {
            return;
        }

        const pageNumber = Number(jumpToPage);

        if (!Number.isInteger(pageNumber)) {
            return;
        }

        handlePageChange(pageNumber - 1);
        setJumpToPage('');
    };

    const handlePageSizeChange = (event) => {
        const nextPageSize = Number.parseInt(event.target.value, 10);

        if (!Number.isInteger(nextPageSize) || nextPageSize <= 0) {
            return;
        }

        setPageSize(nextPageSize);
        setCurrentPage(0);
        setJumpToPage('');
    };

    return (
        <div className="flex h-screen overflow-hidden bg-background-light font-display text-slate-900">
            <main className="flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto p-8 space-y-6">
                    <motion.section
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
                    >
                        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/70 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                            <div>
                                <h2 className="text-lg font-bold text-slate-900">{t('alarm.recordList')}</h2>
                                {/*<p className="text-sm text-slate-500">*/}
                                {/*    {t('alarm.sortedDescHint')}*/}
                                {/*</p>*/}
                            </div>
                            <div className="flex flex-col gap-2 text-xs font-medium text-slate-500 sm:items-end">
                                <div>
                                    {t('alarm.pageSummary', { size: pageInfo.size, total: pageInfo.totalElements })}
                                </div>
                                <div className="flex items-center gap-2">
                                    <label htmlFor="alarm-page-size" className="whitespace-nowrap">
                                        {t('items_per_page')}
                                    </label>
                                    <select
                                        id="alarm-page-size"
                                        value={pageSize}
                                        onChange={handlePageSizeChange}
                                        disabled={loading}
                                        className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {PAGE_SIZE_OPTIONS.map((sizeOption) => (
                                            <option key={sizeOption} value={sizeOption}>
                                                {sizeOption} {t('items')}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                <tr className="bg-slate-50/50 border-b border-slate-200">
                                    <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">{t('time')}</th>
                                    <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">{t('alarm.description')}</th>
                                    <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">{t('alarm.deviceName')}</th>
                                    <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">{t('alarm.deviceIp')}</th>
                                </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                {loading && (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-12 text-center text-sm text-slate-500">
                                            {t('alarm.loading')}
                                        </td>
                                    </tr>
                                )}

                                {!loading && error && (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-12 text-center text-sm text-red-500">
                                            {error}
                                        </td>
                                    </tr>
                                )}

                                {!loading && !error && alarms.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-12 text-center text-sm text-slate-500">
                                            {t('alarm.empty')}
                                        </td>
                                    </tr>
                                )}

                                {!loading && !error && alarms.map((alarm) => (
                                    <tr key={alarm.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4 text-sm font-medium text-slate-600 whitespace-nowrap">{alarm.formattedOccurrenceTime}</td>
                                        <td className="px-6 py-4 text-sm text-slate-600 min-w-[320px]">{alarm.reason}</td>
                                        <td className="px-6 py-4 text-sm font-bold text-primary whitespace-nowrap">{alarm.deviceName}</td>
                                        <td className="px-6 py-4 text-sm text-slate-600 whitespace-nowrap">{alarm.deviceIp}</td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-200 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                            <p className="text-xs text-slate-500 font-medium">
                                {t('alarm.paginationSummary', {
                                    start: displayRange.start,
                                    end: displayRange.end,
                                    total: pageInfo.totalElements,
                                })}
                            </p>

                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
                                <div className="flex items-center gap-1">
                                    <button
                                        type="button"
                                        onClick={() => handlePageChange(pageInfo.number - 1)}
                                        disabled={loading || pageInfo.first || pageInfo.totalPages === 0}
                                        className="size-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 enabled:hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <ChevronLeft className="size-4" />
                                    </button>

                                    {visiblePages.map((page) => (
                                        typeof page === 'number' ? (
                                            <button
                                                key={page}
                                                type="button"
                                                onClick={() => handlePageChange(page - 1)}
                                                disabled={loading}
                                                className={`size-8 flex items-center justify-center rounded-lg text-xs font-bold transition-colors ${
                                                    page === pageInfo.number + 1
                                                        ? 'bg-primary text-white shadow-sm shadow-primary/20'
                                                        : 'border border-slate-200 text-slate-700 hover:bg-white'
                                                } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                                            >
                                                {page}
                                            </button>
                                        ) : (
                                            <span key={page} className="px-2 text-slate-400 text-xs font-bold">...</span>
                                        )
                                    ))}

                                    <button
                                        type="button"
                                        onClick={() => handlePageChange(pageInfo.number + 1)}
                                        disabled={loading || pageInfo.last || pageInfo.totalPages === 0}
                                        className="size-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 enabled:hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <ChevronRight className="size-4" />
                                    </button>
                                </div>

                                <form onSubmit={handleJumpToPage} className="flex items-center gap-2">
                                    <label htmlFor="alarm-jump-page" className="text-xs font-medium text-slate-500 whitespace-nowrap">
                                        {t('jump_to_page')}
                                    </label>
                                    <input
                                        id="alarm-jump-page"
                                        type="number"
                                        min={1}
                                        max={Math.max(pageInfo.totalPages, 1)}
                                        value={jumpToPage}
                                        onChange={(event) => setJumpToPage(event.target.value)}
                                        className="w-20 px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                                        placeholder={`${pageInfo.number + 1}`}
                                    />
                                    <button
                                        type="submit"
                                        disabled={loading || pageInfo.totalPages === 0}
                                        className="px-3 py-2 bg-slate-900 text-white text-sm font-bold rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {t('go')}
                                    </button>
                                </form>
                            </div>
                        </div>
                    </motion.section>
                </div>
            </main>
        </div>
    );
}

