import React, { useState, useEffect } from 'react';
import * as Icons from 'react-icons/ri';
import { Button } from '../components/common/Button.tsx';
import { Page } from '../App';
import { HorizontalProgress } from '../components/common/HorizontalProgress.tsx';
import { TactileIconBox } from '../components/common/TactileIconBox.tsx';
import { getSidebarGroups, getRoutesByGroup } from '../routes/routes';

const {
  RiEqualizerLine: EqIcon,
  RiTimeLine: TimeIcon,
  RiSettings3Line: SetIcon,
  RiLayoutLeftLine: LayoutLeftIcon,
  RiAddLine: AddIcon,
  RiLogoutBoxLine: LogoutIcon,
  RiMagicLine: MagicIcon,
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
      }

      catch (err) {
        console.error('Failed to load settings in sidebar', err);
      }
    };

    loadSettings();

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
      <div className="flex items-center justify-between px-3 pt-6 pb-4 whitespace-nowrap overflow-hidden">
        <div 
          className="flex items-center gap-2 cursor-pointer pl-1"
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          <div className="flex items-center justify-center w-8 h-8 flex-shrink-0">
            <svg className="w-5 h-auto text-black" viewBox="0 0 553 766" role="img" xmlns="http://www.w3.org/2000/svg">
              <title>Two-arc logo shape</title>
              <desc>Two comma-shaped arcs; the top-right arc's outer edge now flows smoothly into its straight approach to the paddle end.</desc>
              <path d="M 217.3,85.5 l 0,85.6 l 7.1,0 c 26.8,0.3 55.7,7.7 79.2,20.7 c 19.5,10.8 42.8,31.7 54.7,49.3 c 6.1,9.1 13.9,24 17.7,34.3 c 1.5,3.7 3.9,11.7 5.5,17.6 c 4.3,16.0 3.7,32.8 4.2,49.3 l 0,36.7 l 165.6,0 l 0,-7.7 c 1.9,-16.7 2.4,-57.6 0.9,-76.3 c -3.1,-38.1 -13.9,-78.9 -29.6,-111.9 c -10.1,-21.2 -18.8,-35.7 -32.9,-54.8 c -12.1,-16.3 -34.8,-40.4 -49.9,-52.9 c -46.1,-38.5 -102.3,-63.2 -162.4,-71.7 c -8.4,-1.2 -25.3,-2.5 -37.6,-2.9 l -22.4,0 l 0,84.8 z" fill="currentColor" />
              <path d="M 255.3,380.0 c -13.7,1.2 -34.9,5.2 -51.6,9.9 c -32.8,9.2 -64,24.5 -91.3,44.9 c -14.5,10.9 -36.7,32.1 -48,46.3 c -23.2,28.8 -42.9,66.4 -53.1,101.3 c -4.5,15.7 -8.4,35.9 -10,52.1 c -0.7,7.3 -1.3,39.7 -1.3,72.1 l 0,59.1 l 83.3,0 l 83.3,0 l 0,-7.7 c 0.1,-4.1 0.4,-30.1 0.7,-57.6 l 0.4,-50 l 2,-9.5 c 7.6,-36 33.9,-67.2 69.6,-82.8 c 11.3,-4.9 26.3,-8.3 38.3,-8.5 l 9.1,-0.3 l 0.3,-85.2 l 0.4,-85.1 l -13.3,0.3 c -7.3,0.1 -15.7,0.4 -18.7,0.7 z" fill="currentColor" />
            </svg>
          </div>
          <span className={`font-semibold text-stone-900 text-lg transition-all duration-300 ease-in-out ${
            isCollapsed ? 'max-w-0 opacity-0 overflow-hidden' : 'max-w-[100px] opacity-100'
          }`}>PandQ</span>
        </div>
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={`text-stone-400 hover:text-stone-900 transition-all duration-300 ease-in-out flex-shrink-0 pr-1 ${
            isCollapsed ? 'max-w-0 opacity-0 pointer-events-none' : 'max-w-[20px] opacity-100'
          }`}
        >
          <LayoutLeftIcon className="w-5 h-5" />
        </button>
      </div>

      {/* Action Icons */}
      <div className={`flex items-center gap-4 px-4 py-2 transition-all duration-300 ease-in-out overflow-hidden ${
        isCollapsed ? 'opacity-0 max-h-0 py-0 pointer-events-none' : 'opacity-100 max-h-12'
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
      <div className="px-3 py-2 flex-shrink-0">
        <Button
          variant="primary"
          onClick={() => onNavigate('invoice-editor')}
          title={isCollapsed ? "New Invoice" : undefined}
          className="w-full h-10 flex items-center justify-center whitespace-nowrap overflow-hidden transition-all duration-300 ease-in-out"
        >
          <div className="flex flex-row items-center justify-center">
            <div className="flex items-center justify-center w-5 h-5 flex-shrink-0">
              <AddIcon className="w-5 h-5" />
            </div>
            <span className={`transition-all duration-300 ease-in-out overflow-hidden text-left ${
              isCollapsed ? 'max-w-0 opacity-0 ml-0' : 'max-w-[150px] opacity-100 ml-2'
            }`}>
              New Invoice
            </span>
          </div>
        </Button>
      </div>

      {/* Navigation */}
      <div className="pt-2 flex-1 overflow-hidden">
        {getSidebarGroups().map((group) => (
          <div key={group}>
            <div className={`px-4 transition-all duration-300 ease-in-out overflow-hidden ${
              isCollapsed ? 'opacity-0 max-h-0 pb-0' : 'opacity-100 max-h-[30px] pb-2'
            }`}>
              <span className="text-xs font-medium text-stone-400 uppercase tracking-wider whitespace-nowrap">{group}</span>
            </div>
            <nav className="flex flex-col gap-0.5 px-3">
              {getRoutesByGroup(group).map((route) => {
                const IconComponent = route.icon;

                return (
                  <NavItem
                    key={route.key}
                    isCollapsed={isCollapsed}
                    icon={<IconComponent className="w-[18px] h-[18px]" />}
                    label={route.label}
                    active={activePage === route.key}
                    onClick={() => onNavigate(route.key)}
                  />
                );
              })}
            </nav>
          </div>
        ))}
      </div>

      {/* Setup Card */}
      {completedSteps < 5 && !isCardDismissed && (
        <div 
          className={`bg-white rounded-2xl shadow-1 p-4 mx-3 mb-3 flex flex-col gap-3 flex-shrink-0 transition-all duration-300 ease-in-out overflow-hidden ${
            isCollapsed ? 'max-h-0 opacity-0 p-0 mb-0' : 'opacity-100 max-h-64'
          }`}
        >
          <TactileIconBox
            icon={MagicIcon}
            size="sm"
          />

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-stone-900">Finish setting up</span>
              <span className="text-stone-400 font-normal">{completedSteps} / 5 completed</span>
            </div>
            <HorizontalProgress current={completedSteps} total={5} className="!h-1.5" barColor="#1c1917" />
          </div>

          <Button
            variant="outline"
            size="sm"
            fullWidth
            onClick={() => onNavigate('settings')}
            className="!h-9 text-xs font-semibold text-stone-900 bg-white border-stone-200 hover:bg-stone-50 rounded-xl shadow-2xs"
          >
            Continue
          </Button>
        </div>
      )}

      {/* Footer Settings & Profile */}
      <div className="pb-4 px-3 flex flex-col gap-2 flex-shrink-0">
        <div 
          className="w-full h-10 flex items-center rounded-xl transition-colors duration-150 hover:bg-stone-200 cursor-pointer group whitespace-nowrap overflow-hidden px-1"
          title={isCollapsed ? orgName : undefined}
        >
          <div className="w-8 h-8 rounded-full bg-stone-300 text-stone-700 flex items-center justify-center text-xs font-bold flex-shrink-0 uppercase ml-0.5">
            {orgName.charAt(0)}
          </div>
          <div className={`flex items-center justify-between transition-all duration-300 ease-in-out overflow-hidden ${
            isCollapsed ? 'max-w-0 opacity-0 ml-0' : 'max-w-[200px] opacity-100 ml-2.5 flex-1'
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
      className={`w-full h-10 flex items-center transition-colors duration-150 text-sm font-regular whitespace-nowrap overflow-hidden rounded-xl px-2.5
        ${active ? 'bg-stone-200 text-stone-900' : 'text-stone-600 hover:bg-stone-200 hover:text-stone-900'}
      `}
    >
      <div className={`flex items-center justify-center w-5 h-5 flex-shrink-0 transition-colors duration-200 ${
        active ? 'text-stone-900' : 'text-stone-400'
      }`}>
        {icon}
      </div>
      <span className={`transition-all duration-300 ease-in-out overflow-hidden text-left ${
        isCollapsed ? 'max-w-0 opacity-0 ml-0' : 'max-w-[150px] opacity-100 ml-2.5'
      }`}>
        {label}
      </span>
    </button>
  );
};
