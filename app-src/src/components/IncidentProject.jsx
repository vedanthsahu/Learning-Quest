import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { milestones, allTasks, INCIDENT_PROJECT_ID, projectSummary, taskComplete } from '../data/incidentProject';
import documents from '../data/incidentDocuments.json';
import { usePreferences } from '../utils/preferences';
import BuildArchitecture from './BuildArchitecture';
import '../build-project.css';

const docRoot = '/content/incident-command/';
const statuses = { todo: 'Not started', active: 'In progress', blocked: 'Blocked', done: 'Complete' };

function ProjectDocument({ path, onSelect, onClose }) {
  const [content, setContent] = useState('');
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const dialog = useRef(null);
  useEffect(() => {
    const element = dialog.current;
    const previous = document.activeElement;
    element.showModal();
    return () => { element.close(); previous?.focus(); };
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    setContent(''); setError('');
    fetch(docRoot + path, { signal: controller.signal }).then(r => {
      if (!r.ok) throw new Error('Document could not be loaded.');
      return r.text();
    }).then(text => { setContent(text); dialog.current?.querySelector('.build-document-body')?.scrollTo(0, 0); })
      .catch(e => { if (e.name !== 'AbortError') setError(e.message); });
    return () => controller.abort();
  }, [path, attempt]);
  function link({ href, children }) {
    if (href?.startsWith('#')) return <a href={href}>{children}</a>;
    let target;
    try { target = new URL(href, window.location.origin + docRoot + path); } catch { return <span>{children}</span>; }
    if (target.origin === window.location.origin) {
      const relative = decodeURIComponent(target.pathname).replace(docRoot, '');
      if (target.pathname.startsWith(docRoot) && documents.some(d => d.path === relative)) {
        return <button className="build-inline-link" onClick={() => onSelect(relative)}>{children}</button>;
      }
      return <span title="This source reference is outside the imported document library">{children}</span>;
    }
    return <a href={href} target="_blank" rel="noreferrer">{children}</a>;
  }
  return <dialog ref={dialog} className="build-document" onCancel={onClose} aria-label="Project document">
    <header><span>{documents.find(d => d.path === path)?.title || path}</span><button onClick={onClose} autoFocus>Close document ×</button></header>
    <div className="build-document-body">
      {error ? <p role="alert">{error} <button onClick={() => setAttempt(a => a + 1)}>Retry</button></p> : !content ? <p role="status">Loading document…</p> : <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ a: link }}>{content}</ReactMarkdown>}
    </div>
    <footer>Imported project reference · reading does not mark implementation complete.</footer>
  </dialog>;
}

