import { achievements, hiddenBugChallenges, worlds } from "./data";
import type { GameState, Mistake, RunProgress, SaveFile } from "./types";

export const SAVE_KEY = "codequest-save-v1";
export const todayKey = (): string => new Date().toLocaleDateString("en-CA");
export const xpForNextLevel = (level: number): number => 500 + level * 150;

export function storageAvailable(): boolean {
  try {
    const testKey = `${SAVE_KEY}-storage-test`;
    window.localStorage.setItem(testKey, "1");
    window.localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

export function freshGame(): GameState {
  return {
    playerName: "Code Explorer", xp: 0, level: 1, coins: 0, streak: 0, combo: 0, bestCombo: 0, answersSubmitted: 0, correctAnswers: 0, lastPlayedDate: "",
    completedChallenges: [], completedMissions: [], defeatedBosses: [], achievements: [], mistakes: [],
    collectedBugs: [], dailyDate: "", dailyComplete: false, settings: { sound: false, animations: true, theme: "dark" }, run: null, saveExists: false,
  };
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function parseGame(value: unknown): GameState | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<GameState>;
  if (
    typeof candidate.playerName !== "string" ||
    typeof candidate.xp !== "number" || !Number.isFinite(candidate.xp) || candidate.xp < 0 ||
    typeof candidate.level !== "number" || !Number.isInteger(candidate.level) || candidate.level < 1 ||
    typeof candidate.coins !== "number" || !Number.isFinite(candidate.coins) || candidate.coins < 0 ||
    typeof candidate.streak !== "number" || !Number.isInteger(candidate.streak) || candidate.streak < 0 ||
    typeof candidate.combo !== "number" || !Number.isInteger(candidate.combo) || candidate.combo < 0 ||
    typeof candidate.bestCombo !== "number" || !Number.isInteger(candidate.bestCombo) || candidate.bestCombo < 0 ||
    typeof candidate.answersSubmitted !== "number" || !Number.isInteger(candidate.answersSubmitted) || candidate.answersSubmitted < 0 ||
    typeof candidate.correctAnswers !== "number" || !Number.isInteger(candidate.correctAnswers) || candidate.correctAnswers < 0 ||
    candidate.correctAnswers > candidate.answersSubmitted ||
    typeof candidate.lastPlayedDate !== "string" || typeof candidate.dailyDate !== "string" ||
    typeof candidate.dailyComplete !== "boolean" ||
    !isStringArray(candidate.completedChallenges) || !isStringArray(candidate.completedMissions) ||
    !isStringArray(candidate.defeatedBosses) || !isStringArray(candidate.achievements) ||
    !isStringArray(candidate.collectedBugs) || !Array.isArray(candidate.mistakes) ||
    !candidate.settings || typeof candidate.settings.sound !== "boolean" || typeof candidate.settings.animations !== "boolean" ||
    candidate.settings.theme !== "dark" && candidate.settings.theme !== "light"
  ) return null;

  const knownChallengeIds = new Set([
    ...worlds.flatMap((world) => world.missions.flatMap((mission) => mission.challenges.map((challenge) => challenge.id))),
    ...hiddenBugChallenges.map((challenge) => challenge.id),
  ]);
  const run = candidate.run && typeof candidate.run === "object" ? candidate.run as RunProgress : null;
  const runWorld = run ? worlds.find((world) => world.id === run.worldId) : undefined;
  const runMission = runWorld?.missions.find((mission) => mission.id === run?.missionId);
  const challengeLimit = run?.mode === "mission" ? runMission?.challenges.length : run?.mode === "boss" ? 5 : 1;
  const validRun = Boolean(run && runWorld && runMission && ["mission", "boss", "daily", "practice"].includes(run.mode) &&
    Number.isInteger(run.challengeIndex) && run.challengeIndex >= 0 && run.challengeIndex < (challengeLimit ?? 0) &&
    Number.isInteger(run.energy) && run.energy >= 0 && run.energy <= 3 &&
    Number.isInteger(run.answers) && run.answers >= 0 && Number.isInteger(run.correct) && run.correct >= 0 && run.correct <= run.answers &&
    Number.isInteger(run.hints) && run.hints >= 0 && Number.isInteger(run.bestCombo) && run.bestCombo >= 0 &&
    Number.isInteger(run.currentHint) && run.currentHint >= 0 && run.currentHint <= 2 &&
    Number.isInteger(run.combo) && run.combo >= 0 &&
    Number.isFinite(run.bossHp) && run.bossHp >= 0 && run.bossHp <= 100 &&
    Number.isFinite(run.awardedXp) && run.awardedXp >= 0 && Number.isFinite(run.awardedCoins) && run.awardedCoins >= 0 &&
    (run.feedback === null || run.feedback === "correct" || run.feedback === "incorrect") &&
    typeof run.selectedAnswer === "string" &&
    (run.mode !== "daily" && run.mode !== "practice" || typeof run.challengeId === "string" && knownChallengeIds.has(run.challengeId)) &&
    (run.mode !== "daily" || typeof run.dateKey === "string"));
  const mistakes = candidate.mistakes.filter((mistake): mistake is Mistake =>
    Boolean(mistake && typeof mistake === "object" && typeof mistake.id === "string" && knownChallengeIds.has(mistake.challengeId) &&
      typeof mistake.question === "string" && typeof mistake.correctAnswer === "string" && typeof mistake.explanation === "string"),
  );
  return {
    ...freshGame(),
    ...candidate,
    completedChallenges: candidate.completedChallenges.filter((id) => knownChallengeIds.has(id)),
    completedMissions: candidate.completedMissions.filter((id) => worlds.some((world) => world.missions.some((mission) => mission.id === id))),
    defeatedBosses: candidate.defeatedBosses.filter((id) => worlds.some((world) => world.id === id)),
    achievements: candidate.achievements.filter((id) => achievements.some((achievement) => achievement.id === id)),
    mistakes,
    collectedBugs: candidate.collectedBugs.filter((id) => ["hidden-bug-1", "hidden-bug-2", "hidden-bug-3"].includes(id)),
    run: validRun ? run : null,
    saveExists: true,
  };
}

export function loadGame(): GameState {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return freshGame();
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || (parsed as Partial<SaveFile>).version !== 1) return freshGame();
    return parseGame((parsed as SaveFile).game) ?? freshGame();
  } catch {
    return freshGame();
  }
}

