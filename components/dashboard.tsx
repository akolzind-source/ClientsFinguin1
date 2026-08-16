"use client";

import {
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Clock3,
  Lightbulb,
  LoaderCircle,
  MessageSquareText,
  MoreHorizontal,
  Pencil,
  Plus,
  Repeat2,
  Search,
  Trash2,
  X,
} from "lucide-react";
import type { CSSProperties, FormEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  DashboardData,
  Idea,
  IdeaStatus,
  Meeting,
  MeetingDuration,
  Priority,
  RegularFrequency,
  RegularRecord,
  RegularTask,
  Task,
  TaskStatus,
} from "@/lib/types";

const TASK_STATUSES: TaskStatus[] = ["Не начато", "В работе", "На проверке", "Завершено", "Просрочено"];
const IDEA_STATUSES: IdeaStatus[] = ["Новая", "На обсуждении", "Одобрена", "В реализации", "Реализована", "Отклонена"];
const PRIORITIES: Priority[] = ["Высокий", "Средний", "Низкий"];
const REGULAR_FREQUENCIES: Array<{ value: RegularFrequency; label: string }> = [
  { value: "weekly", label: "Каждую неделю" },
  { value: "monthly", label: "Каждый месяц" },
  { value: "quarterly", label: "Каждый квартал" },
];
const TODAY = new Date(2026, 7, 16, 12);
const MONTHS = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];
const MONTHS_GENITIVE = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];

type SaveStatus = "loading" | "saved" | "saving" | "error";
type ModalState =
  | { kind: "task"; item: Task | null }
  | { kind: "idea"; item: Idea | null }
  | { kind: "meeting"; item: Meeting | null }
  | { kind: "regular-task"; item: RegularTask | null }
  | { kind: "regular-period"; task: RegularTask; monthStart: string }
  | null;

function parseDate(value: string) {
  if (!value) return new Date(NaN);
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day, 12);
}

function toISO(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return year + "-" + month + "-" + day;
}

function formatShortDate(value: string) {
  const date = parseDate(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.getDate() + " " + MONTHS_GENITIVE[date.getMonth()];
}

function pluralTasks(count: number) {
  const lastTwo = count % 100;
  const last = count % 10;
  if (lastTwo >= 11 && lastTwo <= 14) return "задач";
  if (last === 1) return "задача";
  if (last >= 2 && last <= 4) return "задачи";
  return "задач";
}

function isTaskOverdue(task: Task) {
  return task.status !== "Завершено" && (task.status === "Просрочено" || parseDate(task.endDate) < TODAY);
}

function taskOverlapsMonth(task: Task, monthStart: Date) {
  const taskStart = parseDate(task.startDate);
  const taskEnd = parseDate(task.endDate);
  const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0, 12);
  return !Number.isNaN(taskStart.getTime()) && !Number.isNaN(taskEnd.getTime()) && taskStart <= monthEnd && taskEnd >= monthStart;
}

function taskStatusClass(status: TaskStatus) {
  if (status === "Завершено") return "status status-success";
  if (status === "Просрочено") return "status status-danger";
  if (status === "На проверке") return "status status-warning";
  if (status === "Не начато") return "status status-neutral";
  return "status status-info";
}

function ideaStatusClass(status: IdeaStatus) {
  if (status === "Реализована") return "status status-success";
  if (status === "Отклонена") return "status status-danger";
  if (status === "В реализации") return "status status-info";
  if (status === "Одобрена") return "status status-success-soft";
  if (status === "На обсуждении") return "status status-warning";
  return "status status-neutral";
}

function priorityClass(priority: Priority) {
  if (priority === "Высокий") return "priority priority-high";
  if (priority === "Средний") return "priority priority-medium";
  return "priority priority-low";
}

function orderedTasks(tasks: Task[]) {
  const parents = tasks.filter((task) => !task.parentId);
  const result: Task[] = [];
  parents.forEach((parent) => {
    result.push(parent);
    result.push(...tasks.filter((task) => task.parentId === parent.id));
  });
  result.push(...tasks.filter((task) => task.parentId && !tasks.some((parent) => parent.id === task.parentId)));
  return result;
}

function frequencyLabel(frequency: RegularFrequency) {
  return REGULAR_FREQUENCIES.find((item) => item.value === frequency)?.label || frequency;
}

function orderedRegularTasks(tasks: RegularTask[]) {
  const parents = tasks.filter((task) => !task.parentId);
  const result: RegularTask[] = [];
  parents.forEach((parent) => {
    result.push(parent);
    result.push(...tasks.filter((task) => task.parentId === parent.id));
  });
  result.push(...tasks.filter((task) => task.parentId && !tasks.some((parent) => parent.id === task.parentId)));
  return result;
}

function getPlannedDates(task: RegularTask, monthStartValue: string) {
  const anchor = parseDate(task.anchorDate);
  const monthStart = parseDate(monthStartValue);
  if (Number.isNaN(anchor.getTime()) || Number.isNaN(monthStart.getTime())) return [];
  const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0, 12);
  if (anchor > monthEnd) return [];

  if (task.frequency === "weekly") {
    const cursor = new Date(anchor);
    if (cursor < monthStart) {
      const days = Math.ceil((monthStart.getTime() - cursor.getTime()) / 86400000);
      cursor.setDate(cursor.getDate() + Math.ceil(days / 7) * 7);
    }
    const dates: string[] = [];
    while (cursor <= monthEnd) {
      dates.push(toISO(cursor));
      cursor.setDate(cursor.getDate() + 7);
    }
    return dates;
  }

  const anchorMonth = anchor.getFullYear() * 12 + anchor.getMonth();
  const targetMonth = monthStart.getFullYear() * 12 + monthStart.getMonth();
  const monthDifference = targetMonth - anchorMonth;
  if (monthDifference < 0 || (task.frequency === "quarterly" && monthDifference % 3 !== 0)) return [];
  const plannedDay = Math.min(anchor.getDate(), monthEnd.getDate());
  return [toISO(new Date(monthStart.getFullYear(), monthStart.getMonth(), plannedDay, 12))];
}

type RegularStatus = "Выполнено" | "С опозданием" | "Просрочено" | "Запланировано" | "Частично";

function occurrenceStatus(plannedDate: string, record?: RegularRecord): RegularStatus {
  if (record?.actualDate) return record.actualDate <= plannedDate ? "Выполнено" : "С опозданием";
  return parseDate(plannedDate) < TODAY ? "Просрочено" : "Запланировано";
}

function regularMonthStatus(task: RegularTask, monthStart: string): RegularStatus | null {
  const plannedDates = getPlannedDates(task, monthStart);
  if (plannedDates.length === 0) return null;
  const statuses = plannedDates.map((date) => occurrenceStatus(date, task.records[date]));
  if (statuses.includes("Просрочено")) return "Просрочено";
  if (statuses.every((status) => status === "Выполнено")) return "Выполнено";
  if (statuses.every((status) => status === "Выполнено" || status === "С опозданием")) return "С опозданием";
  if (statuses.some((status) => status === "Выполнено" || status === "С опозданием")) return "Частично";
  return "Запланировано";
}

