import React, { useState } from 'react';
import { LakshyaProvider, useLakshya } from './context/LakshyaContext';
import { DashboardTab } from './components/DashboardTab';
import { GoalsTab } from './components/GoalsTab';
import { HabitsTab } from './components/HabitsTab';
import { AnalyticsTab } from './components/AnalyticsTab';
import { CalendarTab } from './components/CalendarTab';
import { ExamsTab } from './components/ExamsTab';
import { StudentSelectionScreen } from './components/StudentSelectionScreen';
import { RevisionTab } from './components/RevisionTab';
import { OtherTab } from './components/OtherTab';
import {
  Compass,
  ClipboardList,
  BookOpen,
  Flame,
  TrendingUp,
  Calendar as CalendarIcon,
  Send,
  Sliders,
  Type,
  Eye,
  Menu,
  X,
  RefreshCw,
  LogOut,
  ChevronRight,
  Sparkles,
  User,
  Settings,
  Trash2,
  Award,
  Grid
} from 'lucide-react';

export function AppContent() {
  const {
    largeText,
    highContrast,
    setLargeText,
    setHighContrast,
    goals,
    tasks,
    revisions,
    habits,
    todayDate,
    logActivity,
    activeStudentId,
    students,
    switchStudent,
    goalTypes,
    addGoalType,
    deleteGoalType
  } = useLakshya();

  const activeStudent = students.find(s => s.id === activeStudentId);

  // Active navigation tab
  const [activeTab, setActiveTab] = useState<string>('dashboard');

  // System controls popover toggles
  const [settingsOpen, setSettingsOpen] = useState<boolean>(false);
  const [isResetConfirming, setIsResetConfirming] = useState<boolean>(false);
  const [newTypeVal, setNewTypeVal] = useState<string>('');

  // Nav definitions with short names optimised for bottom tab bars
  const navigationItems = [
    { id: 'dashboard', label: 'Home', icon: Compass },
    { id: 'goals', label: 'Goals', icon: Sliders },
    { id: 'exams', label: 'Exams', icon: Award },
    { id: 'habits', label: 'Habits', icon: Flame },
    { id: 'analytics', label: 'Charts', icon: TrendingUp },
    { id: 'calendar', label: 'Calendar', icon: CalendarIcon },
    { id: 'other', label: 'Other', icon: Grid }
  ];

  if (!activeStudentId) {
    return (
      <div
        className={`min-h-screen transition-all duration-300 ${
          largeText ? 'text-lg' : 'text-base'
        } ${
          highContrast ? 'bg-white border-4 border-slate-900 font-bold' : 'bg-slate-50 text-slate-900'
        }`}
        id="student-selection-screen-container"
      >
        <StudentSelectionScreen />
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen flex flex-col transition-all duration-300 pb-20 sm:pb-24 ${
        largeText ? 'text-lg' : 'text-base'
      } ${
        highContrast ? 'bg-white border-4 border-slate-900 font-bold' : 'bg-slate-50 text-slate-900'
      }`}
      id="aistudio-lakshya-shell"
    >
      {/* UNIVERSAL COMPACT TOP HEADER */}
      <header className="sticky top-0 bg-white border-b border-slate-150 py-2.5 px-4 flex items-center justify-between z-30 shadow-3xs">
        {/* ONE TOP LEFT OPTION: Return to selection (Exit Workspace) */}
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            onClick={() => switchStudent(null)}
            className="w-9 h-9 rounded-full border border-slate-200 bg-white hover:bg-rose-50 hover:border-rose-150 text-slate-600 hover:text-rose-600 transition-all flex items-center justify-center cursor-pointer active:scale-90 shadow-3xs"
            title="Exit Workspace / Switch Profile"
          >
            <LogOut className="w-4 h-4" />
          </button>
          
          {activeStudent && (
            <>
              <span className="text-slate-200 select-none font-light">|</span>
              <div className="flex items-center gap-1.5 bg-indigo-50/70 border border-indigo-100 rounded-full px-3 py-1 max-w-[150px] truncate shadow-3xs">
                <User className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                <span className="font-extrabold text-slate-750 text-xs truncate" title={activeStudent.name}>
                  {activeStudent.name}
                </span>
              </div>
            </>
          )}
        </div>

        {/* ONE TOP RIGHT OPTION: Settings / Accessibility */}
        <div className="relative">
          <button
            onClick={() => setSettingsOpen(!settingsOpen)}
            className={`w-9 h-9 rounded-full border transition-all flex items-center justify-center cursor-pointer active:scale-90 shadow-3xs group ${
              settingsOpen 
                ? 'bg-indigo-50 border-indigo-200 text-indigo-600' 
                : 'bg-white border-slate-200 hover:bg-indigo-50 hover:border-indigo-150 text-slate-600 hover:text-indigo-600'
            }`}
            title="System Controls & Visual Settings"
          >
            <Settings className={`w-4 h-4 transition-transform duration-500 ease-out ${settingsOpen ? 'rotate-90' : 'group-hover:rotate-45'}`} />
          </button>

          {settingsOpen && (
            <>
              {/* Overlay clip trigger to dismiss settings */}
              <div className="fixed inset-0 z-40" onClick={() => setSettingsOpen(false)} />
              
              <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-xl shadow-xl p-4 z-50 space-y-4 animate-fade-in text-xs">
                <div>
                  <span className="text-[10px] font-bold tracking-widest uppercase text-slate-400 block mb-2 font-mono">Visual Settings</span>
                  
                  <div className="space-y-1">
                    <button
                      onClick={() => setHighContrast(!highContrast)}
                      className="w-full text-left py-2 px-2.5 rounded-lg text-xs font-medium hover:bg-slate-50 flex items-center justify-between gap-2 text-slate-600 hover:text-slate-800 cursor-pointer transition-colors"
                    >
                      <span className="flex items-center gap-2">
                        <Eye className="w-3.5 h-3.5 text-slate-400" /> High Contrast
                      </span>
                      <span className={`w-2 h-2 rounded-full ${highContrast ? 'bg-indigo-600' : 'bg-slate-300'}`} />
                    </button>

                    <button
                      onClick={() => setLargeText(!largeText)}
                      className="w-full text-left py-2 px-2.5 rounded-lg text-xs font-medium hover:bg-slate-50 flex items-center justify-between gap-2 text-slate-600 hover:text-slate-800 cursor-pointer transition-colors"
                    >
                      <span className="flex items-center gap-2">
                        <Type className="w-3.5 h-3.5 text-slate-400" /> Large Text Scale
                      </span>
                      <span className={`w-2 h-2 rounded-full ${largeText ? 'bg-indigo-600' : 'bg-slate-300'}`} />
                    </button>
                  </div>
                </div>

                {/* Custom Goal Types Manager */}
                <div className="border-t border-slate-100 pt-3">
                  <span className="text-[10px] font-bold tracking-widest uppercase text-slate-400 block mb-2 font-mono">Goal Types Settings</span>
                  <div className="space-y-2">
                    {/* List of current goal types */}
                    <div className="max-h-24 overflow-y-auto space-y-1.5 pr-1 border border-slate-150 rounded-lg p-1.5 bg-slate-50">
                      {goalTypes.map(gt => (
                        <div key={gt} className="flex items-center justify-between gap-1.5 bg-white px-2 py-1 rounded border border-slate-200">
                          <span className="font-semibold text-[11px] text-slate-700 truncate select-none">{gt}</span>
                          <button
                            type="button"
                            onClick={() => deleteGoalType(gt)}
                            className="text-slate-400 hover:text-red-505 p-0.5 rounded cursor-pointer transition-colors animate-pulse"
                            title={`Delete ${gt}`}
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                      {goalTypes.length === 0 && (
                        <p className="text-[10px] text-slate-400 text-center italic py-1">All types removed.</p>
                      )}
                    </div>
                    {/* Add new input */}
                    <div className="flex gap-1">
                      <input
                        type="text"
                        placeholder="New goal type..."
                        value={newTypeVal}
                        onChange={(e) => setNewTypeVal(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (newTypeVal.trim()) {
                              addGoalType(newTypeVal.trim());
                              setNewTypeVal('');
                            }
                          }
                        }}
                        className="w-full border border-slate-250 rounded px-2 py-1 text-[11px] outline-none focus:border-indigo-600 bg-white text-slate-800"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (newTypeVal.trim()) {
                            addGoalType(newTypeVal.trim());
                            setNewTypeVal('');
                          }
                        }}
                        className="bg-indigo-600 hover:bg-indigo-505 text-white font-black px-2 py-1 rounded cursor-pointer text-xs"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-3">
                  {isResetConfirming ? (
                    <div className="bg-rose-50 border border-rose-100 p-2.5 rounded-lg text-xs space-y-2">
                      <span className="text-rose-750 font-bold block leading-tight">Wipe & reset all profiles?</span>
                      <div className="flex gap-1.5 justify-end">
                        <button
                          onClick={() => {
                            localStorage.clear();
                            window.location.reload();
                          }}
                          className="px-2 py-1 bg-rose-650 hover:bg-rose-700 text-white font-extrabold rounded cursor-pointer text-[10px]"
                        >
                          Yes, Wipe
                        </button>
                        <button
                          onClick={() => setIsResetConfirming(false)}
                          className="px-2 py-1 bg-white border border-slate-200 text-slate-600 font-bold rounded cursor-pointer text-[10px] hover:bg-slate-50"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setIsResetConfirming(true)}
                      className="w-full text-left text-rose-600 hover:text-rose-750 py-2 px-2.5 rounded-lg text-xs font-semibold hover:bg-rose-50/50 flex items-center gap-2 cursor-pointer transition-all"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Reset All Database</span>
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </header>

      {/* MAIN CONTENT WORKSPACE VIEWPORT */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 overflow-x-hidden min-w-0" id="main-content-canvas-root">
        {/* Dynamic active screen router switcher */}
        {activeTab === 'dashboard' && <DashboardTab onNavigate={setActiveTab} />}
        {activeTab === 'goals' && <GoalsTab />}
        {activeTab === 'exams' && <ExamsTab />}
        {activeTab === 'habits' && <HabitsTab />}
        {activeTab === 'analytics' && <AnalyticsTab />}
        {activeTab === 'calendar' && <CalendarTab />}
        {activeTab === 'other' && <OtherTab />}
        {activeTab === 'revision' && <RevisionTab onBack={() => setActiveTab('dashboard')} />}
      </main>

      {/* FLOATABLE BOTTOM NAVIGATION BAR (WhatsApp / Instagram Inspired) */}
      {activeTab !== 'revision' && (
        <nav
          className="fixed bottom-0 left-0 right-0 sm:bottom-4 sm:left-1/2 sm:-translate-x-1/2 w-full sm:max-w-2xl bg-white/95 backdrop-blur-md border-t sm:border border-slate-200/80 shadow-md sm:rounded-2xl py-1.5 px-3 z-40 flex items-center justify-around select-none"
          id="bottom-tab-navigation"
        >
          {navigationItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setSettingsOpen(false); // Close settings dropdown on tab change
                }}
                className={`flex-1 flex flex-col items-center justify-center py-1 px-1.5 transition-all text-center relative cursor-pointer active:scale-95 ${
                  isActive
                    ? 'text-indigo-600 font-bold'
                    : 'text-slate-400 hover:text-slate-755'
                }`}
                style={{ minHeight: '44px' }}
              >
                <div className="relative">
                  <Icon className={`w-5 h-5 transition-transform ${isActive ? 'text-indigo-600 scale-110' : 'text-slate-400'}`} />
                </div>
                <span className="text-[9px] sm:text-[10px] mt-1 font-semibold truncate max-w-full">
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>
      )}
    </div>
  );
}

export default function App() {
  return (
    <LakshyaProvider>
      <AppContent />
    </LakshyaProvider>
  );
}
