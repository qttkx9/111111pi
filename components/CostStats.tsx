"use client";

import { useState, useEffect, useCallback } from "react";
import { t } from "@/lib/i18n";
import { formatCost } from "@/lib/currency";

interface SessionCost {
  sessionId: string;
  cwd: string;
  firstMessage: string;
  created: string;
  modified: string;
  tokens: { input: number; output: number; cacheRead: number; cacheWrite: number };
  cost: number;
  model: string;
  provider: string;
  messageCount: number;
}

interface DayStat {
  date: string;
  sessions: number;
  cost: number;
  tokens: { input: number; output: number };
}

interface CostByModel {
  model: string;
  sessions: number;
  cost: number;
  tokens: { input: number; output: number };
}

interface StatsData {
  sessions: SessionCost[];
  totals: { sessions: number; cost: number; tokens: { input: number; output: number } };
  days: DayStat[];
  models: CostByModel[];
}

function fmtNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function shortenCwd(cwd: string): string {
  if (typeof window === "undefined") return cwd;
  const parts = cwd.split(/[/\\]/).filter(Boolean);
  if (parts.length <= 2) return cwd;
  return "…/" + parts.slice(-2).join("/");
}

export function CostStats({ onClose }: { onClose: () => void }) {
  const [range, setRange] = useState("all");
  const [data, setData] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<"overview" | "sessions" | "days">("overview");
  const [selectedSession, setSelectedSession] = useState<SessionCost | null>(null);

  const loadStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/stats?range=${range}&detail=true`);
      const d = await res.json();
      if (d.error) { setError(d.error); return; }
      setData(d);
    } catch (e) { setError(String(e)); }
    finally { setLoading(false); }
  }, [range]);

  useEffect(() => { loadStats(); }, [loadStats]);

  const totalCost = data?.totals?.cost ?? 0;

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        width: 780, height: "82vh", background: "var(--bg)", border: "1px solid var(--border)",
        borderRadius: 10, display: "flex", flexDirection: "column", boxShadow: "0 8px 32px rgba(0,0,0,0.18)", overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "12px 18px", borderBottom: "1px solid var(--border)", flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: "var(--text)" }}>
              费用统计
            </span>
            {data && (
              <span style={{ fontSize: 14, fontWeight: 600, color: "var(--accent)", fontFamily: "var(--font-mono)" }}>
                {formatCost(totalCost)}
              </span>
            )}
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 20, lineHeight: 1, padding: "2px 6px" }}>×</button>
        </div>

        {/* Time Range Tabs */}
        <div style={{ display: "flex", gap: 0, padding: "8px 18px 0", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
          {(["all", "30d", "7d"] as const).map((r) => (
            <button key={r} onClick={() => { setRange(r); setSelectedSession(null); }}
              style={{
                padding: "6px 14px", fontSize: 12, border: "none", cursor: "pointer",
                background: "none", color: range === r ? "var(--text)" : "var(--text-dim)",
                fontWeight: range === r ? 600 : 400,
                borderBottom: range === r ? "2px solid var(--accent)" : "2px solid transparent",
                marginBottom: -1,
              }}>
              {r === "all" ? "全部" : r === "30d" ? "近30天" : "近7天"}
            </button>
          ))}
        </div>

        {/* View Tabs */}
        <div style={{ display: "flex", gap: 6, padding: "8px 18px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
          {(["overview", "days", "sessions"] as const).map((v) => (
            <button key={v} onClick={() => { setView(v); setSelectedSession(null); }}
              style={{
                padding: "4px 12px", fontSize: 12, border: "1px solid var(--border)", borderRadius: 5, cursor: "pointer",
                background: view === v ? "var(--bg-selected)" : "none",
                color: view === v ? "var(--text)" : "var(--text-dim)",
                fontWeight: view === v ? 600 : 400,
              }}>
              {v === "overview" ? "概览" : v === "days" ? "按日期" : "按会话"}
            </button>
          ))}
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
          {loading ? (
            <div style={{ padding: "40px 0", textAlign: "center", color: "var(--text-dim)", fontSize: 13 }}>加载中…</div>
          ) : error ? (
            <div style={{ padding: "40px 0", textAlign: "center", color: "#f87171", fontSize: 13 }}>{error}</div>
          ) : data ? (
            <>
              {view === "overview" && (
                <div>
                  {/* 总览卡片 */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 20 }}>
                    <Card label="总会话数" value={String(data.totals.sessions)} />
                    <Card label="总输入 Token" value={fmtNum(data.totals.tokens.input)} />
                    <Card label="总输出 Token" value={fmtNum(data.totals.tokens.output)} />
                  </div>

                  {/* 按模型 */}
                  <SectionTitle>按模型</SectionTitle>
                  {data.models.map((m) => (
                    <div key={m.model} style={{
                      display: "flex", alignItems: "center", gap: 10, padding: "8px 0",
                      borderBottom: "1px solid var(--border)", fontSize: 13,
                    }}>
                      <span style={{ flex: 1, color: "var(--text)", fontFamily: "var(--font-mono)", fontSize: 12 }}>{m.model}</span>
                      <span style={{ color: "var(--text-dim)", fontSize: 11 }}>{m.sessions} 会话</span>
                      <span style={{ color: "var(--text-dim)", fontSize: 11 }}>输入 {fmtNum(m.tokens.input)}</span>
                      <span style={{ color: "var(--text-dim)", fontSize: 11 }}>输出 {fmtNum(m.tokens.output)}</span>
                      <span style={{ color: "var(--accent)", fontWeight: 600, fontSize: 13 }}>{formatCost(m.cost)}</span>
                    </div>
                  ))}
                </div>
              )}

              {view === "days" && (
                <div>
                  {data.days.length === 0 ? (
                    <div style={{ padding: "40px 0", textAlign: "center", color: "var(--text-dim)", fontSize: 13 }}>暂无数据</div>
                  ) : (
                    data.days.map((d) => (
                      <div key={d.date} style={{
                        display: "flex", alignItems: "center", gap: 10, padding: "8px 0",
                        borderBottom: "1px solid var(--border)", fontSize: 13,
                      }}>
                        <span style={{ flex: 1, color: "var(--text)" }}>{d.date}</span>
                        <span style={{ color: "var(--text-dim)", fontSize: 11 }}>{d.sessions} 会话</span>
                        <span style={{ color: "var(--text-dim)", fontSize: 11 }}>输入 {fmtNum(d.tokens.input)}</span>
                        <span style={{ color: "var(--text-dim)", fontSize: 11 }}>输出 {fmtNum(d.tokens.output)}</span>
                        <span style={{ color: "var(--accent)", fontWeight: 600 }}>{formatCost(d.cost)}</span>
                      </div>
                    ))
                  )}
                </div>
              )}

              {view === "sessions" && selectedSession ? (
                <div>
                  <button onClick={() => setSelectedSession(null)}
                    style={{ alignSelf: "flex-start", marginBottom: 12, padding: "4px 10px", background: "none", border: "1px solid var(--border)", borderRadius: 5, color: "var(--text-muted)", cursor: "pointer", fontSize: 11 }}>
                    ← 返回列表
                  </button>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <div style={{ fontSize: 13, color: "var(--text)", fontWeight: 600 }}>{selectedSession.firstMessage}</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 12, color: "var(--text-dim)" }}>
                      <div>模型: <span style={{ color: "var(--text)" }}>{selectedSession.provider}:{selectedSession.model}</span></div>
                      <div>会话数: <span style={{ color: "var(--text)" }}>{selectedSession.messageCount} 条</span></div>
                      <div>输入: <span style={{ color: "var(--text)" }}>{fmtNum(selectedSession.tokens.input)} tokens</span></div>
                      <div>输出: <span style={{ color: "var(--text)" }}>{fmtNum(selectedSession.tokens.output)} tokens</span></div>
                      <div>缓存读取: <span style={{ color: "var(--text)" }}>{fmtNum(selectedSession.tokens.cacheRead)}</span></div>
                      <div>缓存写入: <span style={{ color: "var(--text)" }}>{fmtNum(selectedSession.tokens.cacheWrite)}</span></div>
                      <div>时间: <span style={{ color: "var(--text)" }}>{selectedSession.created?.slice(0, 16) || "未知"}</span></div>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>费用: <span style={{ color: "var(--accent)" }}>{formatCost(selectedSession.cost)}</span></div>
                    </div>
                    {selectedSession.cwd && (
                      <div style={{ fontSize: 11, color: "var(--text-dim)", fontFamily: "var(--font-mono)" }}>
                        目录: {shortenCwd(selectedSession.cwd)}
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
              {view === "sessions" && !selectedSession && (
                <div>
                  {data.sessions.length === 0 ? (
                    <div style={{ padding: "40px 0", textAlign: "center", color: "var(--text-dim)", fontSize: 13 }}>暂无数据</div>
                  ) : (
                    data.sessions.map((s) => (
                      <div key={s.sessionId} onClick={() => setSelectedSession(s)}
                        style={{
                          display: "flex", alignItems: "center", gap: 8, padding: "8px 10px",
                          borderBottom: "1px solid var(--border)", fontSize: 13, cursor: "pointer", borderRadius: 5,
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = "var(--bg-hover)"}
                        onMouseLeave={(e) => e.currentTarget.style.background = "none"}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 2 }}>
                            {s.firstMessage || "(empty)"}
                          </div>
                          <div style={{ display: "flex", gap: 8, fontSize: 11, color: "var(--text-dim)" }}>
                            <span>{s.created?.slice(0, 10)}</span>
                            <span>{s.messageCount} 条</span>
                            <span style={{ fontFamily: "var(--font-mono)", fontSize: 10 }}>{s.provider}:{s.model}</span>
                          </div>
                        </div>
                        <span style={{ color: "var(--accent)", fontWeight: 600, flexShrink: 0 }}>{formatCost(s.cost)}</span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", padding: "10px 18px", borderTop: "1px solid var(--border)", flexShrink: 0 }}>
          <button onClick={onClose} style={{ padding: "6px 14px", background: "none", border: "1px solid var(--border)", borderRadius: 6, color: "var(--text-muted)", cursor: "pointer", fontSize: 13 }}>
            {t("Close")}
          </button>
        </div>
      </div>
    </div>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ padding: 16, background: "var(--bg-panel)", borderRadius: 8, border: "1px solid var(--border)" }}>
      <div style={{ fontSize: 11, color: "var(--text-dim)", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text)", fontFamily: "var(--font-mono)" }}>{value}</div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-dim)", padding: "8px 0 4px", borderBottom: "1px solid var(--border)", marginBottom: 4 }}>
      {children}
    </div>
  );
}
