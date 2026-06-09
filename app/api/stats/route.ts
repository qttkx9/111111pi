import { NextResponse } from "next/server";
import { getAgentDir } from "@earendil-works/pi-coding-agent";
import { readdirSync, readFileSync, existsSync } from "fs";
import { join } from "path";

export const dynamic = "force-dynamic";

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

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const range = searchParams.get("range") || "all"; // 7d | 30d | all
    const detail = searchParams.get("detail") === "true";

    const sessionsDir = join(getAgentDir(), "sessions");
    if (!existsSync(sessionsDir)) {
      return NextResponse.json({ sessions: [], totals: {}, days: [], models: [] });
    }

    const sessionDirs = readdirSync(sessionsDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => join(sessionsDir, d.name));

    const allSessions: SessionCost[] = [];
    const now = Date.now();
    const rangeMs = range === "7d" ? 7 * 86400000 : range === "30d" ? 30 * 86400000 : Infinity;

    for (const dir of sessionDirs) {
      const files = readdirSync(dir).filter((f) => f.endsWith(".jsonl"));
      for (const file of files) {
        const filePath = join(dir, file);
        try {
          const content = readFileSync(filePath, "utf8").trim();
          if (!content) continue;

          const lines = content.split("\n");
          let sessionInfo: { id?: string; cwd?: string; timestamp?: string } = {};
          let lastModified = "";
          let totalInput = 0, totalOutput = 0, totalCacheRead = 0, totalCacheWrite = 0;
          let totalCost = 0;
          let model = "", provider = "";
          let messageCount = 0;
          let firstMessage = "";
          let created = "";

          for (const line of lines) {
            try {
              const entry = JSON.parse(line);
              if (entry.type === "session") {
                sessionInfo = entry;
                created = entry.timestamp || "";
              }
              if (entry.type === "message" && entry.message?.role === "assistant") {
                const msg = entry.message;
                if (msg.usage?.cost) {
                  totalInput += msg.usage.input || 0;
                  totalOutput += msg.usage.output || 0;
                  totalCacheRead += msg.usage.cacheRead || 0;
                  totalCacheWrite += msg.usage.cacheWrite || 0;
                  totalCost += msg.usage.cost.total || 0;
                  if (!model && msg.model) model = msg.model;
                  if (!provider && msg.provider) provider = msg.provider;
                }
                messageCount++;
                if (msg.content?.[0]?.type === "text" && !firstMessage) {
                  firstMessage = msg.content[0].text.slice(0, 100);
                }
              }
              if (entry.type === "message" && entry.message?.role === "user") {
                messageCount++;
              }
              lastModified = entry.timestamp || lastModified;
            } catch { /* skip malformed lines */ }
          }

          if (totalCost <= 0 && totalInput <= 0) continue; // skip empty sessions

          // Apply time range filter
          const sessionTime = new Date(created || lastModified).getTime();
          if (now - sessionTime > rangeMs) continue;

          allSessions.push({
            sessionId: sessionInfo.id || file.replace(".jsonl", ""),
            cwd: sessionInfo.cwd || "",
            firstMessage: firstMessage || "(empty)",
            created,
            modified: lastModified,
            tokens: { input: totalInput, output: totalOutput, cacheRead: totalCacheRead, cacheWrite: totalCacheWrite },
            cost: totalCost,
            model: model || "unknown",
            provider: provider || "unknown",
            messageCount,
          });
        } catch { /* skip corrupt files */ }
      }
    }

    // Sort by created descending
    allSessions.sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());

    // Calculate totals
    const totals = {
      sessions: allSessions.length,
      cost: allSessions.reduce((s, c) => s + c.cost, 0),
      tokens: allSessions.reduce((s, c) => ({ input: s.input + c.tokens.input, output: s.output + c.tokens.output }), { input: 0, output: 0 }),
    };

    // Group by day
    const dayMap = new Map<string, DayStat>();
    for (const s of allSessions) {
      const dateKey = s.created ? s.created.slice(0, 10) : "unknown";
      const existing = dayMap.get(dateKey) || { date: dateKey, sessions: 0, cost: 0, tokens: { input: 0, output: 0 } };
      existing.sessions++;
      existing.cost += s.cost;
      existing.tokens.input += s.tokens.input;
      existing.tokens.output += s.tokens.output;
      dayMap.set(dateKey, existing);
    }
    const days = [...dayMap.values()].sort((a, b) => a.date.localeCompare(b.date));

    // Group by model
    const modelMap = new Map<string, CostByModel>();
    for (const s of allSessions) {
      const key = `${s.provider}:${s.model}`;
      const existing = modelMap.get(key) || { model: key, sessions: 0, cost: 0, tokens: { input: 0, output: 0 } };
      existing.sessions++;
      existing.cost += s.cost;
      existing.tokens.input += s.tokens.input;
      existing.tokens.output += s.tokens.output;
      modelMap.set(key, existing);
    }
    const models = [...modelMap.values()].sort((a, b) => b.cost - a.cost);

    const result: Record<string, unknown> = { sessions: allSessions, totals, days, models };
    if (detail) result.sessions = allSessions;

    return NextResponse.json(result);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
