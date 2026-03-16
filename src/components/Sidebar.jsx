import React from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Bell, 
  ListTodo, 
  LogOut,
  Factory,
    History
} from 'lucide-react';

export const Sidebar = ({ activeTab, setActiveTab }) => {
  const navItems = [
    { id: 'dashboard', label: '設備總覽', icon: LayoutDashboard },
    { id: 'groups', label: '群組設定', icon: Users },
    { id: 'alerts', label: '警報', icon: Bell },
    { id: 'history', label: '歷史數據', icon: History },
  ];

  return (
    <aside className="w-64 border-r border-slate-200 bg-white hidden md:flex flex-col h-screen sticky top-0">
      <div className="p-6 flex items-center gap-3">
        <div className="size-10 bg-primary rounded-lg flex items-center justify-center text-white shadow-lg shadow-primary/20">
          <Factory size={24} />
        </div>
        <div>
          <h1 className="text-sm font-bold leading-tight">台達設備管理系統</h1>

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
            <item.icon size={20} fill={activeTab === item.id ? 'currentColor' : 'none'} fillOpacity={0.2} />
            <span className="text-sm">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-100">
        <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer group">


        </div>
      </div>
    </aside>
  );
};
