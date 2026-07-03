import React, { useState } from 'react';
import { useLakshya } from '../context/LakshyaContext';
import {
  CheckCircle2,
  Circle,
  Flame,
  CalendarDays,
  Target,
  ChevronRight,
  XCircle,
  Coffee,
  Lock,
  Info
} from 'lucide-react';

export const DashboardTab: React.FC<{
  onNavigate: (tab: string) => void;
}> = ({ onNavigate }) => {
  const {
    goals,
    habits,
    todayDate,
    largeText,
    highContrast,
    updateHabitStatus,
    toggleChildGoal,
    students,
    activeStudentId,
    logActivity,
    lockedHabitDates
  } = useLakshya();

  const activeStudent = students.find(s => s.id === activeStudentId);

  // Utility to check if a habit is scheduled for today
  const isHabitScheduled = (h: any, dateStr: string): boolean => {
    if (h.createdDate && dateStr < h.createdDate) {
      return false;
    }
    if (h.history[dateStr] === 'Done' || h.history[dateStr] === 'Missed' || h.history[dateStr] === 'Holiday') {
      return true;
    }
    try {
      const dateObj = new Date(dateStr + 'T00:00:00');
      const dayOfWeek = dateObj.getDay(); // 0 is Sun, 1 is Mon, etc.
      if (h.frequency === 'Monthly') {
        const dateObjDay = dateObj.getDate();
        const totalDaysInMonth = new Date(dateObj.getFullYear(), dateObj.getMonth() + 1, 0).getDate();
        const targetDay = Math.min(h.customMonthlyDay || 1, totalDaysInMonth);
        return dateObjDay === targetDay;
      }
      if (h.frequency === 'Daily') {
        return true;
      }
      if (h.frequency === 'Custom' || h.customDays) {
        if (h.customDays && h.customDays.length > 0) {
          return h.customDays.includes(dayOfWeek);
        }
        return true;
      }
      if (h.frequency === 'Weekly') {
        return h.customDays ? h.customDays.includes(dayOfWeek) : dayOfWeek === 0;
      }
    } catch (e) {
      return true;
    }
    return true;
  };

  // Compile Syllabus leaf nodes that are currently Pending (and optionally scheduled today or general/unscheduled)
  const pendingSyllabusTasks = React.useMemo(() => {
    const list: Array<{
      id: string;
      name: string;
      completed: boolean;
      goalId: string;
      goalName: string;
      date?: string;
      path: string[];
    }> = [];

    const traverse = (node: any, goalId: string, goalName: string, path: string[]) => {
      const currentPath = [...path, node.name];
      if (node.children && node.children.length > 0) {
        node.children.forEach((child: any) => traverse(child, goalId, goalName, currentPath));
      } else {
        // Leaf node in the goal hierarchy
        if (node.completed !== true) {
          const isScheduledForTodayOrPast = !node.date || node.date <= todayDate;
          if (isScheduledForTodayOrPast) {
            list.push({
              id: node.id,
              name: node.name,
              completed: false,
              goalId,
              goalName,
              date: node.date,
              path: path
            });
          }
        }
      }
    };

    goals.forEach(g => {
      if (g.children) {
        g.children.forEach(child => traverse(child, g.id, g.name, []));
      }
    });

    return list;
  }, [goals, todayDate]);

  // Overall Statistics calculations
  const syllabusTasksTodayStats = React.useMemo(() => {
    let total = 0;
    let completed = 0;

    const traverse = (node: any) => {
      if (node.children && node.children.length > 0) {
        node.children.forEach((child: any) => traverse(child));
      } else {
        if (node.date === todayDate || (node.date && node.date < todayDate)) {
          total += 1;
          if (node.completed) {
            completed += 1;
          }
        }
      }
    };

    goals.forEach(g => {
      if (g.children) {
        g.children.forEach(child => traverse(child));
      }
    });

    return { total, completed };
  }, [goals, todayDate]);

  const todayHabits = React.useMemo(() => {
    return habits.filter(h => isHabitScheduled(h, todayDate));
  }, [habits, todayDate]);

  const completedHabitsCount = todayHabits.filter(h => h.history[todayDate] === 'Done').length;

  const totalActionables = syllabusTasksTodayStats.total + todayHabits.length;
  const completedActionables = syllabusTasksTodayStats.completed + completedHabitsCount;

  // Header Date display format
  const formattedTodayText = new Date(todayDate + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const handleToggleSyllabusTask = (item: any) => {
    toggleChildGoal(item.goalId, item.id);
    logActivity(`Marked syllabus item "${item.name}" as Completed`, 'goal');
  };

  // Aesthetic styling classes
  const textTitleClass = highContrast ? 'text-slate-955 font-black' : 'text-slate-900 font-extrabold';

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-fade-in" id="dashboard-minimalist-root">
      
      {/* 1. HEADER WELCOME - CLEAN & FOCUSED */}
      <header className="py-2 flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-150 pb-5" id="minimal-greeting">
        <div>
          <span className="text-[10px] sm:text-xs font-bold text-indigo-600 uppercase tracking-widest font-mono">
            {formattedTodayText}
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-0.5 flex items-center gap-2">
            Hello, {activeStudent?.name ?? 'Aryan'}.
            <button
              onClick={() => onNavigate('revision')}
              className="p-1 rounded-full text-indigo-600 hover:bg-indigo-50/80 hover:text-indigo-805 border border-transparent hover:border-indigo-150/50 hover:scale-105 active:scale-95 transition-all cursor-pointer"
              title="Open Revision System"
              id="revision-info-btn"
            >
              <Info className="w-5 h-5 sm:w-6 sm:h-6 animate-pulse" />
            </button>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            You have completed{' '}
            <span className="font-extrabold text-indigo-700 bg-indigo-50/80 border border-indigo-150 rounded px-1.5 py-0.5 animate-pulse">
              {completedActionables} / {totalActionables}
            </span>{' '}
            actionable items for today.
          </p>
        </div>

        {/* Global Mini Streak Badge */}
        {habits.length > 0 && (
          <div className="inline-flex items-center gap-1.5 bg-pink-50 border border-pink-100/80 rounded-full px-3 py-1 text-xs shrink-0 self-start md:self-auto shadow-3xs" title="Highest consecutive habit loop">
            <Flame className="w-4 h-4 fill-pink-600 text-pink-600 animate-pulse" />
            <span className="font-bold text-pink-700">
              {Math.max(...habits.map(h => h.currentStreak), 0)}-Day Streak
            </span>
          </div>
        )}
      </header>

      {/* 2. MAIN SEGMENTS LAID OUT IN STRICT SPECIFIED ORDER */}
      <div className="space-y-8">
        
        {/* FIRST BOX: GOAL SYLLABUS TASKS PENDING FOR TODAY */}
        <section className="bg-white rounded-2xl p-6 border border-slate-200 shadow-3xs text-slate-800" id="syllabus-tasks-box">
          <div className="flex justify-between items-start mb-5 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-55 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                <Target className="w-5 h-5" />
              </div>
              <div>
                <h2 className={`${textTitleClass} text-base tracking-tight`}>Goal Syllabus Tasks</h2>
                <p className="text-[10px] text-slate-450 font-medium mt-0.5">
                  Actionable last-level nodes. Completing these lifts overall goal completion.
                </p>
              </div>
            </div>
            
            <span className="text-[10px] font-bold uppercase tracking-wider font-mono text-indigo-600 bg-indigo-50/50 border border-indigo-100 px-2 py-0.5 rounded-md shrink-0">
              {pendingSyllabusTasks.length} Pending
            </span>
          </div>

          {pendingSyllabusTasks.length === 0 ? (
            <div className="border border-dashed border-slate-150 rounded-xl p-8 text-center text-slate-450 bg-slate-50/10">
              <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-2 pointer-events-none">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <p className="text-xs font-bold text-slate-700">All Syllabus Tasks Checked Off!</p>
              <p className="text-[10px] text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed">
                No last-level goal subtasks remain pending for today. Add new targets in the Goals tab!
              </p>
              <button
                type="button"
                onClick={() => onNavigate('goals')}
                className="mt-3.5 inline-flex items-center gap-1 text-[10px] font-extrabold text-indigo-650 bg-indigo-50 hover:bg-indigo-100/80 px-3 py-1.5 rounded-lg border border-indigo-150 tracking-wide transition pointer-events-auto cursor-pointer"
              >
                Go to Goals tab
              </button>
            </div>
          ) : (
            <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
              {pendingSyllabusTasks.map(item => {
                return (
                  <div
                    key={`leaf-${item.id}`}
                    className="p-3.5 rounded-xl border border-slate-150 bg-white shadow-5xs hover:border-slate-300 hover:shadow-4xs transition"
                  >
                    <div className="flex items-start gap-3">
                      {/* Circle checkbox toggle */}
                      <button
                        type="button"
                        onClick={() => handleToggleSyllabusTask(item)}
                        className="mt-0.5 text-indigo-600 hover:text-indigo-805 transition-colors cursor-pointer shrink-0 animate-fade-in"
                        title="Mark Completed"
                      >
                        <Circle className="w-5 h-5 text-slate-300 hover:text-indigo-500 hover:scale-105 transition" />
                      </button>

                      <div className="min-w-0 flex-1">
                        <span className="font-bold text-xs sm:text-sm text-slate-800 break-words leading-tight block">
                          {item.name}
                        </span>

                        {/* Breadcrumbs pathway and Goal links */}
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-2 text-[9.5px]">
                          {/* Parent pathway */}
                          <div className="flex items-center gap-1 text-slate-450 font-medium">
                            <span className="font-black text-indigo-650 tracking-tight">{item.goalName}</span>
                            {item.path && item.path.length > 0 && (
                              <>
                                <ChevronRight className="w-2.5 h-2.5 text-slate-300 pointer-events-none" />
                                <span className="font-semibold text-slate-500">{item.path.join(' ➔ ')}</span>
                              </>
                            )}
                          </div>

                          {/* Due indicator */}
                          {item.date && (
                            <span className={`px-1.5 py-0.25 rounded font-mono font-black uppercase text-[8.5px] truncate max-w-[120px] ml-auto shrink-0 ${
                              item.date === todayDate
                                ? 'bg-amber-50 text-amber-700 border border-amber-100'
                                : 'bg-rose-50 text-rose-700 border border-rose-150 animate-pulse'
                            }`}>
                              {item.date === todayDate ? '🔥 Today' : `Overdue: ${item.date}`}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* SECOND BOX: GOAL HABITS TO BE DONE TODAY / DAILY HABITS IN A BOX */}
        <section className="bg-white rounded-2xl p-6 border border-slate-200 shadow-3xs text-slate-800" id="habits-day-view-box">
          <div className="flex justify-between items-center mb-5 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-pink-50 border border-pink-100 flex items-center justify-center text-pink-600 shrink-0">
                <CalendarDays className="w-5 h-5" />
              </div>
              <div>
                <h2 className={`${textTitleClass} text-base tracking-tight`}>Daily Habits Day Box</h2>
                <p className="text-[10px] text-slate-450 font-medium mt-0.5">
                  Today's precise ritual checklist in custom day-box format. Mark off to secure streaks!
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onNavigate('habits')}
              className="text-[10px] font-extrabold text-pink-600 hover:text-pink-700 bg-pink-50/50 hover:bg-pink-50 border border-pink-100 px-3 py-1.5 rounded-lg cursor-pointer flex items-center gap-0.5 transition"
            >
              Matrix Calendar <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Satisfying Day Completion Progress radar bar */}
          {todayHabits.length > 0 && (
            <div className="mb-4 p-3 bg-slate-50 border border-slate-150 rounded-xl flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-slate-705">Momentum Radar:</span>
                <span className="font-black text-indigo-700 bg-indigo-50 border border-indigo-100 px-1.5 py-0.25 rounded text-[10.5px]">
                  {completedHabitsCount} of {todayHabits.length} Cleared
                </span>
              </div>
              <div className="flex-1 max-w-[120px] bg-slate-200 h-2 rounded-full overflow-hidden shrink-0 ml-3">
                <div
                  className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                  style={{ width: `${(completedHabitsCount / todayHabits.length) * 100}%` }}
                />
              </div>
            </div>
          )}

          {todayHabits.length === 0 ? (
            <div className="border border-dashed border-slate-150 rounded-xl p-8 text-center text-slate-450 bg-slate-50/10">
              <p className="text-xs font-semibold">No habits scheduled for today.</p>
              <p className="text-[10px] text-slate-400 mt-1">
                Customize habit frequency parameters or create daily behaviors in the habits panel!
              </p>
              <button
                type="button"
                onClick={() => onNavigate('habits')}
                className="mt-3 inline-flex items-center gap-1 text-[10px] font-extrabold text-pink-605 bg-pink-50 hover:bg-pink-100 px-3 py-1.5 rounded-lg border border-pink-100 tracking-wide transition pointer-events-auto cursor-pointer"
              >
                Go to Habits tab
              </button>
            </div>
          ) : (
            <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1" id="habits-dayview-container">
              {todayHabits.map(h => {
                const statusToday = h.history[todayDate] || 'Pending';
                const isDone = statusToday === 'Done';
                const isMissed = statusToday === 'Missed';
                const isHoliday = statusToday === 'Holiday';
                const isTodayLocked = lockedHabitDates.includes(todayDate);

                return (
                  <div
                    key={h.id}
                    className={`p-3.5 rounded-xl border transition duration-200 flex items-center justify-between gap-3 ${
                      isDone
                        ? 'bg-emerald-55/10 border-emerald-150 shadow-5xs'
                        : isMissed
                        ? 'bg-rose-55/10 border-rose-150'
                        : isHoliday
                        ? 'bg-purple-55/10 border-purple-150'
                        : 'bg-white border-slate-150 shadow-5xs hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0 flex-1">
                      {/* Checkbox cycling icon on the left */}
                      <button
                        type="button"
                        disabled={isTodayLocked}
                        onClick={() => {
                          if (isTodayLocked) return;
                          
                          let nextStatusFromToday: 'Done' | 'Missed' | 'Holiday' | 'Pending' = 'Done';
                          if (statusToday === 'Done') {
                            nextStatusFromToday = 'Missed';
                          } else if (statusToday === 'Missed') {
                            nextStatusFromToday = 'Holiday';
                          } else if (statusToday === 'Holiday') {
                            nextStatusFromToday = 'Pending';
                          } else {
                            nextStatusFromToday = 'Done';
                          }
                          
                          updateHabitStatus(h.id, todayDate, nextStatusFromToday);
                          logActivity(`Cycled daily habit "${h.name}" status to: ${nextStatusFromToday}`, 'habit');
                        }}
                        className={`transition shrink-0 ${isTodayLocked ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:scale-110'}`}
                        title={isTodayLocked 
                          ? 'Today is locked (cannot be altered)' 
                          : `Status: ${statusToday}. Click to cycle (Done -> Missed -> Holiday -> To Do).`
                        }
                      >
                        {isDone ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-600 fill-emerald-50/10 hover:scale-105 transition" />
                        ) : isMissed ? (
                          <XCircle className="w-5 h-5 text-rose-600 fill-rose-50/10 hover:scale-105 transition" />
                        ) : isHoliday ? (
                          <Coffee className="w-5 h-5 text-purple-600 fill-purple-50/10 hover:scale-105 transition" />
                        ) : (
                          <Circle className="w-5 h-5 text-slate-300 hover:text-pink-500 hover:scale-105 transition" />
                        )}
                      </button>

                      <div className="min-w-0 flex-1">
                        <span className={`font-bold text-xs sm:text-sm tracking-tight block truncate ${
                          isDone ? 'text-slate-450 line-through' : 'text-slate-800'
                        }`}>
                          {h.name}
                        </span>
                        
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wide">
                            {h.frequency}
                          </span>
                          
                          {h.currentStreak > 0 && (
                            <span className="inline-flex items-center gap-0.5 text-[8.5px] font-extrabold text-pink-650 bg-pink-50/60 border border-pink-100 rounded px-1 shrink-0">
                              <Flame className="w-2.5 h-2.5 fill-pink-600 text-pink-650 animate-pulse" />
                              <span>{h.currentStreak}d Streak</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right side status badge & Lock status indicator */}
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-[8.5px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border ${
                        isDone
                          ? 'text-emerald-700 bg-emerald-50 border-emerald-100'
                          : isMissed
                          ? 'text-rose-700 bg-rose-50 border-rose-100'
                          : isHoliday
                          ? 'text-purple-700 bg-purple-50 border-purple-100'
                          : 'text-slate-500 bg-slate-50 border-slate-100'
                      }`}>
                        {statusToday === 'Pending' ? 'To Do' : statusToday}
                      </span>
                      {isTodayLocked && (
                        <div className="flex items-center gap-1 text-[9px] font-black text-amber-600 bg-amber-50 border border-amber-150/70 rounded-lg px-2 py-0.5" title="Locked Day">
                          <Lock className="w-3 h-3 text-amber-500 shrink-0" />
                          <span>Locked</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

      </div>

    </div>
  );
};
