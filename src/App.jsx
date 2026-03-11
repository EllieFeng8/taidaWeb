import React, { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import GroupSettings from './page/GroupSettings.jsx';
import { GroupControl } from './components/GroupControl';
import { Dashboard } from './page/Dashboard';
import Alarm from './page/Alarm.jsx';
import IndustrialControl from './page/IndustrialControl.jsx';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const tabLabels = {
    dashboard: '設備總覽',
    groups: '群組設定',
    alerts: '警報',
    logs: '系統紀錄',
    control: '群組控制',
    industrialControl: '工業控制'
  };

  const [groups] = useState([
    {
      id: 'G1',
      name: '群組 1',
      description: '主生產區的一次配電線組裝叢集。',
      devices: ['設備 1', '設備 2'],
      status: 'operational',
      createdAt: '2 天前'
    },
    {
      id: 'G2',
      name: '群組 2',
      description: '用於最終檢驗的次級測試與品質控制單元。',
      devices: ['設備 3', '設備 4'],
      status: 'maintenance',
      createdAt: '5 天前'
    }
  ]);

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
        return <Dashboard onSelectDevice={handleOpenDevice} />;
      case 'alerts':
        return <Alarm />;
      case 'groups':
        return <GroupSettings groups={groups} onEditGroup={handleEditGroup} />;
      default:
        return (
          <div className="p-8 flex items-center justify-center h-[calc(100vh-64px)]">
            <p className="text-slate-400 italic">{tabLabels[activeTab] ?? activeTab} 的內容即將推出...</p>
          </div>
        );
    }
  };

  return (
    <div className="flex min-h-screen bg-background-light">
      <Sidebar activeTab={activeTab === 'control' ? 'groups' : activeTab} setActiveTab={setActiveTab} />
      
      <main className="flex-1 flex flex-col min-w-0">
        <Header title={tabLabels[activeTab === 'control' ? 'control' : activeTab] ?? '設備總覽'} />
        
        <div className="flex-1 overflow-y-auto">
          {renderContent()}
        </div>
      </main>
    </div>
  );
}
