"use client";

import {
  ArrowLeft,
  BookOpenText,
  CalendarClock,
  Check,
  ExternalLink,
  FilePlus2,
  Link2,
  ListChecks,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import type {
  AccountingReport,
  AccountingReportVariant,
  ReportStatus,
} from "@/lib/types";

const REPORT_STATUSES: ReportStatus[] = ["Работает", "В разработке", "Не используется"];

type TextSectionKey = keyof Pick<
  AccountingReport,
  "essence" | "sources" | "closingStages" | "accountingFeatures" | "attributes" | "referenceMaterials"
>;

const SECTION_FIELDS: Array<{ key: TextSectionKey; title: string; hint: string }> = [
  { key: "essence", title: "Суть отчёта", hint: "Для чего нужен отчёт и на какой вопрос он отвечает" },
  { key: "sources", title: "Источники информации", hint: "Каждый источник можно начинать с новой строки" },
  { key: "closingStages", title: "Этапы закрытия", hint: "Каждый этап начинайте с новой строки" },
  { key: "accountingFeatures", title: "Особенности учёта", hint: "Правила признания, исключения и важные допущения" },
  { key: "attributes", title: "Атрибуты", hint: "Поля и аналитические разрезы отчёта" },
  { key: "referenceMaterials", title: "Справочники и материалы", hint: "Регламенты, справочники и полезные ссылки" },
];

const EMPTY_REPORT: AccountingReport = {
  id: "",
  title: "Новый отчёт",
  icon: "📊",
  assignee: "",
  deadline: "",
  status: "В разработке",
  essence: "",
  sources: "",
  closingStages: "",
  variants: "",
  variantLinks: [],
  accountingFeatures: "",
  attributes: "",
  referenceMaterials: "",
};

function statusClass(status: ReportStatus) {
  if (status === "Работает") return "report-status report-status-ready";
  if (status === "Не используется") return "report-status report-status-off";
  return "report-status report-status-building";
}

function renderText(value: string) {
  if (!value.trim()) return <p className="report-empty-copy">Пока не заполнено</p>;
  return value.split("\n").map((line, index) => <p key={index}>{line || "\u00a0"}</p>);
}

function getLines(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim().replace(/^[•\-–—]\s*/, ""))
    .filter(Boolean);
}

function getReportVariants(report: AccountingReport): AccountingReportVariant[] {
  if (report.variantLinks?.length) return report.variantLinks;
  return getLines(report.variants).map((title, index) => ({
    id: `${report.id}-variant-${index + 1}`,
    title,
    url: "",
  }));
}

function isWebLink(value: string) {
  return /^https?:\/\//i.test(value.trim());
}

