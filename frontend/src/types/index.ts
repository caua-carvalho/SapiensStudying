export interface TaskActivity {
  id: string;
  dayNumber: number;
  title: string;
  description?: string;
  type: 'reading' | 'code' | 'video' | 'quiz' | 'project' | 'review';
  duration: string;
  completed: boolean;
  isToday?: boolean;
}

export interface WeekPlan {
  weekNumber: number;
  title: string;
  description: string;
  progressPercent?: number;
  activities: TaskActivity[];
}

export interface CuratedResource {
  id: string;
  category: 'livros' | 'filmes' | 'cursos' | 'podcasts' | 'artigos';
  title: string;
  authorOrCreator: string;
  badge?: string;
  badgeColor?: 'primary' | 'secondary' | 'tertiary';
  imageUrl?: string;
  rating?: number;
  ratingCount?: string;
  url?: string;
  description?: string;
}

export interface PracticeMethod {
  id: string;
  methodType: 'flashcards' | 'quiz' | 'feynman' | 'project';
  tag: string;
  title: string;
  description: string;
  badge: string;
  meta: string;
  actionText: string;
}

export interface FullStudyPlan {
  id: string;
  code: string; // e.g. TR-8924ML
  title: string;
  category: string;
  badge: string;
  createdAt: string;
  durationWeeks: number;
  dailyHours: string;
  level: 'Iniciante' | 'Intermediário' | 'Avançado';
  currentWeek: number;
  progressPercent: number;
  completedTasksCount: number;
  totalTasksCount: number;
  estimatedEndDate: string;
  status: 'em_andamento' | 'revisao' | 'concluido' | 'arquivado';
  todayTask?: {
    id: string;
    dayText: string;
    title: string;
    description: string;
    duration: string;
    typeText: string;
    completed: boolean;
  };
  weeks: WeekPlan[];
  resources: CuratedResource[];
  methods: PracticeMethod[];
}