function regularStatusClass(status: RegularStatus) {
  if (status === "Выполнено") return "regular-status regular-status-done";
  if (status === "Просрочено") return "regular-status regular-status-overdue";
  if (status === "С опозданием") return "regular-status regular-status-late";
  if (status === "Частично") return "regular-status regular-status-partial";
  return "regular-status regular-status-planned";
}

function CommentsEditor({
  comments,
  onChange,
}: {
  comments: string[];
  onChange: (comments: string[]) => void;
}) {
  const [comment, setComment] = useState("");

  function addComment() {
    const value = comment.trim();
    if (!value) return;
    onChange([...comments, value]);
    setComment("");
  }

  return (
    <div className="comments-editor">
      <label>Комментарии</label>
      {comments.length > 0 && (
        <div className="comment-list">
          {comments.map((item, index) => (
            <div className="comment-item" key={index}>
              <MessageSquareText size={14} />
              <span>{item}</span>
              <button type="button" aria-label="Удалить комментарий" onClick={() => onChange(comments.filter((_, i) => i !== index))}>
                <X size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="comment-entry">
        <input value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Добавить комментарий..." onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            addComment();
          }
        }} />
        <button type="button" className="secondary small-button" onClick={addComment}>Добавить</button>
      </div>
    </div>
  );
}

function ModalShell({
  title,
  subtitle,
  children,
  onClose,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div className="modal-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section className="modal" role="dialog" aria-modal="true" aria-label={title}>
        <header className="modal-head">
          <div><h3>{title}</h3><p>{subtitle}</p></div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Закрыть"><X size={20} /></button>
        </header>
        {children}
      </section>
    </div>
  );
}

function TaskDialog({
  item,
  tasks,
  onClose,
  onSave,
  onDelete,
}: {
  item: Task | null;
  tasks: Task[];
  onClose: () => void;
  onSave: (task: Task) => void;
  onDelete: (id: string) => void;
}) {
  const parents = tasks.filter((task) => !task.parentId && task.id !== item?.id);
  const hasChildren = item ? tasks.some((task) => task.parentId === item.id) : false;
  const [taskType, setTaskType] = useState<"parent" | "subtask">(() => {
    if (item) return item.parentId ? "subtask" : "parent";
    return parents.length > 0 ? "subtask" : "parent";
  });
  const [draft, setDraft] = useState<Task>(() => item ? { ...item, comments: [...item.comments] } : {
    id: crypto.randomUUID(),
    parentId: null,
    title: "",
    assignee: "",
    status: "Не начато",
    startDate: toISO(TODAY),
    endDate: toISO(new Date(2026, 7, 21, 12)),
    comments: [],
  });
  const [error, setError] = useState("");

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!draft.title.trim()) return setError("Укажите название задачи.");
    if (taskType === "subtask" && !draft.parentId) return setError("Выберите надзадачу для этой подзадачи.");
    if (!draft.startDate || !draft.endDate || parseDate(draft.startDate) > parseDate(draft.endDate)) {
      return setError("Проверьте даты начала и окончания.");
    }
    onSave({ ...draft, parentId: taskType === "parent" ? null : draft.parentId, title: draft.title.trim(), assignee: draft.assignee.trim() });
  }

  return (
    <ModalShell title={item ? "Редактировать задачу" : "Новая задача"} subtitle="Сроки сразу появятся на диаграмме Ганта" onClose={onClose}>
      <form onSubmit={submit}>
        <div className="modal-body">
          <label className="field field-wide">Название задачи<input autoFocus value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="Например, Подготовить форму ДДС" /></label>
          <div className="form-grid">
            <label className="field">Тип задачи<select value={taskType} onChange={(event) => {
              const value = event.target.value as "parent" | "subtask";
              setTaskType(value);
              if (value === "parent") setDraft({ ...draft, parentId: null });
            }}><option value="subtask" disabled={parents.length === 0 || hasChildren}>Подзадача</option><option value="parent">Надзадача</option></select><ChevronDown size={15} /></label>
            <label className="field">Ответственный<input value={draft.assignee} onChange={(event) => setDraft({ ...draft, assignee: event.target.value })} placeholder="Имя или роль" /></label>
            {taskType === "subtask" && <label className="field field-wide">К какой надзадаче прикрепить<select value={draft.parentId || ""} onChange={(event) => setDraft({ ...draft, parentId: event.target.value || null })}><option value="">Выберите надзадачу</option>{parents.map((task) => <option value={task.id} key={task.id}>{task.title}</option>)}</select><ChevronDown size={15} /></label>}
            <label className="field">Дата начала<input type="date" value={draft.startDate} onChange={(event) => setDraft({ ...draft, startDate: event.target.value })} /></label>
            <label className="field">Дедлайн<input type="date" value={draft.endDate} onChange={(event) => setDraft({ ...draft, endDate: event.target.value })} /></label>
            <label className="field field-wide">Статус<select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as TaskStatus })}>{TASK_STATUSES.map((status) => <option key={status}>{status}</option>)}</select><ChevronDown size={15} /></label>
          </div>
          <CommentsEditor comments={draft.comments} onChange={(comments) => setDraft({ ...draft, comments })} />
          {error && <p className="form-error">{error}</p>}
        </div>
        <footer className="modal-actions">
          {item ? <button type="button" className="delete-button" onClick={() => onDelete(item.id)}><Trash2 size={16} />Удалить</button> : <span />}
          <div><button type="button" className="secondary" onClick={onClose}>Отмена</button><button type="submit" className="primary">Сохранить</button></div>
        </footer>
      </form>
    </ModalShell>
  );
}

function IdeaDialog({
  item,
  onClose,
  onSave,
  onDelete,
}: {
  item: Idea | null;
  onClose: () => void;
  onSave: (idea: Idea) => void;
  onDelete: (id: string) => void;
}) {
  const [draft, setDraft] = useState<Idea>(() => item ? { ...item, comments: [...item.comments] } : {
    id: crypto.randomUUID(),
    title: "",
    description: "",
    status: "Новая",
    priority: "Средний",
    owner: "",
    effect: "",
    deadline: "",
    comments: [],
  });
  const [error, setError] = useState("");

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!draft.title.trim()) return setError("Укажите название решения.");
    onSave({ ...draft, title: draft.title.trim() });
  }

  return (
    <ModalShell title={item ? "Редактировать решение" : "Новая идея"} subtitle="Зафиксируйте гипотезу и ожидаемый эффект" onClose={onClose}>
      <form onSubmit={submit}>
        <div className="modal-body">
          <label className="field field-wide">Название<input autoFocus value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="Кратко сформулируйте решение" /></label>
          <label className="field field-wide">Описание<textarea rows={3} value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} placeholder="Проблема, основание или контекст" /></label>
          <div className="form-grid">
            <label className="field">Статус<select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as IdeaStatus })}>{IDEA_STATUSES.map((status) => <option key={status}>{status}</option>)}</select><ChevronDown size={15} /></label>
            <label className="field">Приоритет<select value={draft.priority} onChange={(event) => setDraft({ ...draft, priority: event.target.value as Priority })}>{PRIORITIES.map((priority) => <option key={priority}>{priority}</option>)}</select><ChevronDown size={15} /></label>
            <label className="field">Ответственный<input value={draft.owner} onChange={(event) => setDraft({ ...draft, owner: event.target.value })} placeholder="Имя или роль" /></label>
            <label className="field">Срок<input type="date" value={draft.deadline} onChange={(event) => setDraft({ ...draft, deadline: event.target.value })} /></label>
            <label className="field field-wide">Ожидаемый эффект<input value={draft.effect} onChange={(event) => setDraft({ ...draft, effect: event.target.value })} placeholder="Например, +500 тыс. ₽ / мес." /></label>
          </div>
          <CommentsEditor comments={draft.comments} onChange={(comments) => setDraft({ ...draft, comments })} />
          {error && <p className="form-error">{error}</p>}
        </div>
        <footer className="modal-actions">
          {item ? <button type="button" className="delete-button" onClick={() => onDelete(item.id)}><Trash2 size={16} />Удалить</button> : <span />}
          <div><button type="button" className="secondary" onClick={onClose}>Отмена</button><button type="submit" className="primary">Сохранить</button></div>
        </footer>
      </form>
    </ModalShell>
  );
}

