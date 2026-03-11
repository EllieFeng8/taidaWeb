import React from 'react';
// import { Plus } from 'lucide-react';
// import Sidebar from './components/Sidebar';
// import Header from './components/Header';
import { GroupCard, AddGroupCard } from '../components/GroupCard';
import ConfigurationPanel from '../components/ConfigurationPanel';
import { GroupControl } from '../components/GroupControl';
import GroupSet from '../components/GroupSet';
import { motion } from 'motion/react';

export default function GroupSettings() {
  const [showConfig, setShowConfig] = React.useState(false);
  const [selectedGroup, setSelectedGroup] = React.useState(null);
  const [view, setView] = React.useState('list');

  const activeGroups = [
    {
      name: '群組 1',
      description: '主要配電產線的組裝叢集。',
      devices: ['設備 1', '設備 2'],
      status: '運行中',
      created: '建立於 2 天前'
    },
    {
      name: '群組 2',
      description: '次級測試與品質控制單元。',
      devices: ['設備 3', '設備 4'],
      status: '維護中',
      created: '建立於 5 天前'
    }
  ];

  if (view === 'settings' && selectedGroup) {
    return <GroupSet group={selectedGroup} onBack={() => setView('list')} />;
  }

  if (view === 'control' && selectedGroup) {
    return <GroupControl group={selectedGroup} onBack={() => setView('list')} />;
  }

  return (
      <div className="flex min-h-screen font-sans bg-background-light">

        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">

          <div className="flex-1 overflow-y-auto p-8 space-y-10">
            {/* Welcome Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
              >
                <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">管理設備群組</h1>
                <p className="text-slate-500 mt-1.5 text-lg">建立並設定群組，以進行同步化工業自動控制。</p>
              </motion.div>
            </div>

            {/* Active Groups Section */}
            <section>
              <div className="flex items-center justify-between mb-6 px-1">
                <h3 className="text-lg font-bold text-slate-800">啟用中的群組</h3>
                <button className="text-primary text-sm font-bold hover:underline">查看全部</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {activeGroups.map((group) => (
                    <GroupCard
                        key={group.name}
                        name={group.name}
                        description={group.description}
                        devices={group.devices}
                        status={group.status}
                        created={group.created}
                        onOpenSettings={(groupData) => {
                          setSelectedGroup(groupData);
                          setView('settings');
                        }}
                        onOpenControl={(groupData) => {
                          setSelectedGroup(groupData);
                          setView('control');
                        }}
                    />
                ))}
                <AddGroupCard onClick={() => setShowConfig(true)} />
              </div>
            </section>

            {/* Divider */}
            <div className="h-px bg-slate-200 w-full opacity-60"></div>

            {/* Configuration Panel */}
            {showConfig && (
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                >
                  <ConfigurationPanel onClose={() => setShowConfig(false)} />
                </motion.div>
            )}



            <footer className="pt-8 pb-4 text-center">
              <p className="text-xs text-slate-400 font-medium tracking-wide uppercase">
                Industrial Control Systems v4.2.0 • © 2026 Global Automation Corp
              </p>
            </footer>
          </div>
        </main>
      </div>
  );
}
