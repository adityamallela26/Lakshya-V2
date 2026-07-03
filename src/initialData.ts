import { Goal, Task, RevisionCard, Habit, AnalyticsWidget, ActivityLog, CalendarEvent } from './types';

// The current date relative to our sandbox metadata: 2026-06-06
const getLocalTodayDateString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const INITIAL_TODAY = getLocalTodayDateString();

export const INITIAL_GOALS: Goal[] = [
  {
    id: 'g-upsc-2026',
    name: 'UPSC Civil Services Examination Prep',
    type: 'Competitive',
    deadline: '2026-10-15',
    completion: 64,
    status: 'On Track',
    classTracking: 'General Studies Paper I: 75% | CSAT Paper II: 40%',
    daysRemaining: 131,
    children: [
      {
        id: 'gc-polity',
        name: 'Indian Polity & Constitution',
        completed: true,
        children: [
          { id: 'gcc-fr', name: 'Fundamental Rights & Duties', completed: true },
          { id: 'gcc-dpsp', name: 'Directive Principles (DPSP)', completed: true },
          { id: 'gcc-parl', name: 'Parliamentary System Lectures', completed: true }
        ]
      },
      {
        id: 'gc-history',
        name: 'Modern Indian History',
        completed: false,
        children: [
          { id: 'gcc-revolt', name: 'Revolt of 1857 Analysers', completed: true },
          { id: 'gcc-congress', name: 'Early Nationalist Movements', completed: false }
        ]
      },
      {
        id: 'gc-economy',
        name: 'Macroeconomics & Budgeting',
        completed: false,
        children: [
          { id: 'gcc-budget', name: 'Union Budget 2026 Analysis', completed: false },
          { id: 'gcc-monetary', name: 'Inflaton & Monetary Policy Core', completed: false }
        ]
      }
    ]
  },
  {
    id: 'g-fs-dev',
    name: 'Mastery of Python & Django Backend Engineering',
    type: 'Skill',
    deadline: '2026-08-01',
    completion: 45,
    status: 'On Track',
    classTracking: 'Advanced Python Core: Complete | Django REST APIs: In Progress',
    daysRemaining: 56,
    children: [
      {
        id: 'gc-react-adv',
        name: 'Advanced Python Core & Asyncio',
        completed: true,
        children: [
          { id: 'gcc-hooks', name: 'Decorators, Generators & Context Managers', completed: true },
          { id: 'gcc-concurrent', name: 'Asyncio Coroutines & GIL-bypass Multiprocessing', completed: true }
        ]
      },
      {
        id: 'gc-backend-node',
        name: 'Django & FastAPI REST Architecture',
        completed: false,
        children: [
          { id: 'gcc-rest', name: 'FastAPI Route Dependencies & Middleware', completed: true },
          { id: 'gcc-auth', name: 'PyJWT Security Flow & SQLite Database Sync', completed: false }
        ]
      }
    ]
  },
  {
    id: 'g-college-finals',
    name: 'Data Structures & Scientific Python Finals',
    type: 'Academic',
    deadline: '2026-06-25',
    completion: 40,
    status: 'Behind',
    classTracking: 'Data Science Core: 50% Covered | Practice Labs: 30%',
    daysRemaining: 19,
    children: [
      {
        id: 'gc-phys3',
        name: 'Scientific Programming with NumPy & Pandas',
        completed: false,
        children: [
          { id: 'gcc-maxwell', name: 'Vectorized Broadcasting & Matrix Manipulations', completed: true },
          { id: 'gcc-optics', name: 'Data Visualizations with Matplotlib & Seaborn', completed: false }
        ]
      },
      {
        id: 'gc-comp-algo',
        name: 'Data Structures & Dynamic Programming in Python',
        completed: false,
        children: [
          { id: 'gcc-dp', name: 'Dynamic Programming & lru_cache optimization', completed: false },
          { id: 'gcc-greedy', name: 'Graph Traversals (BFS/DFS) via Python Deque', completed: false }
        ]
      }
    ]
  }
];

export const INITIAL_TASKS: Task[] = [
  {
    id: 't-polity-drill',
    goalId: 'g-upsc-2026',
    name: 'Practice MCQ Drill: Fundamental Rights Structure',
    deadline: '2026-06-06',
    estimatedHours: 2.5,
    actualHours: 2.5,
    status: 'Completed',
    revisionStatus: 'Scheduled'
  },
  {
    id: 't-history-notes',
    goalId: 'g-upsc-2026',
    name: 'Draft Analytical Note on Simon Commission (1927)',
    deadline: '2026-06-06',
    estimatedHours: 3.5,
    actualHours: 3,
    status: 'Completed',
    revisionStatus: 'Scheduled'
  },
  {
    id: 't-react-api',
    goalId: 'g-fs-dev',
    name: 'Build FastAPI Router Middleware for PyJWT Session Auth',
    deadline: '2026-06-06',
    estimatedHours: 4,
    actualHours: 1.5,
    status: 'In Progress',
    revisionStatus: 'Not Started'
  },
  {
    id: 't-algo-practice',
    goalId: 'g-college-finals',
    name: 'Solve Knapsack dynamic programming using @lru_cache decorator',
    deadline: '2026-06-07',
    estimatedHours: 3,
    actualHours: 0,
    status: 'Pending',
    revisionStatus: 'In Queue'
  },
  {
    id: 't-maxwell-eqs',
    goalId: 'g-college-finals',
    name: 'Review NumPy multidimensional array slicing & performance benchmarks',
    deadline: '2026-06-08',
    estimatedHours: 2,
    actualHours: 0,
    status: 'Pending',
    revisionStatus: 'Not Started'
  }
];

