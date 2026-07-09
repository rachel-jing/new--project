"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, BadgeCheck, Play } from "lucide-react";
import {
  DrawLog,
  defaultConfig,
  findParticipantByInput,
  loadDrawLogs,
  loadLotteryConfig,
  parseList,
  saveDrawLogs,
  saveLotteryConfig,
  type LotteryConfig
} from "@/lib/lottery";

const pickRandom = (pool: string[], count: number) => {
  const shuffled = [...pool];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled.slice(0, count);
};

const createHiddenPlates = (count: number) =>
  Array.from({ length: Math.max(1, count) }, () => "????");

type PendingDraw = {
  finalWinners: string[];
  latestLogs: DrawLog[];
  presetCount: number;
  roundName: string;
};

export default function LotteryPage() {
  const [config, setConfig] = useState<LotteryConfig>(defaultConfig);
  const [rolling, setRolling] = useState(false);
  const [displayNumbers, setDisplayNumbers] = useState<string[]>(
    createHiddenPlates(defaultConfig.rounds[0].count)
  );
  const [currentWinners, setCurrentWinners] = useState<string[]>([]);
  const [drawLogs, setDrawLogs] = useState<DrawLog[]>([]);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pendingDrawRef = useRef<PendingDraw | null>(null);

  const participants = useMemo(() => parseList(config.participantsText), [config.participantsText]);
  const activeRound =
    config.rounds.find((round) => round.id === config.activeRoundId) ?? config.rounds[0];
  const usedWinners = useMemo(
    () => new Set(drawLogs.flatMap((log) => log.winners)),
    [drawLogs]
  );
  const availablePool = participants.filter((item) => !usedWinners.has(item));
  const presetWinners = parseList(activeRound?.preset ?? "");
  const validPresetWinners = Array.from(
    new Set(
      presetWinners
        .map((item) => findParticipantByInput(item, participants))
        .filter((item): item is string => Boolean(item))
    )
  );
  const plateCount = Math.max(1, activeRound?.count ?? 1);
  const drawDisabled = !rolling && (participants.length === 0 || availablePool.length === 0);
  const visiblePlates = Array.from(
    { length: plateCount },
    (_, index) => displayNumbers[index] ?? "????"
  );

  useEffect(() => {
    const refreshConfig = () => {
      const nextConfig = loadLotteryConfig();
      const nextRound =
        nextConfig.rounds.find((round) => round.id === nextConfig.activeRoundId) ??
        nextConfig.rounds[0];
      setConfig(nextConfig);
      setDrawLogs(loadDrawLogs());
      setCurrentWinners([]);
      setDisplayNumbers(createHiddenPlates(nextRound?.count ?? 1));
    };

    refreshConfig();
    window.addEventListener("focus", refreshConfig);
    window.addEventListener("storage", refreshConfig);

    return () => {
      window.removeEventListener("focus", refreshConfig);
      window.removeEventListener("storage", refreshConfig);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const stopDraw = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    const pendingDraw = pendingDrawRef.current;
    if (!pendingDraw) {
      setRolling(false);
      return;
    }

    const nextLog: DrawLog = {
      id: crypto.randomUUID(),
      roundName: pendingDraw.roundName,
      winners: pendingDraw.finalWinners,
      mode: pendingDraw.presetCount > 0 ? "preset" : "random",
      time: new Date().toLocaleString("zh-CN", { hour12: false })
    };
    const nextLogs = [nextLog, ...pendingDraw.latestLogs];

    setDisplayNumbers(pendingDraw.finalWinners);
    setCurrentWinners(pendingDraw.finalWinners);
    setRolling(false);
    setDrawLogs(nextLogs);
    saveDrawLogs(nextLogs);
    pendingDrawRef.current = null;
  };

  const startDraw = () => {
    if (rolling) {
      stopDraw();
      return;
    }

    const latestConfig = loadLotteryConfig();
    const latestLogs = loadDrawLogs();
    const latestParticipants = parseList(latestConfig.participantsText);
    const latestRound =
      latestConfig.rounds.find((round) => round.id === latestConfig.activeRoundId) ??
      latestConfig.rounds[0];
    const latestUsedWinners = new Set(latestLogs.flatMap((log) => log.winners));
    const latestAvailablePool = latestParticipants.filter((item) => !latestUsedWinners.has(item));

    if (!latestRound || latestParticipants.length === 0 || latestAvailablePool.length === 0) {
      return;
    }

    const count = Math.max(1, Math.min(latestRound.count, latestAvailablePool.length));
    const latestPresetWinners = Array.from(
      new Set(
        parseList(latestRound.preset)
          .map((item) => findParticipantByInput(item, latestParticipants))
          .filter((item): item is string => Boolean(item))
      )
    );
    const presetSelection = latestPresetWinners
      .filter((winner) => !latestUsedWinners.has(winner))
      .slice(0, count);
    const randomNeeded = count - presetSelection.length;
    const randomPool = latestAvailablePool.filter((item) => !presetSelection.includes(item));
    const finalWinners = [
      ...presetSelection,
      ...pickRandom(randomPool, Math.max(0, randomNeeded))
    ].slice(0, count);

    pendingDrawRef.current = {
      finalWinners,
      latestLogs,
      presetCount: presetSelection.length,
      roundName: latestRound.name
    };

    setConfig(latestConfig);
    setCurrentWinners([]);
    setDisplayNumbers(createHiddenPlates(count));
    setRolling(true);

    intervalRef.current = setInterval(() => {
      const rollingPool = latestAvailablePool.length > 0 ? latestAvailablePool : ["0000"];
      setDisplayNumbers(
        Array.from({ length: count }, () => rollingPool[Math.floor(Math.random() * rollingPool.length)])
      );
    }, 72);
  };

  const goNextRound = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    pendingDrawRef.current = null;

    const latestConfig = loadLotteryConfig();
    const rounds = latestConfig.rounds.length > 0 ? latestConfig.rounds : defaultConfig.rounds;
    const currentIndex = Math.max(
      0,
      rounds.findIndex((round) => round.id === latestConfig.activeRoundId)
    );
    const nextRound = rounds[(currentIndex + 1) % rounds.length];
    const nextConfig = {
      ...latestConfig,
      rounds,
      activeRoundId: nextRound.id
    };

    setConfig(nextConfig);
    saveLotteryConfig(nextConfig);
    setRolling(false);
    setCurrentWinners([]);
    setDisplayNumbers(createHiddenPlates(nextRound.count));
  };

  return (
    <main className="min-h-screen bg-[#100035] text-white">
      <section className="lottery-stage relative flex min-h-screen flex-col overflow-hidden px-5 py-6 sm:px-8">
        <div className="stage-beams" aria-hidden="true">
          <span className="stage-beam stage-beam-left" />
          <span className="stage-beam stage-beam-center" />
          <span className="stage-beam stage-beam-right" />
          <span className="stage-glint stage-glint-left" />
          <span className="stage-glint stage-glint-center" />
          <span className="stage-glint stage-glint-right" />
        </div>
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <Link
              href="/admin"
              className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-200 transition hover:text-white"
            >
              VIBE CODING
            </Link>
            <h1 className="lottery-title mt-2 text-3xl font-black sm:text-5xl">
              第三届人工智能与智算发展论坛
            </h1>
          </div>
        </div>

        <div className="relative z-10 flex flex-1 flex-col items-center justify-center py-10">
          <div className="mb-8 flex flex-wrap items-center justify-center gap-3">
            <span className="rounded-md border border-cyan-200/40 bg-white/95 px-4 py-2 text-sm font-bold text-[#16003f] shadow-[0_0_24px_rgba(34,211,238,0.18)]">
              {activeRound?.name}
            </span>
            <span className="rounded-md border border-cyan-200/25 bg-white/[0.08] px-4 py-2 text-sm text-cyan-50/90">
              本轮抽取 {activeRound?.count ?? 0} 名
            </span>
          </div>

          <div className="number-board" data-count={plateCount}>
            {visiblePlates.map((number, index) => (
              <div
                key={`${number}-${index}`}
                className={`number-plate flex min-h-36 items-center justify-center rounded-lg border border-cyan-200/40 bg-white text-center text-5xl font-black tabular-nums text-[#16003f] shadow-2xl sm:min-h-44 sm:text-6xl lg:text-7xl ${
                  rolling ? "is-rolling" : ""
                }`}
              >
                {number}
              </div>
            ))}
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <button
              data-testid="start-draw"
              className="inline-flex h-14 min-w-44 items-center justify-center gap-2 rounded-md bg-cyan-400 px-6 text-base font-black text-[#140037] shadow-[0_18px_45px_rgba(34,211,238,0.28)] transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:bg-white/20 disabled:text-white/50"
              disabled={drawDisabled}
              onClick={startDraw}
            >
              <Play className="h-5 w-5 fill-current" />
              {rolling ? "停止抽奖" : availablePool.length === 0 ? "已抽完" : "开始抽奖"}
            </button>
            <button
              className="inline-flex h-14 items-center justify-center gap-2 rounded-md border border-cyan-200/25 bg-white/[0.08] px-5 text-sm font-semibold text-cyan-50 transition hover:bg-white/[0.14]"
              onClick={goNextRound}
            >
              <ArrowRight className="h-4 w-4" />
              下一轮
            </button>
          </div>

          {currentWinners.length > 0 && (
            <div className="mt-9 w-full max-w-4xl rounded-lg border border-cyan-200/35 bg-cyan-300/12 p-5 text-center shadow-[0_0_34px_rgba(34,211,238,0.16)]">
              <p className="inline-flex items-center gap-2 text-sm font-semibold text-cyan-100">
                <BadgeCheck className="h-4 w-4" />
                恭喜中奖
              </p>
              <p className="mt-3 text-2xl font-black tracking-wide sm:text-4xl">
                {currentWinners.join(" · ")}
              </p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
