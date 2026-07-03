import React, { useState } from 'react';
import { useLakshya } from '../context/LakshyaContext';
import { motion, AnimatePresence } from 'motion/react';
import {
  Flame,
  Plus,
  Trash2,
  TrendingUp,
  Calendar,
  CheckCircle2,
  XSquare,
  AlertCircle,
  HelpCircle,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  Info,
  CalendarDays,
  Sparkles,
  ClipboardList,
  Coffee,
  Lock,
  Unlock,
  RefreshCw
} from 'lucide-react';
import { Habit, HabitFrequency, HabitDayStatus } from '../types';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceArea
} from 'recharts';

interface WeekInfo {
  num: number;
  name: string;
  colorClass: string;
  cellBg: string;
  borderClass: string;
}

const getWeekStart = (dateStr: string): string => {
  const d = new Date(dateStr + 'T00:00:00');
  const day = d.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
  const diff = day === 0 ? -6 : 1 - day; // diff to Monday
  const monday = new Date(d);
  monday.setDate(d.getDate() + diff);
  return monday.toISOString().split('T')[0];
};

const getWeekOfYear = (dateStr: string): number => {
  const d = new Date(dateStr + 'T00:00:00');
  const day = d.getDay() || 7;
  d.setMilliseconds(0);
  d.setSeconds(0);
  d.setMinutes(0);
  d.setHours(0);
  d.setDate(d.getDate() + 4 - day);
  const yearStart = new Date(d.getFullYear(), 0, 1);
  const diff = d.getTime() - yearStart.getTime();
  return Math.ceil((diff / 86400000 + 1) / 7);
};

const getWeekInfo = (dateStr: string): WeekInfo => {
  const wOfYear = getWeekOfYear(dateStr);
  const cycleIndex = (wOfYear % 5 === 0) ? 5 : (wOfYear % 5);
  
  if (cycleIndex === 1) {
    return {
      num: 1,
      name: `Week 1`,
      colorClass: 'bg-emerald-50 text-emerald-800 border-emerald-150',
      cellBg: 'bg-emerald-50/15',
      borderClass: 'border-emerald-200'
    };
  }
  if (cycleIndex === 2) {
    return {
      num: 2,
      name: `Week 2`,
      colorClass: 'bg-orange-50 text-orange-850 border-orange-150',
      cellBg: 'bg-orange-50/15',
      borderClass: 'border-orange-200'
    };
  }
  if (cycleIndex === 3) {
    return {
      num: 3,
      name: `Week 3`,
      colorClass: 'bg-blue-50 text-blue-850 border-blue-150',
      cellBg: 'bg-blue-50/15',
      borderClass: 'border-blue-200'
    };
  }
  if (cycleIndex === 4) {
    return {
      num: 4,
      name: `Week 4`,
      colorClass: 'bg-rose-50 text-rose-800 border-rose-150',
      cellBg: 'bg-rose-50/15',
      borderClass: 'border-rose-200'
    };
  }
  return {
    num: 5,
    name: `Week 5`,
    colorClass: 'bg-yellow-50 text-yellow-850 border-yellow-150',
    cellBg: 'bg-yellow-50/15',
    borderClass: 'border-yellow-250'
  };
};

