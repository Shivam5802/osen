export type ChallengeType = "choice" | "output" | "completion" | "debugging";
export type Difficulty = "Easy" | "Medium" | "Hard";
export type Screen = "home" | "map" | "missions" | "challenge" | "results" | "profile" | "achievements" | "mistakes" | "skills" | "settings";

export interface Challenge {
  id: string;
  type: ChallengeType;
  title: string;
  question: string;
  code?: string;
  options?: string[];
  answer: string;
  explanation: string;
  difficulty: Difficulty;
  topic: string;
  xp: number;
  hint: string;
}

export interface Mission {
  id: string;
  name: string;
  description: string;
  difficulty: Difficulty;
  topic: string;
  xp: number;
  challenges: Challenge[];
}

export interface World {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  topic: string;
  boss: string;
  accent: string;
  icon: string;
  missions: Mission[];
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
}

export interface Mistake {
  id: string;
  challengeId: string;
  worldId: string;
  missionId: string;
  question: string;
  topic: string;
  playerAnswer: string;
  correctAnswer: string;
  explanation: string;
}

export interface Settings {
  sound: boolean;
  animations: boolean;
  theme: "dark" | "light";
}

export interface RunProgress {
  mode: "mission" | "boss" | "daily" | "practice";
  worldId: string;
  missionId: string;
  challengeId?: string;
  dateKey?: string;
  challengeIndex: number;
  answers: number;
  correct: number;
  hints: number;
  bestCombo: number;
  energy: number;
  bossHp: number;
  feedback: "correct" | "incorrect" | null;
  selectedAnswer: string;
  currentHint: number;
  combo: number;
  awardedXp: number;
  awardedCoins: number;
}

export interface GameState {
  playerName: string;
  xp: number;
  level: number;
  coins: number;
  streak: number;
  combo: number;
  bestCombo: number;
  answersSubmitted: number;
  correctAnswers: number;
  lastPlayedDate: string;
  completedChallenges: string[];
  completedMissions: string[];
  defeatedBosses: string[];
  achievements: string[];
  mistakes: Mistake[];
  collectedBugs: string[];
  dailyDate: string;
  dailyComplete: boolean;
  settings: Settings;
  run: RunProgress | null;
  saveExists: boolean;
}

export interface SaveFile {
  version: 1;
  savedAt: string;
  game: GameState;
}
