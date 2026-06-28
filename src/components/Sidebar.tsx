import React from 'react';
import { 
  TbMenu2, 
  TbAdjustmentsHorizontal, 
  TbClock, 
  TbSettings, 
  TbMessagePlus,
  TbReceipt,
  TbActivity,
  TbUsers,
  TbLayoutDashboard,
  TbLogout,
  TbPlus,
  TbLayoutSidebar
} from 'react-icons/tb';
import { Button } from './Button';

export const Sidebar: React.FC = () => {
  return (
    <aside className="w-[260px] h-[calc(100vh-2rem)] my-4 ml-4 bg-stone-100 flex flex-col rounded-2xl text-stone-700 flex-shrink-0 shadow-1 overflow-hidden">
      
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-6 pb-4">
        <div className="flex items-center gap-2">
          {/* Mock Sand Logo */}
          <div className="flex -space-x-[2px] items-center">
            <div className="w-1.5 h-4 bg-black transform skew-x-[20deg]" />
            <div className="w-1.5 h-4 bg-black transform skew-x-[20deg]" />
            <div className="w-1.5 h-4 bg-black transform skew-x-[20deg]" />
          </div>
          <span className="font-semibold text-stone-900 text-lg">Telos</span>
        </div>
        <button className="text-stone-400 hover:text-stone-900 transition-colors">
          <TbLayoutSidebar className="w-5 h-5" />
        </button>
      </div>

      {/* Action Icons */}
      <div className="flex items-center gap-4 px-5 py-2">
        <button className="text-stone-400 hover:text-stone-900 transition-colors">
          <TbAdjustmentsHorizontal className="w-5 h-5" />
        </button>
        <button className="text-stone-400 hover:text-stone-900 transition-colors">
          <TbClock className="w-5 h-5" />
        </button>
        <button className="text-stone-400 hover:text-stone-900 transition-colors">
          <TbSettings className="w-5 h-5" />
        </button>
      </div>

      {/* New Invoice Button */}
      <div className="px-5 py-3">
        <Button 
          variant="primary" 
          fullWidth 
          leftIcon={<TbPlus className="w-5 h-5" />}
        >
          New Invoice
        </Button>
      </div>

      {/* Navigation */}
      <div className="px-3 pt-4 flex-1">
        <div className="px-2 pb-2">
          <span className="text-xs font-medium text-stone-400 uppercase tracking-wider">Pages</span>
        </div>
        <nav className="flex flex-col gap-0.5">
          <NavItem icon={<TbReceipt className="w-[18px] h-[18px]" />} label="Invoices" />
          <NavItem icon={<TbActivity className="w-[18px] h-[18px]" />} label="Activities" />
          <NavItem icon={<TbUsers className="w-[18px] h-[18px]" />} label="Clients" />
          <NavItem icon={<TbLayoutDashboard className="w-[18px] h-[18px]" />} label="Dashboard" />
          <NavItem icon={<TbSettings className="w-[18px] h-[18px]" />} label="Settings" />
        </nav>
      </div>

      {/* Footer Settings & Profile */}
      <div className="px-3 pb-4 flex flex-col gap-2">
        <button className="flex items-center gap-3 px-3 py-2.5 text-sm text-stone-600 hover:bg-stone-100 rounded-xl transition-colors w-full">
          <TbSettings className="w-5 h-5 text-stone-400" />
          <span className="font-medium">Settings</span>
        </button>
        
        <div className="flex items-center justify-between px-3 py-2 mt-1 hover:bg-stone-100 rounded-xl cursor-pointer transition-colors group">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-stone-300 text-stone-700 flex items-center justify-center text-xs font-bold">
              D
            </div>
            <span className="text-sm font-medium text-stone-900">Dimitri Lagouris</span>
          </div>
          <TbLogout className="w-5 h-5 text-stone-400 group-hover:text-stone-900 transition-colors" />
        </div>
      </div>
      
    </aside>
  );
};

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
}

const NavItem: React.FC<NavItemProps> = ({ icon, label, active }) => {
  return (
    <a 
      href="#" 
      className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-colors text-sm font-medium
        ${active ? 'bg-stone-200 text-stone-900' : 'text-stone-600 hover:bg-stone-200 hover:text-stone-900'}
      `}
    >
      <div className={`${active ? 'text-stone-900' : 'text-stone-400'} flex-shrink-0`}>
        {icon}
      </div>
      <span>{label}</span>
    </a>
  );
};
