import { useScrollReveals } from "./utils/useScrollReveals";
import { PreferencesProvider } from "./utils/preferences";
import Atmosphere from "./components/Atmosphere";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { useGameData } from "./utils/useGameData";
import { parseReaderHash } from "./utils/crossref";
import Nav from "./components/Nav";
import Dashboard from "./components/Dashboard";
import BookView from "./components/BookView";
import ChallengeView from "./components/ChallengeView";
import AchievementsView from "./components/AchievementsView";
import ProfileView from "./components/ProfileView";
import RevisionView from "./components/RevisionView";
import Reader from "./components/Reader";
import QuizView from "./components/QuizView";
import NotificationCenter from "./components/NotificationCenter";
import Mascot from "./components/Mascot";

export default function App() { return <PreferencesProvider><LearningApp /></PreferencesProvider>; }

function LearningApp() {
  const {
    data,
    stats,
    loading,
    loadError,
    events,
    dismissEvent,
    pushEvent,
    updateTopic,
    updateChallengeProject,
    logActiveTime,
    updateScrollPct,
    toggleHighlight,
    saveHighlightDetails,
    removeHighlight,
    recordQuizResult,
    saveStatus,
  } = useGameData();

  const [view, setView] = useState({ view: "dashboard" });
  const [readerState, setReaderState] = useState(null); // { target, anchor }
  const [activeQuizId, setActiveQuizId] = useState(null);
  useScrollReveals(`${view.view}-${view.bookId || ""}-${loading}`);

  // Cross-reference links open in a NEW tab (see crossref.js / Reader.jsx's `a` component)
  // so jumping to an earlier chapter never costs you your place in the one you're reading.
  // That new tab boots fresh at the dashboard like any other load -- this is what makes it
  // land on the actual referenced chapter instead: parse the #/reader/... hash once data is
  // ready, and open the Reader directly. hashHandledRef guards this to fire exactly once;
  // without it, `data` changing on every save would re-run the effect indefinitely.
  const hashHandledRef = useRef(false);
  useEffect(() => {
    if (hashHandledRef.current || !data) return;
    hashHandledRef.current = true;
    const target = parseReaderHash(window.location.hash);
    if (target) {
      openReader(
        { scope: "book", bookId: target.bookId, partIndex: target.partIndex, topicIndex: target.topicIndex },
        target.anchor
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  if (loadError) return <div className="loading-screen"><Mascot mood="sleepy" size={140}/><h1>Your observatory is taking a moment.</h1><p className="loading-error" role="alert">{loadError}</p><button className="btn-primary" onClick={()=>window.location.reload()}>Try again</button></div>;

  if (loading) {
    return (
      <div className="loading-screen">
        <Mascot level={1} mood="idle" size={120} />
        <div className="loading-text" role="status">Preparing your universe...</div><div className="loading-orbit" aria-hidden="true"><span/></div>
      </div>
    );
  }

  function openReader(target, anchor) {
    setReaderState({ target, anchor: anchor || null });
  }
  function closeReader() {
    setReaderState(null);
  }
  function navigateFromReader(target, anchor, direction) {
    setReaderState({ target, anchor: anchor || null, direction: direction || null });
  }
  function navigate(next) {
    setView(next);
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  function cycleBookStatus(bookId, partIndex, topicIndex, newStatus) {
    updateTopic(bookId, partIndex, topicIndex, { status: newStatus });
  }
  function cycleChallengeStatus(index, field, newStatus) {
    updateChallengeProject(index, { [field]: newStatus });
  }
  function handleQuizFinish(quizId, scorePct) {
    recordQuizResult(quizId, scorePct);
  }

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">Skip to content</a>
      <Nav stats={stats} view={view} data={data} onNavigate={navigate} saveStatus={saveStatus} />

      <main className="app-main" id="main-content">
        <Atmosphere />
        {view.view === "dashboard" && (
          <Dashboard data={data} stats={stats} onOpenReader={openReader} onNavigateView={navigate} />
        )}
        {view.view === "book" && (
          <BookView
            key={view.bookId}
            book={data.books.find((b) => b.id === view.bookId)}
            xpRules={data.xpRules}
            quizResults={data.quizResults}
            onOpenReader={openReader}
            onCycleStatus={cycleBookStatus}
            onOpenQuiz={setActiveQuizId}
            onBack={() => navigate({ view: "dashboard" })}
          />
        )}
        {view.view === "challenges" && (
          <ChallengeView series={data.challengeSeries} onOpenReader={openReader} onCycleStatus={cycleChallengeStatus} />
        )}
        {view.view === "revision" && <RevisionView data={data} onOpenReader={openReader} />}
        {view.view === "achievements" && <AchievementsView data={data} stats={stats} />}
        {view.view === "profile" && <ProfileView data={data} stats={stats} />}
      </main>

      <AnimatePresence>
        {readerState && (
          <Reader
            key={JSON.stringify(readerState.target)}
            data={data}
            target={readerState.target}
            initialAnchor={readerState.anchor}
            initialDirection={readerState.direction}
            onClose={closeReader}
            onNavigate={navigateFromReader}
            updateTopic={updateTopic}
            updateChallengeProject={updateChallengeProject}
            logActiveTime={logActiveTime}
            updateScrollPct={updateScrollPct}
            toggleHighlight={toggleHighlight}
            saveHighlightDetails={saveHighlightDetails}
            removeHighlight={removeHighlight}
            pushEvent={pushEvent}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {activeQuizId && (
          <QuizView quizId={activeQuizId} onClose={() => setActiveQuizId(null)} onFinish={handleQuizFinish} />
        )}
      </AnimatePresence>

      <NotificationCenter events={events} dismissEvent={dismissEvent} />
    </div>
  );
}
