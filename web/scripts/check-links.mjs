// Pre-launch check: every source URL in src/content responds. Usage: node scripts/check-links.mjs
import { readdirSync, readFileSync } from "node:fs";
const dir = new URL("../src/content/", import.meta.url);
const urls = new Set();
for (const f of readdirSync(dir)) for (const m of readFileSync(new URL(f, dir), "utf8").matchAll(/https?:\/\/[^"'`\s]+/g)) urls.add(m[0]);
let bad = 0;
for (const url of urls) {
  let status;
  try {
    const r = await fetch(url, { method: "GET", redirect: "follow", headers: { "user-agent": "Mozilla/5.0 (link check)" } });
    status = r.status;
  } catch (e) {
    status = e.cause?.code ?? "ERR";
  }
  const ok = status === 200;
  // 401/403 usually means bot-blocking (CBC, CanLII) — open those by hand.
  if (!ok) bad++;
  console.log(`${ok ? "ok " : status === 403 || status === 401 ? "?? " : "BAD"} ${status} ${url}`);
}
console.log(`${urls.size} urls, ${bad} need a look`);
