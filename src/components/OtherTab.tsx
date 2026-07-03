import React, { useState, useRef } from 'react';
import { useLakshya } from '../context/LakshyaContext';
import { WhatsAppTab } from './WhatsAppTab';
import { FlowchartTab } from './FlowchartTab';
import {
  Send,
  Users,
  Sliders,
  ClipboardList,
  Trash2,
  ChevronLeft,
  Plus,
  RefreshCw,
  User,
  Activity,
  AlertTriangle,
  UserCheck,
  ChevronRight,
  Database,
  ArrowRight,
  Layout,
  Download,
  Upload
} from 'lucide-react';

export const OtherTab: React.FC = () => {
  const {
    students,
    switchStudent,
    createStudent,
    updateStudentRole,
    renameStudent,
    deleteStudent,
    importStudent,
    exportStudent,
    goalTypes,
    addGoalType,
    deleteGoalType,
    activities,
    largeText,
    highContrast,
    activeStudentId,
    logActivity
  } = useLakshya();

  const [activeSubTool, setActiveSubTool] = useState<'sync' | 'profiles' | 'types' | 'logs' | 'reset' | 'flowcharts' | null>(null);

  // States for sub-profiles
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentRole, setNewStudentRole] = useState<'Student' | 'Professional' | 'Other'>('Student');
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [editedName, setEditedName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // States for types
  const [newTypeVal, setNewTypeVal] = useState('');

  // States for reset
  const [isResetConfirming, setIsResetConfirming] = useState(false);

  const activeStudents = students.filter(s => !s.deletedAt);

  const activeStudent = students.find(s => s.id === activeStudentId);

  // Filter logs by categories or display latest
  const sortedActivities = [...activities].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentName.trim()) return;
    createStudent(newStudentName.trim(), newStudentRole);
    setNewStudentName('');
  };

  const handleSaveRename = (e: React.MouseEvent | React.KeyboardEvent, id: string) => {
    e.stopPropagation();
    if (!editedName.trim()) return;
    renameStudent(id, editedName.trim());
    setEditingStudentId(null);
  };

  return (
    <div className="space-y-6 animate-fade-in" id="other-tab-root">
      {/* If sub-tool is selected, render it with a custom back button */}
      {activeSubTool === 'sync' && (
        <WhatsAppTab onBack={() => setActiveSubTool(null)} />
      )}

      {activeSubTool === 'flowcharts' && (
        <FlowchartTab onBack={() => setActiveSubTool(null)} />
      )}

      {activeSubTool === 'profiles' && (
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveSubTool(null)}
              className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition active:scale-95 cursor-pointer border border-slate-200 bg-white"
              title="Back to menu"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-6 h-6 text-indigo-600" />
                <span>Student & Professional Profiles</span>
              </h1>
              <p className="text-xs text-slate-500">Manage multiple profiles for different study plans, children, or schedules.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            {/* Create profile panel */}
            <div className="md:col-span-5 bg-white border border-slate-200 rounded-xl p-5 space-y-4 shadow-3xs">
              <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-1.5">
                <User className="w-4 h-4 text-indigo-500" />
                <span>Create New Profile</span>
              </h3>
              <form onSubmit={handleCreateSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Name</label>
                  <input
                    type="text"
                    required
                    placeholder="Enter name (e.g. Aditya, Ravi)"
                    value={newStudentName}
                    onChange={(e) => setNewStudentName(e.target.value)}
                    className="w-full bg-slate-50/50 focus:bg-white border border-slate-250 focus:border-indigo-500 rounded-lg px-3 py-2 text-xs outline-none text-slate-800 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Role Mode</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['Student', 'Professional', 'Other'] as const).map(role => (
                      <button
                        key={role}
                        type="button"
                        onClick={() => setNewStudentRole(role)}
                        className={`py-2 px-2 border rounded-lg text-[11px] font-bold cursor-pointer transition-all ${
                          newStudentRole === role
                            ? 'bg-indigo-50 border-indigo-300 text-indigo-700 font-extrabold'
                            : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                        }`}
                      >
                        {role}
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={!newStudentName.trim()}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-extrabold py-2 px-4 rounded-xl text-xs cursor-pointer shadow-3xs transition"
                >
                  Create & Activate Profile
                </button>
              </form>
            </div>

            {/* List and manage profiles */}
            <div className="md:col-span-7 bg-white border border-slate-200 rounded-xl p-5 space-y-4 shadow-3xs">
              <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2 flex items-center justify-between">
                <span>Active Profiles ({activeStudents.length})</span>
                <span className="text-[10px] font-bold text-slate-400">Click arrow to switch</span>
              </h3>

              <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1">
                {activeStudents.map(student => {
                  const isActive = student.id === activeStudentId;
                  const isEditing = editingStudentId === student.id;

                  return (
                    <div
                      key={student.id}
                      onClick={() => !isEditing && switchStudent(student.id)}
                      className={`group border rounded-xl p-3 flex items-center justify-between gap-3 transition-all cursor-pointer ${
                        isActive
                          ? 'bg-indigo-50/40 border-indigo-200 shadow-4xs'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                          isActive ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {isActive ? <UserCheck className="w-4 h-4" /> : <User className="w-4 h-4" />}
                        </div>

                        <div className="min-w-0 flex-1">
                          {isEditing ? (
                            <div className="flex gap-1.5" onClick={e => e.stopPropagation()}>
                              <input
                                type="text"
                                value={editedName}
                                onChange={e => setEditedName(e.target.value)}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') handleSaveRename(e, student.id);
                                }}
                                className="border border-slate-300 focus:border-indigo-500 rounded px-2 py-1 text-xs outline-none bg-white text-slate-800"
                                autoFocus
                              />
                              <button
                                onClick={e => handleSaveRename(e, student.id)}
                                className="bg-emerald-600 text-white px-2 py-1 rounded text-[10px] font-black cursor-pointer"
                              >
                                Save
                              </button>
                              <button
                                onClick={e => {
                                  e.stopPropagation();
                                  setEditingStudentId(null);
                                }}
                                className="bg-slate-200 text-slate-600 px-2 py-1 rounded text-[10px] font-bold cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div>
                              <h4 className="font-extrabold text-xs text-slate-800 truncate flex items-center gap-1.5">
                                <span>{student.name}</span>
                                {isActive && (
                                  <span className="text-[8px] uppercase tracking-wider font-extrabold text-indigo-700 bg-indigo-100 px-1.5 py-0.5 rounded-md">
                                    Active
                                  </span>
                                )}
                              </h4>
                              <p className="text-[10px] text-slate-400 mt-0.5 font-semibold">
                                Role: <strong className="text-slate-600 font-bold">{student.role || 'Student'}</strong>
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                        {!isEditing && (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingStudentId(student.id);
                                setEditedName(student.name);
                              }}
                              className="text-slate-400 hover:text-slate-700 p-1 rounded-md hover:bg-slate-50 cursor-pointer"
                              title="Rename profile"
                            >
                              <Sliders className="w-3.5 h-3.5" />
                            </button>
                            {activeStudents.length > 1 && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (confirm(`Are you sure you want to delete profile "${student.name}"?`)) {
                                    deleteStudent(student.id);
                                  }
                                }}
                                className="text-slate-400 hover:text-red-600 p-1 rounded-md hover:bg-red-50 cursor-pointer"
                                title="Delete profile"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </>
                        )}
                        {!isActive && (
                          <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors ml-1" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeSubTool === 'types' && (
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveSubTool(null)}
              className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition active:scale-95 cursor-pointer border border-slate-200 bg-white"
              title="Back to menu"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                <Sliders className="w-6 h-6 text-indigo-600" />
                <span>Configure Global Goal Types</span>
              </h1>
              <p className="text-xs text-slate-500">Add or remove general themes and subject tags for targets globally.</p>
            </div>
          </div>

          <div className="max-w-xl bg-white border border-slate-200 rounded-xl p-6 shadow-3xs space-y-5">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Type name (e.g., Physics, Design, Coding)"
                value={newTypeVal}
                onChange={(e) => setNewTypeVal(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newTypeVal.trim()) {
                    addGoalType(newTypeVal.trim());
                    setNewTypeVal('');
                  }
                }}
                className="flex-1 bg-slate-50/50 border border-slate-250 focus:border-indigo-500 focus:bg-white rounded-lg px-3 py-2 text-xs outline-none text-slate-800"
              />
              <button
                type="button"
                onClick={() => {
                  if (newTypeVal.trim()) {
                    addGoalType(newTypeVal.trim());
                    setNewTypeVal('');
                  }
                }}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold px-4 py-2 rounded-lg text-xs cursor-pointer transition shadow-3xs"
              >
                + Add Type
              </button>
            </div>

            <div className="space-y-2 border-t border-slate-100 pt-4">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Current Configured Types</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {goalTypes.map(gt => (
                  <div key={gt} className="flex items-center justify-between gap-1.5 bg-slate-50/70 border border-slate-200 px-3 py-2 rounded-lg">
                    <span className="font-extrabold text-xs text-slate-700 truncate">{gt}</span>
                    <button
                      type="button"
                      onClick={() => deleteGoalType(gt)}
                      className="text-slate-400 hover:text-red-600 p-1 rounded-md hover:bg-white transition-colors cursor-pointer"
                      title={`Delete type ${gt}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                {goalTypes.length === 0 && (
                  <p className="text-xs text-slate-400 italic text-center py-4 col-span-2">No goal types configured. Add some above!</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeSubTool === 'logs' && (
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveSubTool(null)}
              className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition active:scale-95 cursor-pointer border border-slate-200 bg-white"
              title="Back to menu"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                <ClipboardList className="w-6 h-6 text-indigo-600" />
                <span>System Audit Logs</span>
              </h1>
              <p className="text-xs text-slate-500">A detailed chronological sequence of user and system activities on active states.</p>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-3xs space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <span className="text-xs font-bold text-slate-500">Chronological Logs ({activities.length})</span>
            </div>

            <div className="space-y-3 max-h-[450px] overflow-y-auto pr-1">
              {sortedActivities.map((log) => {
                const isGoal = log.category === 'goal';
                const isTask = log.category === 'task';
                const isHabit = log.category === 'habit';
                const isExam = log.category === 'exam';

                let categoryBadge = 'bg-slate-100 text-slate-600 border-slate-200';
                if (isGoal) categoryBadge = 'bg-amber-50 text-amber-800 border-amber-300/45';
                if (isTask) categoryBadge = 'bg-indigo-50 text-indigo-800 border-indigo-300/45';
                if (isHabit) categoryBadge = 'bg-emerald-50 text-emerald-800 border-emerald-300/45';
                if (isExam) categoryBadge = 'bg-rose-50 text-rose-800 border-rose-300/45';

                return (
                  <div key={log.id} className="text-xs border border-slate-100/80 p-3 rounded-lg bg-slate-50/20 hover:bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${
                        isGoal ? 'bg-amber-500' : isTask ? 'bg-indigo-500' : isHabit ? 'bg-emerald-500' : isExam ? 'bg-rose-500' : 'bg-slate-400'
                      }`} />
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-700">{log.text}</p>
                        <p className="text-[10px] text-slate-400 font-medium mt-0.5">{new Date(log.timestamp).toLocaleString()}</p>
                      </div>
                    </div>
                    <span className={`text-[9px] uppercase tracking-wider font-extrabold border rounded-md px-1.8 py-0.6 self-start sm:self-auto ${categoryBadge}`}>
                      {log.category}
                    </span>
                  </div>
                );
              })}
              {sortedActivities.length === 0 && (
                <p className="text-xs text-slate-400 italic text-center py-8">No activities recorded yet.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {activeSubTool === 'reset' && (
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveSubTool(null)}
              className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition active:scale-95 cursor-pointer border border-slate-200 bg-white"
              title="Back to menu"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                <Trash2 className="w-6 h-6 text-red-600" />
                <span>Wipe & Reset Database</span>
              </h1>
              <p className="text-xs text-slate-500">Perform maintenance or clear local data to reset all profiles and targets.</p>
            </div>
          </div>

          <div className="max-w-xl bg-red-50/20 border border-red-200 rounded-2xl p-6 shadow-3xs space-y-4">
            <div className="flex gap-3 items-start text-red-800">
              <AlertTriangle className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
              <div className="space-y-1.5">
                <h4 className="font-extrabold text-sm">Critical Warning</h4>
                <p className="text-xs leading-relaxed font-semibold text-red-700/90">
                  This action will permanently wipe all student/professional profiles, schedules, exam targets, habits logs, and revision cards stored locally in your browser. This action is irreversible.
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-red-200 flex items-center justify-end gap-3">
              {isResetConfirming ? (
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-black text-red-700 animate-pulse">Are you absolutely sure?</span>
                  <button
                    onClick={() => {
                      localStorage.clear();
                      window.location.reload();
                    }}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-extrabold rounded-lg text-xs cursor-pointer shadow-3xs"
                  >
                    Yes, Wipe Everything
                  </button>
                  <button
                    onClick={() => setIsResetConfirming(false)}
                    className="px-3 py-2 bg-white border border-slate-200 text-slate-650 hover:bg-slate-50 rounded-lg text-xs font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setIsResetConfirming(true)}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-black rounded-lg text-xs cursor-pointer shadow-3xs transition-all active:scale-95"
                >
                  ⚠️ Wipe & Reset Database
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main utilities dashboard selection screen */}
      {!activeSubTool && (
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Other Tools & Utilities</h1>
            <p className="text-sm text-slate-500 mt-1">Configure global presets, switch multi-student profiles, view timelines, and sync progress</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 1. Sync Reports (WhatsApp) */}
            <div
              onClick={() => setActiveSubTool('sync')}
              className="group bg-white hover:bg-slate-50/50 border border-slate-200 hover:border-indigo-200 rounded-2xl p-5 shadow-4xs hover:shadow-3xs transition-all cursor-pointer flex gap-4"
            >
              <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-650 shrink-0 group-hover:scale-105 transition-transform">
                <Send className="w-5 h-5" />
              </div>
              <div className="space-y-1 min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <h3 className="font-extrabold text-slate-800 text-sm">WhatsApp Sync Tool</h3>
                  <span className="text-[8px] uppercase tracking-wider font-extrabold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded">
                    Sync
                  </span>
                </div>
                <p className="text-slate-500 text-xs leading-relaxed">
                  Compile and copy beautifully formatted study audit logs and daily reports to share.
                </p>
                <span className="text-[11px] font-black text-indigo-600 group-hover:text-indigo-700 flex items-center gap-1 pt-1">
                  Launch Report Compiler <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                </span>
              </div>
            </div>

            {/* 2. Multi-profile manager */}
            <div
              onClick={() => setActiveSubTool('profiles')}
              className="group bg-white hover:bg-slate-50/50 border border-slate-200 hover:border-indigo-200 rounded-2xl p-5 shadow-4xs hover:shadow-3xs transition-all cursor-pointer flex gap-4"
            >
              <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shrink-0 group-hover:scale-105 transition-transform">
                <Users className="w-5 h-5" />
              </div>
              <div className="space-y-1 min-w-0 flex-1">
                <h3 className="font-extrabold text-slate-800 text-sm">Profiles Manager</h3>
                <p className="text-slate-500 text-xs leading-relaxed">
                  Switch between student profiles, configure roles, export backups, or rename accounts.
                </p>
                <span className="text-[11px] font-black text-indigo-600 group-hover:text-indigo-700 flex items-center gap-1 pt-1">
                  Manage Multi-Profiles <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                </span>
              </div>
            </div>

            {/* 3. Goal & Subject Types */}
            <div
              onClick={() => setActiveSubTool('types')}
              className="group bg-white hover:bg-slate-50/50 border border-slate-200 hover:border-indigo-200 rounded-2xl p-5 shadow-4xs hover:shadow-3xs transition-all cursor-pointer flex gap-4"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0 group-hover:scale-105 transition-transform">
                <Sliders className="w-5 h-5" />
              </div>
              <div className="space-y-1 min-w-0 flex-1">
                <h3 className="font-extrabold text-slate-800 text-sm">Subject & Goal Types</h3>
                <p className="text-slate-500 text-xs leading-relaxed">
                  Customize the tags, themes, and standardized subject presets used across target levels.
                </p>
                <span className="text-[11px] font-black text-indigo-600 group-hover:text-indigo-700 flex items-center gap-1 pt-1">
                  Configure Preset Types <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                </span>
              </div>
            </div>

            {/* 4. Activity Logs */}
            <div
              onClick={() => setActiveSubTool('logs')}
              className="group bg-white hover:bg-slate-50/50 border border-slate-200 hover:border-indigo-200 rounded-2xl p-5 shadow-4xs hover:shadow-3xs transition-all cursor-pointer flex gap-4"
            >
              <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 shrink-0 group-hover:scale-105 transition-transform">
                <ClipboardList className="w-5 h-5" />
              </div>
              <div className="space-y-1 min-w-0 flex-1">
                <h3 className="font-extrabold text-slate-800 text-sm">Chronological Audit Timeline</h3>
                <p className="text-slate-500 text-xs leading-relaxed">
                  Inspect the precise sequence of audits, targets created, and modifications logged.
                </p>
                <span className="text-[11px] font-black text-indigo-600 group-hover:text-indigo-700 flex items-center gap-1 pt-1">
                  Open Audit Timeline <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                </span>
              </div>
            </div>

            {/* 5. Revision Flowcharts */}
            <div
              onClick={() => setActiveSubTool('flowcharts')}
              className="group bg-white hover:bg-indigo-50/10 border border-slate-200 hover:border-indigo-300 rounded-2xl p-5 shadow-4xs hover:shadow-3xs transition-all cursor-pointer flex gap-4"
            >
              <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0 group-hover:scale-105 transition-transform">
                <Layout className="w-5 h-5 text-indigo-605" />
              </div>
              <div className="space-y-1 min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <h3 className="font-extrabold text-slate-800 text-sm">Revision Flowcharts</h3>
                  <span className="text-[8px] uppercase tracking-wider font-extrabold text-indigo-800 bg-indigo-100 px-1.5 py-0.5 rounded">
                    Interactive
                  </span>
                </div>
                <p className="text-slate-500 text-xs leading-relaxed">
                  Convert legal tax slabs, audit procedures, or compliance checklists into editable diagrams.
                </p>
                <span className="text-[11px] font-black text-indigo-650 group-hover:text-indigo-700 flex items-center gap-1 pt-1">
                  Create Flowcharts <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                </span>
              </div>
            </div>

            {/* 6. Database Reset */}
            <div
              onClick={() => setActiveSubTool('reset')}
              className="group bg-white hover:bg-slate-50/50 border border-slate-200 hover:border-red-200 rounded-2xl p-5 shadow-4xs hover:shadow-3xs transition-all cursor-pointer flex gap-4"
            >
              <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center text-red-600 shrink-0 group-hover:scale-105 transition-transform">
                <Database className="w-5 h-5" />
              </div>
              <div className="space-y-1 min-w-0 flex-1">
                <h3 className="font-extrabold text-slate-800 text-sm text-red-700">Wipe Database & Maintenance</h3>
                <p className="text-slate-500 text-xs leading-relaxed">
                  Irreversibly delete all local cookies and clear profile caches to reset the program completely.
                </p>
                <span className="text-[11px] font-black text-red-600 group-hover:text-red-700 flex items-center gap-1 pt-1">
                  Open Reset Controls <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
