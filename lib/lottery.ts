export type Round = {
  id: string;
  name: string;
  count: number;
  preset: string;
};

export type DrawLog = {
  id: string;
  roundName: string;
  winners: string[];
  mode: "random" | "preset";
  time: string;
};

export type LotteryConfig = {
  participantCount: number;
  participantsText: string;
  rounds: Round[];
  activeRoundId: string;
};

export const defaultRounds: Round[] = [
  { id: "r1", name: "第一轮 幸运奖", count: 3, preset: "" },
  { id: "r2", name: "第二轮 人气奖", count: 2, preset: "" },
  { id: "r3", name: "最终轮 大奖", count: 1, preset: "" }
];

export const generateParticipants = (count: number) =>
  Array.from({ length: Math.max(1, count) }, (_, index) =>
    String(index + 1).padStart(4, "0")
  ).join("\n");

export const defaultParticipantCount = 160;
export const defaultParticipants = generateParticipants(defaultParticipantCount);

export const defaultConfig: LotteryConfig = {
  participantCount: defaultParticipantCount,
  participantsText: defaultParticipants,
  rounds: defaultRounds,
  activeRoundId: defaultRounds[0].id
};

export const configStorageKey = "tiangang-lottery-config";
export const logsStorageKey = "tiangang-lottery-logs";

export const parseList = (value: string) =>
  Array.from(
    new Set(
      value
        .split(/[\n,，\s]+/)
        .map((item) => item.trim())
        .filter(Boolean)
    )
  );

export const normalizeNumber = (value: string) => value.replace(/^0+(?=\d)/, "");

export const findParticipantByInput = (value: string, participants: string[]) => {
  const exactMatch = participants.find((item) => item === value);
  if (exactMatch) return exactMatch;

  const normalizedValue = normalizeNumber(value);
  return participants.find((item) => normalizeNumber(item) === normalizedValue);
};

export const loadLotteryConfig = () => {
  if (typeof window === "undefined") return defaultConfig;

  try {
    const saved = window.localStorage.getItem(configStorageKey);
    if (!saved) return defaultConfig;

    const parsed = JSON.parse(saved) as Partial<LotteryConfig>;
    const rounds = Array.isArray(parsed.rounds) && parsed.rounds.length > 0 ? parsed.rounds : defaultRounds;
    const activeRoundId =
      parsed.activeRoundId && rounds.some((round) => round.id === parsed.activeRoundId)
        ? parsed.activeRoundId
        : rounds[0].id;

    return {
      participantCount:
        typeof parsed.participantCount === "number"
          ? parsed.participantCount
          : parseList(parsed.participantsText ?? defaultParticipants).length,
      participantsText: parsed.participantsText ?? defaultParticipants,
      rounds,
      activeRoundId
    };
  } catch {
    return defaultConfig;
  }
};

export const saveLotteryConfig = (config: LotteryConfig) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(configStorageKey, JSON.stringify(config));
};

export const loadDrawLogs = () => {
  if (typeof window === "undefined") return [] as DrawLog[];

  try {
    const saved = window.localStorage.getItem(logsStorageKey);
    const parsed = saved ? JSON.parse(saved) : [];
    return Array.isArray(parsed) ? (parsed as DrawLog[]) : [];
  } catch {
    return [];
  }
};

export const saveDrawLogs = (logs: DrawLog[]) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(logsStorageKey, JSON.stringify(logs));
};