function MeetingDialog({
  item,
  defaultDate,
  onClose,
  onSave,
  onDelete,
}: {
  item: Meeting | null;
  defaultDate: string;
  onClose: () => void;
  onSave: (meeting: Meeting) => void;
  onDelete: (id: string) => void;
}) {
  const [draft, setDraft] = useState<Meeting>(() => item ? { ...item, comments: [...item.comments] } : {
    id: crypto.randomUUID(),
    title: "",
    plannedDate: defaultDate || toISO(TODAY),
    plannedTime: "10:00",
    participants: "",
    agenda: "",
    status: "planned",
    actualDate: "",
    actualTime: "",
    duration: "",
    outcome: "",
    comments: [],
  });
  const [error, setError] = useState("");

  function markCompleted() {
    setDraft({
      ...draft,
      status: "completed",
      actualDate: draft.actualDate || draft.plannedDate,
      actualTime: draft.actualTime || draft.plannedTime,
    });
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!draft.title.trim()) return setError("Укажите тему встречи.");
    if (!draft.plannedDate) return setError("Укажите плановую дату.");
    if (draft.status === "completed" && !draft.actualDate) return setError("Укажите фактическую дату.");
    if (draft.status === "completed" && !draft.duration) return setError("Выберите длительность встречи.");
    onSave({ ...draft, title: draft.title.trim() });
  }

  return (
    <ModalShell title={item ? "Встреча" : "Запланировать встречу"} subtitle="Плановая и фактическая даты отображаются в календаре" onClose={onClose}>
      <form onSubmit={submit}>
        <div className="modal-body">
          <label className="field field-wide">Тема встречи<input autoFocus value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="Например, Статус-встреча по проекту" /></label>
          <div className="form-grid">
            <label className="field">Плановая дата<input type="date" value={draft.plannedDate} onChange={(event) => setDraft({ ...draft, plannedDate: event.target.value })} /></label>
            <label className="field">Плановое время<input type="time" value={draft.plannedTime} onChange={(event) => setDraft({ ...draft, plannedTime: event.target.value })} /></label>
            <label className="field field-wide">Участники<input value={draft.participants} onChange={(event) => setDraft({ ...draft, participants: event.target.value })} placeholder="Перечислите участников текстом" /></label>
          </div>
          <label className="field field-wide">Повестка<textarea rows={2} value={draft.agenda} onChange={(event) => setDraft({ ...draft, agenda: event.target.value })} placeholder="Что нужно обсудить и решить" /></label>
          <div className="meeting-status-line">
            <label className="field">Статус<select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as Meeting["status"] })}><option value="planned">Запланирована</option><option value="completed">Проведена</option><option value="cancelled">Отменена</option></select><ChevronDown size={15} /></label>
            {draft.status !== "completed" && <button type="button" className="complete-button" onClick={markCompleted}><Check size={16} />Отметить проведённой</button>}
          </div>
          {draft.status === "completed" && (
            <div className="fact-panel">
              <div className="form-grid fact-grid">
                <label className="field">Фактическая дата<input type="date" value={draft.actualDate} onChange={(event) => setDraft({ ...draft, actualDate: event.target.value })} /></label>
                <label className="field">Фактическое время<input type="time" value={draft.actualTime} onChange={(event) => setDraft({ ...draft, actualTime: event.target.value })} /></label>
                <label className="field">Длительность<select value={draft.duration || ""} onChange={(event) => setDraft({ ...draft, duration: event.target.value as MeetingDuration | "" })}><option value="">Выберите</option><option>Меньше получаса</option><option>Час</option><option>2 часа</option></select><ChevronDown size={15} /></label>
              </div>
              <label className="field field-wide">Итоги встречи<textarea rows={3} value={draft.outcome} onChange={(event) => setDraft({ ...draft, outcome: event.target.value })} placeholder="Решения и следующие шаги" /></label>
            </div>
          )}
          <CommentsEditor comments={draft.comments} onChange={(comments) => setDraft({ ...draft, comments })} />
          {error && <p className="form-error">{error}</p>}
        </div>
        <footer className="modal-actions">
          {item ? <button type="button" className="delete-button" onClick={() => onDelete(item.id)}><Trash2 size={16} />Удалить</button> : <span />}
          <div><button type="button" className="secondary" onClick={onClose}>Отмена</button><button type="submit" className="primary">Сохранить</button></div>
        </footer>
      </form>
    </ModalShell>
  );
}