export default function IncidentProject({ progress, onUpdate, saveStatus, onRetrySave }) {
  const summary = projectSummary(progress);
  const [selected, setSelected] = useState(() => summary.next?.id || allTasks[0].id);
  const [tab, setTab] = useState('journey');
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [doc, setDoc] = useState(null);
  const [announcement, setAnnouncement] = useState('');
  const [showArchitecture, setShowArchitecture] = useState(false);
  const { reduced, update: updatePreferences } = usePreferences();
  const detail = useRef(null);
  const task = allTasks.find(t => t.id === selected) || allTasks[0];
  const state = progress[task.id] || {};
  const checks = state.checks || {};
  const ready = task.checks.every((_, i) => checks[i]);
  function update(patch) { onUpdate(INCIDENT_PROJECT_ID, task.id, patch); }
  function selectTask(id, focus = false) {
    setSelected(id); setTab('journey');
    if (focus) requestAnimationFrame(() => { detail.current?.scrollIntoView({ behavior: reduced ? 'instant' : 'smooth', block: 'start' }); detail.current?.focus({ preventScroll: true }); });
  }
  function toggleCheck(index) {
    const next = { ...checks, [index]: !checks[index] };
    update({ checks: next, ...(state.status === 'done' && !next[index] ? { status: 'active', completedAt: null } : {}) });
  }
  function complete() {
    if (!ready) return;
    update({ status: 'done', completedAt: new Date().toISOString() });
    setAnnouncement(`Completed: ${task.title}. Progress is being saved.`);
  }
  function exportProgress() {
    const report = { project: INCIDENT_PROJECT_ID, exportedAt: new Date().toISOString(), summary, tasks: allTasks.map(t => ({ id: t.id, title: t.title, ...progress[t.id] })) };
    const url = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' }));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'incident-command-progress.json'; anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setAnnouncement('Progress snapshot downloaded. Your saved progress stays in LearningQuest.');
  }
  const matches = t => (filter === 'all' || (filter === 'done' ? taskComplete(t, progress[t.id]) : (progress[t.id]?.status || 'todo') === filter)) && `${t.title} ${t.outcome}`.toLowerCase().includes(query.toLowerCase());
  const matchedCount = allTasks.filter(matches).length;
  return <div className="build-project">
    <header className="build-hero">
      <div className="build-title"><h1>Incident Command</h1><p className="build-intro">Your plan for building an AI-assisted incident response system.</p></div>
      <div className="build-hero-actions"><button className="build-primary" onClick={() => selectTask(summary.next?.id || allTasks[0].id, true)}>{summary.next ? 'Continue building' : 'Review your work'}</button><button onClick={() => setShowArchitecture(v => !v)} aria-expanded={showArchitecture} aria-controls="build-architecture-panel">{showArchitecture ? 'Hide architecture' : 'Explore architecture'}</button></div>
      <div className="build-progress"><div className="build-progress-label"><strong>{summary.done} of {summary.total} core steps verified</strong><span>{summary.percent}%</span></div><progress max="100" value={summary.percent} aria-label="Core implementation progress" /></div>
    </header>
    {showArchitecture && <div id="build-architecture-panel" className="build-architecture-panel"><div><h2>Four components. One recovery loop.</h2><p>The workspace shows the evidence. Spring Boot controls actions. Python investigates. The simulator makes failure reproducible.</p><p>Select a layer to explore its responsibility.</p><button onClick={() => updatePreferences({ motion: reduced ? 'full' : 'quiet' })} aria-pressed={reduced}>Quiet motion {reduced ? 'on' : 'off'}</button></div><BuildArchitecture /></div>}
    <div className="build-toolbar"><div aria-label="Workspace views">{[['journey', 'Build journey'], ['library', `Document library · ${documents.length}`]].map(([id, label]) => <button key={id} aria-pressed={tab === id} onClick={() => { setTab(id); setQuery(''); }}>{label}</button>)}</div><button onClick={exportProgress}>Export progress ↓</button></div>
    {saveStatus === 'error' && <p className="build-save-error" role="alert">Progress could not be saved. Keep this page open and <button onClick={onRetrySave}>retry saving</button>, or export a snapshot.</p>}
    <p className="build-sr-only" role="status">{announcement}</p>
    {tab === 'journey' ? <>
      <div className="build-next"><span>Up next</span><button onClick={() => selectTask(summary.next?.id || allTasks[0].id, true)}>{summary.next?.title || 'Review the completed scorecard'}</button><small>Explore any step at your own pace.</small></div>
      <div className="build-search"><label>Find a step<input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search outcomes or steps…" type="search" /></label><label>Status<select value={filter} onChange={e => setFilter(e.target.value)}><option value="all">All steps</option>{Object.entries(statuses).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label></div>
      <div className="build-layout"><section className="build-milestones" aria-label="Implementation milestones">
        {!matchedCount && <p>No steps match. <button onClick={() => { setQuery(''); setFilter('all'); }}>Clear filters</button></p>}
        {milestones.map((milestone, index) => {
          const visible = milestone.tasks.filter(matches);
          const done = milestone.tasks.filter(t => taskComplete(t, progress[t.id])).length;
          if (!visible.length) return null;
          return <section key={milestone.id} className="build-milestone">
            <header><span className={`build-stage-number ${done === milestone.tasks.length ? 'complete' : ''}`}>{done === milestone.tasks.length ? '✓' : String(index + 1).padStart(2, '0')}</span><div><h2>{milestone.title}</h2><p>{milestone.subtitle}</p></div><small>{milestone.optional ? 'OPTIONAL · ' : ''}{done}/{milestone.tasks.length}</small></header>
            {visible.map(t => <button key={t.id} className={`build-step ${selected === t.id ? 'selected' : ''}`} onClick={() => selectTask(t.id, window.innerWidth < 900)} aria-pressed={selected === t.id}><span className={`build-step-dot ${progress[t.id]?.status || 'todo'}`}>{taskComplete(t, progress[t.id]) ? '✓' : '•'}</span><span>{t.title}<small>{statuses[progress[t.id]?.status || 'todo']}</small></span><span aria-hidden="true">↗</span></button>)}
          </section>;
        })}
      </section><aside ref={detail} tabIndex="-1" className="build-detail" aria-label="Selected task details">
        <div className="build-detail-meta"><span>{milestones.find(m => m.tasks.some(t => t.id === task.id))?.title}</span><span>{task.checks.filter((_, i) => checks[i]).length}/{task.checks.length} verified</span></div><h2>{task.title}</h2><p>{task.outcome}</p>
        <label className="build-status-label">Step status<select aria-label="Step status" value={state.status === 'done' ? 'done' : state.status || 'todo'} onChange={e => update({ status: e.target.value, completedAt: null })}>{Object.entries(statuses).filter(([key]) => key !== 'done' || state.status === 'done').map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
        <h3>Evidence checklist</h3><p className="build-muted">Check what you have verified in the application.</p>
        <div className="build-checks">{task.checks.map((check, i) => <label key={`${task.id}-${i}`} className={checks[i] ? 'checked' : ''}><input type="checkbox" checked={!!checks[i]} onChange={() => toggleCheck(i)} /><span>{check}</span></label>)}</div>
        <label className="build-notes-label">Notes, test results & blockers<textarea value={state.notes || ''} onChange={e => update({ notes: e.target.value })} placeholder="What worked? Paste a test result or commit reference. What is blocking you?" rows="5" /></label>
        <div className="build-task-footer"><button className="build-primary" disabled={!ready || taskComplete(task, state)} onClick={complete}>{taskComplete(task, state) ? '✓ Step verified' : 'Mark step complete'}</button><small>{taskComplete(task, state) ? 'Change status or uncheck evidence to reopen.' : ready ? 'All evidence checked. Ready to complete.' : 'Verify every checklist item to complete.'}</small></div>
        <h3>Read the supporting documents</h3><div className="build-doc-links">{task.docs.map(path => <button key={path} onClick={() => setDoc(path)}>{documents.find(d => d.path === path)?.title || path}<span>↗</span></button>)}</div>
      </aside></div>
    </> : <section className="build-library"><div className="build-library-heading"><div><h2>The full project library</h2><p>Vision, architecture, decisions and implementation guidance in one place.</p></div><label>Search documents<input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Try models, SLA, security…" /></label></div><p className="build-muted">Portable snapshot imported October 1, 2026. Changes to the source project docs are not automatically synced.</p><div className="build-doc-grid">{documents.filter(d => `${d.title} ${d.path}`.toLowerCase().includes(query.toLowerCase())).map(d => <button key={d.path} onClick={() => setDoc(d.path)}><small>{d.group}</small><strong>{d.title}</strong><span>Read document ↗</span></button>)}</div>{!documents.some(d => `${d.title} ${d.path}`.toLowerCase().includes(query.toLowerCase())) && <p>No matching documents. Try another search.</p>}</section>}
    {doc && <ProjectDocument path={doc} onSelect={setDoc} onClose={() => setDoc(null)} />}
  </div>;
}
