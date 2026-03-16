import React, {useState} from 'react';
import {Sidebar} from './components/Sidebar';
import {Header} from './components/Header';
import GroupSettings from './page/GroupSettings.jsx';
import {GroupControl} from './components/GroupControl';
import {Dashboard} from './page/Dashboard';
import Alarm from './page/Alarm.jsx';
import {IndustrialControl} from './page/IndustrialControl.jsx';
import HistoryList from './page/HistoryList.jsx';
import {LanguageProvider, useLanguage} from './contexts/LanguageContext';

function AppContent() {
    const {t} = useLanguage();
    const [activeTab, setActiveTab] = useState('dashboard');
    const [selectedGroup, setSelectedGroup] = useState(null);
    const [selectedDevice, setSelectedDevice] = useState(null);
    const tabLabels = {
        dashboard: t('tab.dashboard'),
        groups: t('tab.groups'),
        alerts: t('tab.alerts'),
        history: t('tab.history'),
        logs: t('tab.logs'),
        control: t('tab.control'),
        industrialControl: t('tab.industrialControl')
    };

    const [groups] = useState([]);

    const handleEditGroup = (group) => {
        setSelectedGroup(group);
        setActiveTab('control');
    };

    const handleOpenDevice = (device) => {
        setSelectedDevice(device);
        setActiveTab('industrialControl');
    };

    const renderContent = () => {
        if (activeTab === 'control' && selectedGroup) {
            return (
                <GroupControl
                    group={selectedGroup}
                    onBack={() => {
                        setActiveTab('groups');
                        setSelectedGroup(null);
                    }}
                />
            );
        }

        if (activeTab === 'industrialControl' && selectedDevice) {
            return (
                <IndustrialControl
                    device={selectedDevice}
                    onBack={() => {
                        setActiveTab('dashboard');
                        setSelectedDevice(null);
                    }}
                />
            );
        }

        switch (activeTab) {
            case 'dashboard':
                return <Dashboard onSelectDevice={handleOpenDevice}/>;
            case 'alerts':
                return <Alarm/>;
            case 'history':
                return <HistoryList/>;
            case 'groups':
                return <GroupSettings groups={groups} onEditGroup={handleEditGroup}/>;
            default:
                return (
                    <div className="p-8 flex items-center justify-center h-[calc(100vh-64px)]">
                        <p className="text-slate-400 italic">{tabLabels[activeTab] ?? activeTab} {t('common.info')}...</p>
                    </div>
                );
        }
    };

    return (
        <div className="flex min-h-screen bg-background-light">
            <Sidebar activeTab={activeTab === 'control' ? 'groups' : activeTab} setActiveTab={setActiveTab}/>

            <main className="flex-1 flex flex-col min-w-0">
                <Header title={tabLabels[activeTab === 'control' ? 'control' : activeTab] ?? t('tab.dashboard')}/>

                <div className="flex-1 overflow-y-auto">
                    {renderContent()}
                </div>
            </main>
        </div>
    );
}

export default function App() {
    return (
        <LanguageProvider>
            <AppContent/>
        </LanguageProvider>
    );
}

