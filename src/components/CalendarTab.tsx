import React, { useState } from 'react';
import { useLakshya } from '../context/LakshyaContext';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Lock,
  Tag,
  CheckCircle2,
  Clock,
  AlertTriangle
} from 'lucide-react';
import { CalendarEvent } from '../types';

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June", 
  "July", "August", "September", "October", "November", "December"
];

export const CalendarTab: React.FC = () => {
  const {
    calendarEvents,
    goals,
    todayDate,
    largeText,
    highContrast,
    logActivity
  } = useLakshya();

  // Active view layout state: Month, Week, Day
  const [viewMode, setViewMode] = useState<'Month' | 'Week' | 'Day'>('Month');
  
  // Selected day in calendar starts at todayDate
  const [selectedDateStr, setSelectedDateStr] = useState<string>(todayDate);

  // Form states to add custom calendar markers (tied to goals)
  const [showEventForm, setShowEventForm] = useState(false);
  const [eventTitle, setEventTitle] = useState('');
  const [eventDate, setEventDate] = useState(todayDate);
  const [eventType, setEventType] = useState<CalendarEvent['type']>('milestone');
  const [eventGoalId, setEventGoalId] = useState<string>('');

  // Dynamic Month/Year states for month navigator calendar
  const [currentMonth, setCurrentMonth] = useState<number>(() => {
    const parts = todayDate.split('-');
    return parts.length === 3 ? Number(parts[1]) - 1 : 5; // 0-indexed (June = 5)
  });
  const [currentYear, setCurrentYear] = useState<number>(() => {
    const parts = todayDate.split('-');
    return parts.length === 3 ? Number(parts[0]) : 2026;
  });

  // Local storage for custom event creations
  const [localEvents, setLocalEvents] = useState<CalendarEvent[]>(() => {
    const saved = localStorage.getItem('lakshya_custom_events');
    return saved ? JSON.parse(saved) : [];
  });

  const handleCreateEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventTitle.trim()) return;
    const newEvent: CalendarEvent = {
      id: `evt-custom-${Date.now()}`,
      title: eventTitle,
      date: eventDate,
      type: eventType,
      goalId: eventGoalId || undefined
    };
    const updated = [...localEvents, newEvent];
    setLocalEvents(updated);
    localStorage.setItem('lakshya_custom_events', JSON.stringify(updated));
    setEventTitle('');
    setEventGoalId('');
    setShowEventForm(false);
    logActivity(`Created Calendar Event: "${eventTitle}" on ${eventDate}`, 'general');
    
    // Auto sync back visually
    setSelectedDateStr(eventDate);
    const parts = eventDate.split('-');
    if (parts.length === 3) {
      setCurrentYear(Number(parts[0]));
      setCurrentMonth(Number(parts[1]) - 1);
    }
  };

  const handleDeleteEvent = (id: string) => {
    const updated = localEvents.filter(e => e.id !== id);
    setLocalEvents(updated);
    localStorage.setItem('lakshya_custom_events', JSON.stringify(updated));
    logActivity(`Deleted Calendar Event`, 'general');
  };

  // Combine static initial calendar events with user added custom events & recursive goal children milestones
  const compileGoalChildEvents = (): CalendarEvent[] => {
    const list: CalendarEvent[] = [];

    const recurse = (children: any[], gName: string, gId: string, levelNames: string[], depth: number = 0) => {
      children.forEach(c => {
        if (c.date) {
          const levelName = levelNames[depth] || `Level ${depth + 1}`;
          list.push({
            id: `node-cal-${c.id}`,
            title: `${levelName}: ${c.name} (${gName})`,
            date: c.date,
            type: 'milestone',
            goalId: gId
          });
        }
        if (c.children && c.children.length > 0) {
          recurse(c.children, gName, gId, levelNames, depth + 1);
        }
      });
    };

    goals.forEach(g => {
      // Add Goal Deadline itself as virtual deadline event
      list.push({
        id: `goal-dead-cal-${g.id}`,
        title: `🏆 GOAL TARGET: ${g.name}`,
        date: g.deadline,
        type: 'deadline',
        goalId: g.id
      });
      // Add children recursively
      const names = g.levelNames || ['Subject', 'Chapter', 'Topic'];
      if (g.children && g.children.length > 0) {
        recurse(g.children, g.name, g.id, names, 0);
      }
    });

    return list;
  };

  const goalChildEvents = compileGoalChildEvents();
  const allEventsRaw = [...calendarEvents, ...localEvents, ...goalChildEvents];

  // We want the calendar to ONLY contain Goals (milestones/sub-goals) and Deadlines.
  // No studies tasks, no revisions, no habit logs, and no activity/log descriptions.
  const allEvents = allEventsRaw.filter(e => {
    // Exclude basic tasks, revisions, and habits to remove dynamic activity logs
    if (e.type === 'task' || e.type === 'revision' || e.type === 'habit') return false;
    
    // Exclude logged activity metrics
    if (e.id.startsWith('cal-evt-') || e.id.startsWith('cal-task-') || e.id.startsWith('cal-rev-')) return false;
    
    // Accept milestones, deadlines, and high stakes markers
    return e.type === 'milestone' || e.type === 'deadline';
  });

  // Helper date generators for dynamic month grids
  const generateMonthGrid = (year: number, monthIdx: number) => {
    const days = [];
    
    const firstDay = new Date(year, monthIdx, 1);
    const fillStartDay = firstDay.getDay(); // 0 is Sunday, 1 is Monday
    const startPadding = fillStartDay === 0 ? 6 : fillStartDay - 1;
    
    const tempPrev = new Date(year, monthIdx, 0);
    const prevMonthDays = tempPrev.getDate();

    // Previous month padding days
    for (let i = startPadding - 1; i >= 0; i--) {
      const dNum = prevMonthDays - i;
      const m = monthIdx === 0 ? 11 : monthIdx - 1;
      const y = monthIdx === 0 ? year - 1 : year;
      const padMonth = (m + 1) < 10 ? `0${m + 1}` : `${m + 1}`;
      const padDay = dNum < 10 ? `0${dNum}` : `${dNum}`;
      days.push({
        dateStr: `${y}-${padMonth}-${padDay}`,
        dayNum: dNum,
        isCurrentMonth: false
      });
    }

    // Current month days
    const totalDaysInMonth = new Date(year, monthIdx + 1, 0).getDate();
    for (let i = 1; i <= totalDaysInMonth; i++) {
      const padMonth = (monthIdx + 1) < 10 ? `0${monthIdx + 1}` : `${monthIdx + 1}`;
      const padDay = i < 10 ? `0${i}` : `${i}`;
      days.push({
        dateStr: `${year}-${padMonth}-${padDay}`,
        dayNum: i,
        isCurrentMonth: true
      });
    }

    // Next month padding days to satisfy 7-column grid rows
    const remainingCells = days.length % 7;
    if (remainingCells > 0) {
      const nextMonthPadding = 7 - remainingCells;
      for (let i = 1; i <= nextMonthPadding; i++) {
        const m = monthIdx === 11 ? 0 : monthIdx + 1;
        const y = monthIdx === 11 ? year + 1 : year;
        const padMonth = (m + 1) < 10 ? `0${m + 1}` : `${m + 1}`;
        const padDay = i < 10 ? `0${i}` : `${i}`;
        days.push({
          dateStr: `${y}-${padMonth}-${padDay}`,
          dayNum: i,
          isCurrentMonth: false
        });
      }
    }

    return days;
  };

  const monthGridDays = generateMonthGrid(currentYear, currentMonth);

  // Dynamic Goal specific color palette maps (one stable colour per goal)
  const getGoalTheme = (goalId: string | undefined) => {
    const defaultColor = {
      bg: 'bg-indigo-50 border-indigo-200 text-indigo-700',
      dot: 'bg-indigo-500', 
      border: 'border-indigo-200',
      text: 'text-indigo-850',
      badge: 'bg-indigo-100 text-indigo-800'
    };

    if (!goalId) return defaultColor;

    const idx = goals.findIndex(g => g.id === goalId);
    
    const themes = [
      {
        bg: 'bg-indigo-50/90 border-indigo-200 text-indigo-700',
        dot: 'bg-indigo-500',
        border: 'border-indigo-300',
        text: 'text-indigo-800',
        badge: 'bg-indigo-100 text-indigo-800'
      },
      {
        bg: 'bg-emerald-50/90 border-emerald-200 text-emerald-700',
        dot: 'bg-emerald-500',
        border: 'border-emerald-300',
        text: 'text-emerald-800',
        badge: 'bg-emerald-100/80 text-emerald-800'
      },
      {
        bg: 'bg-amber-50/95 border-amber-200 text-amber-800',
        dot: 'bg-amber-500',
        border: 'border-amber-300',
        text: 'text-amber-850',
        badge: 'bg-amber-100/80 text-amber-800'
      },
      {
        bg: 'bg-rose-50/90 border-rose-200 text-rose-700',
        dot: 'bg-rose-500',
        border: 'border-rose-300',
        text: 'text-rose-850',
        badge: 'bg-rose-100/80 text-rose-800'
      },
      {
        bg: 'bg-violet-50/90 border-violet-200 text-violet-700',
        dot: 'bg-violet-500',
        border: 'border-violet-300',
        text: 'text-violet-800',
        badge: 'bg-violet-100/85 text-violet-800'
      },
      {
        bg: 'bg-teal-50/90 border-teal-200 text-teal-700',
        dot: 'bg-teal-500',
        border: 'border-teal-300',
        text: 'text-teal-850',
        badge: 'bg-teal-100/80 text-teal-800'
      },
      {
        bg: 'bg-fuchsia-50/90 border-fuchsia-200 text-fuchsia-700',
        dot: 'bg-fuchsia-500',
        border: 'border-fuchsia-300',
        text: 'text-fuchsia-800',
        badge: 'bg-fuchsia-100 text-fuchsia-800'
      },
      {
        bg: 'bg-sky-50/90 border-sky-200 text-sky-700',
        dot: 'bg-sky-500',
        border: 'border-sky-300',
        text: 'text-sky-850',
        badge: 'bg-sky-100 text-sky-800'
      },
      {
        bg: 'bg-orange-50/90 border-orange-200 text-orange-700',
        dot: 'bg-orange-500',
        border: 'border-orange-300',
        text: 'text-orange-850',
        badge: 'bg-orange-100/80 text-orange-800'
      },
      {
        bg: 'bg-cyan-50/90 border-cyan-200 text-cyan-700',
        dot: 'bg-cyan-500',
        border: 'border-cyan-300',
        text: 'text-cyan-850',
        badge: 'bg-cyan-100 text-cyan-805'
      }
    ];

    if (idx < 0) {
      // derive scheme from custom hash code
      const hash = Array.from(goalId).reduce((acc, char) => acc + char.charCodeAt(0), 0);
      return themes[hash % themes.length];
    }

    return themes[idx % themes.length];
  };

  // Filter events by selected date string
  const activeDayEvents = allEvents.filter(e => e.date === selectedDateStr);

  // Week View dates generator (7 days centering on active date)
  const getWeekDays = () => {
    const list = [];
    const base = new Date(selectedDateStr + 'T00:00:00');
    const dayOfWeek = base.getDay(); // 0 is Sunday, 1 is Monday
    const distanceToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    
    const monday = new Date(base);
    monday.setDate(base.getDate() + distanceToMonday);

    for (let i = 0; i < 7; i++) {
      const temp = new Date(monday);
      temp.setDate(monday.getDate() + i);
      list.push(temp.toISOString().split('T')[0]);
    }
    return list;
  };

  const weekDays = getWeekDays();

  const handlePrevMonth = () => {
    setCurrentMonth(prev => {
      if (prev === 0) {
        setCurrentYear(yr => yr - 1);
        return 11;
      }
      return prev - 1;
    });
  };

  const handleNextMonth = () => {
    setCurrentMonth(prev => {
      if (prev === 11) {
        setCurrentYear(yr => yr + 1);
        return 0;
      }
      return prev + 1;
    });
  };

  const syncMonthAndYearFromDate = (dateStr: string) => {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      setCurrentYear(Number(parts[0]));
      setCurrentMonth(Number(parts[1]) - 1);
    }
  };

  const handlePrevWeek = () => {
    const d = new Date(selectedDateStr + 'T00:00:00');
    d.setDate(d.getDate() - 7);
    const dateStr = d.toISOString().split('T')[0];
    setSelectedDateStr(dateStr);
    syncMonthAndYearFromDate(dateStr);
  };

  const handleNextWeek = () => {
    const d = new Date(selectedDateStr + 'T00:00:00');
    d.setDate(d.getDate() + 7);
    const dateStr = d.toISOString().split('T')[0];
    setSelectedDateStr(dateStr);
    syncMonthAndYearFromDate(dateStr);
  };

  const handlePrevDay = () => {
    const d = new Date(selectedDateStr + 'T00:00:00');
    d.setDate(d.getDate() - 1);
    const dateStr = d.toISOString().split('T')[0];
    setSelectedDateStr(dateStr);
    syncMonthAndYearFromDate(dateStr);
  };

  const handleNextDay = () => {
    const d = new Date(selectedDateStr + 'T00:00:00');
    d.setDate(d.getDate() + 1);
    const dateStr = d.toISOString().split('T')[0];
    setSelectedDateStr(dateStr);
    syncMonthAndYearFromDate(dateStr);
  };

  const handleGoToToday = () => {
    setSelectedDateStr(todayDate);
    syncMonthAndYearFromDate(todayDate);
  };

  return (
    <div className="space-y-8 animate-fade-in" id="calendar-tab-root">
      
      {/* Title block */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Interactive study Calendar</h1>
          <p className="text-sm text-slate-500 font-medium">Plan exam schedules, milestone targets, and calendar markers filtered and color-coded per Goal</p>
        </div>

        <button
          onClick={() => setShowEventForm(!showEventForm)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold py-2 px-4 rounded-lg text-sm cursor-pointer inline-flex items-center gap-1.5 shadow-sm transition active:scale-95"
        >
          <Plus className="w-4 h-4" /> Add Calendar Marker
        </button>
      </div>

      {/* Adding Event form */}
      {showEventForm && (
        <form onSubmit={handleCreateEvent} className="bg-white p-6 rounded-xl border border-slate-205 shadow-sm space-y-4 animate-fade-in text-slate-705">
          <h2 className="text-sm font-black text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-2.5 uppercase tracking-wide">
            <Calendar className="w-4.5 h-4.5 text-indigo-600" />
            <span>Schedule Custom Calendar Marker</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs font-semibold">
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Marker Title</label>
              <input
                type="text"
                required
                placeholder="e.g. UPSC Exam Prep Core Review"
                value={eventTitle}
                onChange={(e) => setEventTitle(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 outline-none focus:border-indigo-600 font-medium text-xs"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Target Date</label>
              <input
                type="date"
                required
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 outline-none focus:border-indigo-600 text-xs"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Select Associated Goal</label>
              <select
                value={eventGoalId}
                onChange={(e) => setEventGoalId(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 outline-none0 focus:border-indigo-600 text-xs font-bold"
              >
                <option value="">-- High-Stakes System Milestone --</option>
                {goals.map(g => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Marker Category</label>
              <select
                value={eventType}
                onChange={(e: any) => setEventType(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 outline-none focus:border-indigo-600 text-xs font-bold"
              >
                <option value="milestone">Goal Milestone</option>
                <option value="deadline">High-Stakes Deadline</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-100 pt-3">
            <button
              type="button"
              onClick={() => setShowEventForm(false)}
              className="px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 rounded-lg font-bold text-slate-700 cursor-pointer text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold cursor-pointer text-xs"
            >
              Plant Marker
            </button>
          </div>
        </form>
      )}

      {/* Goal Color Code Legend */}
      {goals.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-3xs flex flex-wrap gap-2.5 items-center" id="goal-style-legend">
          <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider">Goal Color Key:</span>
          {goals.map((g) => {
            const theme = getGoalTheme(g.id);
            return (
              <div key={g.id} className="flex items-center gap-2 bg-slate-50 border border-slate-150 py-1 px-3 rounded-lg text-xs font-bold">
                <span className={`w-2.5 h-2.5 rounded-full ${theme.dot}`} />
                <span className="text-slate-700 truncate max-w-[130px]">{g.name}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Dynamic Date Navigation toolbar */}
      <div className="bg-white rounded-xl p-4 border border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        
        {/* Navigation Arrows for Month/Week/Day */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-150 p-1.5 rounded-lg shadow-4xs">
            <button
              type="button"
              onClick={
                viewMode === 'Month' ? handlePrevMonth :
                viewMode === 'Week' ? handlePrevWeek :
                handlePrevDay
              }
              className="p-1 hover:bg-slate-200 rounded-md transition text-slate-600 cursor-pointer active:scale-90"
              title={`Previous ${viewMode}`}
            >
              <ChevronLeft className="w-4 h-4 stroke-[2.5px]" />
            </button>
            
            <button
              type="button"
              onClick={handleGoToToday}
              className="px-2.5 py-1 text-[10px] font-black uppercase text-indigo-700 bg-white hover:bg-indigo-50 border border-slate-200 rounded-md transition cursor-pointer shadow-4xs"
              title="Go to Today's date"
            >
              Today
            </button>

            <button
              type="button"
              onClick={
                viewMode === 'Month' ? handleNextMonth :
                viewMode === 'Week' ? handleNextWeek :
                handleNextDay
              }
              className="p-1 hover:bg-slate-200 rounded-md transition text-slate-600 cursor-pointer active:scale-90"
              title={`Next ${viewMode}`}
            >
              <ChevronRight className="w-4 h-4 stroke-[2.5px]" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-extrabold text-slate-800 text-sm md:text-base">
              {viewMode === 'Month' && `${MONTH_NAMES[currentMonth]} ${currentYear}`}
              {viewMode === 'Week' && `Week of ${new Date(weekDays[0] + 'T00:00:00').toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}`}
              {viewMode === 'Day' && `${new Date(selectedDateStr + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}`}
            </span>
          </div>
        </div>

        {/* View mode selectors */}
        <div className="flex bg-slate-50 p-1 border border-slate-150 rounded-lg text-xs self-start sm:self-auto">
          {(['Month', 'Week', 'Day'] as const).map(mode => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`py-1.5 px-4 font-bold rounded-md transition-all cursor-pointer ${
                viewMode === mode
                  ? 'bg-white text-indigo-705 border border-slate-200 shadow-3xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {mode} View
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* CALENDAR ACTIVE PANELS (Left Column) */}
        <div className="lg:col-span-8 bg-white rounded-xl p-5 border border-slate-200 shadow-3xs">
          
          {/* MONTH VIEW CALENDAR GRID */}
          {viewMode === 'Month' && (
            <div className="space-y-4">
              <div className="grid grid-cols-7 gap-1 text-center font-bold text-xs text-slate-400 uppercase tracking-wider mb-2">
                <span>Mon</span>
                <span>Tue</span>
                <span>Wed</span>
                <span>Thu</span>
                <span>Fri</span>
                <span>Sat</span>
                <span>Sun</span>
              </div>
              
              <div className="grid grid-cols-7 gap-2">
                {monthGridDays.map((cell) => {
                  const dateStr = cell.dateStr;
                  const itemsToday = allEvents.filter(e => e.date === dateStr);
                  const isCurrentSelected = selectedDateStr === dateStr;
                  const isToday = todayDate === dateStr;

                  return (
                    <div
                      key={dateStr}
                      onClick={() => {
                        setSelectedDateStr(dateStr);
                        if (!cell.isCurrentMonth) {
                          syncMonthAndYearFromDate(dateStr);
                        }
                      }}
                      className={`min-h-[90px] p-2 border rounded-xl cursor-pointer transition-all flex flex-col justify-between gap-1 select-none hover:border-indigo-400 relative duration-200 ${
                        isCurrentSelected
                          ? 'border-indigo-600 bg-indigo-50/5 ring-1 ring-indigo-600 shadow-3xs'
                          : isToday
                          ? 'bg-amber-50/45 border-amber-300'
                          : cell.isCurrentMonth
                          ? 'bg-white border-slate-200 hover:border-slate-300'
                          : 'bg-slate-50/70 border-slate-150 text-slate-350 opacity-60'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <span className={`text-xs font-mono font-black w-5 h-5 flex items-center justify-center rounded-full ${
                          isToday 
                            ? 'text-amber-850 bg-amber-200 font-serif' 
                            : cell.isCurrentMonth 
                            ? 'text-slate-650' 
                            : 'text-slate-400'
                        }`}>
                          {cell.dayNum}
                        </span>
                        
                        {itemsToday.length > 0 && (
                          <div className="flex gap-0.5 items-center">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-505 animate-pulse" />
                            <span className="text-[9px] font-black text-slate-400 font-mono">({itemsToday.length})</span>
                          </div>
                        )}
                      </div>

                      {/* Micro list of goals and deadlines with respective Color Codes */}
                      <div className="space-y-1 overflow-hidden max-h-12">
                        {itemsToday.slice(0, 2).map((item, idX) => {
                          const theme = getGoalTheme(item.goalId);
                          return (
                            <div
                              key={idX}
                              className={`text-[9px] font-black px-1 py-0.25 rounded truncate border ${theme.bg} ${theme.border} border-l-[3px]`}
                            >
                              {item.title}
                            </div>
                          );
                        })}
                        {itemsToday.length > 2 && (
                          <div className="text-[8px] text-slate-450 tracking-wide text-right font-black">+ {itemsToday.length - 2} more</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* WEEK VIEW CALENDAR GRID */}
          {viewMode === 'Week' && (
            <div className="space-y-4">
              <p className="text-xs text-indigo-600 font-bold uppercase tracking-wider mb-2">Weekly Perspective Calendar</p>
              <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
                {weekDays.map(dateStr => {
                  const itemsToday = allEvents.filter(e => e.date === dateStr);
                  const isCurrentSelected = selectedDateStr === dateStr;
                  const isToday = todayDate === dateStr;
                  
                  const dObj = new Date(dateStr + 'T00:00:00');
                  const dayName = dObj.toLocaleDateString(undefined, { weekday: 'short' });
                  const displayDateVal = dObj.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });

                  return (
                    <div
                      key={dateStr}
                      onClick={() => setSelectedDateStr(dateStr)}
                      className={`p-4 border rounded-xl cursor-pointer transition-all flex flex-col justify-between gap-4 min-h-[160px] ${
                        isCurrentSelected
                          ? 'border-indigo-600 bg-indigo-50/10 ring-1 ring-indigo-650 shadow-3xs'
                          : isToday
                          ? 'bg-amber-50/45 border-amber-300'
                          : 'bg-white border-slate-200 hover:border-slate-355'
                      }`}
                    >
                      <div className="border-b border-slate-100 pb-2 text-center">
                        <span className="block text-xs uppercase text-slate-400 font-bold font-mono">{dayName}</span>
                        <span className="block text-sm font-extrabold text-slate-800">{displayDateVal}</span>
                      </div>

                      {/* Week lists with Color Coding */}
                      <div className="space-y-1.5 flex-1 overflow-y-auto max-h-[100px]">
                        {itemsToday.length === 0 ? (
                          <span className="block text-[10px] text-slate-350 text-center py-2 font-black font-mono">No Goals</span>
                        ) : (
                          itemsToday.map((e, idX) => {
                            const theme = getGoalTheme(e.goalId);
                            return (
                              <div key={idX} className={`text-[9.5px] p-1.5 rounded-lg font-black truncate border ${theme.bg} ${theme.border} border-l-[3px]`} title={e.title}>
                                {e.title}
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* DAY VIEW TIMELINE WITH DIRECT GOAL LISTING AND COLOR CODES */}
          {viewMode === 'Day' && (
            <div className="space-y-4">
              <div className="border-b border-slate-150 pb-2">
                <span className="text-xs text-indigo-600 font-bold uppercase tracking-widest font-mono">Dynamic Agenda</span>
                <h3 className="text-base font-bold text-slate-850">Coordinates: {selectedDateStr}</h3>
              </div>

              <div className="space-y-4 pt-2">
                {activeDayEvents.length === 0 ? (
                  <div className="text-center py-12 bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
                    <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs text-slate-400 font-bold font-mono uppercase">Unscheduled Agenda Coordinate</p>
                    <p className="text-xs text-slate-550 mt-1">No Goal Targets or Deadlines set for {selectedDateStr}.</p>
                  </div>
                ) : (
                  activeDayEvents.map((e, idx) => {
                    const theme = getGoalTheme(e.goalId);
                    return (
                      <div key={idx} className="flex gap-4 items-start animate-fade-in">
                        <span className="text-xs font-bold font-mono text-indigo-600 bg-indigo-50 py-1.5 px-3 rounded-lg border border-indigo-100 shrink-0 shadow-4xs">
                          Slot {idx + 1}
                        </span>
                        <div className="flex-1">
                          <div className={`p-4 border rounded-xl flex items-center justify-between gap-4 shadow-3xs hover:shadow-2xs transition ${theme.bg} ${theme.border} border-l-[4px]`}>
                            <div>
                              <span className="text-[9px] font-mono font-black uppercase block tracking-widest text-slate-500 mb-0.5">{e.type} TARGET</span>
                              <h4 className="font-extrabold text-sm text-slate-900 leading-normal">{e.title}</h4>
                            </div>
                            <span className="text-[10px] bg-white text-slate-850 rounded-lg py-1 px-3.5 font-bold uppercase select-none border border-slate-150 shadow-4xs shrink-0">
                              Active Target
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

        </div>

        {/* AGENDA SELECTOR / DAY LOGS (Right Column) WITH STUNNING LIGHT THEME DESIGN */}
        <div className="lg:col-span-4 space-y-6">
          
          <div className="bg-white rounded-xl p-5 border border-slate-205 space-y-4 shadow-3xs" id="calendar-day-agenda">
            <div className="border-b border-slate-100 pb-3">
              <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest font-mono">Selected Coords</span>
              <h2 className="text-base font-black text-slate-900 mt-0.5">{selectedDateStr}</h2>
            </div>

            <div className="space-y-3">
              <h3 className="text-xs font-extrabold text-indigo-600 uppercase tracking-widest">Active Items ({activeDayEvents.length})</h3>

              {activeDayEvents.length === 0 ? (
                <div className="py-8 text-center text-slate-400">
                  <Clock className="w-7 h-7 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-bold font-mono uppercase">Day agenda is clear</p>
                  <p className="text-[11px] text-slate-500 mt-1">No goals or deadlines scheduled for this day.</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
                  {activeDayEvents.map((e, idx) => {
                    const theme = getGoalTheme(e.goalId);
                    return (
                      <div key={`${e.id}-${idx}`} className={`border p-3.5 rounded-xl flex items-center justify-between gap-3 animate-fade-in text-xs ${theme.bg} ${theme.border} border-l-4 shadow-4xs`}>
                        <div>
                          <div className="flex items-center gap-1.5 mb-1 text-slate-500 font-semibold text-[10px]">
                            <Tag className="w-3 h-3 text-slate-450" />
                            <span className="uppercase tracking-wide">{e.type}</span>
                          </div>
                          <h4 className="font-extrabold text-slate-900 leading-normal">{e.title}</h4>
                        </div>

                        {/* If custom user event, let them delete it */}
                        {e.id.startsWith('evt-custom-') ? (
                          <button
                            onClick={() => handleDeleteEvent(e.id)}
                            className="bg-white text-rose-605 hover:text-rose-700 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 p-1.5 rounded-lg cursor-pointer transition active:scale-95 shadow-4xs shrink-0"
                            title="Remove custom marker"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <span className="bg-white text-slate-400 p-1.5 rounded-lg border border-slate-100 shadow-4xs shrink-0" title="System tied milestone">
                            <Lock className="w-3.5 h-3.5 text-slate-400" />
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="text-[10px] text-slate-450 border-t border-slate-100 pt-3 font-semibold leading-relaxed">
              <p>System scheduled markers (Goals, Milestones, and Exam Deadlines) are automatically synchronized with the program state. Study tasks, revision cards, and audit log activities are excluded from here to avoid visual clutter.</p>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