const CircularProgress: React.FC<{
  percentage: number;
  size?: number;
  strokeWidth?: number;
  primaryColorClass?: string;
  secondaryColorClass?: string;
  textColorClass?: string;
}> = ({
  percentage,
  size = 110,
  strokeWidth = 9,
  primaryColorClass = "text-indigo-650",
  secondaryColorClass = "text-slate-100",
  textColorClass = "text-slate-800"
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (Math.min(100, Math.max(0, percentage)) / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center select-none" style={{ width: size, height: size }}>
      <svg className="w-full h-full transform -rotate-90 pointer-events-none" viewBox={`0 0 ${size} ${size}`}>
        {/* Background circle */}
        <circle
          className={`${secondaryColorClass}`}
          stroke="currentColor"
          fill="transparent"
          strokeWidth={strokeWidth}
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        {/* Foreground (progress) circle */}
        <motion.circle
          className={`${primaryColorClass}`}
          stroke="currentColor"
          fill="transparent"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          strokeLinecap="round"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
      </svg>
      {/* Percentage inner text */}
      <div className={`absolute flex flex-col items-center justify-center font-sans ${textColorClass}`}>
        <span className="text-lg font-black tracking-tight leading-none">{percentage}%</span>
        <span className="text-[8px] uppercase tracking-wider font-extrabold text-slate-400 mt-1">Punched</span>
      </div>
    </div>
  );
};

export const HabitsTab: React.FC = () => {
  const {
    habits,
    addHabit,
    updateHabitStatus,
    deleteHabit,
    declareHolidayBulk,
    toggleLockHabitDate,
    lockedHabitDates,
    todayDate,
    largeText,
    highContrast,
    activeStudentId
  } = useLakshya();

  // Line chart dot and tooltip components
  const CustomDot = (props: any) => {
    const { cx, cy, payload } = props;
    if (!payload) return null;
    const week = getWeekInfo(payload.dateStr);
    let dotColor = '#10b981';
    if (week.num === 1) dotColor = '#10b981';
    else if (week.num === 2) dotColor = '#f97316';
    else if (week.num === 3) dotColor = '#3b82f6';
    else if (week.num === 4) dotColor = '#ef4444';
    else dotColor = '#ca8a04'; // yellow-600

    return (
      <circle cx={cx} cy={cy} r={4.5} fill={dotColor} stroke="#fff" strokeWidth={1.5} />
    );
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const week = getWeekInfo(data.dateStr);
      const completedList = habits.filter(h => h.history[data.dateStr] === 'Done');
      const scheduledList = habits.filter(h => isHabitScheduled(h, data.dateStr));

      return (
        <div className="bg-white/95 backdrop-blur-xs border border-slate-200 p-3.5 rounded-xl shadow-lg font-sans text-xs text-slate-700 max-w-xs space-y-2">
          <div className="flex items-center justify-between border-b border-slate-100 pb-1.5 flex-wrap gap-2">
            <span className="font-bold text-slate-900">Day {data.day} ({data.dateStr})</span>
            <span className={`text-[9.5px] font-black uppercase px-2 py-0.5 rounded-full border ${week.colorClass}`}>
              {week.name}
            </span>
          </div>
          <div className="pb-1 text-slate-500 font-medium flex justify-between gap-4">
            <span>Completion Rate:</span>
            <span className="font-extrabold text-indigo-700 font-mono text-xs">{data.completionPercentage}%</span>
          </div>
          <div className="pb-1 text-slate-500 font-medium flex justify-between gap-4">
            <span>Habits Completed:</span>
            <span className="font-extrabold text-slate-850 font-mono text-xs">{data.completed} of {scheduledList.length}</span>
          </div>
          {completedList.length > 0 && (
            <div className="pt-1.5 border-t border-slate-100">
              <span className="block text-[9.5px] font-black text-slate-400 uppercase tracking-wider mb-1">Completed:</span>
              <ul className="space-y-1 max-h-[100px] overflow-y-auto">
                {completedList.map(h => (
                  <li key={h.id} className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700">
                    <span className="text-emerald-500 text-xs">✓</span>
                    <span className="truncate">{h.name}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  // Navigation and toggles
  const [viewMode, setViewMode] = useState<'weekly' | 'monthly' | 'cards'>('weekly');
  const [showForm, setShowForm] = useState(false);
  const [showHolidayForm, setShowHolidayForm] = useState(false);
  
  // Custom month/year browsing for monthly tracker (Starts at today's month and year dynamically based on todayDate)
  const [currentYear, setCurrentYear] = useState<number>(() => {
    const parts = todayDate.split('-');
    return parts.length === 3 ? Number(parts[0]) : 2026;
  });
  const [currentMonth, setCurrentMonth] = useState<number>(() => {
    const parts = todayDate.split('-');
    return parts.length === 3 ? Number(parts[1]) : 7; // 1-indexed
  });

  // Holiday Planner States
  const [holidayDate, setHolidayDate] = useState(todayDate);
  const [holidayHabitIds, setHolidayHabitIds] = useState<string[]>([]);
  const [holidayIsAllHabits, setHolidayIsAllHabits] = useState(true);

  // Habit Form Creation States
  const [habitName, setHabitName] = useState('');
  const [habitFreq, setHabitFreq] = useState<HabitFrequency>('Custom');
  const [customDays, setCustomDays] = useState<number[]>([1, 2, 3, 4, 5]); // Default Mon-Fri
  const [customMonthlyDay, setCustomMonthlyDay] = useState<number>(1); // [1-31] target day of month
  const [habitStartDate, setHabitStartDate] = useState(todayDate);
  const [deletingHabitId, setDeletingHabitId] = useState<string | null>(null);

  // Day Name mappings for standard calendars
  const DAYS_OF_WEEK = [
    { label: 'Mon', value: 1, name: 'Monday' },
    { label: 'Tue', value: 2, name: 'Tuesday' },
    { label: 'Wed', value: 3, name: 'Wednesday' },
    { label: 'Thu', value: 4, name: 'Thursday' },
    { label: 'Fri', value: 5, name: 'Friday' },
    { label: 'Sat', value: 6, name: 'Saturday' },
    { label: 'Sun', value: 0, name: 'Sunday' }
  ];

  // Map month numbers to readable labels
  const MONTHS_LABELS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const toggleDaySelection = (dayVal: number) => {
    if (customDays.includes(dayVal)) {
      setCustomDays(customDays.filter(d => d !== dayVal));
    } else {
      setCustomDays([...customDays, dayVal].sort());
    }
  };

  const handleFrequencyChange = (freq: HabitFrequency) => {
    setHabitFreq(freq);
    if (freq === 'Daily') {
      setCustomDays([1, 2, 3, 4, 5, 6, 0]); // All days
    } else if (freq === 'Weekly') {
      setCustomDays([0]); // Just Sunday
    } else if (freq === 'Biweekly') {
      setCustomDays([2, 5]); // Tue, Fri
    } else if (freq === 'Custom') {
      setCustomDays([1, 3, 5]); // Mon, Wed, Fri for standard custom
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!habitName.trim()) return;

    // Send the correct parameters for custom monthly or weekly days
    addHabit(
      habitName, 
      habitFreq, 
      habitFreq === 'Custom' ? customDays : (habitFreq === 'Daily' ? [1,2,3,4,5,6,0] : (habitFreq === 'Monthly' ? undefined : customDays)),
      habitFreq === 'Monthly' ? customMonthlyDay : undefined,
      habitStartDate
    );
    setHabitName('');
    setHabitStartDate(todayDate);
    setShowForm(false);
  };

  // Helper to determine if a habit has a scheduled point on a given date (YYYY-MM-DD)
  const isHabitScheduled = (h: Habit, dateStr: string): boolean => {
    if (h.createdDate && dateStr < h.createdDate) {
      return false;
    }

    // If there is existing completed, missed, or holiday history, we show it anyway to preserve data
    if (h.history[dateStr] === 'Done' || h.history[dateStr] === 'Missed' || h.history[dateStr] === 'Holiday') {
      return true;
    }

    try {
      const dateObj = new Date(dateStr + 'T00:00:00');
      const dayOfWeek = dateObj.getDay(); // 0 is Sun, 1 is Mon, etc.

      if (h.frequency === 'Monthly') {
        const dateObjDay = dateObj.getDate(); // 1 - 31
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
        return true; // fallback
      }

      if (h.frequency === 'Weekly') {
        // Fallback or specific scheduled day
        return h.customDays ? h.customDays.includes(dayOfWeek) : dayOfWeek === 0; 
      }

      if (h.frequency === 'Biweekly') {
        return h.customDays ? h.customDays.includes(dayOfWeek) : (dayOfWeek === 2 || dayOfWeek === 5);
      }

    } catch (err) {
      console.error(err);
    }
    return true;
  };

  // Generate date list of7 days in base week (Mon to Sun of current week)
  const getWeeklyDates = (baseDateStr: string): string[] => {
    const baseDate = new Date(baseDateStr + 'T00:00:00');
    const day = baseDate.getDay(); // 0 = Sun, 1 = Mon ... 6 = Sat
    const diffToMonday = day === 0 ? -6 : 1 - day;

    const monday = new Date(baseDate);
    monday.setDate(baseDate.getDate() + diffToMonday);

    const weekList: string[] = [];
    for (let i = 0; i < 7; i++) {
      const temp = new Date(monday);
      temp.setDate(monday.getDate() + i);
      weekList.push(temp.toISOString().split('T')[0]);
    }
    return weekList;
  };

  // Generate date list of the whole month (1 -> 31/30) dynamically
  const getMonthlyDates = (year: number, monthVal: number): string[] => {
    const list: string[] = [];
    // monthVal is 1-indexed, so 6 = June
    const numDays = new Date(year, monthVal, 0).getDate();
    for (let d = 1; d <= numDays; d++) {
      const dayStr = d < 10 ? `0${d}` : `${d}`;
      const monthStr = monthVal < 10 ? `0${monthVal}` : `${monthVal}`;
      list.push(`${year}-${monthStr}-${dayStr}`);
    }
    return list;
  };

  const weeklyDates = getWeeklyDates(todayDate);
  const monthlyDates = getMonthlyDates(currentYear, currentMonth);

  const groupedWeeks = (() => {
    const groups: { [weekStart: string]: string[] } = {};
    monthlyDates.forEach(dateStr => {
      const ws = getWeekStart(dateStr);
      if (!groups[ws]) {
        groups[ws] = [];
      }
      groups[ws].push(dateStr);
    });
    return Object.keys(groups).sort().map((ws) => {
      const datesInWeek = groups[ws];
      const firstDate = datesInWeek[0];
      const firstDayNum = Number(firstDate.split('-')[2]);
      const lastDate = datesInWeek[datesInWeek.length - 1];
      const lastDayNum = Number(lastDate.split('-')[2]);
      const weekInfo = getWeekInfo(firstDate);
      
      let emoji = '🟢';
      let bgHeader = 'bg-emerald-100/90 text-emerald-800 border-emerald-250';
      let lightBg = 'bg-emerald-50 text-emerald-800 border-emerald-150';
      let dotColor = '#10b981';
      let bulletBg = 'bg-emerald-500';

      if (weekInfo.num === 2) {
        emoji = '🟠';
        bgHeader = 'bg-orange-100/90 text-orange-850 border-orange-250';
        lightBg = 'bg-orange-50 text-orange-850 border-orange-150';
        dotColor = '#f97316';
        bulletBg = 'bg-orange-500';
      } else if (weekInfo.num === 3) {
        emoji = '🔵';
        bgHeader = 'bg-blue-100/90 text-blue-800 border-blue-250';
        lightBg = 'bg-blue-50 text-blue-850 border-blue-150';
        dotColor = '#3b82f6';
        bulletBg = 'bg-blue-500';
      } else if (weekInfo.num === 4) {
        emoji = '🔴';
        bgHeader = 'bg-rose-100/90 text-rose-800 border-rose-250';
        lightBg = 'bg-rose-50 text-rose-800 border-rose-150';
        dotColor = '#ef4444';
        bulletBg = 'bg-rose-500';
      } else if (weekInfo.num === 5) {
        emoji = '🟡';
        bgHeader = 'bg-yellow-105 text-yellow-850 border-yellow-250';
        lightBg = 'bg-yellow-50 text-yellow-850 border-yellow-150';
        dotColor = '#ca8a04';
        bulletBg = 'bg-yellow-550';
      }

      return {
        weekStart: ws,
        dates: datesInWeek,
        colSpan: datesInWeek.length,
        label: `${emoji} Week ${weekInfo.num} (Days ${firstDayNum}-${lastDayNum})`,
        bgHeader,
        lightBg,
        dotColor,
        bulletBg,
        weekInfo,
        firstDayNum,
        lastDayNum
      };
    });
  })();

  const isDayLocked = (dateStr: string) => {
    return lockedHabitDates.includes(dateStr);
  };

  // Navigate month
  const adjustMonth = (delta: number) => {
    let m = currentMonth + delta;
    let y = currentYear;
    if (m > 12) {
      m = 1;
      y += 1;
    } else if (m < 1) {
      m = 12;
      y -= 1;
    }
    setCurrentMonth(m);
    setCurrentYear(y);
  };

  // Interactive cycling toggle for habit status
  const cycleHabitCell = (habitId: string, dateStr: string, currentStatus: HabitDayStatus | 'Pending') => {
    if (isDayLocked(dateStr)) return; // Read-only once day is locked or past

    if (currentStatus === 'Done') {
      updateHabitStatus(habitId, dateStr, 'Missed');
    } else if (currentStatus === 'Missed') {
      updateHabitStatus(habitId, dateStr, 'Holiday');
    } else if (currentStatus === 'Holiday') {
      updateHabitStatus(habitId, dateStr, 'Pending');
    } else {
      updateHabitStatus(habitId, dateStr, 'Done');
    }
  };

  // Accessibility formatting helpers
  const getAccessibilitySymbol = (status: HabitDayStatus | 'Pending') => {
    if (status === 'Done') return '✓';
    if (status === 'Missed') return '✗';
    return '○';
  };

  const getDayNameShort = (dateStr: string): string => {
    const d = new Date(dateStr + 'T00:00:00');
    return DAYS_OF_WEEK.find(item => item.value === d.getDay())?.label || 'Day';
  };

  // Calculated overall health stats
  const totalTrackedHabits = habits.length;
  const highestStreak = habits.reduce((max, h) => Math.max(max, h.currentStreak), 0);
  const averageConsistency = habits.length > 0 
    ? Math.round(habits.reduce((sum, h) => sum + h.completionPercent, 0) / habits.length)
    : 0;

  return (
    <div className="space-y-8 animate-fade-in" id="habits-tab-root">
      
      {/* 1. HEADER HERO PANEL */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2">
            <Flame className="w-7 h-7 text-amber-500 fill-amber-100" />
            <span>Habit Matrix & Accountability Grid</span>
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Program customized repeating schedules, toggle active checkmarks directly on a spreadsheet, and review full-month habits consistency.
          </p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => {
              setShowHolidayForm(!showHolidayForm);
              setShowForm(false);
            }}
            className="bg-purple-650 hover:bg-purple-700 text-white font-extrabold py-2 px-4 rounded-xl text-xs cursor-pointer inline-flex items-center gap-1.5 shadow-3xs transition-transform active:scale-95"
          >
            <Coffee className="w-4 h-4" /> Plan Habit Holiday
          </button>
          
          <button
            onClick={() => {
              setShowForm(!showForm);
              setShowHolidayForm(false);
            }}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold py-2 px-4 rounded-xl text-xs cursor-pointer inline-flex items-center gap-1.5 shadow-3xs transition-transform active:scale-95"
          >
            <Plus className="w-4 h-4" /> Add Custom Habit
          </button>
        </div>
      </div>

      {/* Habit Holiday planner Form */}
      <AnimatePresence>
        {showHolidayForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-white p-6 rounded-2xl border border-slate-200 shadow-3xs space-y-4 text-slate-700 overflow-hidden"
          >
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Coffee className="w-4 h-4 text-purple-600" />
                <span>Declare Habit Holiday / Leave</span>
              </h2>
              <button
                type="button"
                onClick={() => setShowHolidayForm(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                Close
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Holiday Date</label>
                  <input
                    type="date"
                    value={holidayDate}
                    onChange={(e) => setHolidayDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 outline-none focus:border-purple-600 font-medium transition"
                  />
                  <p className="text-[10px] text-slate-400 mt-1 font-medium">Selected day's scheduled checkboxes will be designated as a holiday (filled with purple).</p>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Scope of Holiday</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setHolidayIsAllHabits(true);
                        setHolidayHabitIds([]);
                      }}
                      className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold border text-center transition-all cursor-pointer ${
                        holidayIsAllHabits
                          ? 'bg-purple-605 border-purple-600 text-white shadow-3xs'
                          : 'bg-slate-50 border-slate-200 text-slate-650 hover:bg-slate-100'
                      }`}
                    >
                      All Habits
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setHolidayIsAllHabits(false);
                        if (holidayHabitIds.length === 0 && habits.length > 0) {
                          setHolidayHabitIds([habits[0].id]);
                        }
                      }}
                      className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold border text-center transition-all cursor-pointer ${
                        !holidayIsAllHabits
                          ? 'bg-purple-605 border-purple-600 text-white shadow-3xs'
                          : 'bg-slate-50 border-slate-200 text-slate-650 hover:bg-slate-100'
                      }`}
                    >
                      Select Habits
                    </button>
                  </div>
                </div>
              </div>

              {!holidayIsAllHabits && (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Select Active Habit(s)</label>
                  <div className="max-h-[140px] overflow-y-auto space-y-1.5 pr-1">
                    {habits.map((h) => {
                      const isChecked = holidayHabitIds.includes(h.id);
                      return (
                        <label key={h.id} className="flex items-center gap-2 cursor-pointer p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              if (isChecked) {
                                setHolidayHabitIds(holidayHabitIds.filter(id => id !== h.id));
                              } else {
                                setHolidayHabitIds([...holidayHabitIds, h.id]);
                              }
                            }}
                            className="rounded text-purple-600 focus:ring-purple-500 w-3.5 h-3.5"
                          />
                          <span className="text-xs text-slate-700 font-medium truncate">{h.name}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  const targetIds = holidayIsAllHabits ? habits.map(h => h.id) : holidayHabitIds;
                  if (targetIds.length > 0) {
                    declareHolidayBulk(holidayDate, targetIds, false);
                    setShowHolidayForm(false);
                  }
                }}
                className="bg-slate-100 hover:bg-slate-200 text-slate-750 font-extrabold py-2 px-4 rounded-xl text-xs cursor-pointer"
              >
                Clear Holiday for Day
              </button>
              <button
                type="button"
                onClick={() => {
                  const targetIds = holidayIsAllHabits ? habits.map(h => h.id) : holidayHabitIds;
                  if (targetIds.length > 0) {
                    declareHolidayBulk(holidayDate, targetIds, true);
                    setShowHolidayForm(false);
                  }
                }}
                className="bg-purple-600 hover:bg-purple-700 text-white font-extrabold py-2 px-5 rounded-xl text-xs cursor-pointer shadow-3xs"
              >
                Apply Holiday Status
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. STATS SUMMARIZER */}
      {habits.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4" id="habits-mini-metrics">
          <div className="bg-gradient-to-br from-indigo-50/50 to-white rounded-2xl p-4 border border-indigo-100 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 border border-indigo-200 flex items-center justify-center text-indigo-700">
              <ClipboardList className="w-5 h-5" />
            </div>
            <div>
              <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">Active Habit Rows</span>
              <span className="text-xl font-black text-slate-800">{totalTrackedHabits} track{totalTrackedHabits === 1 ? '' : 's'}</span>
            </div>
          </div>

          <div className="bg-gradient-to-br from-pink-50/40 to-white rounded-2xl p-4 border border-pink-100 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-pink-105 border border-pink-150 flex items-center justify-center text-pink-600">
              <Flame className="w-5 h-5 fill-pink-50" />
            </div>
            <div>
              <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">Top Current Streak</span>
              <span className="text-xl font-black text-slate-800">{highestStreak} Day{highestStreak === 1 ? '' : 's'} 🔥</span>
            </div>
          </div>

          <div className="bg-gradient-to-br from-emerald-50/40 to-white rounded-2xl p-4 border border-emerald-100 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-700">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">Mean Consistency Rate</span>
              <span className="text-xl font-black text-slate-800">{averageConsistency}% completion</span>
            </div>
          </div>
        </div>
      )}

      {/* 2.5 HABIT ACHIEVEMENT GRAPH (LINE GRAPH) */}
      {(() => {
        if (habits.length === 0) return null;

        const graphData = monthlyDates.map((dateStr) => {
          const dayNum = Number(dateStr.split('-')[2]);
          const completed = habits.reduce((acc, h) => {
            return h.history[dateStr] === 'Done' ? acc + 1 : acc;
          }, 0);
          const scheduled = habits.reduce((acc, h) => {
            return isHabitScheduled(h, dateStr) ? acc + 1 : acc;
          }, 0);
          const completionPercentage = scheduled > 0 ? Math.round((completed / scheduled) * 100) : 0;
          return {
            day: dayNum,
            dateStr,
            completed,
            scheduled,
            completionPercentage,
          };
        });

        return (
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-3xs space-y-4 animate-fade-in" id="habit-achievement-graph-wrapper">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-indigo-650" />
                  <span>Habit Achievement Graph ({MONTHS_LABELS[currentMonth - 1]} {currentYear})</span>
                </h2>
                <p className="text-[11px] text-slate-500 font-semibold leading-relaxed mt-1">
                  Completion percentage of scheduled daily habits in the selected calendar month. Hover points to inspect your consistency.
                </p>
              </div>

              {/* Micro navigator for current selected month */}
              <div className="flex items-center gap-1.5 bg-slate-100/70 hover:bg-slate-100 p-1 rounded-xl border border-slate-205 self-start sm:self-auto shadow-5xs select-none">
                <button
                  type="button"
                  onClick={() => adjustMonth(-1)}
                  className="p-1.5 text-slate-500 hover:text-slate-850 hover:bg-white rounded-lg transition-all cursor-pointer"
                  title="Previous Month"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="text-[10px] font-extrabold text-slate-800 px-2.5 min-w-[105px] text-center uppercase tracking-wider">
                  {MONTHS_LABELS[currentMonth - 1].substring(0, 3)} {currentYear}
                </span>
                <button
                  type="button"
                  onClick={() => adjustMonth(1)}
                  className="p-1.5 text-slate-500 hover:text-slate-850 hover:bg-white rounded-lg transition-all cursor-pointer"
                  title="Next Month"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Week Color-code Legend */}
            <div className="flex flex-wrap gap-2.5 sm:gap-4 text-[9.5px] font-mono font-bold select-none text-slate-550 pb-1 bg-slate-50/50 p-2.5 rounded-xl border border-slate-150/60 justify-center">
              <span className="text-[10px] uppercase font-black text-slate-400 border-r border-slate-200 pr-3 mr-1">Weeks:</span>
              {groupedWeeks.map((gw) => (
                <span key={gw.weekStart} className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md border ${gw.lightBg}`}>
                  <span className={`w-2 h-2 rounded-full ${gw.bulletBg}`}></span> {gw.label}
                </span>
              ))}
            </div>

            <div className="h-[250px] w-full pt-1">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={graphData}
                  margin={{ top: 10, right: 15, left: -10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="day" 
                    stroke="#94a3b8" 
                    fontSize={10} 
                    fontWeight="bold"
                    tickLine={false}
                    dy={5}
                  />
                  <YAxis 
                    stroke="#94a3b8" 
                    fontSize={10} 
                    fontWeight="bold"
                    allowDecimals={false}
                    domain={[0, 100]}
                    tickFormatter={(v) => `${v}%`}
                    tickLine={false}
                    dx={-5}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  
                  {/* Visual background shading highlighting the weeks */}
                  {groupedWeeks.map((gw) => (
                    <ReferenceArea
                      key={gw.weekStart}
                      {...({
                        x1: gw.firstDayNum,
                        x2: gw.lastDayNum,
                        fill: gw.dotColor,
                        fillOpacity: 0.02
                      } as any)}
                    />
                  ))}

                  <Line
                    type="monotone"
                    dataKey="completionPercentage"
                    stroke="#4f46e5"
                    strokeWidth={3}
                    activeDot={{ r: 6, stroke: '#4f46e5', strokeWidth: 1.5, fill: '#fff' }}
                    dot={<CustomDot />}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        );
      })()}

      {/* 3. NEW CUSTOM HABIT CREATOR FORM */}
      <AnimatePresence>
        {showForm && (
          <motion.form
            onSubmit={handleSubmit}
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="bg-white p-6 rounded-2xl border border-slate-200 shadow-3xs space-y-4 text-slate-700"
          >
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <span>Program Custom Repeating Behavior</span>
              </h2>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="text-slate-405 hover:text-slate-600 text-xs font-bold"
              >
                Close
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Left Form: Name and Preset */}
              <div className="lg:col-span-5 space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Habit Label</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Code 1 hour, Walk 10k steps, Meditate..."
                    value={habitName}
                    onChange={(e) => setHabitName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 outline-none focus:border-indigo-600 font-medium placeholder-slate-400 transition"
                  />
                </div>
                
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Preset Repeat Framework</label>
                  <div className="grid grid-cols-5 gap-1.5">
                    {(['Custom', 'Daily', 'Weekly', 'Biweekly', 'Monthly'] as HabitFrequency[]).map((f) => (
                      <button
                        key={f}
                        type="button"
                        onClick={() => handleFrequencyChange(f)}
                        className={`py-2 px-1 rounded-xl text-[10px] font-bold border text-center transition-all cursor-pointer ${
                          habitFreq === f
                            ? 'bg-indigo-600 border-indigo-600 text-white shadow-3xs'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Track Start / Creation Date</label>
                  <input
                    type="date"
                    required
                    value={habitStartDate}
                    onChange={(e) => setHabitStartDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 outline-none focus:border-indigo-600 font-medium transition"
                  />
                  <p className="text-[10px] text-slate-400 mt-1 font-medium">Tracking is not possible or scheduled before this creation date.</p>
                </div>
              </div>

              {/* Right Form: Interactive Days Selection / Monthly Day Selection */}
              <div className="lg:col-span-7 bg-slate-50/60 p-4 rounded-xl border border-slate-150 flex flex-col justify-between">
                <div>
                  {habitFreq === 'Monthly' ? (
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <label className="block text-[10px] font-semibold text-slate-450 uppercase tracking-widest">
                          Custom Repetition Date of Every Month
                        </label>
                        <span className="text-[9px] text-indigo-600 font-extrabold bg-indigo-50/70 border border-indigo-100 px-2 py-0.5 rounded-full">
                          Day {customMonthlyDay} selected
                        </span>
                      </div>
                      
                      <p className="text-[11px] text-slate-400 mb-3 font-medium">
                        This habit is scheduled to occur ONLY on the selected date of every month. The checklist checkbox column will ONLY show up on this date.
                      </p>

                      <div className="grid grid-cols-7 gap-1 md:gap-1.5 mt-2 max-w-sm">
                        {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => {
                          const isSel = customMonthlyDay === day;
                          return (
                            <button
                              key={day}
                              type="button"
                              onClick={() => setCustomMonthlyDay(day)}
                              className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs border transition-all cursor-pointer ${
                                isSel
                                  ? 'bg-indigo-650 border-indigo-650 text-white shadow-3xs font-black'
                                  : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                              }`}
                              title={`Trigger on day ${day} of every month`}
                            >
                              {day}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <label className="block text-[10px] font-semibold text-slate-450 uppercase tracking-widest">
                          Custom Repetition Days of Week
                        </label>
                        <span className="text-[9px] text-indigo-600 font-extrabold bg-indigo-50/70 border border-indigo-100 px-2 py-0.5 rounded-full">
                          {customDays.length} / 7 days active
                        </span>
                      </div>
                      
                      <p className="text-[11px] text-slate-400 mb-3 font-medium">
                        Toggle days on which this habit is scheduled. A checkbox column will ONLY show up on the selected days.
                      </p>

                      <div className="flex gap-2 justify-start flex-wrap mt-2">
                        {DAYS_OF_WEEK.map((item) => {
                          const isSel = customDays.includes(item.value);
                          return (
                            <button
                              key={item.value}
                              type="button"
                              onClick={() => toggleDaySelection(item.value)}
                              className={`w-10 h-10 rounded-xl flex flex-col items-center justify-center font-bold text-xs border transition-all cursor-pointer ${
                                isSel
                                  ? 'bg-white border-indigo-600 text-indigo-600 shadow-4xs font-black'
                                  : 'bg-slate-100/50 border-slate-200 text-slate-400 hover:bg-slate-100 hover:text-slate-600'
                              }`}
                              title={`Toggle ${item.name}`}
                            >
                              <span className="text-[9px] font-bold uppercase text-slate-450">{item.label}</span>
                              {isSel ? (
                                <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full mt-0.5"></span>
                              ) : (
                                <span className="w-1.5 h-1.5 bg-transparent rounded-full mt-0.5"></span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                <div className="text-[10px] font-bold text-slate-450 mt-4 flex items-center gap-1 bg-white p-2 rounded-lg border border-slate-200/60">
                  <Info className="w-3.5 h-3.5 text-indigo-500" />
                  <span>
                    Currently configured schedule: {
                      habitFreq === 'Monthly'
                        ? `Runs on the ${customMonthlyDay}${
                            customMonthlyDay === 1 ? 'st' : customMonthlyDay === 2 ? 'nd' : customMonthlyDay === 3 ? 'rd' : 'th'
                          } of every month`
                        : (customDays.length === 7 
                            ? 'Everyday' 
                            : customDays.length === 0 
                            ? 'Never (Unscheduled)' 
                            : customDays.map(val => DAYS_OF_WEEK.find(d => d.value === val)?.label).join(', ')
                          )
                    }
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 border border-slate-250 bg-white hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-600 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!habitName.trim() || (habitFreq !== 'Monthly' && customDays.length === 0)}
                className="px-5 py-2 bg-indigo-650 hover:bg-indigo-700 disabled:opacity-50 text-white font-extrabold rounded-xl text-xs cursor-pointer shadow-3xs hover:shadow-2xs transition-all active:scale-95 flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" /> Initialize Habit Row
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* 4. WORKSPACE CONTROLLER FILTERS AND VIEWS */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        
        {/* Toggle between Weekly Spreadsheet & Monthly Scroll grids */}
        <div className="flex bg-slate-100/80 p-1.5 rounded-xl border border-slate-200/50 w-full sm:w-auto">
          <button
            onClick={() => setViewMode('weekly')}
            className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-bold font-sans transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              viewMode === 'weekly'
                ? 'bg-white text-slate-900 shadow-3xs font-black border border-slate-200/20'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Weekly Spreadsheet</span>
          </button>

          <button
            onClick={() => setViewMode('monthly')}
            className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-bold font-sans transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              viewMode === 'monthly'
                ? 'bg-white text-slate-900 shadow-3xs font-black border border-slate-200/20'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <CalendarDays className="w-3.5 h-3.5" />
            <span>Monthly Grid Spreadsheet</span>
          </button>

          <button
            onClick={() => setViewMode('cards')}
            className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-bold font-sans transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              viewMode === 'cards'
                ? 'bg-white text-slate-900 shadow-3xs font-black border border-slate-200/20'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>Detailed Streaks View</span>
          </button>
        </div>

        {/* Dynamic Context Header for Current Calendar Month navigator */}
        {viewMode === 'monthly' && (
          <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 w-full sm:w-auto justify-between sm:justify-start">
            <button
              onClick={() => adjustMonth(-1)}
              className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition cursor-pointer"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-black text-slate-850 px-2 min-w-[120px] text-center">
              {MONTHS_LABELS[currentMonth - 1]} {currentYear}
            </span>
            <button
              onClick={() => adjustMonth(1)}
              className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition cursor-pointer"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* 5. MASTER HABITS SPREADSHEETS */}
      {habits.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 border border-slate-250/70 text-center text-slate-400 shadow-3xs">
          <Flame className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-extrabold text-slate-700 text-sm">No regular habits tracking currently.</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            You need to create repeating behavioral habits before you can check them on the schedule spreadsheet!
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold py-2 px-5 rounded-xl text-xs cursor-pointer inline-flex items-center gap-1.5 shadow-3xs"
          >
            <Plus className="w-4 h-4" /> Adopt your first habit
          </button>
        </div>
      ) : (
        <div>
          {/* VIEW A: WEEKLY SPREADSHEET TABLE */}
          {viewMode === 'weekly' && (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-3xs overflow-hidden" id="weekly-spreadsheet-wrapper">
              <div className="p-4 bg-slate-50/60 border-b border-slate-150 flex items-center justify-between flex-wrap gap-2">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Weekly Punchcard Schedule</h3>
                    {(() => {
                      if (weeklyDates.length === 0) return null;
                      const activeWeekInfo = getWeekInfo(weeklyDates[0]);
                      let emoji = '🟢';
                      let badgeBg = 'bg-emerald-50 text-emerald-800 border-emerald-150';
                      if (activeWeekInfo.num === 2) {
                        emoji = '🟠';
                        badgeBg = 'bg-orange-50 text-orange-850 border-orange-150';
                      } else if (activeWeekInfo.num === 3) {
                        emoji = '🔵';
                        badgeBg = 'bg-blue-50 text-blue-850 border-blue-150';
                      } else if (activeWeekInfo.num === 4) {
                        emoji = '🔴';
                        badgeBg = 'bg-rose-50 text-rose-800 border-rose-150';
                      } else if (activeWeekInfo.num === 5) {
                        emoji = '🟡';
                        badgeBg = 'bg-yellow-50 text-yellow-850 border-yellow-150';
                      }
                      return (
                        <span className={`inline-flex items-center gap-1.5 text-[9.5px] font-extrabold px-2 py-0.5 rounded-full border ${badgeBg} shadow-5xs`}>
                          {emoji} {activeWeekInfo.name} active
                        </span>
                      );
                    })()}
                  </div>
                  <p className="text-[10px] text-slate-450 font-medium mt-0.5">Click on any scheduled cell's checkbox to toggle completing/missing the habit.</p>
                </div>
                <div className="flex gap-4 text-[10px] text-slate-450 font-bold bg-white px-3 py-1 rounded-lg border border-slate-200">
                  <span className="flex items-center gap-1"><span className="text-emerald-500 font-black">✓</span> Completed</span>
                  <span className="flex items-center gap-1"><span className="text-rose-500 font-black">✗</span> Missed</span>
                  <span className="flex items-center gap-1"><span className="text-slate-350">○</span> Pending</span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[700px]">
                  <thead>
                    <tr className="bg-slate-50/30 border-b border-slate-150">
                      {/* Left Frozen Row Head */}
                      <th className="sticky left-0 bg-white z-10 px-5 py-4 text-[10px] font-black uppercase text-slate-400 tracking-wider w-[240px] border-r border-slate-150 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                        Habit & Streaks
                      </th>
                      {/* Dates Column heads */}
                      {weeklyDates.map((dateStr) => {
                        const isToday = dateStr === todayDate;
                        const dayName = getDayNameShort(dateStr);
                        const displayedDayNum = dateStr.split('-')[2];
                        const isAutoLocked = dateStr < todayDate;
                        const isLocked = isDayLocked(dateStr);
                        const weekInfo = getWeekInfo(dateStr);

                        return (
                          <th
                            key={dateStr}
                            className={`px-4 py-3 text-center border-r last:border-0 border-slate-150 transition-colors ${
                              isToday 
                                ? 'bg-indigo-50/50 text-indigo-700 italic border-b-2 border-b-indigo-500' 
                                : `${weekInfo.cellBg} text-slate-705`
                            }`}
                          >
                            <div className="flex flex-col items-center justify-center">
                              <span className={`text-[9px] uppercase font-bold ${isToday ? 'text-indigo-600 font-black' : 'text-slate-400'}`}>
                                {dayName}
                              </span>
                              <span className={`text-base font-black ${isToday ? 'text-indigo-700 font-extrabold' : 'text-slate-705'}`}>
                                {displayedDayNum}
                              </span>
                              {isToday && (
                                <span className="bg-indigo-600 text-[8px] font-bold text-white px-1.5 py-0.25 rounded uppercase tracking-wide mt-1 scale-90">
                                  Today
                                </span>
                              )}
                              
                              <button
                                type="button"
                                disabled={isAutoLocked}
                                onClick={() => !isAutoLocked && toggleLockHabitDate(dateStr)}
                                className={`mt-1.5 p-1 rounded-md transition-all cursor-pointer flex items-center justify-center ${
                                  isAutoLocked
                                    ? 'bg-slate-100/70 text-slate-400 border border-slate-200 cursor-not-allowed select-none'
                                    : isLocked
                                    ? 'bg-amber-100 text-amber-750 hover:bg-amber-200 border border-amber-200 shadow-3xs hover:scale-105 active:scale-95'
                                    : 'bg-slate-100/80 text-slate-450 hover:bg-slate-200 hover:text-slate-755 border border-slate-200 hover:scale-105 active:scale-95'
                                }`}
                                title={isAutoLocked
                                  ? `${dateStr} has passed and is permanently locked.`
                                  : isLocked
                                  ? `${dateStr} is locked. Click to Unlock and edit again.`
                                  : `${dateStr} is unlocked. Click to Lock and secure habits for the day.`
                                }
                              >
                                {isAutoLocked ? (
                                  <span className="flex items-center gap-1 text-[9px] font-extrabold px-1">
                                    <Lock className="w-2.5 h-2.5 text-slate-400" /> Locked
                                  </span>
                                ) : isLocked ? (
                                  <span className="flex items-center gap-1 text-[9px] font-extrabold px-1">
                                    <Lock className="w-2.5 h-2.5 text-amber-600" /> Locked
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-1 text-[9px] font-extrabold px-1">
                                    <Unlock className="w-2.5 h-2.5 text-slate-500" /> Lock Day
                                  </span>
                                )}
                              </button>
                            </div>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-150">
                    {habits.map((h) => (
                      <tr key={h.id} className="hover:bg-slate-50/30 transition-colors group">
                        
                        {/* Habit name Row head - Stickied Left for perfect scroll experience */}
                        <td className="sticky left-0 bg-white z-10 px-5 py-3 border-r border-slate-150 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] text-slate-800">
                          <div className="flex flex-col gap-0.5 max-w-[200px]">
                            <span className="font-extrabold text-slate-800 text-xs truncate" title={h.name}>
                              {h.name}
                            </span>
                            
                            <div className="flex items-center gap-1.5">
                              {/* Streaks mini label */}
                              <span className="text-[9px] text-pink-650 bg-pink-50 border border-pink-100 flex items-center gap-0.5 px-1 py-0.25 rounded font-bold">
                                <Flame className="w-2.5 h-2.5 fill-pink-500 text-pink-600" />
                                <span>{h.currentStreak}d streak</span>
                              </span>
                              {/* Freq Badge */}
                              <span className="text-[8px] font-bold text-slate-450 uppercase tracking-wide bg-slate-100 border border-slate-200 px-1 py-0.25 rounded">
                                {h.frequency === 'Monthly' && h.customMonthlyDay
                                  ? `Monthly (${h.customMonthlyDay}${
                                      h.customMonthlyDay === 1 ? 'st' : h.customMonthlyDay === 2 ? 'nd' : h.customMonthlyDay === 3 ? 'rd' : 'th'
                                    })`
                                  : (h.frequency === 'Custom' && h.customDays 
                                      ? `${h.customDays.length}d` 
                                      : h.frequency)}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Core Date Grid Checkboxes */}
                        {weeklyDates.map((dateStr) => {
                          const scheduled = isHabitScheduled(h, dateStr);
                          const cellVal = h.history[dateStr] || 'Pending';
                          const isToday = dateStr === todayDate;
                          const isLocked = isDayLocked(dateStr);
                          const weekInfo = getWeekInfo(dateStr);

                          return (
                            <td
                              key={dateStr}
                              className={`p-2 text-center border-r last:border-0 border-slate-150 relative transition-all ${
                                isToday ? 'bg-indigo-55/20 shadow-inner' : weekInfo.cellBg
                              }`}
                            >
                              {scheduled ? (
                                <div className="flex items-center justify-center h-10">
                                  {/* Multi-status Toggle Box */}
                                  <button
                                    type="button"
                                    disabled={isLocked}
                                    onClick={() => cycleHabitCell(h.id, dateStr, cellVal)}
                                    className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center transition-all relative group/box ${
                                      isLocked ? 'cursor-not-allowed opacity-60' : 'cursor-pointer active:scale-90 hover:scale-105'
                                    } ${
                                      cellVal === 'Done'
                                        ? 'bg-emerald-500 border-emerald-600 text-white shadow-3xs'
                                        : cellVal === 'Missed'
                                        ? 'bg-rose-500 border-rose-600 text-white shadow-3xs'
                                        : cellVal === 'Holiday'
                                        ? 'bg-purple-600 border-purple-600 text-white shadow-3xs'
                                        : 'bg-white hover:bg-slate-50 hover:border-slate-400 border-slate-250 text-transparent hover:text-slate-350'
                                    }`}
                                    title={isLocked 
                                      ? `${h.name} on ${dateStr} is locked (cannot be edited).`
                                      : `${h.name} on ${dateStr}: Current state is ${cellVal}. Click to cycle (Done -> Missed -> Holiday -> Clear).`
                                    }
                                  >
                                    {cellVal === 'Done' ? (
                                      <Check className="w-5 h-5 stroke-[3px]" />
                                    ) : cellVal === 'Missed' ? (
                                      <X className="w-5 h-5 stroke-[3px]" />
                                    ) : cellVal === 'Holiday' ? (
                                      <Coffee className="w-4 h-4 text-white" />
                                    ) : (
                                      <Check className="w-4 h-4 stroke-[3px]" />
                                    )}
                                  </button>
                                  {isLocked && (
                                    <span className="absolute bottom-1 right-1 text-[8px] text-amber-500 font-extrabold" title="Locked Day">
                                      🔒
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <div className="flex items-center justify-center h-10 select-none bg-slate-100/40 rounded-md">
                                  <span className="text-slate-300 font-serif text-sm font-semibold hover:help cursor-help" title={`Not Scheduled before start date or for this frequency`}>
                                    —
                                  </span>
                                </div>
                              )}
                            </td>
                          );
                        })}

                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* VIEW B: MONTHLY SPREADSHEET TABLE */}
          {viewMode === 'monthly' && (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-3xs overflow-hidden" id="monthly-spreadsheet-wrapper">
              <div className="p-4 bg-slate-50/60 border-b border-slate-150 flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                    Full Month Accountability Spreadsheet ({MONTHS_LABELS[currentMonth - 1]} {currentYear})
                  </h3>
                  <p className="text-[10px] text-slate-450 font-medium">
                    Horizontal scrollable grid presenting all calendar days side-by-side. Habit labels stay frozen on the left.
                  </p>
                </div>
                <div className="flex gap-4 text-[10px] text-slate-450 font-bold bg-white px-3 py-1 rounded-lg border border-slate-200">
                  <span className="flex items-center gap-1"><span className="text-emerald-500 font-extrabold">✓</span> Done</span>
                  <span className="flex items-center gap-1"><span className="text-rose-500 font-extrabold">✗</span> Missed</span>
                  <span className="flex items-center gap-1"><span className="text-slate-300">○</span> Pending</span>
                </div>
              </div>

              {/* Main horizontal table scroller with frozen column logic */}
              <div className="overflow-x-auto max-w-full">
                <table className="w-full text-left border-collapse table-auto">
                  <thead>
                    {/* Timezone division header row dividing weeks with distinct colors */}
                    <tr className="border-b border-slate-150 bg-slate-50/10 text-center text-[10px] uppercase font-mono font-bold select-none">
                      <th className="sticky left-0 bg-slate-100 z-20 px-4 py-2 text-[9px] font-black uppercase text-slate-400 tracking-wider w-[180px] border-r border-slate-150 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                        WEEK DIVISION
                      </th>
                      {groupedWeeks.map((gw) => (
                        <th
                          key={gw.weekStart}
                          colSpan={gw.colSpan}
                          className={`px-1 py-1.5 border-r border-slate-200 text-[10px] font-black tracking-wider text-center ${gw.bgHeader}`}
                        >
                          {gw.label}
                        </th>
                      ))}
                    </tr>
                    <tr className="bg-slate-50/30 border-b border-slate-150">
                      {/* Left Frozen Column */}
                      <th className="sticky left-0 bg-white z-10 px-4 py-3.5 text-[10px] font-black uppercase text-slate-400 tracking-wider w-[180px] border-r border-slate-150 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                        Habit
                      </th>
                      {/* Generates dates 1 through 31/30 */}
                      {monthlyDates.map((dateStr) => {
                        const isToday = dateStr === todayDate;
                        const dayNumObj = Number(dateStr.split('-')[2]);
                        const d = new Date(dateStr + 'T00:00:00');
                        const dayNameShort = DAYS_OF_WEEK.find(item => item.value === d.getDay())?.label || 'Day';
                        const isAutoLocked = dateStr < todayDate;
                        const isLocked = isDayLocked(dateStr);
                        const weekInfo = getWeekInfo(dateStr);

                        return (
                          <th
                            key={dateStr}
                            className={`px-2 py-2 text-center border-r last:border-0 border-slate-150 text-[10px] font-bold min-w-[38px] transition-colors ${
                              isToday 
                                ? 'bg-indigo-50/50 text-indigo-700 italic border-b-2 border-b-indigo-500' 
                                : `${weekInfo.cellBg} text-slate-700`
                            }`}
                          >
                            <div className="flex flex-col items-center justify-center">
                              <span className="text-[8px] font-semibold text-slate-400 uppercase scale-90">
                                {dayNameShort.substring(0, 2)}
                              </span>
                              <span className={`text-xs font-black ${isToday ? 'text-indigo-750' : 'text-slate-600'}`}>
                                {dayNumObj}
                              </span>
                              
                              <button
                                type="button"
                                disabled={isAutoLocked}
                                onClick={() => !isAutoLocked && toggleLockHabitDate(dateStr)}
                                className={`mt-1 p-0.5 rounded transition-all flex items-center justify-center ${
                                  isAutoLocked
                                    ? 'text-slate-300 bg-transparent cursor-not-allowed select-none'
                                    : isLocked
                                    ? 'text-amber-600 bg-amber-50 hover:bg-amber-100 border border-amber-200 cursor-pointer'
                                    : 'text-slate-400 hover:text-slate-650 hover:bg-slate-100/50 border border-transparent cursor-pointer'
                                }`}
                                title={isAutoLocked
                                  ? `${dateStr} is permanently locked.`
                                  : isLocked
                                  ? `${dateStr} is locked. Click to Unlock and edit again.`
                                  : `${dateStr} is unlocked. Click to Lock and secure this day.`
                                }
                              >
                                {isAutoLocked ? (
                                  <Lock className="w-2.5 h-2.5 opacity-40" />
                                ) : isLocked ? (
                                  <Lock className="w-2.5 h-2.5" />
                                ) : (
                                  <Unlock className="w-2.5 h-2.5 opacity-50" />
                                )}
                              </button>
                            </div>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-150">
                    {habits.map((h) => (
                      <tr key={h.id} className="hover:bg-slate-50/20 transition-colors">
                        
                        {/* Sticky Left Column */}
                        <td className="sticky left-0 bg-white z-10 px-4 py-3 border-r border-slate-150 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                          <div className="flex flex-col gap-0.25 max-w-[150px]">
                            <span className="font-extrabold text-slate-800 text-[11px] truncate" title={h.name}>
                              {h.name}
                            </span>
                            <span className="text-[8px] font-bold text-pink-600">
                              Streaks: {h.currentStreak}d / {h.longestStreak}d
                            </span>
                          </div>
                        </td>

                        {/* Checkbox matrix cells */}
                        {monthlyDates.map((dateStr) => {
                          const isToday = dateStr === todayDate;
                          const scheduled = isHabitScheduled(h, dateStr);
                          const cellVal = h.history[dateStr] || 'Pending';
                          const isLocked = isDayLocked(dateStr);
                          const weekInfo = getWeekInfo(dateStr);

                          return (
                            <td
                              key={dateStr}
                              className={`p-1 text-center border-r last:border-0 border-slate-150 transition-colors ${
                                isToday ? 'bg-indigo-55/20 shadow-inner' : weekInfo.cellBg
                              }`}
                            >
                              {scheduled ? (
                                <div className="flex items-center justify-center relative">
                                  <button
                                    type="button"
                                    disabled={isLocked}
                                    onClick={() => cycleHabitCell(h.id, dateStr, cellVal)}
                                    className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                                      isLocked ? 'cursor-not-allowed opacity-60' : 'cursor-pointer active:scale-90 hover:scale-105'
                                    } ${
                                      cellVal === 'Done'
                                        ? 'bg-emerald-500 border-emerald-600 text-white shadow-4xs'
                                        : cellVal === 'Missed'
                                        ? 'bg-rose-500 border-rose-600 text-white shadow-4xs'
                                        : cellVal === 'Holiday'
                                        ? 'bg-purple-600 border-purple-600 text-white shadow-4xs'
                                        : 'bg-white hover:bg-slate-50 border-slate-200 text-transparent hover:text-slate-300'
                                    }`}
                                    title={isLocked
                                      ? `${h.name} on ${dateStr} is locked.`
                                      : `${h.name} (${dateStr}): Current status is ${cellVal}. Click to toggle.`
                                    }
                                  >
                                    {cellVal === 'Done' ? (
                                      <Check className="w-3.5 h-3.5 stroke-[3px]" />
                                    ) : cellVal === 'Missed' ? (
                                      <X className="w-3.5 h-3.5 stroke-[3px]" />
                                    ) : cellVal === 'Holiday' ? (
                                      <Coffee className="w-3.5 h-3.5 text-white" />
                                    ) : (
                                      <Check className="w-3" />
                                    )}
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center justify-center h-6 select-none bg-slate-50 rounded">
                                  <span className="text-slate-205 text-[8px]">—</span>
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* VIEW C: DETAILED STREAK CARDS PANEL */}
          {viewMode === 'cards' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6" id="habits-detail-cards">
              {habits.map((h) => {
                const currentStatus = h.history[todayDate] || 'Pending';
                return (
                  <div key={h.id} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-3xs flex flex-col justify-between gap-4">
                    <div className="flex items-start justify-between gap-4">
                      {/* Left side info & logging controls */}
                      <div className="flex-1 space-y-3">
                        <div>
                          <h3 className="font-extrabold text-slate-800 text-base">{h.name}</h3>
                          <p className="text-[10px] text-slate-400 uppercase tracking-wider bg-slate-50 border border-slate-100 rounded-md px-2 py-0.5 mt-1 inline-block">
                            Method: {h.frequency === 'Monthly' && h.customMonthlyDay
                              ? `Monthly (Day ${h.customMonthlyDay})`
                              : h.frequency}
                          </p>
                        </div>

                        {/* Interactive quick log list */}
                        <div className="space-y-1.5 pt-1">
                          <div className="flex items-center gap-1.5">
                            <span className="block text-[9px] font-extrabold uppercase text-slate-400 tracking-wider">Today's State:</span>
                            <span className={`inline-block text-[11px] font-black uppercase ${
                              currentStatus === 'Done'
                                ? 'text-emerald-700'
                                : currentStatus === 'Missed'
                                ? 'text-rose-700'
                                : currentStatus === 'Holiday'
                                ? 'text-purple-700'
                                : 'text-amber-700'
                            }`}>
                              {currentStatus} {currentStatus === 'Holiday' ? '☕' : `(${getAccessibilitySymbol(currentStatus)})`}
                            </span>
                          </div>

                          <div className="flex gap-1.5">
                            <button
                              disabled={lockedHabitDates.includes(todayDate) || !isHabitScheduled(h, todayDate)}
                              onClick={() => updateHabitStatus(h.id, todayDate, 'Done')}
                              className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-colors ${
                                lockedHabitDates.includes(todayDate) || !isHabitScheduled(h, todayDate)
                                  ? 'cursor-not-allowed opacity-50 bg-slate-100 border border-slate-200 text-slate-400'
                                  : currentStatus === 'Done'
                                  ? 'bg-emerald-600 text-white cursor-pointer hover:bg-emerald-700 shadow-3xs'
                                  : 'bg-slate-50 border border-slate-200 text-slate-650 hover:bg-emerald-50 cursor-pointer'
                              }`}
                            >
                              ✓ Done
                            </button>
                            <button
                              disabled={lockedHabitDates.includes(todayDate) || !isHabitScheduled(h, todayDate)}
                              onClick={() => updateHabitStatus(h.id, todayDate, 'Missed')}
                              className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-colors ${
                                lockedHabitDates.includes(todayDate) || !isHabitScheduled(h, todayDate)
                                  ? 'cursor-not-allowed opacity-50 bg-slate-100 border border-slate-200 text-slate-400'
                                  : currentStatus === 'Missed'
                                  ? 'bg-rose-600 text-white cursor-pointer hover:bg-rose-705 shadow-3xs'
                                  : 'bg-slate-50 border border-slate-200 text-slate-650 hover:bg-rose-50 cursor-pointer'
                              }`}
                            >
                              ✗ Miss
                            </button>
                            <button
                              disabled={lockedHabitDates.includes(todayDate) || !isHabitScheduled(h, todayDate)}
                              onClick={() => updateHabitStatus(h.id, todayDate, 'Pending')}
                              className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-colors ${
                                lockedHabitDates.includes(todayDate) || !isHabitScheduled(h, todayDate)
                                  ? 'cursor-not-allowed opacity-50 bg-slate-100 border border-slate-200 text-slate-400'
                                  : currentStatus === 'Pending'
                                  ? 'bg-amber-500 text-white cursor-pointer hover:bg-amber-600 shadow-3xs'
                                  : 'bg-slate-50 border border-slate-200 text-slate-650 hover:bg-amber-50 cursor-pointer'
                              }`}
                            >
                              ○ Clear
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Right side circular completion & erase trigger */}
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        {deletingHabitId === h.id ? (
                          <div className="flex items-center gap-1 shrink-0 bg-rose-50 px-1.5 py-0.8 rounded border border-rose-100">
                            <span className="text-[9px] text-rose-750 font-extrabold shrink-0">Erase?</span>
                            <button
                              type="button"
                              onClick={() => {
                                deleteHabit(h.id);
                                setDeletingHabitId(null);
                              }}
                              className="px-1.5 py-0.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded text-[9px] cursor-pointer"
                            >
                              Yes
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeletingHabitId(null)}
                              className="px-1.5 py-0.5 bg-white border border-slate-200 text-slate-600 font-bold rounded text-[9px] hover:bg-slate-50 cursor-pointer"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button; button"
                            onClick={() => {
                              setDeletingHabitId(h.id);
                            }}
                            className="text-slate-400 hover:text-rose-500 cursor-pointer p-1 rounded-lg hover:bg-slate-50 transition"
                            title="Delete Habit"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}

                        <CircularProgress
                          percentage={h.completionPercent}
                          size={70}
                          strokeWidth={6.5}
                          primaryColorClass="text-indigo-650"
                          secondaryColorClass="text-slate-100"
                        />
                      </div>
                    </div>

                    {/* Stats grid inside the card */}
                    <div className="grid grid-cols-3 gap-2.5 text-center border-t border-slate-100 pt-3">
                      <div className="bg-pink-50/40 p-2 border border-pink-100/70 rounded-xl">
                        <span className="text-pink-600 font-black text-sm flex items-center justify-center gap-0.5">
                          <Flame className="w-3.5 h-3.5 fill-pink-500" />
                          <span>{h.currentStreak}d</span>
                        </span>
                        <span className="block text-[8px] font-bold uppercase tracking-wider text-slate-400 mt-1">Current Streak</span>
                      </div>

                      <div className="bg-amber-50/30 p-2 border border-amber-100/70 rounded-xl">
                        <span className="text-amber-750 font-black text-sm block">
                          {h.longestStreak}d
                        </span>
                        <span className="block text-[8px] font-bold uppercase tracking-wider text-slate-400 mt-1">Longest Streak</span>
                      </div>

                      <div className="bg-indigo-50/30 p-2 border border-indigo-100/70 rounded-xl">
                        <span className="text-indigo-800 font-black text-sm block">
                          {h.completionPercent}%
                        </span>
                        <span className="block text-[8px] font-bold uppercase tracking-wider text-slate-400 mt-1">Completion Avg</span>
                      </div>
                    </div>

                    {/* Historical mini punchcard dots */}
                    <div className="border-t border-slate-100 pt-3">
                      <div className="flex justify-between items-center mb-2">
                        <span className="block text-[9px] font-extrabold uppercase text-slate-400 tracking-wider">Past 28 Days punchcard</span>
                        <span className="block text-[8px] font-extrabold text-slate-400 uppercase tracking-wide">Click to Cycle Status</span>
                      </div>
                      <div className="flex gap-1 max-w-full overflow-hidden shrink-0">
                        {Array.from({ length: 28 }, (_, i) => {
                          const dayOffset = 27 - i;
                          const d = new Date(todayDate);
                          d.setDate(d.getDate() - dayOffset);
                          const dateStr = d.toISOString().split('T')[0];
                          const state = h.history[dateStr] || 'Pending';
                          const isSch = isHabitScheduled(h, dateStr);

                          if (!isSch) {
                            return <div key={i} className="w-3.5 h-3.5 rounded bg-slate-100 border border-dashed border-slate-200" title={`${dateStr}: Not Scheduled`} />;
                          }

                          return (
                            <button
                              type="button"
                              key={i}
                              title={`${dateStr}: ${state} (Click to cycle)`}
                              onClick={() => {
                                if (lockedHabitDates.includes(dateStr)) return;
                                let nextStatus: HabitDayStatus;
                                if (state === 'Done') nextStatus = 'Missed';
                                else if (state === 'Missed') nextStatus = 'Holiday';
                                else if (state === 'Holiday') nextStatus = 'Pending';
                                else nextStatus = 'Done';
                                updateHabitStatus(h.id, dateStr, nextStatus);
                              }}
                              className={`w-3.5 h-3.5 rounded border transition-all cursor-pointer hover:scale-110 active:scale-90 ${
                                state === 'Done'
                                  ? 'bg-emerald-500 border-emerald-600 hover:bg-emerald-600'
                                  : state === 'Missed'
                                  ? 'bg-rose-500 border-rose-600 hover:bg-rose-600'
                                  : state === 'Holiday'
                                  ? 'bg-purple-600 border-purple-700 hover:bg-purple-700'
                                  : 'bg-white border-slate-205 hover:bg-slate-50'
                              }`}
                            />
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* WEEKLY HABIT ANALYTICS: DRILLDOWN CIRCULAR CHARTS */}
          {(() => {
            const weekMetrics = groupedWeeks.map((gw) => {
              let weekScheduled = 0;
              let weekCompleted = 0;

              habits.forEach((h) => {
                gw.dates.forEach((dateStr) => {
                  if (isHabitScheduled(h, dateStr)) {
                    weekScheduled++;
                    if (h.history[dateStr] === 'Done') {
                      weekCompleted++;
                    }
                  }
                });
              });

              const weekPercentage = weekScheduled > 0 ? Math.round((weekCompleted / weekScheduled) * 100) : 0;
              
              let primaryCol = 'text-emerald-500';
              let secondaryCol = 'text-emerald-50/50';
              let badgeCol = gw.lightBg;

              if (gw.weekInfo.num === 2) {
                primaryCol = 'text-orange-550';
                secondaryCol = 'text-orange-50/50';
              } else if (gw.weekInfo.num === 3) {
                primaryCol = 'text-blue-500';
                secondaryCol = 'text-blue-50/50';
              } else if (gw.weekInfo.num === 4) {
                primaryCol = 'text-rose-500';
                secondaryCol = 'text-rose-50/50';
              } else if (gw.weekInfo.num === 5) {
                primaryCol = 'text-yellow-600';
                secondaryCol = 'text-yellow-50/50';
              }

              return {
                weekStart: gw.weekStart,
                weekScheduled,
                weekCompleted,
                weekPercentage,
                primaryCol,
                secondaryCol,
                badgeCol,
                label: gw.label
              };
            });

            return (
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-3xs space-y-4 mt-8 animate-fade-in" id="weekly-habit-analytics-drilldown">
                <div>
                  <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                    <ClipboardList className="w-5 h-5 text-indigo-650" />
                    <span>Weekly Habit Analytics ({MONTHS_LABELS[currentMonth - 1]} {currentYear})</span>
                  </h2>
                  <p className="text-[11px] text-slate-450 font-semibold leading-relaxed mt-1">
                    Completion statistics calculated on scheduled behavioral routines parted week-by-week for the selected calendar month.
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 items-start justify-items-center py-2 pb-1">
                  {weekMetrics.map((wm) => (
                    <div key={wm.weekStart} className="flex flex-col items-center justify-between text-center space-y-3 bg-slate-50/40 p-4 rounded-xl border border-slate-150/60 w-full hover:scale-[1.02] transition duration-200 h-full">
                      <CircularProgress 
                        percentage={wm.weekPercentage} 
                        size={95} 
                        strokeWidth={8}
                        primaryColorClass={`${wm.primaryCol} animate-fade-in`} 
                        secondaryColorClass={wm.secondaryCol} 
                        textColorClass="text-slate-800"
                      />
                      <div className="space-y-1 w-full">
                        <span className={`block text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${wm.badgeCol} whitespace-nowrap text-center`}>
                          {wm.label}
                        </span>
                        <span className="block text-[9.5px] font-mono text-slate-400 font-semibold shadow-5xs rounded py-0.5 bg-white border border-slate-100 text-center w-full">
                          {wm.weekCompleted} / {wm.weekScheduled} punches
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
};