export function saveGame(game: GameState): void {
  try {
    const save: SaveFile = { version: 1, savedAt: new Date().toISOString(), game: { ...game, saveExists: true } };
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(save));
  } catch {
    // Storage can be unavailable in private browsing or when the browser quota is full.
  }
}

export function addXp(game: GameState, amount: number): GameState {
  let xp = game.xp + amount;
  let level = game.level;
  while (xp >= xpForNextLevel(level)) {
    xp -= xpForNextLevel(level);
    level += 1;
  }
  return { ...game, xp, level };
}

export function updateAchievements(game: GameState): GameState {
  const unlocked = new Set(game.achievements);
  const debugCount = game.completedChallenges.filter((id) => {
    const challenge = [...worlds.flatMap((world) => world.missions.flatMap((mission) => mission.challenges)), ...hiddenBugChallenges].find((item) => item.id === id);
    return challenge?.type === "debugging";
  }).length;
  if (game.completedMissions.length >= 1) unlocked.add("first-quest");
  if (debugCount >= 10) unlocked.add("bug-hunter");
  if (game.completedMissions.some((id) => id.startsWith("logic-"))) unlocked.add("logic-master");
  if (game.defeatedBosses.length >= 1) unlocked.add("boss-breaker");
  if (game.defeatedBosses.length >= 7) unlocked.add("code-master");
  if (game.bestCombo >= 5) unlocked.add("combo-master");
  if (game.dailyComplete) unlocked.add("daily-streak");
  return { ...game, achievements: [...unlocked] };
}

export function makeRun(worldId: string, missionId: string, mode: RunProgress["mode"] = "mission", challengeId?: string, dateKey?: string): RunProgress {
  return {
    mode, worldId, missionId, ...(challengeId ? { challengeId } : {}), ...(dateKey ? { dateKey } : {}), challengeIndex: 0, answers: 0, correct: 0, hints: 0, bestCombo: 0,
    energy: 3, bossHp: mode === "boss" ? 100 : 0, feedback: null, selectedAnswer: "", currentHint: 0,
    combo: 0, awardedXp: 0, awardedCoins: 0,
  };
}
