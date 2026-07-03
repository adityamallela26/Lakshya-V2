import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import {
  Goal,
  GoalChild,
  Task,
  RevisionCard,
  Habit,
  AnalyticsWidget,
  ActivityLog,
  CalendarEvent,
  GoalType,
  GoalStatus,
  TaskStatus,
  RevisionStatus,
  RevisionCardStatus,
  HabitFrequency,
  HabitDayStatus,
  StudentProfile,
  AcademicTest
} from '../types';
import {
  INITIAL_GOALS,
  INITIAL_TASKS,
  INITIAL_REVISIONS,
  INITIAL_HABITS,
  INITIAL_WIDGETS,
  INITIAL_ACTIVITIES,
  INITIAL_CALENDAR_EVENTS,
  INITIAL_TODAY
} from '../initialData';

interface LakshyaContextType {
  goals: Goal[];
  tasks: Task[];
  revisions: RevisionCard[];
  habits: Habit[];
  widgets: AnalyticsWidget[];
  activities: ActivityLog[];
  calendarEvents: CalendarEvent[];
  academicTests: AcademicTest[];
  todayDate: string;
  lockedHabitDates: string[];

  // Accessibility modes
  largeText: boolean;
  highContrast: boolean;
  setLargeText: (val: boolean) => void;
  setHighContrast: (val: boolean) => void;

  // Custom Goal Types
  goalTypes: string[];
  addGoalType: (type: string) => void;
  deleteGoalType: (type: string) => void;

  // Goal actions
  addGoal: (name: string, type: GoalType, deadline: string, classTracking: string, levelNames?: string[], classEnabled?: boolean, startDate?: string, idealDate?: string, calculationMode?: 'equal' | 'weightage', weightageLevels?: number[]) => void;
  updateGoal: (id: string, fields: Partial<Goal>) => void;
  deleteGoal: (id: string) => void;
  
  // Recursive Goal Tree actions
  addChildGoal: (goalId: string, parentId: string | null, name: string, date?: string, idealDate?: string) => void; // null parentId means direct child of the root goal
  bulkAddChildren: (goalId: string, parsedRows: string[][]) => void;
  deleteChildGoal: (goalId: string, childId: string) => void;
  toggleChildGoal: (goalId: string, childId: string) => void;
  renameChildGoal: (goalId: string, childId: string, newName: string) => void;
  moveChildGoal: (goalId: string, childId: string, direction: 'up' | 'down') => void;
  updateChildGoalFields: (goalId: string, childId: string, fields: Partial<GoalChild>) => void;
  updateChildrenWeights: (goalId: string, weightsMap: Record<string, number>) => void;

  // Task actions
  addTask: (name: string, goalId: string, deadline: string, estimatedHours: number, taskType?: string) => void;
  updateTask: (id: string, fields: Partial<Task>) => void;
  deleteTask: (id: string) => void;

  // Academic Test score actions
  addAcademicTest: (
    goalId: string,
    title: string,
    testDate: string,
    maxMarks: number,
    marksObtained: number,
    coveredChapters: string[],
    examination?: string,
    subjectId?: string,
    subjectName?: string,
    chapterId?: string,
    chapterName?: string
  ) => void;
  deleteAcademicTest: (id: string) => void;

  // Revision actions
  addRevision: (taskId: string, taskName: string, scheduledDate: string, audioLink?: string) => void;
  updateRevision: (id: string, fields: Partial<RevisionCard>) => void;
  deleteRevision: (id: string) => void;

  // Habit actions
  addHabit: (name: string, frequency: HabitFrequency, customDays?: number[], customMonthlyDay?: number, createdDate?: string) => void;
  updateHabitStatus: (id: string, date: string, status: HabitDayStatus) => void;
  deleteHabit: (id: string) => void;
  declareHolidayBulk: (date: string, habitIds: string[], isHoliday: boolean) => void;
  toggleLockHabitDate: (date: string) => void;
  recalculateAllData: () => void;

  // Widget actions
  addWidget: (type: AnalyticsWidget['type'], title: string, metric: AnalyticsWidget['metric'], size: AnalyticsWidget['size']) => void;
  deleteWidget: (id: string) => void;
  moveWidget: (id: string, direction: 'forward' | 'backward') => void;

  // Log activity helper
  logActivity: (text: string, category: ActivityLog['category']) => void;

  // Student multi-profile engine (Tally-style)
  students: StudentProfile[];
  activeStudentId: string | null;
  isStudent: boolean;
  switchStudent: (id: string | null) => void;
  createStudent: (name: string, role?: 'Student' | 'Professional' | 'Other') => void;
  updateStudentRole: (id: string, role: 'Student' | 'Professional' | 'Other') => void;
  renameStudent: (id: string, newName: string) => void;
  deleteStudent: (id: string) => void;
  restoreStudent: (id: string) => void;
  permanentlyDeleteStudent: (id: string) => void;
  importStudent: (studentData: any) => { success: boolean; error?: string };
  exportStudent: (id: string) => void;
}

const LakshyaContext = createContext<LakshyaContextType | undefined>(undefined);

export const isHabitScheduled = (h: Habit, dateStr: string): boolean => {
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
      return true; 
    }

    if (h.frequency === 'Weekly') {
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

export const recalculateStreakForHabit = (h: Habit, todayStr: string): Habit => {
  const historyDates = Object.keys(h.history).filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d));
  
  if (historyDates.length === 0) {
    return {
      ...h,
      currentStreak: 0,
      longestStreak: 0,
      completionPercent: 0
    };
  }

  // Sort history dates chronologically
  historyDates.sort();
  const startStr = historyDates[0];
  const endStr = todayStr;

  const dates: string[] = [];
  try {
    const start = new Date(startStr + 'T00:00:00');
    const end = new Date(endStr + 'T00:00:00');
    const temp = new Date(start);
    let limit = 0;
    while (temp <= end && limit < 1000) {
      dates.push(temp.toISOString().split('T')[0]);
      temp.setDate(temp.getDate() + 1);
      limit++;
    }
  } catch (e) {
    console.error("Error generating dates range:", e);
  }

  const scheduledDates = dates.filter(d => isHabitScheduled(h, d));

  let currentStreak = 0;
  let longestStreak = 0;

  for (const dateVal of scheduledDates) {
    const status = h.history[dateVal] || 'Pending';
    if (status === 'Done') {
      currentStreak++;
      if (currentStreak > longestStreak) {
        longestStreak = currentStreak;
      }
    } else if (status === 'Holiday') {
      // Holiday preserves the existing streak! Do not increment, but do not reset to 0
    } else {
      if (dateVal === todayStr && status === 'Pending') {
        // Keep currentStreak as-is, don't reset
      } else {
        currentStreak = 0;
      }
    }
  }

  const totalScheduledLogged = scheduledDates.length || 1;
  const doneCount = scheduledDates.filter(d => h.history[d] === 'Done').length;
  const completionPercent = Math.round((doneCount / totalScheduledLogged) * 100);

  return {
    ...h,
    currentStreak,
    longestStreak,
    completionPercent
  };
};

