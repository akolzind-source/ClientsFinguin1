import type { DashboardData } from "./types";

export const DEFAULT_DATA: DashboardData = {
  clientName: "Название клиента",
  people: [
    "Иван Петров",
    "Анна Смирнова",
    "Дмитрий Волков",
    "Мария Кузнецова",
    "Алексей Соколов",
    "Финансовый директор",
    "Финансовый аналитик",
    "Финансовый менеджер",
    "Бухгалтерия",
    "Руководитель проекта",
    "Аналитик",
    "Руководство"
  ],
  tasks: [
    { id: "task-1", parentId: null, title: "Построение управленческой отчётности", assignee: "Иван Петров", status: "В работе", startDate: "2026-08-11", endDate: "2026-09-30", comments: [] },
    { id: "task-2", parentId: "task-1", title: "Сбор исходных данных", assignee: "Анна Смирнова", status: "Завершено", startDate: "2026-08-11", endDate: "2026-08-18", comments: ["Исходные выгрузки получены и проверены."] },
    { id: "task-3", parentId: "task-1", title: "Разработка ОПиУ", assignee: "Дмитрий Волков", status: "В работе", startDate: "2026-08-19", endDate: "2026-08-25", comments: [] },
    { id: "task-4", parentId: "task-1", title: "Согласование формата", assignee: "Мария Кузнецова", status: "В работе", startDate: "2026-08-24", endDate: "2026-08-30", comments: ["Нужно согласовать детализацию по направлениям."] },
    { id: "task-5", parentId: "task-1", title: "Настройка отчётов в системе", assignee: "Алексей Соколов", status: "Не начато", startDate: "2026-08-29", endDate: "2026-09-12", comments: [] },
    { id: "task-6", parentId: "task-1", title: "Тестирование и проверка", assignee: "Анна Смирнова", status: "Не начато", startDate: "2026-09-10", endDate: "2026-09-20", comments: [] },
    { id: "task-7", parentId: "task-1", title: "Обучение пользователей", assignee: "Мария Кузнецова", status: "Не начато", startDate: "2026-09-20", endDate: "2026-09-30", comments: [] }
  ],
  ideas: [
    { id: "idea-1", title: "Сократить кассовые разрывы", description: "Пересмотреть очередность платежей и минимальный резерв.", status: "В реализации", priority: "Высокий", owner: "Иван Петров", effect: "+2,5 млн ₽ / мес.", deadline: "2026-09-05", comments: ["Нужна детализация по неделям."] },
    { id: "idea-2", title: "Пересмотреть маржинальность проектов", description: "Добавить план-факт маржи по каждому проекту.", status: "На обсуждении", priority: "Средний", owner: "Анна Смирнова", effect: "+1,8 млн ₽ / мес.", deadline: "2026-09-15", comments: [] },
    { id: "idea-3", title: "Автоматизировать платёжный календарь", description: "Объединить заявки на оплату и прогноз движения денег.", status: "Одобрена", priority: "Средний", owner: "Дмитрий Волков", effect: "+0,6 млн ₽ / мес.", deadline: "2026-09-25", comments: ["Проверить возможность загрузки из банка."] }
  ],
  meetings: [
    { id: "meeting-1", title: "Сверка исходных данных", plannedDate: "2026-08-11", plannedTime: "10:00", participants: "Финансовый директор, бухгалтерия", agenda: "Проверить полноту выгрузок.", status: "completed", actualDate: "2026-08-11", actualTime: "10:05", duration: "Час", outcome: "Определены недостающие разрезы аналитики.", comments: [] },
    { id: "meeting-2", title: "Статус-встреча по проекту", plannedDate: "2026-08-19", plannedTime: "11:00", participants: "Финансовый директор, руководитель проекта", agenda: "Статус задач и согласование ОПиУ.", status: "planned", actualDate: "", actualTime: "", duration: "", outcome: "", comments: [] },
    { id: "meeting-3", title: "Обсуждение дашбордов", plannedDate: "2026-08-20", plannedTime: "15:00", participants: "Финансовый директор, аналитик", agenda: "Согласовать набор виджетов.", status: "completed", actualDate: "2026-08-21", actualTime: "15:00", duration: "2 часа", outcome: "Формат согласован, переходим к сборке.", comments: ["Добавить отдельный блок по ДДС."] },
    { id: "meeting-4", title: "Демонстрация прототипа отчётов", plannedDate: "2026-08-26", plannedTime: "10:00", participants: "Финансовый директор, руководство", agenda: "Показать первый прототип и собрать обратную связь.", status: "planned", actualDate: "", actualTime: "", duration: "", outcome: "", comments: [] }
  ],
  regularTasks: [
    { id: "regular-1", parentId: null, title: "Закрыть управленческий месяц", assignee: "Финансовый директор", frequency: "monthly", anchorDate: "2026-08-05", description: "Подготовить и проверить комплект управленческой отчётности.", records: { "2026-08-05": { actualDate: "2026-08-06", note: "Закрыто после получения банковской выписки." } } },
    { id: "regular-2", parentId: "regular-1", title: "Обновить ОПиУ", assignee: "Финансовый аналитик", frequency: "monthly", anchorDate: "2026-08-03", description: "Загрузить факт и сверить статьи доходов и расходов.", records: { "2026-08-03": { actualDate: "2026-08-03", note: "" } } },
    { id: "regular-3", parentId: "regular-1", title: "Обновить ДДС", assignee: "Финансовый аналитик", frequency: "monthly", anchorDate: "2026-08-04", description: "Сверить движения денег с банковскими выписками.", records: { "2026-08-04": { actualDate: "", note: "Ожидаем выписку по резервному счёту." } } },
    { id: "regular-4", parentId: null, title: "Актуализировать платёжный календарь", assignee: "Финансовый менеджер", frequency: "weekly", anchorDate: "2026-08-07", description: "Обновить план платежей и отметить критичные остатки.", records: { "2026-08-07": { actualDate: "2026-08-07", note: "" }, "2026-08-14": { actualDate: "", note: "Не получены заявки от отдела закупок." } } },
    { id: "regular-5", parentId: null, title: "Обновить квартальный прогноз", assignee: "Финансовый директор", frequency: "quarterly", anchorDate: "2026-09-15", description: "Пересобрать прогноз выручки, расходов и денежных остатков.", records: {} }
  ]
};
