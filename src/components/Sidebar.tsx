import React from 'react';
import { 
  TbAdjustmentsHorizontal, 
  TbClock, 
  TbSettings, 
  TbReceipt,
  TbActivity,
  TbUsers,
  TbLayoutDashboard,
  TbLogout,
  TbPlus,
  TbLayoutSidebar
} from 'react-icons/tb';
import { Button } from './Button';
import { Page } from '../App';

interface SidebarProps {
  activePage: Page;
  onNavigate: (page: Page) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activePage, onNavigate }) => {
  return (
    <aside 
      style={{ backgroundColor: 'var(--bg-sidebar)' }}
      className="w-[260px] h-[calc(100vh-2rem)] my-4 ml-4 flex flex-col rounded-2xl text-stone-700 flex-shrink-0 shadow-1 overflow-hidden"
    >
      
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-6 pb-4">
        <div className="flex items-center gap-2">
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
        <button className="text-stone-400 hover:text-stone-900 transition-colors" onClick={() => onNavigate('settings')}>
          <TbSettings className="w-5 h-5" />
        </button>
      </div>

      {/* New Invoice Button */}
      <div className="px-5 py-3">
        <Button 
          variant="primary" 
          fullWidth 
          leftIcon={<TbPlus className="w-5 h-5" />}
          onClick={() => onNavigate('invoices')}
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
          <NavItem icon={<TbReceipt className="w-[18px] h-[18px]" />} label="Invoices" active={activePage === 'projects'} onClick={() => onNavigate('projects')} />
          <NavItem icon={<TbActivity className="w-[18px] h-[18px]" />} label="Activities" active={activePage === 'activities'} onClick={() => onNavigate('activities')} />
          <NavItem icon={<TbUsers className="w-[18px] h-[18px]" />} label="Clients" active={activePage === 'clients'} onClick={() => onNavigate('clients')} />
          <NavItem icon={<TbLayoutDashboard className="w-[18px] h-[18px]" />} label="Dashboard" active={activePage === 'dashboard'} onClick={() => onNavigate('dashboard')} />
          <NavItem icon={<TbSettings className="w-[18px] h-[18px]" />} label="Settings" active={activePage === 'settings'} onClick={() => onNavigate('settings')} />
        </nav>
      </div>

      {/* Footer Settings & Profile */}
      <div className="px-3 pb-4 flex flex-col gap-2">
        <div className="flex items-center justify-between px-3 py-2 hover:bg-stone-200 rounded-xl cursor-pointer transition-colors duration-200 group">
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
  onClick: () => void;
}

const NavItem: React.FC<NavItemProps> = ({ icon, label, active, onClick }) => {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-200 ease-in-out text-sm font-medium
        ${active ? 'bg-stone-200 text-stone-900' : 'text-stone-600 hover:bg-stone-200 hover:text-stone-900'}
      `}
    >
      <div className={`${active ? 'text-stone-900' : 'text-stone-400'} flex-shrink-0 transition-colors duration-200`}>
        {icon}
      </div>
      <span>{label}</span>
    </button>
  );
};