export default function AccountingPolicy({
  reports,
  people,
  onChange,
}: {
  reports: AccountingReport[];
  people: string[];
  onChange: (reports: AccountingReport[]) => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<AccountingReport | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"Все" | ReportStatus>("Все");

  const selected = selectedId ? reports.find((report) => report.id === selectedId) || null : null;
  const visibleReports = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("ru");
    return reports.filter((report) => {
      const matchesQuery = !query || (report.title + " " + report.assignee + " " + report.essence).toLocaleLowerCase("ru").includes(query);
      return matchesQuery && (statusFilter === "Все" || report.status === statusFilter);
    });
  }, [reports, search, statusFilter]);

  function startCreate() {
    setDraft({ ...EMPTY_REPORT, id: crypto.randomUUID() });
    setIsNew(true);
    setSelectedId(null);
  }

  function startEdit(report: AccountingReport) {
    setDraft({ ...structuredClone(report), variantLinks: getReportVariants(report) });
    setIsNew(false);
  }

  function updateDraft<K extends keyof AccountingReport>(key: K, value: AccountingReport[K]) {
    setDraft((current) => current ? { ...current, [key]: value } : current);
  }

  function updateVariant(id: string, key: "title" | "url", value: string) {
    setDraft((current) => {
      if (!current) return current;
      const variants = current.variantLinks ?? getReportVariants(current);
      return {
        ...current,
        variantLinks: variants.map((variant) => variant.id === id ? { ...variant, [key]: value } : variant),
      };
    });
  }

  function addVariant() {
    setDraft((current) => {
      if (!current) return current;
      const variants = current.variantLinks ?? getReportVariants(current);
      return { ...current, variantLinks: [...variants, { id: `variant-${Date.now()}`, title: "", url: "" }] };
    });
  }

  function removeVariant(id: string) {
    setDraft((current) => current ? {
      ...current,
      variantLinks: (current.variantLinks ?? getReportVariants(current)).filter((variant) => variant.id !== id),
    } : current);
  }

  function saveDraft() {
    if (!draft) return;
    const variantLinks = (draft.variantLinks ?? getReportVariants(draft)).filter(
      (variant) => variant.title.trim() || variant.url.trim(),
    );
    const normalized = {
      ...draft,
      title: draft.title.trim() || "Без названия",
      icon: draft.icon.trim() || "📊",
      variantLinks,
      variants: variantLinks.map((variant) => `• ${variant.title.trim()}`).join("\n"),
    };
    if (isNew) onChange([...reports, normalized]);
    else onChange(reports.map((report) => report.id === normalized.id ? normalized : report));
    setSelectedId(normalized.id);
    setDraft(null);
    setIsNew(false);
  }

  function deleteReport(report: AccountingReport) {
    if (!window.confirm(`Удалить отчёт «${report.title}»?`)) return;
    onChange(reports.filter((item) => item.id !== report.id));
    setSelectedId(null);
    setDraft(null);
  }

  if (draft) {
    const variants = draft.variantLinks ?? getReportVariants(draft);

    return (
      <section className="policy-page report-editor">
        <div className="policy-page-head">
          <button className="secondary" onClick={() => { setDraft(null); setIsNew(false); }}><X size={17} />Отмена</button>
          <div><small>{isNew ? "Новый отчёт" : "Редактирование отчёта"}</small><h2>{draft.icon} {draft.title}</h2></div>
          <button className="primary" onClick={saveDraft}><Check size={17} />Сохранить отчёт</button>
        </div>

        <div className="report-editor-meta card">
          <label className="field report-icon-field">Иконка<input value={draft.icon} maxLength={8} onChange={(event) => updateDraft("icon", event.target.value)} /></label>
          <label className="field">Название отчёта<input value={draft.title} onChange={(event) => updateDraft("title", event.target.value)} /></label>
          <label className="field">Ответственный<input list="report-people" value={draft.assignee} onChange={(event) => updateDraft("assignee", event.target.value)} placeholder="Выберите или впишите" /></label>
          <datalist id="report-people">{people.map((person) => <option key={person} value={person} />)}</datalist>
          <label className="field">Срок закрытия отчёта<input value={draft.deadline} onChange={(event) => updateDraft("deadline", event.target.value)} placeholder="Например: до 10 числа" /></label>
          <label className="field">Статус<select value={draft.status} onChange={(event) => updateDraft("status", event.target.value as ReportStatus)}>{REPORT_STATUSES.map((status) => <option key={status}>{status}</option>)}</select></label>
        </div>

        <div className="report-editor-sections">
          {SECTION_FIELDS.slice(0, 3).map((section) => (
            <label className="card report-edit-section" key={section.key}>
              <span><b>{section.title}</b><small>{section.hint}</small></span>
              <textarea rows={section.key === "essence" ? 5 : 8} value={draft[section.key]} onChange={(event) => updateDraft(section.key, event.target.value)} placeholder="Введите текст…" />
            </label>
          ))}

          <section className="card report-edit-section report-variant-editor">
            <div className="report-edit-section-head">
              <span><b>Варианты отчёта</b><small>Название и гиперссылка на отчёт, архив или файл</small></span>
              <button type="button" className="secondary small" onClick={addVariant}><Plus size={15} />Добавить вариант</button>
            </div>
            <div className="report-variant-editor-list">
              {variants.map((variant) => (
                <div className="report-variant-editor-row" key={variant.id}>
                  <label>Название<input value={variant.title} placeholder="Например, PnL за 2025 год" onChange={(event) => updateVariant(variant.id, "title", event.target.value)} /></label>
                  <label>Гиперссылка<input type="url" value={variant.url} placeholder="https://..." onChange={(event) => updateVariant(variant.id, "url", event.target.value)} /></label>
                  <button type="button" className="icon-button danger" aria-label={`Удалить вариант ${variant.title || "без названия"}`} onClick={() => removeVariant(variant.id)}><Trash2 size={17} /></button>
                </div>
              ))}
              {variants.length === 0 ? <button type="button" className="report-empty-add" onClick={addVariant}><Link2 size={18} />Добавить первый вариант отчёта</button> : null}
            </div>
          </section>

          {SECTION_FIELDS.slice(3).map((section) => (
            <label className="card report-edit-section" key={section.key}>
              <span><b>{section.title}</b><small>{section.hint}</small></span>
              <textarea rows={section.key === "accountingFeatures" ? 5 : 8} value={draft[section.key]} onChange={(event) => updateDraft(section.key, event.target.value)} placeholder="Введите текст…" />
            </label>
          ))}
        </div>
      </section>
    );
  }

  if (selected) {
    const variants = getReportVariants(selected);
    const stages = getLines(selected.closingStages);

    return (
      <section className="policy-page report-detail">
        <div className="policy-page-head report-detail-head">
          <button className="secondary" onClick={() => setSelectedId(null)}><ArrowLeft size={17} />Все отчёты</button>
          <div className="report-detail-title"><span>{selected.icon}</span><div><small>Учетная политика · отчёт</small><h2>{selected.title}</h2></div></div>
          <div className="report-detail-actions"><button className="secondary danger-button" onClick={() => deleteReport(selected)}><Trash2 size={16} />Удалить</button><button className="primary" onClick={() => startEdit(selected)}><Pencil size={16} />Редактировать</button></div>
        </div>

        <div className="report-summary card">
          <div className="report-summary-item"><small>Статус</small><span className={statusClass(selected.status)}>{selected.status}</span></div>
          <div className="report-summary-item"><small>Ответственный</small><strong>{selected.assignee || "Не назначен"}</strong></div>
          <div className="report-summary-item report-summary-deadline"><CalendarClock size={20} /><div><small>Срок закрытия отчёта</small><strong>{selected.deadline || "Не указан"}</strong></div></div>
        </div>

        <div className="report-detail-layout">
          <article className="card report-read-section report-essence-section">
            <div className="report-section-heading"><span className="report-section-icon"><BookOpenText size={20} /></span><div><small>О назначении отчёта</small><h3>Суть отчёта</h3></div></div>
            <div className="report-rich-text report-essence-copy">{renderText(selected.essence)}</div>
          </article>

          <article className="card report-read-section">
            <div className="report-section-heading"><span className="report-section-number">01</span><h3>Источники информации</h3></div>
            <div className="report-rich-text">{renderText(selected.sources)}</div>
          </article>

          <article className="card report-read-section">
            <div className="report-section-heading"><span className="report-section-number">02</span><h3>Особенности учёта</h3></div>
            <div className="report-rich-text">{renderText(selected.accountingFeatures)}</div>
          </article>

          <article className="card report-read-section report-closing-section">
            <div className="report-closing-header">
              <div className="report-section-heading"><span className="report-section-icon"><ListChecks size={20} /></span><div><small>Порядок подготовки</small><h3>Этапы закрытия</h3></div></div>
              <div className="report-closing-deadline"><CalendarClock size={18} /><span>Закрыть отчёт</span><strong>{selected.deadline || "Срок не указан"}</strong></div>
            </div>
            {stages.length ? <ol className="report-stage-list">{stages.map((stage, index) => <li key={`${stage}-${index}`}><span>{index + 1}</span><p>{stage}</p></li>)}</ol> : <p className="report-empty-copy">Этапы пока не описаны</p>}
          </article>

          <article className="card report-read-section report-variants-section">
            <div className="report-section-heading"><span className="report-section-icon"><Link2 size={20} /></span><div><small>Файлы и архив</small><h3>Варианты отчёта</h3></div></div>
            <div className="report-variant-links">
              {variants.length ? variants.map((variant) => {
                const content = <><span className="report-variant-link-icon"><Link2 size={17} /></span><span><strong>{variant.title || "Вариант без названия"}</strong><small>{isWebLink(variant.url) ? "Открыть отчёт" : "Ссылка не добавлена"}</small></span>{isWebLink(variant.url) ? <ExternalLink size={16} /> : null}</>;
                return isWebLink(variant.url)
                  ? <a href={variant.url} target="_blank" rel="noreferrer" key={variant.id}>{content}</a>
                  : <div className="report-variant-link is-disabled" key={variant.id}>{content}</div>;
              }) : <p className="report-empty-copy">Варианты отчёта пока не добавлены</p>}
            </div>
          </article>

          <article className="card report-read-section">
            <div className="report-section-heading"><span className="report-section-number">03</span><h3>Атрибуты</h3></div>
            <div className="report-rich-text">{renderText(selected.attributes)}</div>
          </article>

          <article className="card report-read-section">
            <div className="report-section-heading"><span className="report-section-number">04</span><h3>Справочники и материалы</h3></div>
            <div className="report-rich-text">{renderText(selected.referenceMaterials)}</div>
          </article>
        </div>
      </section>
    );
  }

  return (
    <section className="policy-page">
      <div className="policy-hero">
        <span><BookOpenText size={28} /></span>
        <div><small>Единые правила подготовки отчётности</small><h2>Учетная политика</h2><p>Выберите отчёт, чтобы увидеть источники, сроки, этапы и правила его формирования.</p></div>
        <button className="primary" onClick={startCreate}><FilePlus2 size={18} />Добавить отчёт</button>
      </div>

      <div className="policy-toolbar">
        <label className="search-field"><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Поиск по отчётам…" /></label>
        <div className="report-filters">{(["Все", ...REPORT_STATUSES] as const).map((status) => <button key={status} className={statusFilter === status ? "active" : ""} onClick={() => setStatusFilter(status)}>{status}</button>)}</div>
      </div>

      <div className="report-gallery">
        {visibleReports.map((report, index) => (
          <button className="report-card card" key={report.id} onClick={() => setSelectedId(report.id)}>
            <span className={`report-cover report-cover-${index % 6}`}><i>{report.icon}</i></span>
            <span className="report-card-body"><span className={statusClass(report.status)}>{report.status}</span><b>{report.title}</b><small>{report.assignee || "Ответственный не назначен"}</small><em>{report.deadline || "Срок не указан"}</em></span>
          </button>
        ))}
        <button className="report-card report-add-card card" onClick={startCreate}><span><Plus size={28} /></span><b>Добавить новый отчёт</b><small>Создать карточку по единому шаблону</small></button>
      </div>
      {visibleReports.length === 0 && <div className="policy-empty"><Search size={24} /><b>Отчёты не найдены</b><span>Измените поиск или фильтр статуса.</span></div>}
    </section>
  );
}
