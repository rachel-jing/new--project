"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ClipboardList,
  Download,
  History,
  Plus,
  RotateCcw,
  Sparkles,
  Trash2
} from "lucide-react";
import {
  DrawLog,
  defaultConfig,
  findParticipantByInput,
  generateParticipants,
  loadDrawLogs,
  loadLotteryConfig,
  parseList,
  saveDrawLogs,
  saveLotteryConfig,
  type LotteryConfig,
  type Round
} from "@/lib/lottery";

export default function AdminPage() {
  const [config, setConfig] = useState<LotteryConfig>(defaultConfig);
  const [drawLogs, setDrawLogs] = useState<DrawLog[]>([]);

  const participants = useMemo(() => parseList(config.participantsText), [config.participantsText]);

  useEffect(() => {
    setConfig(loadLotteryConfig());
    setDrawLogs(loadDrawLogs());
  }, []);

  const updateConfig = (nextConfig: LotteryConfig) => {
    setConfig(nextConfig);
    saveLotteryConfig(nextConfig);
  };

  const updateParticipantCount = (count: number) => {
    const nextCount = Math.max(1, Math.min(9999, count || 1));
    updateConfig({
      ...config,
      participantCount: nextCount,
      participantsText: generateParticipants(nextCount)
    });
  };

  const updateParticipantsText = (participantsText: string) => {
    updateConfig({
      ...config,
      participantCount: parseList(participantsText).length,
      participantsText
    });
  };

  const updateRound = (id: string, patch: Partial<Round>) => {
    updateConfig({
      ...config,
      rounds: config.rounds.map((round) => (round.id === id ? { ...round, ...patch } : round))
    });
  };

  const addRound = () => {
    const nextRound: Round = {
      id: crypto.randomUUID(),
      name: `第 ${config.rounds.length + 1} 轮`,
      count: 1,
      preset: ""
    };
    updateConfig({
      ...config,
      rounds: [...config.rounds, nextRound],
      activeRoundId: nextRound.id
    });
  };

  const removeRound = (id: string) => {
    if (config.rounds.length === 1) return;

    const nextRounds = config.rounds.filter((round) => round.id !== id);
    updateConfig({
      ...config,
      rounds: nextRounds,
      activeRoundId: config.activeRoundId === id ? nextRounds[0].id : config.activeRoundId
    });
  };

  const exportResult = () => {
    const content = drawLogs
      .map(
        (log) =>
          `${log.time} | ${log.roundName} | ${log.mode === "preset" ? "预设" : "随机抽取"} | ${log.winners.join(", ")}`
      )
      .join("\n");
    const blob = new Blob([content || "暂无抽奖记录"], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "lottery-results.txt";
    link.click();
    URL.revokeObjectURL(url);
  };

  const clearLogs = () => {
    setDrawLogs([]);
    saveDrawLogs([]);
  };

  return (
    <main className="min-h-screen bg-[#f5f7fb] px-5 py-6 text-[#152033] sm:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm font-bold text-[#0f766e] transition hover:text-[#0f4f49]"
            >
              <ArrowLeft className="h-4 w-4" />
              返回抽奖大屏
            </Link>
            <h1 className="mt-3 text-3xl font-black sm:text-4xl">抽奖后台</h1>
            <p className="mt-2 text-sm text-slate-500">设置保存后，回到抽奖大屏即可生效。</p>
          </div>
          <div className="flex items-center gap-2 rounded-md border border-teal-100 bg-white px-4 py-3 text-sm font-black text-[#0f766e] shadow-sm">
            <Sparkles className="h-5 w-5 text-[#f97316]" />
            VIBE CODING
          </div>
        </header>

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <section className="space-y-6">
            <div className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="inline-flex items-center gap-2 text-base font-black">
                  <ClipboardList className="h-4 w-4" />
                  参与号码池
                </h2>
                <span className="text-xs font-semibold text-slate-500">{participants.length} 个号码</span>
              </div>
              <div className="mb-3 grid gap-3 sm:grid-cols-[12rem_minmax(0,1fr)]">
                <label className="block">
                  <span className="mb-2 block text-xs font-bold text-slate-500">号码池数量</span>
                  <input
                    data-testid="participant-count"
                    className="h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm font-bold outline-none focus:border-teal-500"
                    type="number"
                    min={1}
                    max={9999}
                    value={config.participantCount}
                    onChange={(event) => updateParticipantCount(Number(event.target.value))}
                  />
                </label>
                <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs leading-6 text-slate-500">
                  自动生成从 0001 开始的连续号码。手动编辑下方号码池时，数量会按实际号码数同步。
                </div>
              </div>
              <textarea
                className="h-56 w-full resize-none rounded-md border border-slate-200 bg-slate-50 p-3 text-sm leading-6 outline-none transition focus:border-teal-500 focus:bg-white"
                value={config.participantsText}
                onChange={(event) => updateParticipantsText(event.target.value)}
                placeholder="每行一个号码，或用逗号/空格分隔"
              />
            </div>

            <div className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-base font-black">轮次与名额</h2>
                <button
                  className="inline-flex h-10 items-center gap-2 rounded-md bg-[#111827] px-4 text-sm font-bold text-white transition hover:bg-[#263244]"
                  onClick={addRound}
                >
                  <Plus className="h-4 w-4" />
                  添加轮次
                </button>
              </div>

              <div className="space-y-3">
                {config.rounds.map((round) => {
                  const presetInputs = parseList(round.preset);
                  const validPresetCount = new Set(
                    presetInputs
                      .map((item) => findParticipantByInput(item, participants))
                      .filter(Boolean)
                  ).size;

                  return (
                    <div
                      key={round.id}
                      className={`rounded-md border p-4 ${
                        config.activeRoundId === round.id
                          ? "border-teal-500 bg-teal-50"
                          : "border-slate-200 bg-white"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <button
                          className="h-5 w-5 rounded-full border border-slate-300 bg-white p-1"
                          onClick={() => updateConfig({ ...config, activeRoundId: round.id })}
                          aria-label={`选择 ${round.name}`}
                        >
                          <span
                            className={`block h-full w-full rounded-full ${
                              config.activeRoundId === round.id ? "bg-teal-600" : "bg-transparent"
                            }`}
                          />
                        </button>
                        <input
                          className="min-w-0 flex-1 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-teal-500"
                          value={round.name}
                          onChange={(event) => updateRound(round.id, { name: event.target.value })}
                        />
                        <input
                          className="h-10 w-20 rounded-md border border-slate-200 bg-white px-2 text-center text-sm font-bold outline-none focus:border-teal-500"
                          type="number"
                          min={1}
                          max={12}
                          value={round.count}
                          onChange={(event) =>
                            updateRound(round.id, {
                              count: Math.max(1, Number(event.target.value) || 1)
                            })
                          }
                        />
                        <button
                          className="flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 text-slate-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                          onClick={() => removeRound(round.id)}
                          aria-label="删除轮次"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="mt-3 flex items-center justify-between gap-3">
                        <label className="block text-xs font-bold text-slate-500">
                          预设中奖号码
                        </label>
                        <span className="text-xs font-semibold text-teal-700">
                          有效 {validPresetCount} 个
                        </span>
                      </div>
                      <textarea
                        data-testid={`preset-${round.id}`}
                        className="mt-2 h-24 w-full resize-none rounded-md border border-slate-200 bg-white p-3 text-sm outline-none focus:border-teal-500"
                        value={round.preset}
                        onChange={(event) => updateRound(round.id, { preset: event.target.value })}
                        placeholder="填入本轮指定中奖号码；例如 8 会匹配 0008，留空则随机抽取"
                      />
                      <p className="mt-2 text-xs leading-5 text-slate-500">
                        预设号码会优先中奖；例如填 8 会匹配 0008。若显示有效 0 个，说明号码不在号码池内；已中过的号码会自动跳过，避免重复中奖。
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          <aside className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="inline-flex items-center gap-2 text-base font-black">
                <History className="h-4 w-4" />
                抽奖记录
              </h2>
              <div className="flex items-center gap-2">
                <button
                  className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 px-3 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
                  onClick={clearLogs}
                >
                  <RotateCcw className="h-4 w-4" />
                  清空
                </button>
                <button
                  className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 px-3 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
                  onClick={exportResult}
                >
                  <Download className="h-4 w-4" />
                  导出
                </button>
              </div>
            </div>

            <div className="max-h-[calc(100vh-14rem)] space-y-2 overflow-auto pr-1">
              {drawLogs.length === 0 ? (
                <p className="rounded-md bg-slate-50 p-4 text-sm text-slate-500">暂无记录</p>
              ) : (
                drawLogs.map((log) => (
                  <div key={log.id} className="rounded-md border border-slate-200 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-black">{log.roundName}</p>
                      <span
                        className={`rounded px-2 py-1 text-[11px] font-bold ${
                          log.mode === "preset"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-emerald-100 text-emerald-800"
                        }`}
                      >
                        {log.mode === "preset" ? "预设" : "随机"}
                      </span>
                    </div>
                    <p className="mt-2 text-lg font-black tabular-nums text-[#111827]">
                      {log.winners.join(" / ")}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">{log.time}</p>
                  </div>
                ))
              )}
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
