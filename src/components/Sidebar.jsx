import React from 'react';
import {
    LayoutDashboard,
    Users,
    Bell,
    Factory,
    History
} from 'lucide-react';
import {useLanguage} from '../contexts/LanguageContext';

export const Sidebar = ({activeTab, setActiveTab}) => {
    const {language, toggleLanguage, t} = useLanguage();
    const navItems = [
        {id: 'dashboard', label: t('tab.dashboard') , icon: LayoutDashboard},
        {id: 'groups', label: t('tab.groups'), icon: Users},
        {id: 'alerts', label: t('tab.alerts'), icon: Bell},
        {id: 'history', label: t('tab.history'), icon: History},
    ];

    return (
        <aside className="w-64 border-r border-slate-200 bg-white hidden md:flex flex-col h-screen sticky top-0">
            <div className="p-6 flex items-center gap-3">
                <div
                    className="size-10 bg-primary rounded-lg flex items-center justify-center text-white shadow-lg shadow-primary/20">
                    <Factory size={24}/>
                </div>
                <div>
                    <h1 className="text-sm font-bold leading-tight">{t('system.title')}</h1>

                </div>
            </div>

            <nav className="flex-1 px-4 space-y-1 mt-4">
                {navItems.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                            activeTab === item.id
                                ? 'bg-primary/10 text-primary font-bold shadow-sm'
                                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                        }`}
                    >
                        <item.icon size={20} fill={activeTab === item.id ? 'currentColor' : 'none'} fillOpacity={0.2}/>
                        <span className="text-sm">{item.label}</span>
                    </button>
                ))}
            </nav>

            <div className="p-4 border-t border-slate-100">
                <div
                    className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer group">


                </div>
            </div>
        </aside>
    );
};