function RegularTaskDialog({
  item,
  tasks,
  onClose,
  onSave,
  onDelete,
}: {
  item: RegularTask | null;
  tasks: RegularTask[];
  onClose: () => void;
  onSave: (task: RegularTask) => void;
  onDelete: (id: string) => void;
}) {
  const parents = tasks.filter((task) => !task.parentId && task.id !== item?.id);
  const hasChildren = item ? tasks.some((task) => task.parentId === item.id) : false;
  const [taskType, setTaskType] = useState<"parent" | "subtask">(() => {
    if (item) return item.parentId ? "subtask" : "parent";
    return parents.length > 0 ? "subtask" : "parent";
  });
  const [draft, setDraft] = useState<RegularTask>(() => item ? {
    ...item,
    records: structuredClone(item.records),
  } : {
    id: crypto.randomUUID(),
    parentId: null,
    title: "",
    assignee: "",
    frequency: "monthly",
    anchorDate: toISO(TODAY),
    description: "",
    records: {},
  });
  const [error, setError] = useState("");

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!draft.title.trim()) return setError("Укажите название регулярной задачи.");
    if (!draft.assignee.trim()) return setError("Укажите ответственного.");
    if (!draft.anchorDate) return setError("Укажите дату первого выполнения.");
    if (taskType === "subtask" && !draft.parentId) return setError("Выберите регулярную задачу, к которой относится подэтап.");
    onSave({
      ...draft,
      parentId: taskType === "parent" ? null : draft.parentId,
      title: draft.title.trim(),
      assignee: draft.assignee.trim(),
      description: draft.description.trim(),
    });
  }

  return (
    <ModalShell title={item ? "Регулярная задача" : "Создать регулярную задачу"} subtitle="Периодичность формирует нормативные даты автоматически" onClose={onClose}>
      <form onSubmit={submit}>
        <div className="modal-body">
          <label className="field field-wide">Название<input autoFocus value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="Например, Закрыть управленческий месяц" /></label>
          <div className="form-grid">
            <label className="field">Тип<select value={taskType} onChange={(event) => {
              const value = event.target.value as "parent" | "subtask";
              setTaskType(value);
              if (value === "parent") setDraft({ ...draft, parentId: null });
            }}><option value="subtask" disabled={parents.length === 0 || hasChildren}>Подэтап</option><option value="parent">Регулярная задача</option></select><ChevronDown size={15} /></label>
            <label className="field">Ответственный *<input value={draft.assignee} onChange={(event) => setDraft({ ...draft, assignee: event.target.value })} placeholder="Имя или роль" /></label>
            {taskType === "subtask" && <label className="field field-wide">К какой задаче прикрепить<select value={draft.parentId || ""} onChange={(event) => setDraft({ ...draft, parentId: event.target.value || null })}><option value="">Выберите регулярную задачу</option>{parents.map((task) => <option key={task.id} value={task.id}>{task.title}</option>)}</select><ChevronDown size={15} /></label>}
            <label className="field">Периодичность<select value={draft.frequency} onChange={(event) => setDraft({ ...draft, frequency: event.target.value as RegularFrequency })}>{REGULAR_FREQUENCIES.map((frequency) => <option key={frequency.value} value={frequency.value}>{frequency.label}</option>)}</select><ChevronDown size={15} /></label>
            <label className="field">Дата первого выполнения<input type="date" value={draft.anchorDate} onChange={(event) => setDraft({ ...draft, anchorDate: event.target.value })} /></label>
          </div>
          <label className="field field-wide">Регламент или описание<textarea rows={3} value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} placeholder="Что именно нужно сделать и проверить" /></label>
          {error && <p className="form-error">{error}</p>}
        </div>
        <footer className="modal-actions">
          {item ? <button type="button" className="delete-button" onClick={() => onDelete(item.id)}><Trash2 size={16} />Удалить</button> : <span />}
          <div><button type="button" className="secondary" onClick={onClose}>Отмена</button><button type="submit" className="primary">Сохранить</button></div>
        </footer>
      </form>
    </ModalShell>
  );
}

function RegularPeriodDialog({
  task,
  monthStart,
  onClose,
  onSave,
}: {
  task: RegularTask;
  monthStart: string;
  onClose: () => void;
  onSave: (task: RegularTask) => void;
}) {
  const plannedDates = getPlannedDates(task, monthStart);
  const [records, setRecords] = useState<Record<string, RegularRecord>>(() => structuredClone(task.records));
  const monthDate = parseDate(monthStart);

  function updateRecord(plannedDate: string, field: keyof RegularRecord, value: string) {
    setRecords((current) => ({
      ...current,
      [plannedDate]: { ...(current[plannedDate] || { actualDate: "", note: "" }), [field]: value },
    }));
  }

  return (
    <ModalShell title={task.title} subtitle={MONTHS[monthDate.getMonth()] + " " + monthDate.getFullYear() + " · план-факт выполнения"} onClose={onClose}>
      <form onSubmit={(event) => { event.preventDefault(); onSave({ ...task, records }); }}>
        <div className="modal-body regular-period-body">
          {task.description && <p className="regular-description">{task.description}</p>}
          {plannedDates.map((plannedDate) => {
            const record = records[plannedDate] || { actualDate: "", note: "" };
            const status = occurrenceStatus(plannedDate, record);
            return (
              <section className="regular-occurrence" key={plannedDate}>
                <div className="regular-occurrence-head"><div><small>Нормативная дата</small><strong>{formatShortDate(plannedDate)}</strong></div><em className={regularStatusClass(status)}>{status}</em></div>
                <label className="field">Фактическая дата<input type="date" value={record.actualDate} onChange={(event) => updateRecord(plannedDate, "actualDate", event.target.value)} /></label>
                <label className="field">Примечание<textarea rows={2} value={record.note} onChange={(event) => updateRecord(plannedDate, "note", event.target.value)} placeholder={status === "Просрочено" ? "Укажите, почему задача не выполнена" : "Детали выполнения или причина отклонения"} /></label>
              </section>
            );
          })}
        </div>
        <footer className="modal-actions"><span /><div><button type="button" className="secondary" onClick={onClose}>Отмена</button><button type="submit" className="primary">Сохранить факт</button></div></footer>
      </form>
    </ModalShell>
  );
}

