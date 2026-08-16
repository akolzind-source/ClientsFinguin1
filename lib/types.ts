export type TaskStatus =
  | "Не начато"
  | "В работе"
  | "На проверке"
  | "Завершено"
  | "Просрочено";

export type IdeaStatus =
  | "Новая"
  | "На обсуждении"
  | "Одобрена"
  | "В реализации"
  | "Реализована"
  | "Отклонена";

export type Priority = "Высокий" | "Средний" | "Низкий";
export type MeetingStatus = "planned" | "completed" | "cancelled";
export type MeetingDuration = "Меньше получаса" | "Час" | "2 часа";
export type RegularFrequency = "weekly" | "monthly" | "quarterly";

export interface RegularRecord {
  actualDate: string;
  note: string;
}

export interface RegularTask {
  id: string;
  parentId: string | null;
  title: string;
  assignee: string;
  frequency: RegularFrequency;
  anchorDate: string;
  description: string;
  records: Record<string, RegularRecord>;
}

export interface Task {
  id: string;
  parentId: string | null;
  title: string;
  assignee: string;
  status: TaskStatus;
  startDate: string;
  endDate: string;
  comments: string[];
}

export interface Idea {
  id: string;
  title: string;
  description: string;
  status: IdeaStatus;
  priority: Priority;
  owner: string;
  effect: string;
  deadline: string;
  comments: string[];
}

export interface Meeting {
  id: string;
  title: string;
  plannedDate: string;
  plannedTime: string;
  participants: string;
  agenda: string;
  status: MeetingStatus;
  actualDate: string;
  actualTime: string;
  duration: MeetingDuration | "";
  outcome: string;
  comments: string[];
}

export interface DashboardData {
  clientName: string;
  people: string[];
  tasks: Task[];
  ideas: Idea[];
  meetings: Meeting[];
  regularTasks: RegularTask[];
}