export const INITIAL_REVISIONS: RevisionCard[] = [
  {
    id: 'rev-history-1',
    taskId: 't-history-notes',
    taskName: 'Simon Commission Analytical Draft',
    revisionNumber: 1,
    scheduledDate: '2026-06-06',
    status: 'Completed',
    audioLink: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3'
  },
  {
    id: 'rev-wave-mech',
    taskId: 't-maxwell-eqs',
    taskName: 'NumPy array slicing performance & vectorized functions',
    revisionNumber: 2,
    scheduledDate: '2026-06-06',
    status: 'Pending',
    audioLink: ''
  },
  {
    id: 'rev-db-norm',
    taskId: 't-react-api',
    taskName: 'Python Asyncio futures, tasks execution order & await boundaries',
    revisionNumber: 3,
    scheduledDate: '2026-06-07',
    status: 'Pending',
    audioLink: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3'
  }
];

export const INITIAL_HABITS: Habit[] = [
  {
    id: 'h-mcqs',
    name: 'Solve 20 Practice MCQ Questions',
    frequency: 'Daily',
    currentStreak: 12,
    longestStreak: 25,
    history: {
      '2026-06-05': 'Done',
      '2026-06-04': 'Done',
      '2026-06-03': 'Done',
      '2026-06-02': 'Done',
      '2026-06-01': 'Missed',
      '2026-05-31': 'Done',
      '2026-06-06': 'Done'
    },
    completionPercent: 88,
    createdDate: '2026-05-30'
  },
  {
    id: 'h-coding',
    name: 'Spend 45 minutes on Python Sandboxes (LeetCode)',
    frequency: 'Daily',
    currentStreak: 4,
    longestStreak: 18,
    history: {
      '2026-06-05': 'Done',
      '2026-06-04': 'Done',
      '2026-06-03': 'Done',
      '2026-06-02': 'Missed',
      '2026-06-01': 'Done',
      '2026-05-31': 'Done',
      '2026-06-06': 'Pending'
    },
    completionPercent: 78,
    createdDate: '2026-05-30'
  },
  {
    id: 'h-editorial',
    name: 'Read The Hindu / IE Editorial Analysis',
    frequency: 'Daily',
    currentStreak: 0,
    longestStreak: 15,
    history: {
      '2026-06-05': 'Missed',
      '2026-06-04': 'Done',
      '2026-06-03': 'Done',
      '2026-06-02': 'Missed',
      '2026-06-01': 'Done',
      '2026-05-31': 'Done',
      '2026-06-06': 'Pending'
    },
    completionPercent: 60,
    createdDate: '2026-05-30'
  }
];

export const INITIAL_WIDGETS: AnalyticsWidget[] = [
  {
    id: 'wi-hours-kpi',
    type: 'KPI',
    title: 'Study Session hours today',
    metric: 'study-hours',
    size: 'small',
    order: 1
  },
  {
    id: 'wi-tasks-kpi',
    type: 'KPI',
    title: 'Tasks finalized today',
    metric: 'tasks-completed',
    size: 'small',
    order: 2
  },
  {
    id: 'wi-coverage-ring',
    type: 'Progress Ring',
    title: 'UPSC Syllabus Completeness',
    metric: 'syllabus-coverage',
    size: 'small',
    order: 3
  },
  {
    id: 'wi-hours-bar',
    type: 'Bar Chart',
    title: 'Study Hours breakdown (Past 7 Days)',
    metric: 'study-hours',
    size: 'medium',
    order: 4
  },
  {
    id: 'wi-revision-line',
    type: 'Line Chart',
    title: 'Active Revision targets met',
    metric: 'revisions-done',
    size: 'medium',
    order: 5
  },
  {
    id: 'wi-cal-punch',
    type: 'Heatmap',
    title: 'Habit Consistency Grid (Past 4 Weeks)',
    metric: 'habit-streak',
    size: 'large',
    order: 6
  }
];

export const INITIAL_ACTIVITIES: ActivityLog[] = [
  {
    id: 'act-1',
    timestamp: '2026-06-06T09:30:00Z',
    text: 'Completed target Task: "Simon Commission Analytical Draft"',
    category: 'task'
  },
  {
    id: 'act-2',
    timestamp: '2026-06-06T10:15:00Z',
    text: 'Completed Scheduled Revision on "Simon Commission Analytical Draft"',
    category: 'revision'
  },
  {
    id: 'act-3',
    timestamp: '2026-06-06T12:00:00Z',
    text: 'Completed MCQ practice on fundamental rights',
    category: 'task'
  },
  {
    id: 'act-4',
    timestamp: '2026-06-06T16:10:00Z',
    text: 'Marked Habit: "Solve 20 Practice MCQ Questions" as completed',
    category: 'habit'
  }
];

export const INITIAL_CALENDAR_EVENTS: CalendarEvent[] = [
  {
    id: 'cal-1',
    title: 'MCQ: Fundamental Rights',
    date: '2026-06-06',
    type: 'task',
    status: 'Completed'
  },
  {
    id: 'cal-2',
    title: 'Revision: Wave boundary conditions',
    date: '2026-06-06',
    type: 'revision',
    status: 'Pending'
  },
  {
    id: 'cal-3',
    title: 'UPSC Indian Polity Goal Review Milestone',
    date: '2026-06-15',
    type: 'milestone'
  },
  {
    id: 'cal-4',
    title: 'UPSC Exam Prep Final Deadline',
    date: '2026-10-15',
    type: 'deadline'
  },
  {
    id: 'cal-5',
    title: 'Advanced Electromagnetism Exam',
    date: '2026-06-25',
    type: 'deadline'
  }
];
