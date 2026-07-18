import React, { useState, useEffect } from 'react';
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
} from 'react-icons/react-icons/ri';
import { Button } from './Button';
import { Page } from '../App';
import { HorizontalProgress } from './HorizontalProgress';

// React-icons standard import fallback since the above is weird
import * as Icons from 'react-icons/ri';

const {
  RiEqualizerLine: EqIcon,
  RiTimeLine: TimeIcon,
  RiSettings3Line: SetIcon,
  RiReceiptLine: RecIcon,
  RiPulseLine: PulseIcon,
  RiGroup3Line: GroupIcon,
  RiDashboardLine: DashIcon,
  RiLogoutBoxLine: LogoutIcon,
  RiAddLine: AddIcon,
  RiLayoutLeftLine: LayoutLeftIcon
} = Icons;

interface SidebarProps {
  activePage: Page;
  onNavigate: (page: Page) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activePage, onNavigate }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [orgName, setOrgName] = useState('My business');
  const [completedSteps, setCompletedSteps] = useState(0);
  const [isCardDismissed, setIsCardDismissed] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await window.electronAPI.getSettings();
        setOrgName(settings.setting_org_name || 'My business');

        const isOrgNameSet = (settings.setting_org_name || '').trim() !== '' && (settings.setting_org_name || '').trim() !== 'Your Business';
        const isOrgAbnSet = (settings.setting_org_abn || '').trim() !== '';
        const isOrgAddressSet = (settings.setting_org_address || '').trim() !== '' && (settings.setting_org_address || '').trim() !== 'Your address here';
        const isOrgEmailSet = (settings.setting_org_email || '').trim() !== '';
        const isBankSet = (settings.setting_bsb || '').trim() !== '' && (settings.setting_account_number || '').trim() !== '';

        const completed = [isOrgNameSet, isOrgAbnSet, isOrgAddressSet, isOrgEmailSet, isBankSet].filter(Boolean).length;
        setCompletedSteps(completed);
      } catch (err) {
        console.error('Failed to load settings in sidebar', err);
      }
    };
    loadSettings();

    // Re-fetch if settings are updated
    const handleSettingsUpdated = () => loadSettings();
    window.addEventListener('settings-updated', handleSettingsUpdated);
    return () => window.removeEventListener('settings-updated', handleSettingsUpdated);
  }, []);

  return (
    <aside
      style={{ backgroundColor: 'var(--bg-sidebar)' }}
      className={`h-[calc(100vh-2rem)] my-4 ml-4 flex flex-col rounded-2xl text-stone-700 flex-shrink-0 shadow-1 overflow-hidden transition-all duration-300 ease-in-out ${
        isCollapsed ? 'w-[64px]' : 'w-[260px]'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-6 pb-4 whitespace-nowrap overflow-hidden">
        <div 
          className="flex items-center gap-2 cursor-pointer"
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          <div className="flex items-center justify-center w-5 h-5 flex-shrink-0">
            <svg className="w-5 h-auto text-black" viewBox="0 0 553 766" role="img" xmlns="http://www.w3.org/2000/svg">
              <title>Two-arc logo shape</title>
              <desc>Two comma-shaped arcs; the top-right arc's outer edge now flows smoothly into its straight approach to the paddle end.</desc>
              <path d="M 217.3,85.5 l 0,85.6 l 7.1,0 c 26.8,0.3 55.7,7.7 79.2,20.7 c 19.5,10.8 42.8,31.7 54.7,49.3 c 6.1,9.1 13.9,24 17.7,34.3 c 1.5,3.7 3.9,11.7 5.5,17.6 c 4.3,16.0 3.7,32.8 4.2,49.3 l 0,36.7 l 165.6,0 l 0,-7.7 c 1.9,-16.7 2.4,-57.6 0.9,-76.3 c -3.1,-38.1 -13.9,-78.9 -29.6,-111.9 c -10.1,-21.2 -18.8,-35.7 -32.9,-54.8 c -12.1,-16.3 -34.8,-40.4 -49.9,-52.9 c -46.1,-38.5 -102.3,-63.2 -162.4,-71.7 c -8.4,-1.2 -25.3,-2.5 -37.6,-2.9 l -22.4,0 l 0,84.8 z" fill="currentColor" />
              <path d="M 255.3,380.0 c -13.7,1.2 -34.9,5.2 -51.6,9.9 c -32.8,9.2 -64,24.5 -91.3,44.9 c -14.5,10.9 -36.7,32.1 -48,46.3 c -23.2,28.8 -42.9,66.4 -53.1,101.3 c -4.5,15.7 -8.4,35.9 -10,52.1 c -0.7,7.3 -1.3,39.7 -1.3,72.1 l 0,59.1 l 83.3,0 l 83.3,0 l 0,-7.7 c 0.1,-4.1 0.4,-30.1 0.7,-57.6 l 0.4,-50 l 2,-9.5 c 7.6,-36 33.9,-67.2 69.6,-82.8 c 11.3,-4.9 26.3,-8.3 38.3,-8.5 l 9.1,-0.3 l 0.3,-85.2 l 0.4,-85.1 l -13.3,0.3 c -7.3,0.1 -15.7,0.4 -18.7,0.7 z" fill="currentColor" />
            </svg>
          </div>
          <span className={`font-semibold text-stone-900 text-lg transition-all duration-300 ${isCollapsed ? 'max-w-0 opacity-0 overflow-hidden' : 'max-w-[100px] opacity-100'}`}>PandQ</span>
        </div>
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={`text-stone-400 hover:text-stone-900 transition-all duration-300 flex-shrink-0 ${
            isCollapsed ? 'max-w-0 opacity-0 pointer-events-none' : 'max-w-[20px] opacity-100'
          }`}
        >
          <LayoutLeftIcon className="w-5 h-5" />
        </button>
      </div>

      {/* Action Icons */}
      <div className={`flex items-center gap-4 px-5 py-2 transition-all duration-300 ${
        isCollapsed ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}>
        <button className="text-stone-400 hover:text-stone-900 transition-colors">
          <EqIcon className="w-5 h-5" />
        </button>
        <button className="text-stone-400 hover:text-stone-900 transition-colors">
          <TimeIcon className="w-5 h-5" />
        </button>
        <button className="text-stone-400 hover:text-stone-900 transition-colors" onClick={() => onNavigate('settings')}>
          <SetIcon className="w-5 h-5" />
        </button>
      </div>

      {/* New Invoice Button */}
      <div className={`py-3 transition-all duration-300 overflow-hidden ${isCollapsed ? 'px-3' : 'px-5'}`}>
        <Button
          variant="primary"
          onClick={() => onNavigate('invoices')}
          title={isCollapsed ? "New Invoice" : undefined}
          className={`transition-all duration-300 flex items-center justify-center whitespace-nowrap overflow-hidden ${
            isCollapsed ? 'w-10 h-10 !px-0 rounded-xl' : 'w-full'
          }`}
        >
          <div className="flex items-center justify-center">
            <div className="flex items-center flex-shrink-0">
              <AddIcon className="w-5 h-5" />
            </div>
            <span className={`transition-all duration-300 overflow-hidden ${
              isCollapsed ? 'max-w-0 opacity-0 ml-0' : 'max-w-[150px] opacity-100 ml-2'
            }`}>
              New Invoice
            </span>
          </div>
        </Button>
      </div>

      {/* Navigation */}
      <div className="pt-4 flex-1 overflow-hidden">
        <div className={`px-5 transition-all duration-300 overflow-hidden ${
          isCollapsed ? 'opacity-0 max-h-0 pb-0' : 'opacity-100 max-h-[30px] pb-2'
        }`}>
          <span className="text-xs font-medium text-stone-400 uppercase tracking-wider whitespace-nowrap">Pages</span>
        </div>
        <nav className={`flex flex-col gap-0.5 transition-all duration-300 ${isCollapsed ? 'px-3' : 'px-3'}`}>
          <NavItem isCollapsed={isCollapsed} icon={<RecIcon className="w-[18px] h-[18px]" />} label="Invoices" active={activePage === 'projects'} onClick={() => onNavigate('projects')} />
          <NavItem isCollapsed={isCollapsed} icon={<DashIcon className="w-[18px] h-[18px]" />} label="Dashboard" active={activePage === 'dashboard'} onClick={() => onNavigate('dashboard')} />
          <NavItem isCollapsed={isCollapsed} icon={<GroupIcon className="w-[18px] h-[18px]" />} label="Clients" active={activePage === 'clients'} onClick={() => onNavigate('clients')} />
          <NavItem isCollapsed={isCollapsed} icon={<PulseIcon className="w-[18px] h-[18px]" />} label="Activity" active={activePage === 'activities'} onClick={() => onNavigate('activities')} />
          <NavItem isCollapsed={isCollapsed} icon={<SetIcon className="w-[18px] h-[18px]" />} label="Settings" active={activePage === 'settings'} onClick={() => onNavigate('settings')} />
        </nav>
      </div>

      {/* Setup Card */}
      {completedSteps < 5 && !isCardDismissed && (
        <div 
          onClick={() => onNavigate('settings')}
          className={`bg-stone-50 border border-stone-200 rounded-xl cursor-pointer hover:bg-stone-100 transition-all duration-300 overflow-hidden mx-3 mb-2 flex flex-col flex-shrink-0 shadow-sm relative ${
            isCollapsed ? 'max-h-0 opacity-0 p-0 border-transparent mb-0' : 'max-h-[120px] opacity-100 p-3'
          }`}
        >
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setIsCardDismissed(true);
            }}
            className="absolute top-3 right-3 text-stone-400 hover:text-stone-600 transition-colors"
            title="Dismiss"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <h4 className="text-sm font-semibold text-stone-900 mb-1 pr-4 truncate">Finish setting up</h4>
          <div className="flex items-center justify-between text-xs text-stone-500 mb-3 truncate">
            <span>{completedSteps}/5 steps completed</span>
          </div>
          <HorizontalProgress current={completedSteps} total={5} />
        </div>
      )}

      {/* Footer Settings & Profile */}
      <div className={`pb-4 flex flex-col gap-2 transition-all duration-300 overflow-hidden ${isCollapsed ? 'px-3' : 'px-3'}`}>
        <div 
          className={`flex items-center rounded-xl transition-all duration-300 hover:bg-stone-200 cursor-pointer group whitespace-nowrap overflow-hidden ${
            isCollapsed ? 'p-1' : 'px-3 py-2'
          }`}
          title={isCollapsed ? orgName : undefined}
        >
          <div className="w-8 h-8 rounded-full bg-stone-300 text-stone-700 flex items-center justify-center text-xs font-bold flex-shrink-0 uppercase">
            {orgName.charAt(0)}
          </div>
          <div className={`flex items-center justify-between transition-all duration-300 overflow-hidden ${
            isCollapsed ? 'max-w-0 opacity-0 ml-0' : 'max-w-[200px] opacity-100 ml-3 flex-1'
          }`}>
            <span className="text-sm font-medium text-stone-900 truncate pr-2">{orgName}</span>
            <LogoutIcon className="w-5 h-5 text-stone-400 group-hover:text-stone-900 transition-colors flex-shrink-0" />
          </div>
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
  isCollapsed?: boolean;
}

const NavItem: React.FC<NavItemProps> = ({ icon, label, active, onClick, isCollapsed }) => {
  return (
    <button
      onClick={onClick}
      title={isCollapsed ? label : undefined}
      className={`w-full flex items-center transition-all duration-300 ease-in-out text-sm font-regular whitespace-nowrap overflow-hidden
        h-10 px-3 rounded-xl
        ${active ? 'bg-stone-200 text-stone-900' : 'text-stone-600 hover:bg-stone-200 hover:text-stone-900'}
      `}
    >
      <div className={`flex items-center justify-center w-[18px] h-[18px] flex-shrink-0 transition-colors duration-200 ${
        active ? 'text-stone-900' : 'text-stone-400'
      }`}>
        {icon}
      </div>
      <span className={`transition-all duration-300 overflow-hidden text-left ${
        isCollapsed ? 'max-w-0 opacity-0 ml-0' : 'max-w-[150px] opacity-100 ml-3'
      }`}>
        {label}
      </span>
    </button>
  );
};

