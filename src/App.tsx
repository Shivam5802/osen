import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity, ArrowLeft, ArrowRight, Award, Battery, BookOpen, Bug, Check, CheckCircle2,
  ChevronRight, CircleHelp, Code2, Coins, Compass, Crown, Flame, Home, Lightbulb, Lock, Map,
  Menu, Moon, Pause, Play, RotateCcw, Settings, Shield, Sparkles, Star, Sun, Target, Trophy, Volume2, VolumeX,
  X, Zap,
} from "lucide-react";
import { achievements, getChallenge, hiddenBugChallenges, worlds } from "./data";
import { addXp, loadGame, makeRun, saveGame, storageAvailable, todayKey, updateAchievements, xpForNextLevel } from "./game";
import type { Challenge, GameState, Mission, RunProgress, Screen, World } from "./types";

const allChallenges = worlds.flatMap((world) => world.missions.flatMap((mission) => mission.challenges));
const dailyChallenge = (date = todayKey()): { challenge: Challenge; world: World; mission: Mission } => {
  const index = Math.abs(date.split("").reduce((value, char) => value * 31 + char.charCodeAt(0), 7)) % allChallenges.length;
  const challenge = allChallenges[index];
  for (const world of worlds) {
    const mission = world.missions.find((item) => item.challenges.some((question) => question.id === challenge.id));
    if (mission) return { challenge, world, mission };
  }
  return { challenge: allChallenges[0], world: worlds[0], mission: worlds[0].missions[0] };
};

const iconByScreen = {
  home: Home, map: Map, missions: BookOpen, skills: Activity, achievements: Trophy,
  mistakes: Bug, profile: Target, settings: Settings,
};

function answerChoices(challenge: Challenge): string[] {
  if (challenge.options) return challenge.options;
  if (challenge.type === "debugging") {
    return [challenge.answer, "The condition is always false", "The value is declared with const"];
  }
  return [];
}

