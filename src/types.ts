export type GoalType = string;
export type GoalStatus = 'On Track' | 'At Risk' | 'Behind' | 'Completed';

export interface GoalChild {
  id: string;
  name: string;
  completed: boolean;
  children?: GoalChild[];
  date?: string; // YYYY-MM-DD node target date
  idealDate?: string; // YYYY-MM-DD node ideal target date
  startDate?: string; // YYYY-MM-DD node custom onset date
  classCompleted?: boolean; // Toggles parallel class track completion
  weight?: number; // Relative weight of the chapter/node
}

export interface Goal {
  id: string;
  name: string;
  type: GoalType;
  deadline: string;
  idealDate?: string; // YYYY-MM-DD goal ideal completion date
  completion: number; // 0 - 100
  status: GoalStatus;
  classTracking: string; // e.g., "Lectures: 14/20 completed"
  daysRemaining: number;
  startDate?: string;
  children: GoalChild[];
  levelNames?: string[]; // e.g. ["Subject", "Chapter", "Topic"]
  classEnabled?: boolean; // parallel class tracker mode if student is active
  calculationMode?: 'equal' | 'weightage'; // 'equal' (default) or 'weightage'
  weightageLevels?: number[]; // indices of levels (depths) that use weightage, e.g., [0, 1]
}

export type TaskStatus = 'Pending' | 'In Progress' | 'Completed';
export type RevisionStatus = 'Not Started' | 'In Queue' | 'Scheduled' | 'Revised';

export interface Task {
  id: string;
  goalId: string; // can be "none"
  name: string;
  deadline: string;
  estimatedHours: number;
  actualHours: number;
  status: TaskStatus;
  revisionStatus: RevisionStatus;
  taskType?: string; // e.g. "Theory Reading", "Exercise / Problem Practice", etc.
}

export interface AcademicTest {
  id: string;
  goalId: string; // target academic goal representing subject
  title: string;
  testDate: string; // YYYY-MM-DD
  maxMarks: number;
  marksObtained: number;
  coveredChapters: string[]; // names or IDs of chapters/materials covered
  examination?: string;
  subjectId?: string;
  subjectName?: string;
  chapterId?: string;
  chapterName?: string;
}

export type RevisionCardStatus = 'Pending' | 'Completed' | 'Overdue';

export interface RevisionCard {
  id: string;
  taskId: string;
  taskName: string;
  revisionNumber: number; // 1, 2, 3, etc.
  scheduledDate: string; // YYYY-MM-DD
  status: RevisionCardStatus;
  audioLink: string; // Audio link URL or local path
}

export type HabitFrequency = 'Daily' | 'Weekly' | 'Biweekly' | 'Custom' | 'Monthly';
export type HabitDayStatus = 'Done' | 'Pending' | 'Missed' | 'Holiday';

export interface Habit {
  id: string;
  name: string;
  frequency: HabitFrequency;
  customDays?: number[]; // [0 = Sunday, 1 = Monday, ..., 6 = Saturday]
  customMonthlyDay?: number; // [1-31] representing the day of the month
  currentStreak: number;
  longestStreak: number;
  history: Record<string, HabitDayStatus>; // YYYY-MM-DD -> status
  completionPercent: number; // calculated completion rating
  createdDate: string; // YYYY-MM-DD creation date to constrain tracking
}

export type WidgetType = 'KPI' | 'Progress Ring' | 'Bar Chart' | 'Line Chart' | 'Heatmap';

export interface AnalyticsWidget {
  id: string;
  type: WidgetType;
  title: string;
  metric: 'study-hours' | 'tasks-completed' | 'habit-streak' | 'revisions-done' | 'syllabus-coverage';
  size: 'small' | 'medium' | 'large'; // governs grid layout sizing
  order: number;
}

export interface ActivityLog {
  id: string;
  timestamp: string; // YYYY-MM-DDTHH:mm:ssZ
  text: string;
  category: 'goal' | 'task' | 'revision' | 'habit' | 'general';
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  type: 'task' | 'deadline' | 'habit' | 'revision' | 'milestone';
  status?: string;
  colorClass?: string;
  goalId?: string;
}

export interface StudentProfile {
  id: string;
  name: string;
  role: 'Student' | 'Professional' | 'Other';
  createdDate: string; // YYYY-MM-DD
  deletedAt?: string; // ISO String when moved to Recycle bin
  goals: Goal[];
  tasks: Task[];
  revisions: RevisionCard[];
  habits: Habit[];
  widgets: AnalyticsWidget[];
  calendarEvents: CalendarEvent[];
  activities: ActivityLog[];
  academicTests?: AcademicTest[];
  lockedHabitDates?: string[]; // YYYY-MM-DD keys of locked days
}

