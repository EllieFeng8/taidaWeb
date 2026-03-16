/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
    Settings2,
    Gamepad2,
    X,
    ArrowRight,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '../contexts/LanguageContext';

export default function GroupMenu({
    open,
    onClose,
    groupName,
    onOpenSettings,
    onOpenControl
}) {
    const { t } = useLanguage();
    const resolvedGroupName = groupName ?? t('groups.defaultGroupName');

    return (
        <AnimatePresence>
            {open && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={onClose}
                            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                        />

                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
                        >
                            {/* Modal Header */}
                            <div className="flex items-center justify-between border-b border-slate-100 px-8 py-6">
                                <h3 className="flex items-center gap-3 text-xl font-bold text-slate-900">
                                    <Settings2 className="h-6 w-6 text-blue-600" />
                                    {t('groups.menu.title', { name: resolvedGroupName })}
                                </h3>
                                <button
                                    onClick={onClose}
                                    className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                                >
                                    <X className="h-6 w-6" />
                                </button>
                            </div>

                            {/* Modal Body */}
                            <div className="p-8">
                                <p className="mb-8 text-sm font-medium text-slate-500">{t('groups.menu.prompt', { name: resolvedGroupName })}</p>

                                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                    {/* Option 1: Group Settings */}
                                    <button
                                        type="button"
                                        onClick={() => {
                                            onClose?.();
                                            onOpenSettings?.();
                                        }}
                                        className="group relative flex flex-col items-start rounded-xl border-2 border-slate-100 bg-slate-50/50 p-6 text-left transition-all duration-300 hover:border-blue-600/50 hover:bg-blue-50/50"
                                    >
                                        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-blue-100 text-blue-600 transition-transform duration-300 group-hover:scale-110">
                                            <Settings2 className="h-8 w-8" />
                                        </div>
                                        <h4 className="mb-2 text-lg font-bold text-slate-900">{t('groups.menu.settingsTitle')}</h4>
                                        <p className="text-sm leading-relaxed text-slate-500">
                                            {t('groups.menu.settingsDescription')}
                                        </p>
                                        <div className="mt-6 flex items-center text-sm font-bold text-blue-600 opacity-0 transition-opacity group-hover:opacity-100">
                                            {t('groups.menu.settingsAction')} <ArrowRight className="ml-1 h-4 w-4" />
                                        </div>
                                    </button>

                                    {/* Option 2: Group Control */}
                                    <button
                                        type="button"
                                        onClick={() => {
                                            onClose?.();
                                            onOpenControl?.();
                                        }}
                                        className="group relative flex flex-col items-start rounded-xl border-2 border-slate-100 bg-slate-50/50 p-6 text-left transition-all duration-300 hover:border-blue-600/50 hover:bg-blue-50/50"
                                    >
                                        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-600/25 transition-transform duration-300 group-hover:scale-110">
                                            <Gamepad2 className="h-8 w-8" />
                                        </div>
                                        <h4 className="mb-2 text-lg font-bold text-slate-900">{t('groups.menu.controlTitle')}</h4>
                                        <p className="text-sm leading-relaxed text-slate-500">
                                            {t('groups.menu.controlDescription')}
                                        </p>
                                        <div className="mt-6 flex items-center text-sm font-bold text-blue-600 opacity-0 transition-opacity group-hover:opacity-100">
                                            {t('groups.menu.controlAction')} <ArrowRight className="ml-1 h-4 w-4" />
                                        </div>
                                    </button>
                                </div>
                            </div>

                            {/* Modal Footer */}
                            <div className="flex justify-end bg-slate-50 px-8 py-6">
                                <button
                                    onClick={onClose}
                                    className="px-5 py-2 text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors"
                                >
                                    {t('common.cancel')}
                                </button>
                            </div>
                        </motion.div>
                    </div>
            )}
        </AnimatePresence>
    );
}