export default function Dashboard({ initialData }: { initialData: DashboardData }) {
  const [data, setData] = useState<DashboardData>(initialData);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("loading");
  const [storageMode, setStorageMode] = useState<"postgres" | "local">("local");
  const [modal, setModal] = useState<ModalState>(null);
  const [ganttFilter, setGanttFilter] = useState<"Все" | "В работе" | "Просрочено">("Все");
  const [collapsedTaskIds, setCollapsedTaskIds] = useState<Set<string>>(() => new Set());
  const [collapsedRegularIds, setCollapsedRegularIds] = useState<Set<string>>(() => new Set());
  const [ideaSearch, setIdeaSearch] = useState("");
  const [ideaStatus, setIdeaStatus] = useState("Все статусы");
  const [ideaPriority, setIdeaPriority] = useState("Все приоритеты");
  const [editingClient, setEditingClient] = useState(false);
  const [clientDraft, setClientDraft] = useState(initialData.clientName);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(new Date(2026, 7, 1, 12));
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ganttScrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/data", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Load failed");
        return response.json() as Promise<{ data: DashboardData; storage: "postgres" | "local" }>;
      })
      .then((payload) => {
        setData(payload.data);
        setClientDraft(payload.data.clientName);
        setStorageMode(payload.storage);
        setSaveStatus("saved");
      })
      .catch((error: Error) => {
        if (error.name !== "AbortError") setSaveStatus("error");
      });
    return () => controller.abort();
  }, []);

  const persist = useCallback(async (nextData: DashboardData) => {
    setSaveStatus("saving");
    try {
      const response = await fetch("/api/data", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: nextData }),
      });
      if (!response.ok) throw new Error("Save failed");
      setSaveStatus("saved");
    } catch {
      setSaveStatus("error");
    }
  }, []);

  const commit = useCallback((updater: DashboardData | ((current: DashboardData) => DashboardData)) => {
    setData((current) => {
      const next = typeof updater === "function" ? updater(current) : updater;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => persist(next), 450);
      return next;
    });
  }, [persist]);

  useEffect(() => () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
  }, []);

  const ordered = useMemo(() => orderedTasks(data.tasks), [data.tasks]);
  const filteredTasks = useMemo(() => ordered.filter((task) => {
    if (ganttFilter === "В работе") return task.status === "В работе" || task.status === "На проверке";
    if (ganttFilter === "Просрочено") return isTaskOverdue(task);
    return true;
  }), [ordered, ganttFilter]);
  const visibleTasks = useMemo(() => filteredTasks.filter((task) => !task.parentId || !collapsedTaskIds.has(task.parentId)), [filteredTasks, collapsedTaskIds]);

  const openTasks = data.tasks.filter((task) => task.status !== "Завершено");
  const overdueCount = openTasks.filter(isTaskOverdue).length;
  const nearestTask = [...openTasks].filter((task) => parseDate(task.endDate) >= TODAY).sort((a, b) => parseDate(a.endDate).getTime() - parseDate(b.endDate).getTime())[0];
  const nextMeeting = [...data.meetings].filter((meeting) => meeting.status === "planned" && parseDate(meeting.plannedDate) >= TODAY).sort((a, b) => (a.plannedDate + a.plannedTime).localeCompare(b.plannedDate + b.plannedTime))[0];

  const planningCoverage = useMemo(() => {
    const workTasks = data.tasks.filter((task) => task.parentId || !data.tasks.some((child) => child.parentId === task.id));
    return [0, 1].map((monthOffset) => {
      const monthStart = new Date(TODAY.getFullYear(), TODAY.getMonth() + monthOffset, 1, 12);
      const count = workTasks.filter((task) => taskOverlapsMonth(task, monthStart)).length;
      return { monthStart, count, hasPlan: count > 0 };
    });
  }, [data.tasks]);
  const missingPlanMonths = planningCoverage.filter((month) => !month.hasPlan);
  const hasTwoMonthPlan = missingPlanMonths.length === 0;
  const planningMessage = hasTwoMonthPlan
    ? "План работ сформирован на текущий и следующий месяц"
    : missingPlanMonths.length === 2
      ? "Нет плана работ на текущий и следующий месяц"
      : "Нет плана работ на " + MONTHS_GENITIVE[missingPlanMonths[0].monthStart.getMonth()];

  const ganttRange = useMemo(() => {
    const dates = [TODAY, ...data.tasks.flatMap((task) => [parseDate(task.startDate), parseDate(task.endDate)])].filter((date) => !Number.isNaN(date.getTime()));
    const minDate = dates.length ? new Date(Math.min(...dates.map((date) => date.getTime()))) : TODAY;
    const maxDate = dates.length ? new Date(Math.max(...dates.map((date) => date.getTime()))) : new Date(2026, 8, 30, 12);
    const start = new Date(minDate.getFullYear(), minDate.getMonth(), 1, 12);
    const end = new Date(maxDate.getFullYear(), maxDate.getMonth() + 1, 0, 12);
    const totalDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1);
    const months: Array<{ key: string; label: string; days: number }> = [];
    const cursor = new Date(start);
    while (cursor <= end) {
      const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0, 12);
      months.push({
        key: cursor.getFullYear() + "-" + cursor.getMonth(),
        label: MONTHS[cursor.getMonth()] + " " + cursor.getFullYear(),
        days: monthEnd.getDate(),
      });
      cursor.setMonth(cursor.getMonth() + 1);
    }
    return { start, end, totalDays, months };
  }, [data.tasks]);

  const ideaRows = useMemo(() => {
    const search = ideaSearch.trim().toLowerCase();
    return data.ideas.filter((idea) => {
      const matchesSearch = !search || (idea.title + " " + idea.description + " " + idea.owner).toLowerCase().includes(search);
      const matchesStatus = ideaStatus === "Все статусы" || idea.status === ideaStatus;
      const matchesPriority = ideaPriority === "Все приоритеты" || idea.priority === ideaPriority;
      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [data.ideas, ideaSearch, ideaStatus, ideaPriority]);

  const calendarCells = useMemo(() => {
    const first = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1, 12);
    const mondayIndex = (first.getDay() + 6) % 7;
    const start = new Date(first);
    start.setDate(first.getDate() - mondayIndex);
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      const iso = toISO(date);
      const meetingsOnDate = data.meetings.filter((meeting) => (meeting.status !== "cancelled" && meeting.plannedDate === iso) || (meeting.status === "completed" && meeting.actualDate === iso));
      const hasPlan = meetingsOnDate.some((meeting) => meeting.status !== "cancelled" && meeting.plannedDate === iso);
      const hasFact = meetingsOnDate.some((meeting) => meeting.status === "completed" && meeting.actualDate === iso);
      return { date, iso, hasPlan, hasFact, count: new Set(meetingsOnDate.map((meeting) => meeting.id)).size, inMonth: date.getMonth() === calendarMonth.getMonth() };
    });
  }, [calendarMonth, data.meetings]);

  const displayedMeetings = useMemo(() => {
    const isInCalendarMonth = (value: string) => {
      const date = parseDate(value);
      return !Number.isNaN(date.getTime()) && date.getFullYear() === calendarMonth.getFullYear() && date.getMonth() === calendarMonth.getMonth();
    };
    const meetings = data.meetings.filter((meeting) => {
      if (selectedDate) return meeting.plannedDate === selectedDate || (meeting.status === "completed" && meeting.actualDate === selectedDate);
      return isInCalendarMonth(meeting.plannedDate) || (meeting.status === "completed" && isInCalendarMonth(meeting.actualDate));
    });
    return meetings.sort((a, b) => {
      const firstFact = a.status === "completed" && (selectedDate ? a.actualDate === selectedDate : isInCalendarMonth(a.actualDate));
      const secondFact = b.status === "completed" && (selectedDate ? b.actualDate === selectedDate : isInCalendarMonth(b.actualDate));
      const firstKey = (selectedDate || (firstFact ? a.actualDate : a.plannedDate)) + (firstFact && a.actualTime ? a.actualTime : a.plannedTime);
      const secondKey = (selectedDate || (secondFact ? b.actualDate : b.plannedDate)) + (secondFact && b.actualTime ? b.actualTime : b.plannedTime);
      return firstKey.localeCompare(secondKey);
    });
  }, [data.meetings, selectedDate, calendarMonth]);

  const regularMonths = useMemo(() => Array.from({ length: 12 }, (_, index) => {
    const date = new Date(TODAY.getFullYear(), TODAY.getMonth() + index, 1, 12);
    return { date, iso: toISO(date), label: MONTHS[date.getMonth()] + " " + date.getFullYear() };
  }), []);
  const regularRows = useMemo(() => orderedRegularTasks(data.regularTasks).filter((task) => !task.parentId || !collapsedRegularIds.has(task.parentId)), [data.regularTasks, collapsedRegularIds]);

  function saveTask(task: Task) {
    commit((current) => ({ ...current, tasks: current.tasks.some((item) => item.id === task.id) ? current.tasks.map((item) => item.id === task.id ? task : item) : [...current.tasks, task] }));
    setModal(null);
  }

  function deleteTask(id: string) {
    if (!window.confirm("Удалить задачу и её подзадачи?")) return;
    commit((current) => ({ ...current, tasks: current.tasks.filter((task) => task.id !== id && task.parentId !== id) }));
    setModal(null);
  }

  function saveIdea(idea: Idea) {
    commit((current) => ({ ...current, ideas: current.ideas.some((item) => item.id === idea.id) ? current.ideas.map((item) => item.id === idea.id ? idea : item) : [...current.ideas, idea] }));
    setModal(null);
  }

  function deleteIdea(id: string) {
    if (!window.confirm("Удалить управленческое решение?")) return;
    commit((current) => ({ ...current, ideas: current.ideas.filter((idea) => idea.id !== id) }));
    setModal(null);
  }

  function saveMeeting(meeting: Meeting) {
    commit((current) => ({ ...current, meetings: current.meetings.some((item) => item.id === meeting.id) ? current.meetings.map((item) => item.id === meeting.id ? meeting : item) : [...current.meetings, meeting] }));
    setSelectedDate(meeting.plannedDate);
    setCalendarMonth(new Date(parseDate(meeting.plannedDate).getFullYear(), parseDate(meeting.plannedDate).getMonth(), 1, 12));
    setModal(null);
  }

  function deleteMeeting(id: string) {
    if (!window.confirm("Удалить встречу?")) return;
    commit((current) => ({ ...current, meetings: current.meetings.filter((meeting) => meeting.id !== id) }));
    setModal(null);
  }

  function saveRegularTask(task: RegularTask) {
    commit((current) => ({
      ...current,
      regularTasks: current.regularTasks.some((item) => item.id === task.id)
        ? current.regularTasks.map((item) => item.id === task.id ? task : item)
        : [...current.regularTasks, task],
    }));
    setModal(null);
  }

  function deleteRegularTask(id: string) {
    if (!window.confirm("Удалить регулярную задачу и её подэтапы?")) return;
    commit((current) => ({ ...current, regularTasks: current.regularTasks.filter((task) => task.id !== id && task.parentId !== id) }));
    setModal(null);
  }

  function saveClientName() {
    const value = clientDraft.trim() || "Название клиента";
    commit((current) => ({ ...current, clientName: value }));
    setClientDraft(value);
    setEditingClient(false);
  }

  function toggleParent(id: string) {
    setCollapsedTaskIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleRegularParent(id: string) {
    setCollapsedRegularIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function moveCalendarMonth(offset: number) {
    setCalendarMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1, 12));
    setSelectedDate(null);
  }

  function ganttBarStyle(task: Task): CSSProperties {
    const startOffset = Math.max(0, Math.round((parseDate(task.startDate).getTime() - ganttRange.start.getTime()) / 86400000));
    const duration = Math.max(1, Math.round((parseDate(task.endDate).getTime() - parseDate(task.startDate).getTime()) / 86400000) + 1);
    return {
      left: (startOffset / ganttRange.totalDays * 100) + "%",
      width: (Math.min(duration, ganttRange.totalDays - startOffset) / ganttRange.totalDays * 100) + "%",
    };
  }

  const todayPercent = (Math.round((TODAY.getTime() - ganttRange.start.getTime()) / 86400000) / ganttRange.totalDays) * 100;
  const ganttTimelineWidth = Math.max(760, ganttRange.months.length * 300);
  const weekLineCount = Math.ceil(ganttRange.totalDays / 7) + 1;
  const calendarDefaultDate = selectedDate || toISO(new Date(
    calendarMonth.getFullYear(),
    calendarMonth.getMonth(),
    calendarMonth.getFullYear() === TODAY.getFullYear() && calendarMonth.getMonth() === TODAY.getMonth() ? TODAY.getDate() : 1,
    12
  ));

  function scrollGanttToToday() {
    const scroller = ganttScrollRef.current;
    if (!scroller) return;
    const currentMonthStart = new Date(TODAY.getFullYear(), TODAY.getMonth(), 1, 12);
    const daysFromRangeStart = Math.max(0, Math.round((currentMonthStart.getTime() - ganttRange.start.getTime()) / 86400000));
    const monthPosition = daysFromRangeStart / ganttRange.totalDays * ganttTimelineWidth;
    scroller.scrollTo({ left: Math.max(0, monthPosition - 16), behavior: "smooth" });
  }

  return (
    <main className="dashboard-shell">
      <header className="topbar">
        <h1>Дорожная карта</h1>
        <span className="divider" />
        {editingClient ? (
          <form className="client-edit" onSubmit={(event) => { event.preventDefault(); saveClientName(); }}>
            <input autoFocus value={clientDraft} onChange={(event) => setClientDraft(event.target.value)} onBlur={saveClientName} />
          </form>
        ) : (
          <button className="client-name" onClick={() => setEditingClient(true)}>{data.clientName}<Pencil size={14} /></button>
        )}
        <div className={"save-indicator save-" + saveStatus} title={storageMode === "postgres" ? "Данные сохраняются в PostgreSQL" : "Локальный режим разработки"}>
          {saveStatus === "saving" || saveStatus === "loading" ? <LoaderCircle size={14} className="spin" /> : saveStatus === "error" ? <CircleAlert size={14} /> : <Check size={14} />}
          {saveStatus === "loading" ? "Загрузка" : saveStatus === "saving" ? "Сохранение" : saveStatus === "error" ? "Ошибка сохранения" : "Сохранено"}
        </div>
      </header>

      <section className={"planning-banner " + (hasTwoMonthPlan ? "planning-ready" : "planning-missing")} aria-live="polite">
        <span className="planning-icon">{hasTwoMonthPlan ? <Check size={18} /> : <CircleAlert size={18} />}</span>
        <div className="planning-copy"><small>Планирование на 2 месяца</small><strong>{planningMessage}</strong></div>
        <div className="planning-months">
          {planningCoverage.map((month, index) => <span className={month.hasPlan ? "month-planned" : "month-unplanned"} key={toISO(month.monthStart)}><i>{month.hasPlan ? <Check size={12} /> : <CircleAlert size={12} />}</i><b>{index === 0 ? "Текущий · " : "Следующий · "}{MONTHS[month.monthStart.getMonth()]}</b><small>{month.hasPlan ? month.count + " " + pluralTasks(month.count) : "плана нет"}</small></span>)}
        </div>
      </section>

      <section className="metrics" aria-label="Сводка">
        <article className="metric"><span className="metric-icon metric-blue"><CalendarDays size={26} /></span><div><small>Ближайший дедлайн</small><strong>{nearestTask ? formatShortDate(nearestTask.endDate) : "Нет задач"}</strong></div><span className="metric-note">{nearestTask?.title || "Добавьте задачу"}</span></article>
        <article className="metric"><span className="metric-icon metric-red"><CircleAlert size={26} /></span><div><small>Просрочено</small><strong className="danger">{overdueCount} {pluralTasks(overdueCount)}</strong></div><span className="metric-note">Требуют внимания</span></article>
        <article className="metric"><span className="metric-icon metric-teal"><Clock3 size={26} /></span><div><small>Следующая встреча</small><strong>{nextMeeting ? formatShortDate(nextMeeting.plannedDate) + ", " + nextMeeting.plannedTime : "Не запланирована"}</strong></div><span className="metric-note">{nextMeeting?.title || "Добавьте встречу"}</span></article>
      </section>

      <section className="card roadmap-card">
        <div className="section-head">
          <div className="section-title-wrap"><h2>Дорожная карта</h2><nav>{(["Все", "В работе", "Просрочено"] as const).map((filter) => <button key={filter} className={ganttFilter === filter ? "active" : ""} onClick={() => setGanttFilter(filter)}>{filter}</button>)}</nav></div>
          <div className="roadmap-actions"><button className="secondary today-button" onClick={scrollGanttToToday}><CalendarDays size={16} />Сегодня</button><button className="primary" onClick={() => setModal({ kind: "task", item: null })}><Plus size={17} />Новая задача</button></div>
        </div>
        <div className="gantt-grid">
          <div className="task-table">
            <div className="task-table-head"><span>Задача</span><span>Ответственный</span><span>Статус</span><span>Срок</span></div>
            {visibleTasks.map((task) => {
              const childCount = data.tasks.filter((child) => child.parentId === task.id).length;
              const isCollapsed = collapsedTaskIds.has(task.id);
              return (
                <div className={"task-table-row " + (task.parentId ? "task-child" : "task-parent")} key={task.id} role="button" tabIndex={0} onClick={() => setModal({ kind: "task", item: task })} onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") setModal({ kind: "task", item: task });
                }}>
                  <span className="task-title-cell">
                    {!task.parentId && childCount > 0 && <button type="button" className="task-toggle" aria-label={isCollapsed ? "Развернуть подзадачи" : "Свернуть подзадачи"} aria-expanded={!isCollapsed} onClick={(event) => { event.stopPropagation(); toggleParent(task.id); }}>{isCollapsed ? <ChevronRight size={15} /> : <ChevronDown size={15} />}</button>}
                    {!task.parentId && childCount === 0 && <span className="toggle-spacer" />}
                    {task.parentId && <i />}
                    <b>{task.title}</b>
                    {!task.parentId && childCount > 0 && <small className="child-count">{childCount}</small>}
                    {task.comments.length > 0 && <small><MessageSquareText size={12} />{task.comments.length}</small>}
                  </span>
                  <span className="assignee-cell">{task.assignee || "—"}</span>
                  <span><em className={taskStatusClass(isTaskOverdue(task) ? "Просрочено" : task.status)}>{isTaskOverdue(task) ? "Просрочено" : task.status}</em></span>
                  <span className="deadline-cell">{formatShortDate(task.endDate)}<MoreHorizontal size={15} /></span>
                </div>
              );
            })}
            {visibleTasks.length === 0 && <div className="empty-row">Нет задач по выбранному фильтру</div>}
          </div>
          <div className="gantt-chart-scroll" ref={ganttScrollRef} aria-label="Прокручиваемая временная шкала">
            <div className="gantt-chart" style={{ width: ganttTimelineWidth }}>
              <div className="gantt-months">{ganttRange.months.map((month) => <span key={month.key} style={{ width: (month.days / ganttRange.totalDays * 100) + "%" }}>{month.label}</span>)}</div>
              <div className="gantt-lines">{Array.from({ length: weekLineCount }, (_, index) => <i key={index} style={{ left: (index * 7 / ganttRange.totalDays * 100) + "%" }} />)}</div>
              {todayPercent >= 0 && todayPercent <= 100 && <div className="today-line" style={{ left: todayPercent + "%" }}><span>Сегодня</span></div>}
              <div className="gantt-bars">
                {visibleTasks.map((task) => <div className="gantt-row" key={task.id}><button aria-label={"Редактировать " + task.title} onClick={() => setModal({ kind: "task", item: task })} className={"gantt-bar gantt-" + (isTaskOverdue(task) ? "overdue" : task.status === "Завершено" ? "done" : task.status === "Не начато" ? "planned" : "active") + (task.parentId ? "" : " gantt-parent")} style={ganttBarStyle(task)}><span>{task.title}</span><i /></button></div>)}
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="lower-grid">
        <section className="card decisions-card">
          <div className="compact-head"><h2>Управленческие решения</h2><button className="primary" onClick={() => setModal({ kind: "idea", item: null })}><Plus size={17} />Добавить идею</button></div>
          <div className="filters">
            <label className="search-field"><Search size={16} /><input value={ideaSearch} onChange={(event) => setIdeaSearch(event.target.value)} placeholder="Поиск по идеям и решениям..." /></label>
            <label className="select-field"><select value={ideaStatus} onChange={(event) => setIdeaStatus(event.target.value)}><option>Все статусы</option>{IDEA_STATUSES.map((status) => <option key={status}>{status}</option>)}</select><ChevronDown size={14} /></label>
            <label className="select-field"><select value={ideaPriority} onChange={(event) => setIdeaPriority(event.target.value)}><option>Все приоритеты</option>{PRIORITIES.map((priority) => <option key={priority}>{priority}</option>)}</select><ChevronDown size={14} /></label>
          </div>
          <div className="idea-table">
            <div className="idea-head"><span>Идея / решение</span><span>Статус</span><span>Приоритет</span><span>Ответственный</span><span>Ожидаемый эффект</span><span /></div>
            {ideaRows.map((idea) => (
              <button className="idea-row" key={idea.id} onClick={() => setModal({ kind: "idea", item: idea })}>
                <span className="idea-title"><i><Lightbulb size={17} /></i><b>{idea.title}</b>{idea.comments.length > 0 && <small><MessageSquareText size={12} />{idea.comments.length}</small>}</span>
                <span><em className={ideaStatusClass(idea.status)}>{idea.status}</em></span>
                <span><em className={priorityClass(idea.priority)}>{idea.priority}</em></span>
                <span>{idea.owner || "—"}</span>
                <strong className="effect">{idea.effect || "—"}</strong>
                <MoreHorizontal size={16} />
              </button>
            ))}
            {ideaRows.length === 0 && <div className="empty-row">Ничего не найдено</div>}
          </div>
        </section>

        <section className="card meetings-card">
          <div className="compact-head"><h2>Календарь встреч</h2><button className="primary" onClick={() => setModal({ kind: "meeting", item: null })}><Plus size={17} />Запланировать</button></div>
          <div className="calendar-layout">
            <div className="calendar">
              <div className="calendar-nav"><button onClick={() => moveCalendarMonth(-1)} aria-label="Предыдущий месяц"><ChevronLeft size={18} /></button><strong>{MONTHS[calendarMonth.getMonth()]} {calendarMonth.getFullYear()}</strong><button onClick={() => moveCalendarMonth(1)} aria-label="Следующий месяц"><ChevronRight size={18} /></button></div>
              <div className="weekdays">{["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((day) => <span key={day}>{day}</span>)}</div>
              <div className="calendar-grid">
                {calendarCells.map((cell) => {
                  const fillClass = cell.hasPlan && cell.hasFact ? "day-plan-fact" : cell.hasFact ? "day-fact" : cell.hasPlan ? "day-plan" : "";
                  return <button key={cell.iso} className={"calendar-day " + fillClass + (cell.inMonth ? "" : " outside") + (selectedDate === cell.iso ? " selected" : "")} onClick={() => {
                    setSelectedDate((current) => current === cell.iso ? null : cell.iso);
                    if (!cell.inMonth) setCalendarMonth(new Date(cell.date.getFullYear(), cell.date.getMonth(), 1, 12));
                  }} aria-pressed={selectedDate === cell.iso} aria-label={cell.count ? cell.count + " встреч на " + formatShortDate(cell.iso) : "Нет встреч на " + formatShortDate(cell.iso)}><span>{cell.date.getDate()}</span>{cell.count > 1 && <em>{cell.count}</em>}</button>;
                })}
              </div>
              <div className="calendar-legend"><span><i className="legend-plan" />План</span><span><i className="legend-fact" />Факт</span><span><i className="legend-both" />План + факт</span></div>
            </div>
            <div className="meeting-list">
              <div className="meeting-list-head"><span>{selectedDate ? "Встречи на выбранную дату" : "Все встречи месяца"}</span><small>{selectedDate ? formatShortDate(selectedDate) : MONTHS[calendarMonth.getMonth()] + " " + calendarMonth.getFullYear()}</small></div>
              {displayedMeetings.map((meeting) => {
                const isPlanOccurrence = selectedDate ? meeting.plannedDate === selectedDate : parseDate(meeting.plannedDate).getFullYear() === calendarMonth.getFullYear() && parseDate(meeting.plannedDate).getMonth() === calendarMonth.getMonth();
                const isFactOccurrence = meeting.status === "completed" && (selectedDate ? meeting.actualDate === selectedDate : parseDate(meeting.actualDate).getFullYear() === calendarMonth.getFullYear() && parseDate(meeting.actualDate).getMonth() === calendarMonth.getMonth());
                const occurrenceTime = isFactOccurrence && meeting.actualTime ? meeting.actualTime : meeting.plannedTime;
                const occurrenceDate = selectedDate || (isFactOccurrence ? meeting.actualDate : meeting.plannedDate);
                const statusLabel = meeting.status === "completed" ? "Проведена" : meeting.status === "cancelled" ? "Отменена" : "Запланирована";
                return (
                <button className="meeting-item" key={meeting.id} onClick={() => setModal({ kind: "meeting", item: meeting })}>
                  <time className={isFactOccurrence ? "meeting-fact" : "meeting-plan"}><b>{parseDate(occurrenceDate).getDate()}</b><span>{MONTHS_GENITIVE[parseDate(occurrenceDate).getMonth()].slice(0, 3)}</span></time>
                  <span className="meeting-copy"><small>{occurrenceTime}</small><b>{meeting.title}</b><span className="occurrence-badges">{isPlanOccurrence && <i className="occurrence-plan">План</i>}{isFactOccurrence && <i className="occurrence-fact">Факт</i>}<em>{statusLabel}</em></span></span>
                  {meeting.comments.length > 0 && <span className="comment-count"><MessageSquareText size={13} />{meeting.comments.length}</span>}
                  <MoreHorizontal size={15} />
                </button>
                );
              })}
              {displayedMeetings.length === 0 && <div className="empty-meetings"><CalendarDays size={22} /><b>{selectedDate ? "На эту дату встреч нет" : "В этом месяце встреч нет"}</b><span>{selectedDate ? "Нажмите на выбранный день ещё раз, чтобы увидеть все встречи месяца." : "Выберите другой месяц или запланируйте новую встречу."}</span></div>}
            </div>
          </div>
        </section>
      </div>

      <section className="card regular-card">
        <div className="compact-head regular-head">
          <div><h2>Регулярные задачи</h2><p>Поддержание отчётности после внедрения</p></div>
          <button className="primary" onClick={() => setModal({ kind: "regular-task", item: null })}><Plus size={17} />Создать регулярную задачу</button>
        </div>
        <div className="regular-grid">
          <div className="regular-fixed">
            <div className="regular-fixed-head"><span>Регулярная задача</span><span>Периодичность</span><span>Ответственный</span></div>
            {regularRows.map((task) => {
              const childCount = data.regularTasks.filter((child) => child.parentId === task.id).length;
              const isCollapsed = collapsedRegularIds.has(task.id);
              return (
                <div className={"regular-fixed-row " + (task.parentId ? "regular-child" : "regular-parent")} key={task.id}>
                  <button className="regular-task-name" onClick={() => setModal({ kind: "regular-task", item: task })}>
                    {!task.parentId && childCount > 0 && <span className="regular-toggle" role="button" aria-label={isCollapsed ? "Развернуть подэтапы" : "Свернуть подэтапы"} onClick={(event) => { event.stopPropagation(); toggleRegularParent(task.id); }}>{isCollapsed ? <ChevronRight size={15} /> : <ChevronDown size={15} />}</span>}
                    {!task.parentId && childCount === 0 && <span className="toggle-spacer" />}
                    {task.parentId && <i />}
                    <span><b>{task.title}</b>{task.description && <small>{task.description}</small>}</span>
                    {!task.parentId && childCount > 0 && <em>{childCount}</em>}
                  </button>
                  <span className="regular-frequency"><Repeat2 size={13} />{frequencyLabel(task.frequency)}</span>
                  <span className="regular-assignee">{task.assignee}</span>
                </div>
              );
            })}
          </div>
          <div className="regular-month-scroll" aria-label="Прокручиваемые месяцы регулярных задач">
            <div className="regular-month-track" style={{ width: regularMonths.length * 232 }}>
              <div className="regular-month-head">{regularMonths.map((month) => <span key={month.iso}>{month.label}</span>)}</div>
              {regularRows.map((task) => (
                <div className={"regular-month-row " + (task.parentId ? "regular-child" : "regular-parent")} key={task.id}>
                  {regularMonths.map((month) => {
                    const plannedDates = getPlannedDates(task, month.iso);
                    const actualDates = plannedDates.map((date) => task.records[date]?.actualDate).filter(Boolean);
                    const status = regularMonthStatus(task, month.iso);
                    const hasNote = plannedDates.some((date) => Boolean(task.records[date]?.note));
                    return (
                      <button className={"regular-month-cell " + (status ? "has-occurrence" : "is-empty")} disabled={!status} key={month.iso} onClick={() => setModal({ kind: "regular-period", task, monthStart: month.iso })}>
                        {status ? <>
                          <span className="regular-dates"><small>План</small><b>{plannedDates.map(formatShortDate).join(", ")}</b></span>
                          <span className="regular-dates"><small>Факт</small><b>{actualDates.length ? actualDates.map(formatShortDate).join(", ") : "—"}</b></span>
                          <span className="regular-cell-footer"><em className={regularStatusClass(status)}>{status}</em>{hasNote && <i title="Есть примечание"><MessageSquareText size={13} /></i>}</span>
                        </> : <span className="regular-no-plan">Нет выполнения</span>}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {modal?.kind === "task" && <TaskDialog item={modal.item} tasks={data.tasks} onClose={() => setModal(null)} onSave={saveTask} onDelete={deleteTask} />}
      {modal?.kind === "idea" && <IdeaDialog item={modal.item} onClose={() => setModal(null)} onSave={saveIdea} onDelete={deleteIdea} />}
      {modal?.kind === "meeting" && <MeetingDialog item={modal.item} defaultDate={calendarDefaultDate} onClose={() => setModal(null)} onSave={saveMeeting} onDelete={deleteMeeting} />}
      {modal?.kind === "regular-task" && <RegularTaskDialog item={modal.item} tasks={data.regularTasks} onClose={() => setModal(null)} onSave={saveRegularTask} onDelete={deleteRegularTask} />}
      {modal?.kind === "regular-period" && <RegularPeriodDialog task={modal.task} monthStart={modal.monthStart} onClose={() => setModal(null)} onSave={saveRegularTask} />}
    </main>
  );
}