export const useLakshya = () => {
  const context = useContext(LakshyaContext);
  if (!context) {
    throw new Error('useLakshya must be used within a LakshyaProvider');
  }
  return context;
};

// Reusable student profile ID generator based on Academy LKS prefix, year, initials, and numeric suffix
export const generateStudentNomenclatureId = (name: string): string => {
  const year = INITIAL_TODAY && INITIAL_TODAY.includes('-') ? INITIAL_TODAY.split('-')[0] : '2026';
  const initials = name
    .trim()
    .split(/\s+/)
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .replace(/[^A-Z]/g, '') // Keep clean alphabetical characters only
    .slice(0, 4);
    
  const code = initials || 'ST';
  const randNum = Math.floor(1000 + Math.random() * 9000);
  return `LKS-${year}-${code}-${randNum}`;
};

export const LakshyaProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Master list of all student profiles (companies)
  const [students, setStudents] = useState<StudentProfile[]>(() => {
    const saved = localStorage.getItem('lakshya_students');
    if (saved) {
      try {
        const parsed: StudentProfile[] = JSON.parse(saved);
        // Deduplicate profiles by ID to prevent random key collision warnings or duplicate data
        const uniqueProfiles: StudentProfile[] = [];
        const seenIds = new Set<string>();
        for (const s of parsed) {
          if (s && s.id && !seenIds.has(s.id)) {
            seenIds.add(s.id);
            uniqueProfiles.push({
              ...s,
              role: s.role || 'Student'
            });
          }
        }
        // Tally-style garbage collection: permanently clean up any student deleted over 30 days ago
        return uniqueProfiles.filter(s => {
          if (!s.deletedAt) return true;
          const deletedDate = new Date(s.deletedAt);
          const now = new Date(INITIAL_TODAY);
          const diffTime = now.getTime() - deletedDate.getTime();
          const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
          return diffDays < 30; // hold in Recycle Bin for strictly 30 days
        });
      } catch (e) {
        // Fallback below
      }
    }
    
    // Default seed student profile so the parent starts with structured example data immediately
    const defaultStudent: StudentProfile = {
      id: 'LKS-2026-AM-8801',
      name: 'Aryan Mallela',
      role: 'Student',
      createdDate: INITIAL_TODAY,
      goals: INITIAL_GOALS,
      tasks: INITIAL_TASKS,
      revisions: INITIAL_REVISIONS,
      habits: INITIAL_HABITS,
      widgets: INITIAL_WIDGETS,
      calendarEvents: INITIAL_CALENDAR_EVENTS,
      activities: INITIAL_ACTIVITIES,
      academicTests: [
        {
          id: 'test-seed-1',
          goalId: 'g-college-finals',
          title: 'NumPy Array Performance and Broadcasting Assessment',
          testDate: '2026-06-01',
          maxMarks: 100,
          marksObtained: 85,
          coveredChapters: ['Scientific Programming with NumPy & Pandas ➔ Vectorized Broadcasting & Matrix Manipulations'],
          examination: 'Term End Exam',
          subjectId: 'gc-phys3',
          subjectName: 'Scientific Programming with NumPy & Pandas',
          chapterId: 'gcc-maxwell',
          chapterName: 'Vectorized Broadcasting & Matrix Manipulations'
        },
        {
          id: 'test-seed-2',
          goalId: 'g-college-finals',
          title: 'Data Analysis & Graph Visualizations with Seaborn Lab',
          testDate: '2026-06-03',
          maxMarks: 50,
          marksObtained: 40,
          coveredChapters: ['Scientific Programming with NumPy & Pandas ➔ Data Visualizations with Matplotlib & Seaborn'],
          examination: 'Term End Exam',
          subjectId: 'gc-phys3',
          subjectName: 'Scientific Programming with NumPy & Pandas',
          chapterId: 'gcc-optics',
          chapterName: 'Data Visualizations with Matplotlib & Seaborn'
        },
        {
          id: 'test-seed-3',
          goalId: 'g-college-finals',
          title: 'Python Memoization & lru_cache decorator test',
          testDate: '2026-06-04',
          maxMarks: 100,
          marksObtained: 72,
          coveredChapters: ['Data Structures & Dynamic Programming in Python ➔ Dynamic Programming & lru_cache optimization'],
          examination: 'Term End Exam',
          subjectId: 'gc-comp-algo',
          subjectName: 'Data Structures & Dynamic Programming in Python',
          chapterId: 'gcc-dp',
          chapterName: 'Dynamic Programming & lru_cache optimization'
        },
        {
          id: 'test-seed-4',
          goalId: 'g-college-finals',
          title: 'Python Collections deque and BFS implementation quiz',
          testDate: '2026-06-05',
          maxMarks: 30,
          marksObtained: 27,
          coveredChapters: ['Data Structures & Dynamic Programming in Python ➔ Graph Traversals (BFS/DFS) via Python Deque'],
          examination: 'Class Unit Quiz',
          subjectId: 'gc-comp-algo',
          subjectName: 'Data Structures & Dynamic Programming in Python',
          chapterId: 'gcc-greedy',
          chapterName: 'Graph Traversals (BFS/DFS) via Python Deque'
        }
      ]
    };
    return [defaultStudent];
  });

  // Current active student profile ID (or null if on student selection dashboard)
  const [activeStudentId, setActiveStudentId] = useState<string | null>(() => {
    return localStorage.getItem('lakshya_active_student_id') || null;
  });

  // Individual hooks to preserve fast, zero-re-render responsive updates in specific tabs
  const [goals, setGoals] = useState<Goal[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [revisions, setRevisions] = useState<RevisionCard[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [lockedHabitDates, setLockedHabitDates] = useState<string[]>([]);
  const [widgets, setWidgets] = useState<AnalyticsWidget[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [academicTests, setAcademicTests] = useState<AcademicTest[]>([]);

  const [largeText, setLargeText] = useState<boolean>(() => {
    return localStorage.getItem('lakshya_large_text') === 'true';
  });

  const [highContrast, setHighContrast] = useState<boolean>(() => {
    return localStorage.getItem('lakshya_high_contrast') === 'true';
  });

  const [goalTypes, setGoalTypes] = useState<string[]>(() => {
    const saved = localStorage.getItem('lakshya_goal_types');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // Fallback below
      }
    }
    return ['Academic', 'Competitive', 'Skill', 'Personal'];
  });

  const todayDate = INITIAL_TODAY;
  const isSwitchingRef = useRef(false);

  const activeStudent = students.find(s => s.id === activeStudentId);
  const isStudent = !activeStudent || activeStudent.role === 'Student';

  // Sync state FROM master active Student Profile on switch/load
  useEffect(() => {
    const active = students.find(s => s.id === activeStudentId);
    if (active) {
      isSwitchingRef.current = true;
      setGoals(active.goals || []);
      setTasks(active.tasks || []);
      setRevisions(active.revisions || []);
      
      const rawHabits = active.habits || [];
      const recalculatedHabits = rawHabits.map(h => {
        const habitWithCreated = { ...h, createdDate: h.createdDate || '2026-06-01' };
        return recalculateStreakForHabit(habitWithCreated, todayDate);
      });
      setHabits(recalculatedHabits);
      setLockedHabitDates(active.lockedHabitDates || []);
      
      setWidgets(active.widgets || INITIAL_WIDGETS);
      setActivities(active.activities || []);
      setCalendarEvents(active.calendarEvents || []);
      setAcademicTests(active.academicTests || []);
      
      // Release mutex shortly
      setTimeout(() => {
        isSwitchingRef.current = false;
      }, 50);
    } else {
      isSwitchingRef.current = true;
      setGoals([]);
      setTasks([]);
      setRevisions([]);
      setHabits([]);
      setLockedHabitDates([]);
      setWidgets([]);
      setActivities([]);
      setCalendarEvents([]);
      setAcademicTests([]);
      setTimeout(() => {
        isSwitchingRef.current = false;
      }, 50);
    }
    localStorage.setItem('lakshya_active_student_id', activeStudentId || '');
  }, [activeStudentId]);

  // Sync state TO master active Student Profile on editing changes
  useEffect(() => {
    if (isSwitchingRef.current || !activeStudentId) return;
    setStudents(prev => prev.map(s => {
      if (s.id === activeStudentId) {
        return {
          ...s,
          goals,
          tasks,
          revisions,
          habits: habits.map(h => ({ ...h, createdDate: h.createdDate || '2026-06-01' })),
          widgets,
          calendarEvents,
          activities,
          academicTests,
          lockedHabitDates
        };
      }
      return s;
    }));
  }, [goals, tasks, revisions, habits, widgets, calendarEvents, activities, academicTests, activeStudentId, lockedHabitDates]);

  // Master local storage serialization
  useEffect(() => {
    localStorage.setItem('lakshya_students', JSON.stringify(students));
  }, [students]);

  useEffect(() => {
    localStorage.setItem('lakshya_large_text', String(largeText));
  }, [largeText]);

  useEffect(() => {
    localStorage.setItem('lakshya_high_contrast', String(highContrast));
  }, [highContrast]);

  useEffect(() => {
    localStorage.setItem('lakshya_goal_types', JSON.stringify(goalTypes));
  }, [goalTypes]);

  const addGoalType = (type: string) => {
    const trimmed = type.trim();
    if (!trimmed) return;
    setGoalTypes(prev => {
      if (prev.some(t => t.toLowerCase() === trimmed.toLowerCase())) return prev;
      return [...prev, trimmed];
    });
    logActivity(`Added custom goal type: "${trimmed}"`, 'general');
  };

  const deleteGoalType = (type: string) => {
    setGoalTypes(prev => prev.filter(t => t !== type));
    logActivity(`Deleted custom goal type: "${type}"`, 'general');
  };

  // Student list action handlers
  const switchStudent = (id: string | null) => {
    setActiveStudentId(id);
  };

  const createStudent = (name: string, role: 'Student' | 'Professional' | 'Other' = 'Student') => {
    let newId = generateStudentNomenclatureId(name);
    // Guarantee ID uniqueness against existing active or recycled profiles
    while (students.some(s => s.id === newId)) {
      newId = generateStudentNomenclatureId(name);
    }
    const newStudent: StudentProfile = {
      id: newId,
      name,
      role,
      createdDate: INITIAL_TODAY,
      goals: [],
      tasks: [],
      revisions: [],
      habits: [],
      widgets: INITIAL_WIDGETS,
      calendarEvents: [],
      activities: [
        {
          id: `act-${Date.now()}`,
          timestamp: new Date().toISOString(),
          text: `Profile folder created (${role}): ${name}`,
          category: 'general'
        }
      ]
    };
    setStudents(prev => [...prev, newStudent]);
    setActiveStudentId(newStudent.id);
  };

  const updateStudentRole = (id: string, role: 'Student' | 'Professional' | 'Other') => {
    setStudents(prev => prev.map(s => {
      if (s.id === id) {
        return { ...s, role };
      }
      return s;
    }));
    logActivity(`Changed profile role to: "${role}"`, 'general');
  };

  const renameStudent = (id: string, newName: string) => {
    setStudents(prev => prev.map(s => {
      if (s.id === id) {
        return { ...s, name: newName };
      }
      return s;
    }));
  };

  const deleteStudent = (id: string) => {
    setStudents(prev => prev.map(s => {
      if (s.id === id) {
        return { ...s, deletedAt: new Date().toISOString() };
      }
      return s;
    }));
    if (activeStudentId === id) {
      setActiveStudentId(null);
    }
  };

  const restoreStudent = (id: string) => {
    setStudents(prev => prev.map(s => {
      if (s.id === id) {
        const { deletedAt, ...rest } = s;
        return rest as StudentProfile;
      }
      return s;
    }));
  };

  const permanentlyDeleteStudent = (id: string) => {
    setStudents(prev => prev.filter(s => s.id !== id));
    if (activeStudentId === id) {
      setActiveStudentId(null);
    }
  };

  const importStudent = (studentData: any): { success: boolean; error?: string } => {
    try {
      if (!studentData || typeof studentData !== 'object') {
        return { success: false, error: 'Malformed profile file data (must be a valid JSON object)' };
      }
      if (!studentData.name) {
        return { success: false, error: 'Student file is missing the mandatory "name" attribute' };
      }

      const imported: StudentProfile = {
        id: studentData.id || generateStudentNomenclatureId(studentData.name),
        name: studentData.name,
        role: studentData.role || 'Student',
        createdDate: studentData.createdDate || INITIAL_TODAY,
        goals: Array.isArray(studentData.goals) ? studentData.goals : [],
        tasks: Array.isArray(studentData.tasks) ? studentData.tasks : [],
        revisions: Array.isArray(studentData.revisions) ? studentData.revisions : [],
        habits: Array.isArray(studentData.habits) ? studentData.habits : [],
        widgets: Array.isArray(studentData.widgets) ? studentData.widgets : INITIAL_WIDGETS,
        calendarEvents: Array.isArray(studentData.calendarEvents) ? studentData.calendarEvents : [],
        activities: Array.isArray(studentData.activities) ? studentData.activities : []
      };

      setStudents(prev => {
        const filtered = prev.filter(s => s.id !== imported.id);
        return [...filtered, imported];
      });
      setActiveStudentId(imported.id);
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message || 'Error occurred while loading JSON' };
    }
  };

  const exportStudent = (id: string) => {
    const student = students.find(s => s.id === id);
    if (!student) return;

    // Export raw JSON clone
    const clone = { ...student };
    delete clone.deletedAt; // export as active state file

    const rawStr = JSON.stringify(clone, null, 2);
    const blob = new Blob([rawStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    // Tally-like company extension file name
    const sanitizedName = student.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    link.download = `lakshya_${sanitizedName}_${student.id}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Activity stream logger
  const logActivity = (text: string, category: ActivityLog['category']) => {
    const newLog: ActivityLog = {
      id: `act-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      timestamp: new Date().toISOString(),
      text,
      category
    };
    setActivities(prev => [newLog, ...prev].slice(0, 50)); // cap at 50 logs
  };

  // Helper: calculate days remaining from today to target date
  const getDaysDiff = (targetRaw: string) => {
    const today = new Date(todayDate);
    const target = new Date(targetRaw);
    const diffTime = target.getTime() - today.getTime();
    return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  };

  // --- GOAL ACTIONS ---
  const addGoal = (
    name: string,
    type: GoalType,
    deadline: string,
    classTracking: string,
    levelNames?: string[],
    classEnabled?: boolean,
    startDate?: string,
    idealDate?: string,
    calculationMode?: 'equal' | 'weightage',
    weightageLevels?: number[]
  ) => {
    const newId = `g-${Date.now()}`;
    const newGoal: Goal = {
      id: newId,
      name,
      type,
      deadline,
      idealDate: idealDate || deadline,
      startDate: startDate || todayDate,
      completion: 0,
      status: 'On Track',
      classTracking,
      daysRemaining: getDaysDiff(deadline),
      children: [],
      levelNames: levelNames || ["Subject", "Chapter", "Topic"],
      classEnabled: !!classEnabled,
      calculationMode: calculationMode || 'equal',
      weightageLevels: weightageLevels || (calculationMode === 'weightage' ? [0] : [])
    };
    setGoals(prev => [...prev, newGoal]);

    // Calendar milestone
    const newCal: CalendarEvent = {
      id: `cal-dead-${newId}`,
      title: `DEADLINE: ${name}`,
      date: deadline,
      type: 'deadline'
    };
    setCalendarEvents(prev => [...prev, newCal]);
    logActivity(`Added new goal: "${name}"`, 'goal');
  };

  const updateGoal = (id: string, fields: Partial<Goal>) => {
    setGoals(prev =>
      prev.map(g => {
        if (g.id === id) {
          const updated = { ...g, ...fields };
          if (fields.deadline) {
            updated.daysRemaining = getDaysDiff(fields.deadline);
          }
          updated.completion = recalculateGoalCompletion(updated.children, updated.calculationMode, updated.weightageLevels);
          return updated;
        }
        return g;
      })
    );

    // Sync to CalendarEvent as well!
    setCalendarEvents(prev =>
      prev.map(c => {
        if (c.id === `cal-dead-${id}`) {
          return {
            ...c,
            ...(fields.name ? { title: `DEADLINE: ${fields.name}` } : {}),
            ...(fields.deadline ? { date: fields.deadline } : {})
          };
        }
        return c;
      })
    );

    if (fields.name) {
      logActivity(`Updated goal attributes for "${fields.name}"`, 'goal');
    } else {
      logActivity(`Updated goal attributes`, 'goal');
    }
  };

  const deleteGoal = (id: string) => {
    const goalToDelete = goals.find(g => g.id === id);
    setGoals(prev => prev.filter(g => g.id !== id));
    setTasks(prev => prev.filter(t => t.goalId !== id)); // cascade delete tasks
    setCalendarEvents(prev => prev.filter(c => c.id !== `cal-dead-${id}`));
    if (goalToDelete) {
      logActivity(`Deleted goal: "${goalToDelete.name}" and references`, 'goal');
    }
  };

  // Recalculate completion score of a Goal recursively based on subgoals
  const recalculateGoalCompletion = (children: GoalChild[], calculationMode?: 'equal' | 'weightage', weightageLevels?: number[]): number => {
    if (children.length === 0) return 0;

    const isWeightageAtDepth = (depth: number): boolean => {
      if (weightageLevels && weightageLevels.includes(depth)) {
        return true;
      }
      if (calculationMode === 'weightage' && depth === 0) {
        return true;
      }
      return false;
    };
    
    // Help calculate a single node's percentage recursively
    const getNodeCompletion = (node: GoalChild, depth: number): number => {
      if (!node.children || node.children.length === 0) {
        return node.completed ? 100 : 0;
      }
      const useWeightage = isWeightageAtDepth(depth + 1);
      if (useWeightage) {
        let totalWeight = 0;
        let weightedSum = 0;
        node.children.forEach(c => {
          const w = c.weight !== undefined ? c.weight : 1;
          totalWeight += w;
          weightedSum += getNodeCompletion(c, depth + 1) * w;
        });
        return totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;
      } else {
        const sum = node.children.reduce((acc, c) => acc + getNodeCompletion(c, depth + 1), 0);
        return Math.round(sum / node.children.length);
      }
    };

    const useWeightageAtRoot = isWeightageAtDepth(0);
    if (useWeightageAtRoot) {
      let totalWeight = 0;
      let weightedSum = 0;
      children.forEach(c => {
        const weight = c.weight !== undefined ? c.weight : 1;
        totalWeight += weight;
        weightedSum += getNodeCompletion(c, 0) * weight;
      });
      return totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;
    } else {
      const total = children.reduce((acc, c) => acc + getNodeCompletion(c, 0), 0);
      return Math.round(total / children.length);
    }
  };

  // Tree helper function
  const updateChildInTree = (
    children: GoalChild[],
    childId: string,
    updater: (child: GoalChild) => GoalChild | null
  ): GoalChild[] => {
    return children
      .map(child => {
        if (child.id === childId) {
          return updater(child);
        }
        if (child.children && child.children.length > 0) {
          return {
            ...child,
            children: updateChildInTree(child.children, childId, updater)
          };
        }
        return child;
      })
      .filter((child): child is GoalChild => child !== null);
  };

  const addChildInTree = (
    children: GoalChild[],
    parentId: string,
    newChild: GoalChild
  ): GoalChild[] => {
    return children.map(child => {
      if (child.id === parentId) {
        return {
          ...child,
          children: [...(child.children || []), newChild]
        };
      }
      if (child.children && child.children.length > 0) {
        return {
          ...child,
          children: addChildInTree(child.children, parentId, newChild)
        };
      }
      return child;
    });
  };

  const moveChildInTree = (
    children: GoalChild[],
    childId: string,
    direction: 'up' | 'down'
  ): GoalChild[] => {
    const idx = children.findIndex(c => c.id === childId);
    if (idx !== -1) {
      const nextIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (nextIdx >= 0 && nextIdx < children.length) {
        const updated = [...children];
        const temp = updated[idx];
        updated[idx] = updated[nextIdx];
        updated[nextIdx] = temp;
        return updated;
      }
      return children;
    }
    return children.map(child => {
      if (child.children && child.children.length > 0) {
        return {
          ...child,
          children: moveChildInTree(child.children, childId, direction)
        };
      }
      return child;
    });
  };

  const alignTreeBottomUp = (list: GoalChild[]): GoalChild[] => {
    return list.map(item => {
      if (item.children && item.children.length > 0) {
        const updatedChildren = alignTreeBottomUp(item.children);
        const allCompleted = updatedChildren.every(c => c.completed);
        return {
          ...item,
          children: updatedChildren,
          completed: allCompleted
        };
      }
      return item;
    });
  };

  // --- ACTIONS FOR RECURSIVE GOAL TREES ---
  const addChildGoal = (goalId: string, parentId: string | null, name: string, date?: string, idealDate?: string) => {
    const parentGoal = goals.find(g => g.id === goalId);
    const defaultDate = date || parentGoal?.deadline || '';
    const defaultIdealDate = idealDate || date || parentGoal?.idealDate || parentGoal?.deadline || '';

    const newChild: GoalChild = {
      id: `gc-${Date.now()}`,
      name,
      completed: false,
      children: [],
      date: defaultDate,
      idealDate: defaultIdealDate,
      classCompleted: false
    };

    setGoals(prev =>
      prev.map(g => {
        if (g.id === goalId) {
          let updatedChildren: GoalChild[];
          if (!parentId) {
            updatedChildren = [...g.children, newChild];
          } else {
            updatedChildren = addChildInTree(g.children, parentId, newChild);
          }
          const alignedChildren = alignTreeBottomUp(updatedChildren);
          const completion = recalculateGoalCompletion(alignedChildren, g.calculationMode, g.weightageLevels);
          return {
            ...g,
            children: alignedChildren,
            completion,
            status: completion > 80 ? 'Completed' : g.status === 'Completed' ? 'On Track' : g.status
          };
        }
        return g;
      })
    );
    logActivity(`Added sub-objective: "${name}"`, 'goal');
  };

  const bulkAddChildren = (goalId: string, parsedRows: string[][]) => {
    const parentGoal = goals.find(g => g.id === goalId);
    if (!parentGoal) return;
    
    const levelCount = parentGoal.levelNames?.length || 3;
    const defaultDate = parentGoal.deadline || '';
    
    // Create copy of the current tree
    let tree = JSON.parse(JSON.stringify(parentGoal.children)) as GoalChild[];
    
    const generateId = () => `gc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    parsedRows.forEach((row) => {
      // Clean and normalize columns
      const cols = row.map(c => c.trim()).filter(Boolean);
      if (cols.length === 0) return;

      // Limit depth traversal to the defined levelCount for this parentGoal
      const depth = Math.min(cols.length, levelCount);
      let currentLevelNodes = tree;

      for (let i = 0; i < depth; i++) {
        const name = cols[i];
        if (!name) break;

        let node = currentLevelNodes.find(n => n.name.toLowerCase() === name.toLowerCase());
        if (!node) {
          node = {
            id: generateId(),
            name,
            completed: false,
            children: [],
            date: defaultDate,
            idealDate: defaultDate,
            classCompleted: false
          };
          currentLevelNodes.push(node);
        }

        // Prepare currentLevelNodes for the next tier
        if (i < depth - 1) {
          if (!node.children) {
            node.children = [];
          }
          currentLevelNodes = node.children;
        }
      }
    });

    const alignedChildren = alignTreeBottomUp(tree);
    const completion = recalculateGoalCompletion(alignedChildren, parentGoal.calculationMode, parentGoal.weightageLevels);

    setGoals(prev =>
      prev.map(g => {
        if (g.id === goalId) {
          return {
            ...g,
            children: alignedChildren,
            completion,
            status: completion > 80 ? 'Completed' : g.status === 'Completed' ? 'On Track' : g.status
          };
        }
        return g;
      })
    );

    logActivity(`Bulk added ${parsedRows.length} nodes to goal tree syllabus`, 'goal');
  };

  const updateChildGoalFields = (goalId: string, childId: string, fields: Partial<GoalChild>) => {
    const recursivelyApplyFields = (node: GoalChild, partialFields: Partial<GoalChild>): GoalChild => {
      const updatedNode = { ...node, ...partialFields };
      if (node.children && node.children.length > 0) {
        updatedNode.children = node.children.map(c => recursivelyApplyFields(c, partialFields));
      }
      return updatedNode;
    };

    setGoals(prev =>
      prev.map(g => {
        if (g.id === goalId) {
          const updatedChildren = updateChildInTree(g.children, childId, (child) => {
            if (fields.classCompleted !== undefined) {
              return recursivelyApplyFields(child, { classCompleted: fields.classCompleted });
            }
            return {
              ...child,
              ...fields
            };
          });
          const alignedChildren = alignTreeBottomUp(updatedChildren);
          const completion = recalculateGoalCompletion(alignedChildren, g.calculationMode, g.weightageLevels);
          return {
            ...g,
            children: alignedChildren,
            completion
          };
        }
        return g;
      })
    );
    logActivity(`Updated objective attributes`, 'goal');
  };

  const updateChildrenWeights = (goalId: string, weightsMap: Record<string, number>) => {
    const updateWeightsInTree = (nodes: GoalChild[]): GoalChild[] => {
      return nodes.map(node => {
        let updatedNode = { ...node };
        if (weightsMap[node.id] !== undefined) {
          updatedNode.weight = weightsMap[node.id];
        }
        if (node.children && node.children.length > 0) {
          updatedNode.children = updateWeightsInTree(node.children);
        }
        return updatedNode;
      });
    };

    setGoals(prev =>
      prev.map(g => {
        if (g.id === goalId) {
          const updatedChildren = updateWeightsInTree(g.children);
          const alignedChildren = alignTreeBottomUp(updatedChildren);
          const completion = recalculateGoalCompletion(alignedChildren, g.calculationMode, g.weightageLevels);
          return {
            ...g,
            children: alignedChildren,
            completion
          };
        }
        return g;
      })
    );
    logActivity(`Updated sibling weightages to 100% distribution`, 'goal');
  };

  const deleteChildGoal = (goalId: string, childId: string) => {
    setGoals(prev =>
      prev.map(g => {
        if (g.id === goalId) {
          const updatedChildren = updateChildInTree(g.children, childId, () => null);
          const alignedChildren = alignTreeBottomUp(updatedChildren);
          const completion = recalculateGoalCompletion(alignedChildren, g.calculationMode, g.weightageLevels);
          return {
            ...g,
            children: alignedChildren,
            completion
          };
        }
        return g;
      })
    );
    logActivity(`Removed sub-objective`, 'goal');
  };

  const toggleChildGoal = (goalId: string, childId: string) => {
    setGoals(prev =>
      prev.map(g => {
        if (g.id === goalId) {
          // Top-down propagation function: sets completed flag of target node and all of its descendants
          const findAndToggleInTree = (list: GoalChild[]): GoalChild[] => {
            return list.map(item => {
              if (item.id === childId) {
                // Only allow manual toggle if the node is a leaf (has no children)
                if (item.children && item.children.length > 0) {
                  return item;
                }
                const toggledVal = !item.completed;
                const setDescendants = (node: GoalChild, val: boolean): GoalChild => {
                  return {
                    ...node,
                    completed: val,
                    children: node.children ? node.children.map(c => setDescendants(c, val)) : []
                  };
                };
                return setDescendants(item, toggledVal);
              }
              if (item.children && item.children.length > 0) {
                return {
                  ...item,
                  children: findAndToggleInTree(item.children)
                };
              }
              return item;
            });
          };

          const firstPass = findAndToggleInTree(g.children);
          const finalChildren = alignTreeBottomUp(firstPass);
          const completion = recalculateGoalCompletion(finalChildren, g.calculationMode, g.weightageLevels);

          return {
            ...g,
            children: finalChildren,
            completion,
            status: completion > 80 ? 'Completed' : g.status === 'Completed' ? 'On Track' : g.status
          };
        }
        return g;
      })
    );
    logActivity(`Toggled sub-objective progress status`, 'goal');
  };

  const renameChildGoal = (goalId: string, childId: string, newName: string) => {
    setGoals(prev =>
      prev.map(g => {
        if (g.id === goalId) {
          const updatedChildren = updateChildInTree(g.children, childId, (child) => ({
            ...child,
            name: newName
          }));
          return {
            ...g,
            children: updatedChildren
          };
        }
        return g;
      })
    );
    logActivity(`Renamed objective helper to: "${newName}"`, 'goal');
  };

  const moveChildGoal = (goalId: string, childId: string, direction: 'up' | 'down') => {
    setGoals(prev =>
      prev.map(g => {
        if (g.id === goalId) {
          const updatedChildren = moveChildInTree(g.children, childId, direction);
          return {
            ...g,
            children: updatedChildren
          };
        }
        return g;
      })
    );
  };

  // --- TASK ACTIONS ---
  const addTask = (name: string, goalId: string, deadline: string, estimatedHours: number, taskType?: string) => {
    const newId = `t-${Date.now()}`;
    const newTask: Task = {
      id: newId,
      goalId,
      name,
      deadline,
      estimatedHours,
      actualHours: 0,
      status: 'Pending',
      revisionStatus: 'Not Started',
      taskType: taskType || 'Theory Reading' // Default to "Theory Reading"
    };
    setTasks(prev => [...prev, newTask]);

    // Calendar link
    const newCal: CalendarEvent = {
      id: `cal-task-${newId}`,
      title: `Task: ${name}`,
      date: deadline,
      type: 'task',
      status: 'Pending'
    };
    setCalendarEvents(prev => [...prev, newCal]);
    logActivity(`Created assignment task: "${name}"`, 'task');
  };

  // --- ACADEMIC TEST ACTIONS ---
  const addAcademicTest = (
    goalId: string,
    title: string,
    testDate: string,
    maxMarks: number,
    marksObtained: number,
    coveredChapters: string[],
    examination?: string,
    subjectId?: string,
    subjectName?: string,
    chapterId?: string,
    chapterName?: string
  ) => {
    const newId = `test-${Date.now()}`;
    const newTest: AcademicTest = {
      id: newId,
      goalId,
      title,
      testDate,
      maxMarks,
      marksObtained,
      coveredChapters,
      examination,
      subjectId,
      subjectName,
      chapterId,
      chapterName
    };
    setAcademicTests(prev => [...prev, newTest]);
    logActivity(`Recorded academic score for test "${title}": ${marksObtained}/${maxMarks}`, 'goal');
  };

  const deleteAcademicTest = (id: string) => {
    setAcademicTests(prev => prev.filter(t => t.id !== id));
    logActivity(`Deleted recorded academic test score entry`, 'goal');
  };

  const updateTask = (id: string, fields: Partial<Task>) => {
    setTasks(prev =>
      prev.map(t => {
        if (t.id === id) {
          const updated = { ...t, ...fields };
          // If status changes to completed, maybe trigger a notification or Revision Queue
          if (fields.status === 'Completed' && t.status !== 'Completed') {
            if (isStudent) {
              updated.revisionStatus = 'In Queue';
              // Automatically queue a revision for tomorrow!
              const tmrw = new Date();
              tmrw.setDate(tmrw.getDate() + 1);
              const tmrwString = tmrw.toISOString().split('T')[0];
              
              // Call next-tick scheduler logic (push to schedule)
              setTimeout(() => {
                addRevision(t.id, t.name, tmrwString);
              }, 0);
            } else {
              updated.revisionStatus = 'Not Started';
            }
          }
          return updated;
        }
        return t;
      })
    );

    // Update Calendar corresponding item dynamically
    if (fields.status || fields.name || fields.deadline) {
      setCalendarEvents(prev =>
        prev.map(c => {
          if (c.id === `cal-task-${id}`) {
            return {
              ...c,
              ...(fields.name ? { title: `Task: ${fields.name}` } : {}),
              ...(fields.deadline ? { date: fields.deadline } : {}),
              ...(fields.status ? { status: fields.status } : {})
            };
          }
          return c;
        })
      );
    }
  };

  const deleteTask = (id: string) => {
    const target = tasks.find(t => t.id === id);
    setTasks(prev => prev.filter(t => t.id !== id));
    setRevisions(prev => prev.filter(r => r.taskId !== id)); // Cascade to revision cards too!
    setCalendarEvents(prev => prev.filter(c => c.id !== `cal-task-${id}`));
    if (target) {
      logActivity(`Deleted task: "${target.name}"`, 'task');
    }
  };

  // --- REVISION ACTIONS ---
  const addRevision = (taskId: string, taskName: string, scheduledDate: string, audioLink = '') => {
    // Determine revision number based on current count for this task
    const currentCount = revisions.filter(r => r.taskId === taskId).length;
    const newId = `rev-${Date.now()}`;
    const newRev: RevisionCard = {
      id: newId,
      taskId,
      taskName,
      revisionNumber: currentCount + 1,
      scheduledDate,
      status: 'Pending',
      audioLink: audioLink || ''
    };
    setRevisions(prev => [...prev, newRev]);

    // Calendar sync
    const newCal: CalendarEvent = {
      id: `cal-rev-${newId}`,
      title: `Revision #${currentCount + 1}: ${taskName}`,
      date: scheduledDate,
      type: 'revision',
      status: 'Pending'
    };
    setCalendarEvents(prev => [...prev, newCal]);

    setTasks(prev =>
      prev.map(t => {
        if (t.id === taskId) {
          return { ...t, revisionStatus: 'Scheduled' };
        }
        return t;
      })
    );
    logActivity(`Scheduled Revision #${currentCount + 1} for: "${taskName}"`, 'revision');
  };

  const updateRevision = (id: string, fields: Partial<RevisionCard>) => {
    setRevisions(prev =>
      prev.map(r => {
        if (r.id === id) {
          const updated = { ...r, ...fields };
          // If revision completes, update parent task revision status
          if (fields.status === 'Completed' && r.status !== 'Completed') {
            setTasks(prevTasks =>
              prevTasks.map(t => {
                if (t.id === r.taskId) {
                  return { ...t, revisionStatus: 'Revised' };
                }
                return t;
              })
            );
            setTimeout(() => {
              logActivity(`Accomplished revision #${r.revisionNumber} on: "${r.taskName}"`, 'revision');
            }, 0);
          }
          return updated;
        }
        return r;
      })
    );

    if (fields.status || fields.scheduledDate) {
      setCalendarEvents(prev =>
        prev.map(c => {
          if (c.id === `cal-rev-${id}`) {
            return {
              ...c,
              ...(fields.scheduledDate ? { date: fields.scheduledDate } : {}),
              ...(fields.status ? { status: fields.status } : {})
            };
          }
          return c;
        })
      );
    }
  };

  const deleteRevision = (id: string) => {
    const target = revisions.find(r => r.id === id);
    setRevisions(prev => prev.filter(r => r.id !== id));
    setCalendarEvents(prev => prev.filter(c => c.id !== `cal-rev-${id}`));
    if (target) {
      logActivity(`Deleted revision schedule for: "${target.taskName}"`, 'revision');
    }
  };

  // --- HABIT ACTIONS ---
  const addHabit = (name: string, frequency: HabitFrequency, customDays?: number[], customMonthlyDay?: number, createdDate?: string) => {
    const newId = `h-${Date.now()}`;
    const newHabit: Habit = {
      id: newId,
      name,
      frequency,
      customDays,
      customMonthlyDay,
      currentStreak: 0,
      longestStreak: 0,
      history: {},
      completionPercent: 0,
      createdDate: createdDate || todayDate
    };
    setHabits(prev => [...prev, newHabit]);
    logActivity(`Adopted new habit pattern: "${name}"`, 'habit');
  };

  const updateHabitStatus = (id: string, date: string, status: HabitDayStatus) => {
    if (lockedHabitDates.includes(date)) {
      return; // Immutability guard for locked dates
    }
    setHabits(prev =>
      prev.map(h => {
        if (h.id === id) {
          const updated = {
            ...h,
            history: { ...h.history, [date]: status }
          };
          return recalculateStreakForHabit(updated, todayDate);
        }
        return h;
      })
    );

    if (status === 'Done') {
      const h = habits.find(habit => habit.id === id);
      logActivity(`Completed daily habit track: "${h?.name}"`, 'habit');
    }
  };

  const deleteHabit = (id: string) => {
    const target = habits.find(h => h.id === id);
    setHabits(prev => prev.filter(h => h.id !== id));
    if (target) {
      logActivity(`Deleted habit: "${target.name}"`, 'habit');
    }
  };

  const declareHolidayBulk = (date: string, habitIds: string[], isHoliday: boolean) => {
    if (lockedHabitDates.includes(date)) {
      return; // Immutability guard for locked dates
    }
    setHabits(prev =>
      prev.map(h => {
        if (habitIds.includes(h.id)) {
          const updatedHistory = { ...h.history };
          if (isHoliday) {
            updatedHistory[date] = 'Holiday';
          } else {
            if (updatedHistory[date] === 'Holiday') {
              delete updatedHistory[date];
            }
          }
          const updated = {
            ...h,
            history: updatedHistory
          };
          return recalculateStreakForHabit(updated, todayDate);
        }
        return h;
      })
    );
    logActivity(
      isHoliday 
        ? `Declared holiday for selected habits on ${date}` 
        : `Removed holiday for selected habits on ${date}`,
      'habit'
    );
  };

  const toggleLockHabitDate = (date: string) => {
    if (date < todayDate) {
      return; // Auto-locked past dates can never be toggled or altered
    }
    setLockedHabitDates(prev => {
      const isLocked = prev.includes(date);
      const updated = isLocked ? prev.filter(d => d !== date) : [...prev, date];
      logActivity(
        isLocked 
          ? `Unlocked habit sheet updates for ${date}` 
          : `Locked habit sheet updates for ${date} (read-only mode enabled)`,
        'habit'
      );
      return updated;
    });
  };

  const recalculateAllData = () => {
    // Recalculate goals completion rates
    setGoals(prev => prev.map(g => {
      const completion = recalculateGoalCompletion(g.children, g.calculationMode, g.weightageLevels);
      return { ...g, completion };
    }));
    // Recalculate habit streaks
    setHabits(prev => prev.map(h => {
      return recalculateStreakForHabit(h, todayDate);
    }));
    logActivity(`Manually recalculated and synchronized all goals and habit streaks`, 'general');
  };

  // --- WIDGET ACTIONS ---
  const addWidget = (
    type: AnalyticsWidget['type'],
    title: string,
    metric: AnalyticsWidget['metric'],
    size: AnalyticsWidget['size']
  ) => {
    if (widgets.length >= 30) return; // specs hard cap of 30 widgets
    const newWidget: AnalyticsWidget = {
      id: `wi-${Date.now()}`,
      type,
      title,
      metric,
      size,
      order: widgets.length + 1
    };
    setWidgets(prev => [...prev, newWidget]);
    logActivity(`Added Custom Widget: "${title}"`, 'general');
  };

  const deleteWidget = (id: string) => {
    setWidgets(prev => prev.filter(w => w.id !== id));
  };

  const moveWidget = (id: string, direction: 'forward' | 'backward') => {
    const idx = widgets.findIndex(w => w.id === id);
    if (idx === -1) return;
    const swapWith = direction === 'backward' ? idx - 1 : idx + 1;
    if (swapWith >= 0 && swapWith < widgets.length) {
      const updated = [...widgets];
      const temp = updated[idx];
      updated[idx] = updated[swapWith];
      updated[swapWith] = temp;
      
      // update indices order labels
      const final = updated.map((w, index) => ({ ...w, order: index + 1 }));
      setWidgets(final);
    }
  };

  return (
    <LakshyaContext.Provider
      value={{
        goals,
        tasks,
        revisions,
        habits,
        widgets,
        activities,
        calendarEvents,
        academicTests,
        todayDate,
        lockedHabitDates,
        largeText,
        highContrast,
        setLargeText,
        setHighContrast,
        goalTypes,
        addGoalType,
        deleteGoalType,
        addGoal,
        updateGoal,
        deleteGoal,
        addChildGoal,
        bulkAddChildren,
        deleteChildGoal,
        toggleChildGoal,
        renameChildGoal,
        moveChildGoal,
        updateChildGoalFields,
        updateChildrenWeights,
        addTask,
        updateTask,
        deleteTask,
        addAcademicTest,
        deleteAcademicTest,
        addRevision,
        updateRevision,
        deleteRevision,
        addHabit,
        updateHabitStatus,
        deleteHabit,
        declareHolidayBulk,
        toggleLockHabitDate,
        recalculateAllData,
        addWidget,
        deleteWidget,
        moveWidget,
        logActivity,
        students,
        activeStudentId,
        isStudent,
        switchStudent,
        createStudent,
        updateStudentRole,
        renameStudent,
        deleteStudent,
        restoreStudent,
        permanentlyDeleteStudent,
        importStudent,
        exportStudent
      }}
    >
      {children}
    </LakshyaContext.Provider>
  );
};