function normalized(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function challengeForRun(run: RunProgress): Challenge | undefined {
  if (run.mode === "daily" || run.mode === "practice") return run.challengeId ? getChallenge(run.challengeId) : dailyChallenge().challenge;
  if (run.mode === "boss") {
    const world = worlds.find((item) => item.id === run.worldId);
    return world?.missions.flatMap((mission) => mission.challenges)[run.challengeIndex];
  }
  const mission = worlds.flatMap((world) => world.missions).find((item) => item.id === run.missionId);
  return mission?.challenges[run.challengeIndex];
}

function comboMultiplier(combo: number): number {
  if (combo >= 5) return 3;
  if (combo === 4) return 2;
  if (combo === 3) return 1.5;
  if (combo === 2) return 1.2;
  return 1;
}

function playTone(enabled: boolean, correct: boolean): void {
  if (!enabled || typeof window.AudioContext === "undefined") return;
  try {
    const context = new window.AudioContext();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = correct ? 660 : 210;
    gain.gain.setValueAtTime(0.045, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.12);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.12);
    window.setTimeout(() => void context.close(), 180);
  } catch {
    // Audio is an optional enhancement and must not interrupt gameplay.
  }
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

function App() {
  const [initialGame] = useState(() => loadGame());
  const [storageWorks] = useState(() => storageAvailable());
  const [game, setGame] = useState<GameState>(initialGame);
  const [screen, setScreen] = useState<Screen>(() => (initialGame.run ? "challenge" : "home"));
  const [selectedWorldId, setSelectedWorldId] = useState(worlds[0].id);
  const [levelUp, setLevelUp] = useState<number | null>(null);
  const [newAchievement, setNewAchievement] = useState<string | null>(null);
  const [hiddenBugId, setHiddenBugId] = useState<string | null>(null);
  const [bugAnswer, setBugAnswer] = useState("");
  const [bugFeedback, setBugFeedback] = useState<"correct" | "incorrect" | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const previousLevel = useRef(game.level);
  const previousAchievements = useRef(game.achievements.join("|"));

  useEffect(() => {
    if (game.saveExists) saveGame(game);
  }, [game]);

  useEffect(() => {
    if (game.level > previousLevel.current) setLevelUp(game.level);
    previousLevel.current = game.level;
  }, [game.level]);

  useEffect(() => {
    const previous = new Set(previousAchievements.current.split("|").filter(Boolean));
    const justUnlocked = game.achievements.find((id) => !previous.has(id));
    if (justUnlocked) {
      setNewAchievement(justUnlocked);
      window.setTimeout(() => setNewAchievement(null), 3500);
    }
    previousAchievements.current = game.achievements.join("|");
  }, [game.achievements]);

  const unlockedWorldIds = useMemo(() => new Set([worlds[0].id, ...game.defeatedBosses.map((id) => {
    const index = worlds.findIndex((world) => world.id === id);
    return worlds[index + 1]?.id;
  }).filter((id): id is string => Boolean(id))]), [game.defeatedBosses]);

  const currentWorld = worlds.find((world) => world.id === selectedWorldId) ?? worlds[0];
  const activeRun = game.run;
  const activeWorld = activeRun ? worlds.find((world) => world.id === activeRun.worldId) ?? worlds[0] : worlds[0];
  const currentChallenge = activeRun ? challengeForRun(activeRun) : undefined;
  const currentMission = activeRun ? activeWorld.missions.find((mission) => mission.id === activeRun.missionId) : undefined;
  const activeRunSucceeded = Boolean(activeRun && activeRun.energy > 0 &&
    !(activeRun.mode === "boss" && activeRun.bossHp > 0) &&
    !(activeRun.mode === "daily" && activeRun.dateKey !== todayKey()));

  function updateGame(updater: (current: GameState) => GameState): void {
    setGame((current) => ({ ...updater(current), saveExists: true }));
  }

  function toggleTheme(): void {
    updateGame((current) => ({
      ...current,
      settings: { ...current.settings, theme: current.settings.theme === "dark" ? "light" : "dark" },
    }));
  }

  function beginRun(world: World, mission: Mission, mode: RunProgress["mode"] = "mission", challengeId?: string): void {
    if (mode === "daily" && game.dailyComplete && game.dailyDate === todayKey()) return;
    const today = todayKey();
    const nextStreak = game.lastPlayedDate === today ? game.streak : game.lastPlayedDate === new Date(Date.now() - 86400000).toLocaleDateString("en-CA") ? game.streak + 1 : 1;
    updateGame((current) => ({
      ...current,
      streak: nextStreak,
      lastPlayedDate: today,
      combo: 0,
      run: makeRun(world.id, mission.id, mode, challengeId, mode === "daily" ? today : undefined),
    }));
    setScreen("challenge");
  }

  function startDaily(): void {
    const daily = dailyChallenge();
    beginRun(daily.world, daily.mission, "daily", daily.challenge.id);
  }

  function selectAnswer(value: string): void {
    if (!activeRun || !currentChallenge || activeRun.feedback) return;
    const correct = normalized(value) === normalized(currentChallenge.answer);
    const currentCombo = correct ? activeRun.combo + 1 : 0;
    const multiplier = comboMultiplier(currentCombo);
    const dailyAlreadyComplete = game.dailyComplete && game.dailyDate === todayKey();
    const dailyRunToday = activeRun.mode === "daily" && activeRun.dateKey === todayKey();
    const reward = activeRun.mode === "daily"
      ? (correct && dailyRunToday && !dailyAlreadyComplete ? 100 : 0)
      : correct && !game.completedChallenges.includes(currentChallenge.id)
        ? Math.round(currentChallenge.xp * (activeRun.hints > 0 ? 0.75 : 1) * multiplier)
        : 0;
    const coinReward = activeRun.mode === "daily"
      ? (correct && dailyRunToday && !dailyAlreadyComplete ? 50 : 0)
      : correct && !game.completedChallenges.includes(currentChallenge.id)
        ? ({ Easy: 10, Medium: 20, Hard: 30 }[currentChallenge.difficulty])
        : 0;

    updateGame((current) => {
      const run = current.run;
      if (!run || run.feedback) return current;
      const mistake = !correct ? {
        id: `${currentChallenge.id}-${Date.now()}`,
        challengeId: currentChallenge.id,
        worldId: run.worldId,
        missionId: run.missionId,
        question: currentChallenge.question,
        topic: currentChallenge.topic,
        playerAnswer: value || "No answer",
        correctAnswer: currentChallenge.answer,
        explanation: currentChallenge.explanation,
      } : null;
      let next: GameState = {
        ...current,
        dailyComplete: current.dailyComplete || activeRun.mode === "daily" && dailyRunToday && correct,
        dailyDate: activeRun.mode === "daily" && dailyRunToday && correct ? todayKey() : current.dailyDate,
        combo: currentCombo,
        bestCombo: Math.max(current.bestCombo, currentCombo),
        answersSubmitted: current.answersSubmitted + 1,
        correctAnswers: current.correctAnswers + (correct ? 1 : 0),
        completedChallenges: correct ? [...new Set([...current.completedChallenges, currentChallenge.id])] : current.completedChallenges,
        mistakes: mistake ? [...current.mistakes, mistake] : current.mistakes,
        coins: current.coins + coinReward,
        run: {
          ...run,
          answers: run.answers + 1,
          correct: run.correct + (correct ? 1 : 0),
          combo: currentCombo,
          bestCombo: Math.max(run.bestCombo, currentCombo),
          energy: correct || run.mode === "daily" ? run.energy : Math.max(0, run.energy - 1),
          bossHp: run.mode === "boss" && correct ? Math.max(0, run.bossHp - 34) : run.bossHp,
          feedback: correct ? "correct" : "incorrect",
          selectedAnswer: value,
          awardedCoins: run.awardedCoins + coinReward,
        },
      };
      if (reward > 0) {
        next = addXp(next, reward);
        next.run = { ...next.run!, awardedXp: next.run!.awardedXp + reward };
      }
      return updateAchievements(next);
    });
    playTone(game.settings.sound, correct);
  }

  function useHint(): void {
    if (!activeRun || !currentChallenge || activeRun.feedback || activeRun.currentHint >= 2) return;
    updateGame((current) => current.run ? ({
      ...current,
      run: current.run.currentHint >= 2 ? current.run : { ...current.run, currentHint: current.run.currentHint + 1, hints: current.run.hints + 1 },
    }) : current);
  }

  function continueChallenge(): void {
    if (!activeRun || !currentChallenge) return;
    const outOfEnergy = activeRun.energy <= 0;
    const staleDaily = activeRun.mode === "daily" && activeRun.dateKey !== todayKey();
    if (activeRun.mode === "daily" && activeRun.feedback === "incorrect" && !outOfEnergy && !staleDaily) {
      updateGame((current) => current.run ? ({
        ...current,
        run: { ...current.run, feedback: null, selectedAnswer: "", currentHint: 0 },
      }) : current);
      return;
    }
    const atEnd = activeRun.challengeIndex >= (activeRun.mode === "mission" ? (currentMission?.challenges.length ?? 0) - 1 : activeRun.mode === "boss" ? 4 : 0);
    const bossWon = activeRun.mode === "boss" && activeRun.bossHp <= 0;
    const missionWon = activeRun.mode === "mission" && !outOfEnergy && atEnd;
    const dailyWon = activeRun.mode === "daily" && !outOfEnergy && atEnd && activeRun.feedback === "correct" && !staleDaily;
    if (outOfEnergy || atEnd || bossWon || staleDaily) {
      updateGame((current) => {
        let next = current;
        const run = current.run;
        if (!run) return current;
        if (missionWon) {
          if (!current.completedMissions.includes(run.missionId)) {
            next = addXp(next, 100);
            next = { ...next, coins: next.coins + 50, completedMissions: [...next.completedMissions, run.missionId] };
            next.run = { ...run, awardedXp: run.awardedXp + 100, awardedCoins: run.awardedCoins + 50 };
          }
          if (run.answers > 0 && run.correct === run.answers) next.achievements = [...new Set([...next.achievements, "perfect-run"])];
        }
        if (bossWon && !current.defeatedBosses.includes(run.worldId)) {
          next = addXp(next, 250);
          next = { ...next, coins: next.coins + 100, defeatedBosses: [...next.defeatedBosses, run.worldId] };
          next.run = { ...run, awardedXp: run.awardedXp + 250, awardedCoins: run.awardedCoins + 100 };
        }
        if (dailyWon && !(current.dailyComplete && current.dailyDate === todayKey())) {
          next = {
            ...next, dailyComplete: true, dailyDate: todayKey(),
            achievements: [...new Set([...next.achievements, "daily-streak"])],
          };
        }
        return updateAchievements(next);
      });
      setScreen("results");
      return;
    }
    updateGame((current) => current.run ? ({
      ...current,
      run: { ...current.run, challengeIndex: current.run.challengeIndex + 1, feedback: null, selectedAnswer: "", currentHint: 0 },
    }) : current);
  }

  function retryRun(): void {
    if (!activeRun) return;
    if (activeRun.mode === "daily") {
      startDaily();
      return;
    }
    const mode = activeRun.mode;
    const world = worlds.find((item) => item.id === activeRun.worldId) ?? worlds[0];
    const mission = world.missions.find((item) => item.id === activeRun.missionId) ?? world.missions[0];
    beginRun(world, mission, mode, activeRun.challengeId);
  }

  function finishRun(): void {
    updateGame((current) => ({ ...current, run: null }));
    setScreen("map");
  }

  function goTo(next: Screen): void {
    setScreen(next);
    setMobileMenuOpen(false);
  }

  function practice(mistakeId: string): void {
    const mistake = game.mistakes.find((item) => item.id === mistakeId);
    const source = mistake ? getChallenge(mistake.challengeId) : undefined;
    const world = worlds.find((item) => item.id === mistake?.worldId);
    const mission = world?.missions.find((item) => item.id === mistake?.missionId);
    if (!source || !world || !mission) return;
    beginRun(world, mission, "practice", source.id);
  }

  function openBug(id: string): void {
    setHiddenBugId(id);
    setBugAnswer("");
    setBugFeedback(null);
  }

  function submitBug(): void {
    const bug = hiddenBugChallenges.find((item) => item.id === hiddenBugId);
    if (!bug || bugFeedback) return;
    const isCorrect = normalized(bugAnswer) === normalized(bug.answer);
    setBugFeedback(isCorrect ? "correct" : "incorrect");
  }

  function collectBug(): void {
    if (!hiddenBugId || game.collectedBugs.includes(hiddenBugId)) {
      setHiddenBugId(null);
      return;
    }
    updateGame((current) => current.collectedBugs.includes(hiddenBugId) ? current : updateAchievements({
      ...current,
      collectedBugs: [...current.collectedBugs, hiddenBugId],
      completedChallenges: [...new Set([...current.completedChallenges, hiddenBugId])],
      coins: current.coins + 25,
    }));
    setHiddenBugId(null);
  }

  const accuracy = game.answersSubmitted ? Math.round(game.correctAnswers / game.answersSubmitted * 100) : 0;
  const activeProgress = activeRun && currentChallenge
    ? Math.round((activeRun.challengeIndex / (activeRun.mode === "boss" ? 5 : activeRun.mode === "daily" ? 1 : currentMission?.challenges.length ?? 1)) * 100)
    : 0;
  const navItems: Array<{ id: Screen; label: string }> = [
    { id: "home", label: "Home" }, { id: "map", label: "World Map" }, { id: "missions", label: "Missions" },
    { id: "skills", label: "Skills" }, { id: "achievements", label: "Achievements" },
    { id: "mistakes", label: "Mistakes" }, { id: "profile", label: "Profile" },
  ];

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        if (hiddenBugId) setHiddenBugId(null);
        else if (levelUp !== null) setLevelUp(null);
        else if (mobileMenuOpen) setMobileMenuOpen(false);
      }
      if (event.key === "Enter" && screen === "challenge" && activeRun && currentChallenge && !(event.target instanceof HTMLInputElement)) {
        event.preventDefault();
        if (activeRun.feedback) continueChallenge();
        else if (activeRun.selectedAnswer) selectAnswer(activeRun.selectedAnswer);
      }
      if (event.key.toLowerCase() === "p" && screen === "challenge" && activeRun && !(event.target instanceof HTMLInputElement)) setScreen("home");
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  return (
    <div className={`app-shell ${game.settings.animations ? "" : "no-animations"}`} data-theme={game.settings.theme}>
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <aside className={`sidebar ${mobileMenuOpen ? "sidebar-open" : ""}`}>
        <button className="brand" onClick={() => goTo("home")} aria-label="CodeQuest home">
          <span className="brand-mark"><Code2 size={20} /></span>
          <span>code<span>quest</span><small>LEARN • PLAY • LEVEL UP</small></span>
        </button>
        <div className="nav-caption">YOUR ADVENTURE</div>
        <nav aria-label="Main navigation">
          {navItems.map(({ id, label }) => {
            const Icon = iconByScreen[id as keyof typeof iconByScreen];
            return (
              <button key={id} className={`nav-item ${screen === id ? "nav-active" : ""}`} aria-label={label} onClick={() => goTo(id)}>
                <Icon size={17} strokeWidth={1.8} /><span>{label}</span>
                {id === "mistakes" && game.mistakes.length > 0 && <span className="nav-count">{game.mistakes.length}</span>}
                {screen === id && <span className="nav-indicator" />}
              </button>
            );
          })}
        </nav>
        <div className="sidebar-spacer" />
        <div className="sidebar-quest">
          <div className="quest-sigil">BYTE <Sparkles size={13} /></div>
          <p>Every bug is a clue. Keep exploring.</p>
          <button onClick={() => goTo("map")}>View your map <ArrowRight size={14} /></button>
        </div>
        <div className="sidebar-profile">
          <div className="avatar">CE</div>
          <div className="sidebar-player"><strong>{game.playerName}</strong><span>LEVEL {game.level} EXPLORER</span></div>
          <button className="icon-button" aria-label="Open settings" onClick={() => goTo("settings")}><Settings size={16} /></button>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <button className="mobile-menu-trigger icon-button" aria-label="Toggle navigation" onClick={() => setMobileMenuOpen((open) => !open)}>
            <Menu size={20} />
          </button>
          <div className="breadcrumb"><span>CODEQUEST</span><ChevronRight size={14} /><strong>{screen.replace("-", " ")}</strong></div>
          <div className="topbar-right">
            <div className="top-level"><span className="top-level-mark"><Zap size={13} /></span><span>LVL {game.level}</span></div>
            <div className="coin-pill"><Coins size={15} /> {formatNumber(game.coins)}</div>
            <button className="theme-toggle icon-button" onClick={toggleTheme} aria-label={`Switch to ${game.settings.theme === "dark" ? "light" : "dark"} mode`} title={`Switch to ${game.settings.theme === "dark" ? "light" : "dark"} mode`}>
              {game.settings.theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
            </button>
            <button className="top-avatar" onClick={() => goTo("profile")} aria-label="Open player profile">CE</button>
          </div>
        </header>

        {screen === "home" && (
          <div className="page home-page">
            <section className="hero-panel">
              <div className="hero-copy">
                <div className="eyebrow"><span className="eyebrow-dot" /> YOUR NEXT ADVENTURE AWAITS</div>
                <h1>Master the code.<br /><span>Defeat the bugs.</span></h1>
                <p>You are a Code Explorer. The digital world is infected with bugs. Learn, debug, and restore the Code Core.</p>
                <div className="hero-actions">
                  <button className="button button-primary" onClick={() => game.run ? goTo("challenge") : goTo("map")}>
                    {game.completedMissions.length || game.run ? <><Play size={16} fill="currentColor" /> CONTINUE QUEST</> : <><Compass size={17} /> START QUEST</>}
                    <ArrowRight size={16} />
                  </button>
                  {game.saveExists && game.run && <span className="resume-note"><span /> JOURNEY SAVED</span>}
                </div>
                <div className="hero-stats">
                  <div><strong>{game.completedMissions.length}<small>/21</small></strong><span>MISSIONS CLEARED</span></div>
                  <div><strong>{game.defeatedBosses.length}<small>/7</small></strong><span>WORLDS RESTORED</span></div>
                  <div><strong>{game.level}</strong><span>EXPLORER LEVEL</span></div>
                </div>
              </div>
              <div className="hero-art" aria-label="A glowing digital portal">
                <div className="portal-orbit orbit-a" /><div className="portal-orbit orbit-b" />
                <div className="portal-core"><Code2 size={56} strokeWidth={1.2} /></div>
                <span className="float-code code-one">{"{ }"}</span><span className="float-code code-two">01</span><span className="float-code code-three">;</span>
                <div className="portal-label"><span className="live-dot" /> CODE CORE <small>AWAITING RESTORATION</small></div>
              </div>
            </section>

            <section className="home-grid">
              <article className="daily-card">
                <div className="card-topline"><span className="card-kicker"><Zap size={14} /> DAILY SIGNAL</span><span className="today-date">{new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span></div>
                <div className="daily-graphic"><div className="daily-orbit"><Code2 size={24} /></div><span className="daily-star star-a">✦</span><span className="daily-star star-b">✧</span></div>
                <h2>One quick challenge.<br />A brighter streak.</h2>
                <p>Complete today's code challenge and earn bonus rewards.</p>
                <div className="daily-reward"><span><Zap size={13} /> +100 XP</span><span><Coins size={14} /> +50 COINS</span></div>
                <button className="button button-outline daily-button" disabled={game.dailyComplete && game.dailyDate === todayKey()} onClick={startDaily}>
                  {game.dailyComplete && game.dailyDate === todayKey() ? <><Check size={15} /> COMPLETED TODAY</> : <>TAKE THE CHALLENGE <ArrowRight size={15} /></>}
                </button>
              </article>

              <article className="progress-card panel">
                <div className="section-heading"><div><span className="card-kicker">YOUR PROGRESS</span><h2>Explorer status</h2></div><button className="text-link" onClick={() => goTo("profile")}>VIEW PROFILE <ArrowRight size={14} /></button></div>
                <div className="level-display">
                  <div className="level-badge"><span>LVL</span><strong>{game.level}</strong></div>
                  <div className="level-info"><div><strong>{game.playerName}</strong><span>CODE EXPLORER</span></div><strong className="xp-amount">{formatNumber(game.xp)} <small>/ {formatNumber(xpForNextLevel(game.level))} XP</small></strong><div className="progress-track"><span style={{ width: `${Math.min(100, game.xp / xpForNextLevel(game.level) * 100)}%` }} /></div></div>
                </div>
                <div className="quick-stats">
                  <div><span className="stat-icon green"><Target size={15} /></span><strong>{game.completedChallenges.length}</strong><small>CHALLENGES</small></div>
                  <div><span className="stat-icon purple"><Award size={15} /></span><strong>{game.achievements.length}</strong><small>ACHIEVEMENTS</small></div>
                  <div><span className="stat-icon orange"><Flame size={15} /></span><strong>{game.streak}</strong><small>DAY STREAK</small></div>
                  <div><span className="stat-icon blue"><CheckCircle2 size={15} /></span><strong>{accuracy}%</strong><small>ACCURACY</small></div>
                </div>
              </article>

              <article className="continue-card panel">
                <div className="section-heading"><div><span className="card-kicker">PICK UP WHERE YOU LEFT OFF</span><h2>{activeRun ? currentMission?.name ?? "Your adventure" : "The frontier is open"}</h2></div><div className="continue-icon"><Compass size={19} /></div></div>
                <p>{activeRun ? `${activeWorld.name} · ${activeRun.mode === "boss" ? `${activeWorld.boss} encounter` : activeRun.mode === "daily" ? "Daily Signal" : `Challenge ${activeRun.challengeIndex + 1} of ${currentMission?.challenges.length ?? 3}`}` : "Your first world is waiting. Learn the fundamentals and bring the valley back to life."}</p>
                <div className="continue-bottom"><div className="mini-worlds">{worlds.slice(0, 4).map((world) => <span key={world.id} className={unlockedWorldIds.has(world.id) ? "mini-unlocked" : ""}>{world.icon}</span>)}</div><button className="text-link" onClick={() => activeRun ? goTo("challenge") : goTo("map")}>{activeRun ? "RESUME" : "EXPLORE MAP"} <ArrowRight size={14} /></button></div>
              </article>
            </section>

            <div className="home-footer-note"><span className="live-dot" /> THE CODE CORE IS STABLE <span className="footer-divider" /> <span>BUILT FOR CURIOUS MINDS</span></div>
          </div>
        )}

        {screen === "map" && (
          <div className="page map-page">
            <div className="page-title-row"><div><div className="eyebrow"><span className="eyebrow-dot" /> THE DIGITAL FRONTIER</div><h1>World map</h1><p>Seven corrupted regions. One explorer. Where will you begin?</p></div><div className="worlds-counter"><span>{game.defeatedBosses.length.toString().padStart(2, "0")}</span><small>/{worlds.length} WORLDS<br />RESTORED</small></div></div>
            <div className="map-layout">
              <div className="world-route">
                <div className="route-line" />
                {worlds.map((world, index) => {
                  const unlocked = unlockedWorldIds.has(world.id);
                  const completed = game.defeatedBosses.includes(world.id);
                  const progress = Math.round(world.missions.filter((mission) => game.completedMissions.includes(mission.id)).length / world.missions.length * 100);
                  return (
                    <article key={world.id} className={`world-node-card ${unlocked ? "" : "world-locked"} ${completed ? "world-complete" : ""} ${index % 2 ? "route-right" : ""}`} style={{ "--world-accent": world.accent } as React.CSSProperties}>
                      <div className="route-node">{completed ? <Check size={17} /> : unlocked ? world.icon : <Lock size={15} />}</div>
                      <button className="world-card panel" disabled={!unlocked} onClick={() => { setSelectedWorldId(world.id); goTo("missions"); }}>
                        <div className="world-card-top"><span className="world-symbol">{world.icon}</span><div><span className="card-kicker">WORLD {String(index + 1).padStart(2, "0")}</span><h2>{world.name}</h2><p>{world.subtitle}</p></div><span className={`world-state ${completed ? "state-complete" : unlocked ? "state-open" : ""}`}>{completed ? "RESTORED" : unlocked ? "UNLOCKED" : "LOCKED"}</span></div>
                        <div className="world-card-bottom"><div className="world-progress"><div className="progress-track"><span style={{ width: `${completed ? 100 : progress}%` }} /></div><small>{completed ? "WORLD COMPLETE" : `${progress}% MISSION PROGRESS`}</small></div><span className="world-enter">{unlocked ? "ENTER" : <><Lock size={12} /> COMPLETE PREVIOUS WORLD</>}<ArrowRight size={14} /></span></div>
                      </button>
                    </article>
                  );
                })}
              </div>
              <aside className="map-aside">
                <article className="panel map-info-card">
                  <span className="card-kicker">MISSION CONTROL</span><h2>Choose your next move.</h2><p>Complete all three missions in a world to face its coding boss. Defeat the boss to unlock the next region.</p>
                  <div className="map-legend"><span><i className="legend-dot legend-green" /> Available</span><span><i className="legend-dot legend-lock" /> Locked</span><span><i className="legend-dot legend-done" /> Restored</span></div>
                  <button className="button button-primary map-continue" onClick={() => {
                    const target = worlds.find((world) => unlockedWorldIds.has(world.id) &&
                      (world.missions.some((mission) => !game.completedMissions.includes(mission.id)) || !game.defeatedBosses.includes(world.id))) ?? worlds[worlds.length - 1];
                    setSelectedWorldId(target.id); goTo("missions");
                  }}>VIEW MISSIONS <ArrowRight size={15} /></button>
                </article>
                <article className="panel hidden-bugs-card"><div className="hidden-bugs-heading"><Bug size={16} /><span className="card-kicker">HIDDEN BUGS</span></div><p>Little glitches are hiding across the map. Find them for bonus coins.</p><div className="bug-hunt-list">{hiddenBugChallenges.map((bug, index) => {
                  const found = game.collectedBugs.includes(bug.id);
                  return <button key={bug.id} disabled={found} aria-label={found ? `Hidden bug ${index + 1} found` : `Investigate hidden bug ${index + 1}`} onClick={() => openBug(bug.id)} className={found ? "bug-found" : ""}><span>{found ? <Check size={14} /> : <Bug size={14} />}</span>{found ? "GLITCH CONTAINED" : `ANOMALY 0${index + 1}`}<small>{found ? "+25" : "?"}</small></button>;
                })}</div></article>
              </aside>
            </div>
          </div>
        )}

        {screen === "missions" && (
          <div className="page missions-page">
            <button className="back-link" onClick={() => goTo("map")}><ArrowLeft size={15} /> BACK TO WORLD MAP</button>
            <div className="world-banner" style={{ "--world-accent": currentWorld.accent } as React.CSSProperties}>
              <div className="world-banner-symbol">{currentWorld.icon}</div><div><span className="card-kicker">WORLD {String(worlds.indexOf(currentWorld) + 1).padStart(2, "0")} · {currentWorld.topic.toUpperCase()}</span><h1>{currentWorld.name}</h1><p>{currentWorld.description}</p></div><div className="banner-progress"><span>{currentWorld.missions.filter((mission) => game.completedMissions.includes(mission.id)).length}<small> / 3</small></span><small>MISSIONS CLEARED</small></div>
            </div>
            <div className="mission-section-heading"><div><span className="card-kicker">THE QUESTLINE</span><h2>Choose a mission</h2></div><div className="boss-gate"><Shield size={15} /><span>FINAL ENCOUNTER</span><strong>{currentWorld.boss}</strong></div></div>
            <div className="mission-list">
              {currentWorld.missions.map((mission, index) => {
                const completed = game.completedMissions.includes(mission.id);
                const locked = index > 0 && !game.completedMissions.includes(currentWorld.missions[index - 1].id);
                const completeBoss = currentWorld.missions.every((item) => game.completedMissions.includes(item.id));
                return (
                  <article key={mission.id} className={`mission-card panel ${completed ? "mission-done" : ""} ${locked ? "mission-locked" : ""}`}>
                    <div className="mission-number">{completed ? <Check size={18} /> : `0${index + 1}`}</div>
                    <div className="mission-copy"><div className="mission-tags"><span>{mission.difficulty.toUpperCase()}</span><span>{mission.topic.toUpperCase()}</span></div><h3>{mission.name}</h3><p>{mission.description}</p></div>
                    <div className="mission-meta"><span><Code2 size={14} /> {mission.challenges.length} CHALLENGES</span><span><Zap size={14} /> +{mission.xp} XP BONUS</span></div>
                    <button className={`button ${completed ? "button-complete" : "button-outline"}`} disabled={locked} onClick={() => beginRun(currentWorld, mission)}>{locked ? <><Lock size={14} /> LOCKED</> : completed ? <><RotateCcw size={14} /> REPLAY</> : <>START MISSION <ArrowRight size={14} /></>}</button>
                    {locked && <span className="mission-lock-note">Complete the previous mission first</span>}
                    {completeBoss && index === 2 && !game.defeatedBosses.includes(currentWorld.id) && (
                      <button className="boss-launch button button-boss" onClick={() => beginRun(currentWorld, currentWorld.missions[0], "boss")}><Bug size={15} /> CHALLENGE {currentWorld.boss} <ArrowRight size={14} /></button>
                    )}
                    {game.defeatedBosses.includes(currentWorld.id) && index === 2 && <span className="boss-victory"><Crown size={14} /> {currentWorld.boss} DEFEATED</span>}
                  </article>
                );
              })}
            </div>
          </div>
        )}

        {screen === "challenge" && activeRun && currentChallenge && (
          <div className="page challenge-page">
            <div className="challenge-topline"><button className="back-link" onClick={() => goTo(activeRun.mode === "daily" ? "home" : "missions")}><ArrowLeft size={15} /> EXIT {activeRun.mode === "daily" ? "CHALLENGE" : activeRun.mode === "practice" ? "PRACTICE" : "MISSION"}</button><div className="run-context">{activeRun.mode === "boss" ? <><Bug size={15} /> BOSS BATTLE</> : activeRun.mode === "daily" ? <><Zap size={15} /> DAILY SIGNAL</> : activeRun.mode === "practice" ? <><BookOpen size={15} /> MISTAKE PRACTICE</> : <><Compass size={15} /> {activeWorld.name.toUpperCase()}</>}</div><button className="icon-button" aria-label="Pause and return to home" onClick={() => goTo("home")}><Pause size={16} /></button></div>
            <div className="run-hud panel">
              <div className="hud-player"><div className="avatar avatar-small">CE</div><div><strong>LVL {game.level}</strong><small>CODE EXPLORER</small></div></div>
              <div className="hud-mission"><strong>{activeRun.mode === "boss" ? activeWorld.boss : activeRun.mode === "daily" ? "Daily Code" : activeRun.mode === "practice" ? "Mistake Practice" : currentMission?.name}</strong><div className="hud-progress"><span style={{ width: `${activeRun.mode === "boss" ? Math.min(100, activeRun.challengeIndex / 5 * 100) : Math.min(100, activeProgress + 100 / (activeRun.mode === "mission" ? currentMission?.challenges.length ?? 3 : 1))}%` }} /></div><small>CHALLENGE {activeRun.challengeIndex + 1} / {activeRun.mode === "boss" ? 5 : activeRun.mode === "daily" || activeRun.mode === "practice" ? 1 : currentMission?.challenges.length}</small></div>
              <div className="hud-rewards"><span><Zap size={14} /> {formatNumber(game.xp)} XP</span><span><Coins size={14} /> {formatNumber(game.coins)}</span></div>
            </div>

            {activeRun.mode === "boss" && <div className="boss-health panel"><div className="boss-face"><Bug size={22} /></div><div className="boss-health-info"><div><span className="card-kicker">CORRUPTED ENTITY</span><strong>{activeWorld.boss}</strong></div><span className="boss-hp-label">{activeRun.bossHp} <small>HP</small></span><div className="boss-health-track"><span style={{ width: `${activeRun.bossHp}%` }} /></div></div><div className="boss-energy"><span className="card-kicker">ENERGY</span><div>{[0, 1, 2].map((life) => <span key={life} className={life < activeRun.energy ? "energy-on" : ""}>♥</span>)}</div></div></div>}
            {activeRun.mode !== "daily" && <div className="energy-row"><span><Battery size={14} /> ENERGY</span>{[0, 1, 2].map((life) => <span key={life} className={`heart ${life < activeRun.energy ? "heart-on" : ""}`}>♥</span>)}<span className="combo-label">{activeRun.combo >= 2 && <><Flame size={14} /> {activeRun.combo} COMBO · ×{comboMultiplier(activeRun.combo)}</>}</span></div>}

            <div className="challenge-grid">
              <section className="challenge-card panel">
                <div className="challenge-label"><span className="challenge-type-pill">{currentChallenge.type === "choice" ? "MULTIPLE CHOICE" : currentChallenge.type === "output" ? "OUTPUT PREDICTION" : currentChallenge.type === "completion" ? "CODE COMPLETION" : "DEBUGGING"}</span><span className={`difficulty difficulty-${currentChallenge.difficulty.toLowerCase()}`}>{currentChallenge.difficulty}</span></div>
                <h1>{currentChallenge.title}</h1><p className="challenge-question">{currentChallenge.question}</p>
                {currentChallenge.code && <pre className="code-window"><span className="code-window-bar"><i /><i /><i /><small>challenge.js</small></span><code>{currentChallenge.code.split("\n").map((line, index) => <span key={index} className="code-line"><em>{String(index + 1).padStart(2, "0")}</em>{line || " "}</span>)}</code></pre>}
                {currentChallenge.type === "completion" ? (
                  <label className="completion-field"><span>YOUR CODE</span><input value={activeRun.selectedAnswer} disabled={Boolean(activeRun.feedback)} onChange={(event) => updateGame((current) => current.run ? ({ ...current, run: { ...current.run, selectedAnswer: event.target.value } }) : current)} onKeyDown={(event) => { if (event.key === "Enter" && !activeRun.feedback) selectAnswer(activeRun.selectedAnswer); }} placeholder="Type the missing code…" aria-label="Enter the missing code" /></label>
                ) : (
                  <div className="answer-list" role="group" aria-label="Answer options">
                    {answerChoices(currentChallenge).map((option, index) => {
                      const isSelected = activeRun.selectedAnswer === option;
                      const isAnswer = normalized(option) === normalized(currentChallenge.answer);
                      const stateClass = activeRun.feedback ? isAnswer ? "answer-correct" : isSelected ? "answer-wrong" : "" : "";
                      return <button key={`${option}-${index}`} className={`answer-option ${isSelected ? "answer-selected" : ""} ${stateClass}`} disabled={Boolean(activeRun.feedback)} onClick={() => updateGame((current) => current.run ? ({ ...current, run: { ...current.run, selectedAnswer: option } }) : current)}><span className="answer-letter">{String.fromCharCode(65 + index)}</span><span>{option}</span>{activeRun.feedback && isAnswer && <Check size={16} />}{activeRun.feedback && isSelected && !isAnswer && <X size={16} />}</button>;
                    })}
                  </div>
                )}

                {activeRun.feedback && (
                  <div className={`feedback-box ${activeRun.feedback}`}>
                    <div className="feedback-icon">{activeRun.feedback === "correct" ? <Check size={17} /> : <X size={17} />}</div>
                    <div><strong>{activeRun.feedback === "correct" ? "Correct! Nice work." : "Not quite. Keep going."}</strong><p>{activeRun.feedback === "correct" ? currentChallenge.explanation : `The correct answer is ${currentChallenge.answer}. ${currentChallenge.explanation}`}</p></div>
                  </div>
                )}
                {activeRun.currentHint > 0 && !activeRun.feedback && <div className="hint-box"><Lightbulb size={16} /><p>{activeRun.currentHint === 1 ? currentChallenge.hint : `Focus on ${currentChallenge.topic.toLowerCase()} and compare each value with the question.`}</p></div>}
                <div className="challenge-actions">
                  {!activeRun.feedback ? <><button className="button button-primary submit-button" disabled={!activeRun.selectedAnswer.trim()} onClick={() => selectAnswer(activeRun.selectedAnswer)}>SUBMIT ANSWER <ArrowRight size={15} /></button><button className="hint-button" disabled={activeRun.currentHint >= 2} onClick={useHint}><Lightbulb size={16} /> {activeRun.currentHint >= 2 ? "HINTS USED" : "GET A HINT"} <small>−25% XP</small></button></> : <button className="button button-primary submit-button" onClick={continueChallenge}>{activeRun.energy <= 0 ? "VIEW RESULTS" : activeRun.mode === "daily" && activeRun.feedback === "incorrect" ? "TRY AGAIN" : activeRun.mode === "boss" && activeRun.bossHp <= 0 ? "CLAIM VICTORY" : activeRun.mode === "daily" || activeRun.mode === "practice" || activeRun.mode === "mission" && activeRun.challengeIndex >= (currentMission?.challenges.length ?? 1) - 1 || activeRun.mode === "boss" && activeRun.challengeIndex >= 4 ? "VIEW RESULTS" : "CONTINUE"} <ArrowRight size={15} /></button>}
                  <div className="byte-bubble"><div className="byte-avatar"><span>▣</span><i /></div><span><strong>BYTE</strong><small>{activeRun.feedback === "correct" ? "That was clean code." : activeRun.feedback === "incorrect" ? "Take a breath. You can do this." : "Ready, Explorer? Let's debug this."}</small></span></div>
                </div>
              </section>
              <aside className="challenge-side">
                {activeRun.mode === "boss" ? <div className="boss-panel panel"><div className="boss-orb"><Bug size={27} /></div><span className="card-kicker">BOSS ENCOUNTER</span><h3>{activeWorld.boss}</h3><p>Crack the corrupted logic. Every correct answer weakens the signal.</p><div className="boss-objective"><Target size={15} /><span>LAND 3 CLEAN HITS TO DEFEAT THE BOSS</span></div></div> : <div className="side-mission panel"><span className="card-kicker">CURRENT OBJECTIVE</span><h3>{currentMission?.name ?? "Daily challenge"}</h3><p>{currentMission?.description ?? "One challenge. Bonus XP and coins."}</p><div className="side-divider" /><div className="side-meta"><span>TOPIC</span><strong>{currentChallenge.topic}</strong></div><div className="side-meta"><span>BASE REWARD</span><strong className="reward-green">+{activeRun.mode === "daily" ? "100" : currentChallenge.xp} XP</strong></div></div>}
                <div className="code-tip panel"><div className="tip-icon"><CircleHelp size={16} /></div><span className="card-kicker">EXPLORER TIP</span><p>{activeRun.currentHint ? "A hint reduces your XP reward a little, but every bug you fix makes you better." : "Read the code first, then choose your answer. There is no penalty for taking your time."}</p></div>
              </aside>
            </div>
          </div>
        )}

        {screen === "results" && activeRun && (
          <div className="page results-page">
            <div className={`results-emblem ${activeRunSucceeded ? "result-success" : "result-failed"}`}>{activeRunSucceeded ? <Trophy size={38} /> : <RotateCcw size={35} />}</div>
            <span className="eyebrow"><span className="eyebrow-dot" /> {activeRun.mode === "boss" ? "BOSS ENCOUNTER" : activeRun.mode === "daily" ? "DAILY SIGNAL" : "MISSION REPORT"}</span>
            <h1>{activeRun.mode === "daily" && activeRun.dateKey !== todayKey() ? "Daily challenge expired" : activeRun.energy <= 0 ? activeRun.mode === "daily" ? "Daily challenge failed" : "Mission failed" : activeRun.mode === "boss" ? activeRun.bossHp <= 0 ? "Boss defeated" : "Boss held its ground" : activeRun.mode === "daily" ? "Signal restored" : activeRun.mode === "practice" ? "Practice complete" : "Mission complete"}</h1>
            <p className="results-subtitle">{activeRun.mode === "daily" && activeRun.dateKey !== todayKey() ? "A new day has begun. Today's signal is ready from the home screen." : activeRun.energy <= 0 ? "Every mistake is a clue. Rest, review, and give it another go." : activeRun.mode === "boss" ? activeRun.bossHp <= 0 ? `${activeWorld.boss} is no more. The region is stable.` : `${activeWorld.boss} survived this round. Regroup and try again.` : "The Code Core is a little stronger thanks to you."}</p>
            <div className="results-card panel"><div className="results-card-heading"><span>{activeRun.mode === "boss" ? activeWorld.boss : activeRun.mode === "daily" ? "Daily Code" : currentMission?.name}</span><span className={activeRunSucceeded ? "result-tag" : "result-tag result-tag-fail"}>{activeRunSucceeded ? "COMPLETE" : "RETRY"}</span></div><div className="results-stats"><div><Zap size={16} /><strong>+{activeRun.awardedXp}</strong><small>XP EARNED</small></div><div><Coins size={16} /><strong>+{activeRun.awardedCoins}</strong><small>COINS EARNED</small></div><div><Target size={16} /><strong>{activeRun.answers ? Math.round(activeRun.correct / activeRun.answers * 100) : 0}%</strong><small>ACCURACY</small></div><div><Flame size={16} /><strong>{activeRun.bestCombo}×</strong><small>BEST COMBO</small></div></div><div className="results-footer-stats"><span><Check size={14} /> {activeRun.correct} CORRECT</span><span><X size={14} /> {activeRun.answers - activeRun.correct} WRONG</span><span><Lightbulb size={14} /> {activeRun.hints} HINTS USED</span></div></div>
            {game.achievements.length > 0 && <div className="result-achievement"><Award size={17} /><span><strong>ACHIEVEMENTS</strong><small>{game.achievements.length} unlocked so far</small></span><button className="text-link" onClick={() => goTo("achievements")}>VIEW <ArrowRight size={14} /></button></div>}
            <div className="results-actions">{activeRun.energy <= 0 || activeRun.mode === "boss" && activeRun.bossHp > 0 || activeRun.mode === "daily" && activeRun.dateKey !== todayKey() ? <button className="button button-primary" onClick={retryRun}><RotateCcw size={15} /> {activeRun.mode === "daily" && activeRun.dateKey !== todayKey() ? "TODAY'S CHALLENGE" : `RETRY ${activeRun.mode === "boss" ? "BOSS" : activeRun.mode === "daily" ? "DAILY CHALLENGE" : "MISSION"}`}</button> : <button className="button button-primary" onClick={finishRun}>CONTINUE <ArrowRight size={15} /></button>}<button className="button button-outline" onClick={() => { goTo("mistakes"); }}>REVIEW MISTAKES <Bug size={15} /></button><button className="text-link" onClick={finishRun}>RETURN TO MAP <Map size={14} /></button></div>
          </div>
        )}

        {screen === "profile" && (
          <div className="page profile-page"><div className="page-title-row"><div><div className="eyebrow"><span className="eyebrow-dot" /> YOUR JOURNEY SO FAR</div><h1>Explorer profile</h1><p>Every challenge makes you a stronger builder.</p></div></div>
            <section className="profile-hero panel"><div className="profile-avatar">CE<span><Star size={14} fill="currentColor" /></span></div><div className="profile-identity"><span className="card-kicker">CODE EXPLORER</span><h2>{game.playerName}</h2><p>On the path to becoming a Code Master.</p></div><div className="profile-level"><span>LEVEL</span><strong>{game.level}</strong></div><div className="profile-xp"><div><span>EXPERIENCE</span><strong>{formatNumber(game.xp)} / {formatNumber(xpForNextLevel(game.level))} XP</strong></div><div className="progress-track"><span style={{ width: `${Math.min(100, game.xp / xpForNextLevel(game.level) * 100)}%` }} /></div></div></section>
            <div className="profile-stat-grid">{[
              ["CHALLENGES COMPLETED", game.completedChallenges.length, <Code2 size={17} />],
              ["ACCURACY", `${accuracy}%`, <Target size={17} />], ["WORLDS UNLOCKED", unlockedWorldIds.size, <Map size={17} />],
              ["BOSSES DEFEATED", game.defeatedBosses.length, <Shield size={17} />], ["COINS COLLECTED", formatNumber(game.coins), <Coins size={17} />],
              ["CURRENT STREAK", `${game.streak} DAYS`, <Flame size={17} />],
            ].map(([label, value, icon]) => <article key={String(label)} className="panel profile-stat"><span>{icon}</span><strong>{value}</strong><small>{label}</small></article>)}</div>
            <div className="profile-lower"><article className="panel mastery-panel"><div className="section-heading"><div><span className="card-kicker">LEARNING PATH</span><h2>Skill mastery</h2></div><button className="text-link" onClick={() => goTo("skills")}>SKILL TREE <ArrowRight size={14} /></button></div>{worlds.slice(0, 6).map((world) => {
              const challenges = world.missions.flatMap((mission) => mission.challenges);
              const solved = challenges.filter((challenge) => game.completedChallenges.includes(challenge.id)).length;
              return <div className="mastery-row" key={world.id}><span>{world.icon}</span><div><strong>{world.topic}</strong><small>{solved}/{challenges.length} challenges cleared</small></div><div className="progress-track"><span style={{ width: `${solved / challenges.length * 100}%` }} /></div></div>;
            })}</article><article className="panel badge-panel"><span className="card-kicker">RECENT ACHIEVEMENTS</span><h2>Badges earned</h2>{game.achievements.length ? game.achievements.slice(-3).reverse().map((id) => {
              const achievement = achievements.find((item) => item.id === id);
              return achievement ? <div className="earned-badge" key={id}><span>{achievement.icon}</span><div><strong>{achievement.name}</strong><small>{achievement.description}</small></div></div> : null;
            }) : <div className="empty-badges"><Award size={23} /><span>Your first badge is waiting.</span></div>}</article></div>
          </div>
        )}

        {screen === "skills" && (
          <div className="page skills-page"><div className="page-title-row"><div><div className="eyebrow"><span className="eyebrow-dot" /> KNOWLEDGE MAP</div><h1>Skill tree</h1><p>Track the concepts you're learning on your journey.</p></div><div className="skills-summary"><Sparkles size={16} /> {worlds.slice(0, 6).filter((world) => world.missions.flatMap((mission) => mission.challenges).every((challenge) => game.completedChallenges.includes(challenge.id))).length} / 6 MASTERED</div></div>
            <div className="skill-tree">{worlds.slice(0, 6).map((world, index) => {
              const challengeList = world.missions.flatMap((mission) => mission.challenges);
              const solved = challengeList.filter((challenge) => game.completedChallenges.includes(challenge.id)).length;
              const state = solved === challengeList.length ? "mastered" : solved ? "in-progress" : unlockedWorldIds.has(world.id) ? "available" : "locked";
              return <article key={world.id} className={`skill-node panel skill-${state}`} style={{ "--world-accent": world.accent } as React.CSSProperties}><div className="skill-icon">{state === "locked" ? <Lock size={20} /> : world.icon}</div><div><span className={`skill-status status-${state}`}>{state.replace("-", " ").toUpperCase()}</span><h2>{world.topic}</h2><p>{world.subtitle}</p></div><div className="skill-node-bottom"><span>{solved}/{challengeList.length} CONCEPTS</span><div className="progress-track"><span style={{ width: `${solved / challengeList.length * 100}%` }} /></div><button className="text-link" onClick={() => { setSelectedWorldId(world.id); goTo(unlockedWorldIds.has(world.id) ? "missions" : "map"); }}>{state === "locked" ? "VIEW MAP" : "PRACTICE"} <ArrowRight size={13} /></button></div>{index < 5 && <div className="skill-connector" />}</article>;
            })}</div>
            <article className="skill-core panel"><div className="core-flare"><Code2 size={23} /></div><div><span className="card-kicker">THE ULTIMATE GOAL</span><h2>Algorithm Core</h2><p>Bring all six core skills together and restore the final region.</p></div><button className="button button-outline" onClick={() => { setSelectedWorldId("algorithms"); goTo(unlockedWorldIds.has("algorithms") ? "missions" : "map"); }}>{unlockedWorldIds.has("algorithms") ? "ENTER CORE" : "LOCKED"} <ArrowRight size={14} /></button></article>
          </div>
        )}

        {screen === "achievements" && (
          <div className="page achievements-page"><div className="page-title-row"><div><div className="eyebrow"><span className="eyebrow-dot" /> MILESTONES & MOMENTS</div><h1>Achievements</h1><p>Small wins are how great developers are made.</p></div><div className="achievement-count"><Trophy size={17} /> {game.achievements.length} <span>/ {achievements.length}</span></div></div>
            <div className="achievement-grid">{achievements.map((achievement, index) => {
              const unlocked = game.achievements.includes(achievement.id);
              return <article key={achievement.id} className={`achievement-card panel ${unlocked ? "achievement-unlocked" : "achievement-locked"}`}><div className="achievement-icon">{unlocked ? achievement.icon : <Lock size={21} />}</div><div className="achievement-info"><span className="card-kicker">{unlocked ? "UNLOCKED" : `MILESTONE 0${index + 1}`}</span><h2>{achievement.name}</h2><p>{achievement.description}</p></div><span className="achievement-check">{unlocked ? <CheckCircle2 size={18} /> : <Lock size={15} />}</span></article>;
            })}</div>
          </div>
        )}

        {screen === "mistakes" && (
          <div className="page mistakes-page"><div className="page-title-row"><div><div className="eyebrow"><span className="eyebrow-dot" /> EVERY BUG IS A CLUE</div><h1>Mistake review</h1><p>Revisit tricky questions and strengthen what you've learned.</p></div><div className="mistake-count"><Bug size={17} /> {game.mistakes.length} TO REVIEW</div></div>
            {game.mistakes.length === 0 ? <div className="empty-state panel"><div className="empty-state-icon"><CheckCircle2 size={31} /></div><span className="card-kicker">CLEAN RUN</span><h2>No bugs hiding here.</h2><p>Perfect run! Keep exploring to build your mistake library.</p><button className="button button-primary" onClick={() => goTo("map")}>EXPLORE WORLDS <ArrowRight size={15} /></button></div> : <div className="mistake-list">{[...game.mistakes].reverse().map((mistake) => <article key={mistake.id} className="mistake-card panel"><div className="mistake-mark"><Bug size={17} /></div><div className="mistake-copy"><div className="mission-tags"><span>{mistake.topic.toUpperCase()}</span><span>YOUR ANSWER: {mistake.playerAnswer}</span></div><h2>{mistake.question}</h2><div className="mistake-answer"><strong>Correct answer</strong><span>{mistake.correctAnswer}</span></div><p>{mistake.explanation}</p></div><button className="button button-outline" onClick={() => practice(mistake.id)}><RotateCcw size={14} /> PRACTICE</button></article>)}</div>}
          </div>
        )}

        {screen === "settings" && (
          <div className="page settings-page"><div className="page-title-row"><div><div className="eyebrow"><span className="eyebrow-dot" /> MAKE IT YOURS</div><h1>Settings</h1><p>A few controls to make your adventure feel right.</p></div></div><section className="settings-panel panel"><div className="setting-row"><div className="setting-icon"><Sun size={18} /></div><div><strong>Appearance</strong><p>Choose a light or dark look for your adventure.</p></div><button className="theme-choice" onClick={toggleTheme} aria-label={`Switch to ${game.settings.theme === "dark" ? "light" : "dark"} mode`}><span className={game.settings.theme === "dark" ? "theme-choice-active" : ""}><Moon size={14} /> Dark</span><span className={game.settings.theme === "light" ? "theme-choice-active" : ""}><Sun size={14} /> Light</span></button></div><div className="setting-row"><div className="setting-icon"><Volume2 size={18} /></div><div><strong>Sound effects</strong><p>Small, optional feedback tones. Off by default.</p></div><button className={`toggle ${game.settings.sound ? "toggle-on" : ""}`} role="switch" aria-checked={game.settings.sound} aria-label="Toggle sound effects" onClick={() => updateGame((current) => ({ ...current, settings: { ...current.settings, sound: !current.settings.sound } }))}><span /></button></div><div className="setting-row"><div className="setting-icon"><Sparkles size={18} /></div><div><strong>Animations</strong><p>Subtle transitions and movement throughout the game.</p></div><button className={`toggle ${game.settings.animations ? "toggle-on" : ""}`} role="switch" aria-checked={game.settings.animations} aria-label="Toggle animations" onClick={() => updateGame((current) => ({ ...current, settings: { ...current.settings, animations: !current.settings.animations } }))}><span /></button></div><div className="setting-row"><div className="setting-icon"><VolumeX size={18} /></div><div><strong>Progress storage</strong><p>{storageWorks ? "Your game is saved on this device in your browser." : "Browser storage is unavailable; progress lasts only for this session."}</p></div><span className={`storage-status ${storageWorks ? "" : "storage-unavailable"}`}><i /> {storageWorks ? game.saveExists ? "SAVED LOCALLY" : "NEW JOURNEY" : "UNAVAILABLE"}</span></div></section><div className="settings-note"><Shield size={16} /><p>CodeQuest works offline after install. Your progress stays on this device and is never sent to a server.</p></div></div>
        )}
      </main>

      <nav className="mobile-bottom-nav" aria-label="Mobile navigation">{(["home", "map", "missions", "profile"] as Screen[]).map((id) => {
        const Icon = iconByScreen[id as keyof typeof iconByScreen];
        return <button key={id} className={screen === id ? "mobile-nav-active" : ""} onClick={() => goTo(id)}><Icon size={18} /><span>{id === "map" ? "Map" : id}</span></button>;
      })}</nav>

      {levelUp !== null && <div className="modal-backdrop" role="presentation"><section className="level-modal panel" role="dialog" aria-modal="true" aria-labelledby="level-title"><button className="modal-close icon-button" aria-label="Close level up" onClick={() => setLevelUp(null)}><X size={18} /></button><div className="level-up-spark"><Zap size={29} fill="currentColor" /></div><span className="card-kicker">EXPERIENCE LEVEL UP</span><h2 id="level-title">LEVEL {levelUp}</h2><p>You're learning fast, Explorer. Keep that momentum going.</p><button className="button button-primary" onClick={() => setLevelUp(null)}>LET'S GO <ArrowRight size={15} /></button></section></div>}
      {newAchievement && <div className="achievement-toast"><span><Award size={17} /></span><div><small>ACHIEVEMENT UNLOCKED</small><strong>{achievements.find((item) => item.id === newAchievement)?.name}</strong></div><button className="icon-button" aria-label="Dismiss achievement notification" onClick={() => setNewAchievement(null)}><X size={15} /></button></div>}
      {hiddenBugId && <div className="modal-backdrop" role="presentation"><section className="bug-modal panel" role="dialog" aria-modal="true" aria-labelledby="bug-title"><button className="modal-close icon-button" aria-label="Close hidden bug" onClick={() => setHiddenBugId(null)}><X size={18} /></button><div className="bug-modal-icon"><Bug size={22} /></div><span className="card-kicker">HIDDEN GLITCH FOUND</span><h2 id="bug-title">{hiddenBugChallenges.find((item) => item.id === hiddenBugId)?.title}</h2><p>{hiddenBugChallenges.find((item) => item.id === hiddenBugId)?.question}</p><pre className="code-window bug-code"><code>{hiddenBugChallenges.find((item) => item.id === hiddenBugId)?.code}</code></pre>{bugFeedback ? <div className={`feedback-box ${bugFeedback}`}><div className="feedback-icon">{bugFeedback === "correct" ? <Check size={17} /> : <X size={17} />}</div><div><strong>{bugFeedback === "correct" ? "Glitch contained! +25 coins" : "Not quite — take another look."}</strong><p>{bugFeedback === "correct" ? hiddenBugChallenges.find((item) => item.id === hiddenBugId)?.explanation : "Look closely at the names and values in the snippet."}</p></div></div> : <><div className="answer-list bug-options">{answerChoices(hiddenBugChallenges.find((item) => item.id === hiddenBugId)!).map((option, index) => <button key={option} className={`answer-option ${bugAnswer === option ? "answer-selected" : ""}`} onClick={() => setBugAnswer(option)}><span className="answer-letter">{String.fromCharCode(65 + index)}</span>{option}</button>)}</div></>}<div className="modal-actions">{bugFeedback === "correct" ? <button className="button button-primary" onClick={collectBug}>COLLECT REWARD <Coins size={15} /></button> : bugFeedback === "incorrect" ? <button className="button button-primary" onClick={() => { setBugFeedback(null); setBugAnswer(""); }}>TRY AGAIN <RotateCcw size={15} /></button> : <button className="button button-primary" disabled={!bugAnswer} onClick={submitBug}>CHECK BUG <ArrowRight size={15} /></button>}<button className="text-link" onClick={() => { setHiddenBugId(null); }}>CLOSE</button></div></section></div>}
    </div>
  );
}

export default App;
