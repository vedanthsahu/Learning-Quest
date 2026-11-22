import ChapterMap from "./ChapterMap";
import ChapterExplorer from "./ChapterExplorer";
import { downloadCompletion } from "../utils/completionCard";
import WorldArt from "./WorldArt";
import {worldFor} from "../data/worlds";
import { useState } from "react";
import { motion } from "framer-motion";
import ProgressRing from "./ProgressRing";
import PageHero from "./PageHero";
import { bookStats, rankTitle } from "../utils/xp";
import { mascotForBook } from "../utils/mascots";
import { quizForPart, quizResultFor } from "../data/quizzes";

const STATUS_CYCLE = { not_started: "in_progress", in_progress: "done", done: "not_started" };
const STATUS_LABEL = { not_started: "Not started", in_progress: "In progress", done: "Completed" };
const STATUS_ICON = { not_started: "\u25cb", in_progress: "\u25d0", done: "\u2713" };

export default function BookView({ book, xpRules, quizResults, onOpenReader, onCycleStatus, onOpenQuiz, onBack, paused }) {
  const [layout,setLayout]=useState(() => {
    try { const saved = localStorage.getItem('lq-chapter-view'); return ['list','rocket','globe','cards','map'].includes(saved) ? saved : 'list'; } catch { return 'list'; }
  });
  function chooseLayout(next) { setLayout(next); try { localStorage.setItem('lq-chapter-view', next); } catch { /* Available for this session. */ } }
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const stats = bookStats(book, xpRules);
  const rank = rankTitle(stats.pct);
  const Companion = mascotForBook(book.id);
  const parts = book.parts.map((part, partIndex) => ({ ...part, partIndex,
    topics: part.topics.map((topic, topicIndex) => ({ ...topic, topicIndex })).filter(t =>
      (filter === "all" || t.status === filter) && `${t.num} ${t.title} ${part.name}`.toLowerCase().includes(query.toLowerCase().trim()))
  })).filter(part => part.topics.length);
  const count = parts.reduce((sum, part) => sum + part.topics.length, 0);
  return (
    <div className="view book-view" style={{ "--page-accent": book.color }}>
      <button className="back-link" onClick={onBack}>&larr; Learning library</button>
      <PageHero eyebrow={worldFor(book.id).name.toUpperCase()} title={book.name} description={book.subtitle} accent={book.color}>
        <div className="book-world"><WorldArt bookId={book.id}/><Companion level={1} mood={stats.pct >= 1 ? "happy" : "idle"} size={100} /></div>
      </PageHero>
      <div className="book-journey-strip"><ProgressRing pct={stats.pct} color={book.color} size={48} strokeWidth={4}/><div><strong>{rank.title}</strong><span>{stats.done} of {stats.total} chapters completed</span></div><div className="journey-line"><span style={{width: `${stats.pct * 100}%`, background: book.color}} /></div><span>{book.parts.length} sections</span></div>
      <div className="collection-toolbar">
        <label className="search-field"><span aria-hidden="true">&#8981;</span><input type="search" aria-label="Search chapters" placeholder="Find a chapter or concept..." value={query} onChange={e => setQuery(e.target.value)}/></label>
        <div className="filter-tabs" aria-label="Filter chapters">{[["all", "All chapters"], ["in_progress", "In progress"], ["done", "Completed"], ["not_started", "Not started"]].map(([value,label]) => <button key={value} aria-pressed={filter === value} onClick={() => setFilter(value)}>{label}</button>)}</div>
      </div>
      <div className="book-layout-controls"><div className="filter-tabs chapter-view-tabs" role="group" aria-label="Chapter view">{[['list','List'],['rocket','Rocket route'],['globe','Chapter globe'],['cards','Chapter cards'],['map','Constellation map']].map(([value,label]) => <button key={value} aria-pressed={layout === value} onClick={() => chooseLayout(value)}>{label}</button>)}</div>{stats.pct >= 1 && <button className="btn-primary" onClick={()=>downloadCompletion({title:book.name,subtitle:`${stats.total} chapters explored`})}>Save completion card</button>}</div>
      <div className="collection-count" role="status">{count} chapters {query || filter !== "all" ? "match your filters" : "to explore"}</div>
      {parts.length === 0 && <div className="designed-empty"><span className="empty-orbit" aria-hidden="true">&#8981;</span><h2>No chapters found</h2><p>Try another concept or change your status filter.</p><button className="btn-secondary" onClick={() => { setQuery(""); setFilter("all"); }}>Clear filters</button></div>}
      {['list','rocket','globe'].includes(layout) && <ChapterExplorer book={book} parts={parts} mode={layout} quizResults={quizResults} onOpenReader={onOpenReader} onCycleStatus={onCycleStatus} onOpenQuiz={onOpenQuiz} paused={paused} />}
      {['cards','map'].includes(layout) && parts.map((part) => {
        const {partIndex} = part;
        const quiz = quizForPart(book.id, partIndex);
        const result = quiz ? quizResultFor(quizResults, quiz.id) : null;
        return <section key={part.name} className="quest-part">
          <div className="quest-part-title-row"><div className="part-heading"><span className="part-index">{String(partIndex + 1).padStart(2, "0")}</span><h2 className="quest-part-title">{part.name}</h2></div>{quiz && <button className="quiz-btn" onClick={() => onOpenQuiz(quiz.id)}>{result ? `Retake quiz (${result.bestScore}%)` : "Test your knowledge"} &rarr;</button>}</div>
          {layout === "map" ? <ChapterMap part={part} bookId={book.id} color={book.color} onOpenReader={onOpenReader}/> : <div className="quest-node-grid">{part.topics.map(t => <motion.article key={t.num} className={`quest-node status-${t.status}`} whileHover={{ y: -3 }} style={{"--node-color": book.color}}>
            <button className="chapter-open" onClick={() => onOpenReader({scope:"book",bookId:book.id,partIndex,topicIndex:t.topicIndex})}>
              <span className="quest-node-num">CHAPTER {String(t.num).padStart(2,"0")}</span><span className="quest-node-title">{t.title}</span><span className="quest-node-meta">{t.estMinutes} min read <span aria-hidden="true">&#8599;</span></span>
            </button>
            <div className="chapter-status-row"><span>{STATUS_LABEL[t.status]}</span><button className="quest-node-status-btn" aria-label={`${t.title}: ${STATUS_LABEL[t.status]}. Change to ${STATUS_LABEL[STATUS_CYCLE[t.status]]}`} onClick={() => onCycleStatus(book.id,partIndex,t.topicIndex,STATUS_CYCLE[t.status])}>{STATUS_ICON[t.status]}</button></div>
            {t.scrollPct > 0 && <div className="chapter-read-track"><span style={{width:`${Math.min(100, Math.max(0,t.scrollPct * 100))}%`}}/></div>}
          </motion.article>)}</div>}
        </section>;
      })}
    </div>
  );
}
