import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// POST /api/packages/install  body: { name: string }
// Uses `pi install npm:<name>` to install npm packages from the market
export async function POST(req: Request) {
  try {
    const { name } = await req.json() as { name?: string };
    if (!name?.trim()) return NextResponse.json({ error: "name required" }, { status: 400 });

    const { execSync } = await import("child_process");
    const cmd = `npx pi install npm:${name}`;
    console.log(`[packages/install] running: ${cmd}`);

    const output = execSync(cmd, {
      timeout: 120000,
      env: { ...process.env, FORCE_COLOR: "0" },
      cwd: process.cwd(),
      windowsHide: true,
    }).toString();

    const success = !output.includes("error") && !output.includes("ERR");
    if (!success) {
      return NextResponse.json({ error: output.slice(-500) || "Install failed" }, { status: 500 });
    }
    return NextResponse.json({ success: true, output });
  } catch (e: unknown) {
    const err = e as { stdout?: string; stderr?: string; message?: string; status?: number };
    const output = ((err.stdout ?? "") + (err.stderr ?? "")).trim();
    const message = output || (err.message ?? String(e));
    return NextResponse.json({ error: message }, { status: err.status ?? 500 });
  }
}
