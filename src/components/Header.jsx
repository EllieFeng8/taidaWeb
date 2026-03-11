import React from 'react';
import { Search, Settings, Bell, User } from 'lucide-react';

export const Header = ({ title }) => {
  return (
    <header className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-8 sticky top-0 z-10">
      <div className="flex items-center gap-4">
        <h2 className="text-lg font-bold text-slate-800">{title}</h2>
      </div>

      <div className="flex items-center gap-4">

        
        <div className="flex items-center gap-1">

          <button className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors relative">
            <Bell size={20} />
            <span className="absolute top-2 right-2 size-2 bg-red-500 rounded-full border-2 border-white"></span>
          </button>
        </div>
        
        <div className="h-8 w-[1px] bg-slate-200 mx-2"></div>
        
        <button className="flex items-center gap-2 p-1 pr-3 hover:bg-slate-50 rounded-full transition-colors">
          <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <User size={18} />
          </div>
        </button>
      </div>
    </header>
  );
};
