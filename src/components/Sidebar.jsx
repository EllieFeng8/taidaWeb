import React from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Bell, 
  ListTodo, 
  LogOut,
  Factory
} from 'lucide-react';

export const Sidebar = ({ activeTab, setActiveTab }) => {
  const navItems = [
    { id: 'dashboard', label: '設備總覽', icon: LayoutDashboard },
    { id: 'groups', label: '群組設定', icon: Users },
    { id: 'alerts', label: '警報', icon: Bell },
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
          <div className="size-10 rounded-full bg-slate-100 overflow-hidden border border-slate-200">
            <img 
              alt="使用者頭像" 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuCGO6gPGlnHA04z_s0iPST27_DOjzZuZQPcQwHgugMZFbXDyk6PnNdBoBsR-V8bCIHiba9c0ruWclBB-Ccu9t8SmnKY0wr7jnxeHrNitr3aE0wgsbFyN1QWqe0Z0-T-7lBnr2FP-z0PLGzioAYdJwLtYlUYlGl2GzOl_Dr4BnXEY2cM7G1pujDiRcDGUQNl1VAdEebHixQz8FpwMqQOODIwX3Mw_7dOtu3EdifP423E8CXICmubgIs1moBIwpret0ZIeFgr6vXzLuo" 
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold truncate">王志明</p>
            <p className="text-[10px] text-slate-500 truncate">資深主管</p>
          </div>
          <LogOut size={16} className="text-slate-400 group-hover:text-red-500 transition-colors" />
        </div>
      </div>
    </aside>
  );
};
