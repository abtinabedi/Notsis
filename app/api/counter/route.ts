import { NextRequest } from "next/server";
import path from "path";
import fs from "fs";

// NOTE: This uses the local filesystem. On Vercel, the fs is read-only at runtime.
// For production persistence, replace with a cloud DB (Upstash Redis, Vercel KV, etc.).
const DB_PATH = path.join(process.cwd(), "data", "db.json");

function readCount(): number {
  try {
    const raw = fs.readFileSync(DB_PATH, "utf-8");
    const data = JSON.parse(raw);
    return typeof data.count === "number" ? data.count : 0;
  } catch {
    return 0;
  }
}

function writeCount(count: number): void {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify({ count }), "utf-8");
  } catch {
    // silent fail — read-only environments (Vercel prod)
  }
}

// GET /api/counter — returns the current count.
// POST /api/counter — increments count if the visitor cookie is not already set, then returns count + a Set-Cookie header.
export async function GET() {
  const count = readCount();
  return Response.json({ count });
}

export async function POST(request: NextRequest) {
  const alreadyCounted = request.cookies.get("notsis_visited");

  const count = readCount();

  if (!alreadyCounted) {
    const newCount = count + 1;
    writeCount(newCount);

    return new Response(JSON.stringify({ count: newCount, incremented: true }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        // Cookie expires in 365 days
        "Set-Cookie": `notsis_visited=1; Path=/; Max-Age=31536000; SameSite=Lax`,
      },
    });
  }

  return Response.json({ count, incremented: false });
}
