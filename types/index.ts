export const TASK_TIME_VALUES = [
  'dawn',
  'morning',
  'work',
  'communication',
  'appointment',
  'lunch',
  'afternoon',
  'evening',
  'night',
  'sleep',
] as const;

export const TASK_PRIORITY_VALUES = ['high', 'low'] as const;

export type TaskTime = (typeof TASK_TIME_VALUES)[number];
export type TaskPriority = (typeof TASK_PRIORITY_VALUES)[number];

export type InputSource = 'text' | 'voice';
export type OrganizeMode = 'full' | 'focus';
export type RecordingStatus = 'idle' | 'recording' | 'transcribing';

export type Task = {
  id: string;
  text: string;
  completed: boolean;
  time?: TaskTime;
  reason?: string;
  priority?: TaskPriority;
};

export type PlanGroups = Record<string, string[]>;

export type TaskResult = {
  tasks: Task[];
  focusTasks?: Task[];
  plan: PlanGroups;
};

export type HistoryItem = {
  id: string;
  input: string;
  result: TaskResult;
  timestamp: number;
  source: InputSource;
};

export type HistoryGroup = {
  title: string;
  items: HistoryItem[];
};

export type ProgressDayBreakdown = {
  dateKey: string;
  label: string;
  taskCount: number;
  completedCount: number;
  entryCount: number;
};

export type WeeklyCompletionTrend = 'up' | 'down' | 'flat' | 'none';

export type ProgressStats = {
  streak: number;
  todayUsage: boolean;
  totalEntries: number;
  totalTasks: number;
  completedTasks: number;
  completionRate: number;
  weeklyTasks: number;
  weeklyDays: number;
  bestStreak: number;
  averageTasksPerSession: number;
  mostProductiveDay: string | null;
  voiceSessionCount: number;
  textSessionCount: number;
  weeklyCompletionTrend: WeeklyCompletionTrend;
  dailyBreakdown: ProgressDayBreakdown[];
};

export type OrganizeApiResponse = {
  tasks?: Array<{
    text: string;
    time?: TaskTime;
    reason?: string;
    priority?: TaskPriority;
  }>;
  focusTasks?: Array<{
    text: string;
    time?: TaskTime;
    reason?: string;
    priority?: TaskPriority;
  }>;
  plan?: Record<string, string[]>;
};

export type TranscribeApiResponse = {
  text: string;
};
