import React from 'react';
import {
  RiEqualizerLine,
  RiTimeLine,
  RiSettings3Line,
  RiReceiptLine,
  RiPulseLine,
  RiGroup3Line,
  RiDashboardLine,
  RiLogoutBoxLine,
  RiAddLine,
  RiLayoutLeftLine
} from 'react-icons/ri';
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
          <div className="flex items-center">
            <svg className="w-5 h-auto text-black" viewBox="0 0 553 766" role="img" xmlns="http://www.w3.org/2000/svg">
              <title>Two-arc logo shape</title>
              <desc>Two comma-shaped arcs; the top-right arc's outer edge now flows smoothly into its straight approach to the paddle end.</desc>
              <path d="M 217.3,85.5 l 0,85.6 l 7.1,0 c 26.8,0.3 55.7,7.7 79.2,20.7 c 19.5,10.8 42.8,31.7 54.7,49.3 c 6.1,9.1 13.9,24 17.7,34.3 c 1.5,3.7 3.9,11.7 5.5,17.6 c 4.3,16.0 3.7,32.8 4.2,49.3 l 0,36.7 l 165.6,0 l 0,-7.7 c 1.9,-16.7 2.4,-57.6 0.9,-76.3 c -3.1,-38.1 -13.9,-78.9 -29.6,-111.9 c -10.1,-21.2 -18.8,-35.7 -32.9,-54.8 c -12.1,-16.3 -34.8,-40.4 -49.9,-52.9 c -46.1,-38.5 -102.3,-63.2 -162.4,-71.7 c -8.4,-1.2 -25.3,-2.5 -37.6,-2.9 l -22.4,0 l 0,84.8 z" fill="currentColor" />
              <path d="M 255.3,380.0 c -13.7,1.2 -34.9,5.2 -51.6,9.9 c -32.8,9.2 -64,24.5 -91.3,44.9 c -14.5,10.9 -36.7,32.1 -48,46.3 c -23.2,28.8 -42.9,66.4 -53.1,101.3 c -4.5,15.7 -8.4,35.9 -10,52.1 c -0.7,7.3 -1.3,39.7 -1.3,72.1 l 0,59.1 l 83.3,0 l 83.3,0 l 0,-7.7 c 0.1,-4.1 0.4,-30.1 0.7,-57.6 l 0.4,-50 l 2,-9.5 c 7.6,-36 33.9,-67.2 69.6,-82.8 c 11.3,-4.9 26.3,-8.3 38.3,-8.5 l 9.1,-0.3 l 0.3,-85.2 l 0.4,-85.1 l -13.3,0.3 c -7.3,0.1 -15.7,0.4 -18.7,0.7 z" fill="currentColor" />
            </svg>
          </div>
          <span className="font-semibold text-stone-900 text-lg">PandQ</span>
        </div>
        <button className="text-stone-400 hover:text-stone-900 transition-colors">
          <RiLayoutLeftLine className="w-5 h-5" />
        </button>
      </div>

      {/* Action Icons */}
      <div className="flex items-center gap-4 px-5 py-2">
        <button className="text-stone-400 hover:text-stone-900 transition-colors">
          <RiEqualizerLine className="w-5 h-5" />
        </button>
        <button className="text-stone-400 hover:text-stone-900 transition-colors">
          <RiTimeLine className="w-5 h-5" />
        </button>
        <button className="text-stone-400 hover:text-stone-900 transition-colors" onClick={() => onNavigate('settings')}>
          <RiSettings3Line className="w-5 h-5" />
        </button>
      </div>

      {/* New Invoice Button */}
      <div className="px-5 py-3">
        <Button
          variant="primary"
          fullWidth
          leftIcon={<RiAddLine className="w-5 h-5" />}
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
          <NavItem icon={<RiReceiptLine className="w-[18px] h-[18px]" />} label="Invoices" active={activePage === 'projects'} onClick={() => onNavigate('projects')} />
          <NavItem icon={<RiPulseLine className="w-[18px] h-[18px]" />} label="Activity" active={activePage === 'activities'} onClick={() => onNavigate('activities')} />
          <NavItem icon={<RiGroup3Line className="w-[18px] h-[18px]" />} label="Clients" active={activePage === 'clients'} onClick={() => onNavigate('clients')} />
          <NavItem icon={<RiDashboardLine className="w-[18px] h-[18px]" />} label="Dashboard" active={activePage === 'dashboard'} onClick={() => onNavigate('dashboard')} />
          <NavItem icon={<RiSettings3Line className="w-[18px] h-[18px]" />} label="Settings" active={activePage === 'settings'} onClick={() => onNavigate('settings')} />
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
          <RiLogoutBoxLine className="w-5 h-5 text-stone-400 group-hover:text-stone-900 transition-colors" />
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
      className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-200 ease-in-out text-sm font-regular
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

