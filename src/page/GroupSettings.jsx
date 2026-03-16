import React, { useEffect,useState } from 'react';
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
  const [groups, setGroups] = useState([]);
  const [deletingGroupId, setDeletingGroupId] = useState(null);

  const fetchGroups = React.useCallback(() => {
    return fetch(`/api/groups`, {
      method: "GET",
    })
        .then(res => res.json())
        .then(data => {
          setGroups(Array.isArray(data) ? data : []);
        })
        .catch(err => {
          console.error("群組獲取失敗:", err);
          setGroups([]);
        });
  }, []);

  useEffect(() => {
    fetchGroups();
    const interval = setInterval(fetchGroups, 1000); // 每 10 秒查詢一次
    return () => clearInterval(interval);
  }, [fetchGroups]);

  const handleDeleteGroup = async (group) => {
    if (!group?.id) {
      window.alert('找不到可刪除的群組 ID');
      return;
    }

    const confirmed = window.confirm(`確定要刪除群組「${group.name}」嗎？`);

    if (!confirmed) {
      return;
    }

    setDeletingGroupId(group.id);

    try {
      const response = await fetch(`/api/groups/${encodeURIComponent(group.id)}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      await fetchGroups();
    } catch (error) {
      console.error('群組刪除失敗:', error);
      window.alert('刪除群組失敗，請確認後端刪除 API 是否為 DELETE /api/groups/{id}');
    } finally {
      setDeletingGroupId(null);
    }
  };


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

              </motion.div>
            </div>

            {/* Active Groups Section */}
            <section>
              <div className="flex items-center justify-between mb-6 px-1">
                <h3 className="text-lg font-bold text-slate-800">啟用中的群組</h3>
                <button className="text-primary text-sm font-bold hover:underline">查看全部</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {groups.map((group) => (
                    <GroupCard
                        key={group.id}
                        name={group.name}
                        devices={group.devices}
                        onOpenSettings={() => {
                          setSelectedGroup(group);
                          setView('settings');
                        }}
                        onOpenControl={() => {
                          setSelectedGroup(group);
                          setView('control');
                        }}
                        onDelete={() => handleDeleteGroup(group)}
                        isDeleting={deletingGroupId === group.id}
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
                  <ConfigurationPanel
                      onClose={() => setShowConfig(false)}
                      onSaved={fetchGroups}
                  />
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
