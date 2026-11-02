// Leaderboard Jejak Sirah: Netlify Function + Netlify Blobs.
// GET  /api/scores                -> 30 markah teratas (tanpa data rahsia)
// POST /api/scores {action:"submit", id, secret, name, stars, gems, scrolls, done, score}
// POST /api/scores {action:"delete", id, secret}
// Setiap pemain ada id + kunci rahsia yang dijana dalam pelayar dia sendiri.
// Hanya hash SHA-256 kunci itu disimpan, jadi seorang pemain hanya boleh ubah/padam markah sendiri.
import { getStore } from "@netlify/blobs";
import { createHash } from "node:crypto";

const KEY = "board";
const MAX_PLAYERS = 20000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const LIMITS = { stars: 54, gems: 18, scrolls: 36, done: 18 };

const json = (status, body, extra) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...(extra || {}) },
  });
const hash = (s) => createHash("sha256").update(String(s)).digest("hex");
const cleanName = (n) => {
  const s = String(n || "").replace(/[<>"&\u0000-\u001f\u007f]/g, "").replace(/\s+/g, " ").trim().slice(0, 18);
  return s || "Pengembara";
};
const int = (v) => (Number.isInteger(v) ? v : NaN);

export function topList(board) {
  return Object.entries(board.players || {})
    .map(([id, p]) => ({ id, name: p.name, score: p.score, stars: p.stars, gems: p.gems, scrolls: p.scrolls, done: p.done, t: p.t }))
    .sort((a, b) => b.score - a.score || a.t - b.t)
    .slice(0, 30)
    .map(({ t, ...rest }) => rest);
}

// Baca-ubah-tulis dengan semakan ETag supaya dua tulisan serentak tidak saling menindih.
async function update(store, mutate) {
  for (let attempt = 0; attempt < 6; attempt++) {
    const cur = await store.getWithMetadata(KEY, { type: "json" });
    const board = (cur && cur.data) || { players: {} };
    const res = mutate(board);
    if (res.error) return res;
    if (!res.changed) return { ok: true };
    const w = cur && cur.etag
      ? await store.setJSON(KEY, board, { onlyIfMatch: cur.etag })
      : await store.setJSON(KEY, board, { onlyIfNew: true });
    if (w.modified) return { ok: true };
    await new Promise((r) => setTimeout(r, 40 + Math.random() * 120));
  }
  return { error: [503, "busy"] };
}

export async function handle(req, store) {
  if (req.method === "GET") {
    const board = (await store.get(KEY, { type: "json" })) || { players: {} };
    return json(200, topList(board));
  }
  if (req.method !== "POST") return json(405, { error: "method" });
  const raw = await req.text();
  if (raw.length > 2000) return json(413, { error: "too large" });
  let b;
  try { b = JSON.parse(raw); } catch { return json(400, { error: "bad json" }); }
  if (!b || !UUID.test(String(b.id)) || typeof b.secret !== "string" || b.secret.length < 24 || b.secret.length > 200)
    return json(400, { error: "bad identity" });
  const id = String(b.id).toLowerCase(), h = hash(b.secret);

  if (b.action === "delete") {
    const r = await update(store, (board) => {
      const p = board.players[id];
      if (!p) return { changed: false };
      if (p.h !== h) return { error: [403, "not owner"] };
      delete board.players[id];
      return { changed: true };
    });
    return r.error ? json(r.error[0], { error: r.error[1] }) : json(200, { ok: true });
  }

  if (b.action === "submit") {
    const v = { stars: int(b.stars), gems: int(b.gems), scrolls: int(b.scrolls), done: int(b.done), score: int(b.score) };
    for (const k of Object.keys(LIMITS)) if (!(v[k] >= 0 && v[k] <= LIMITS[k])) return json(400, { error: "bad " + k });
    if (v.score !== v.stars * 10 + v.gems * 5 + v.scrolls * 3) return json(400, { error: "score mismatch" });
    const name = cleanName(b.name), now = Date.now();
    const r = await update(store, (board) => {
      const p = board.players[id];
      if (p) {
        if (p.h !== h) return { error: [403, "not owner"] };
        if (now - p.t < 2000) return { changed: false }; // had kekerapan
      } else {
        if (Object.keys(board.players).length >= MAX_PLAYERS) return { error: [507, "full"] };
        // had pemain baru: maksimum 30 seminit untuk seluruh game (halang spam)
        board.rec = (board.rec || []).filter((t) => now - t < 60000);
        if (board.rec.length >= 30) return { error: [429, "busy"] };
        board.rec.push(now);
      }
      board.players[id] = { h, name, ...v, t: now };
      return { changed: true };
    });
    return r.error ? json(r.error[0], { error: r.error[1] }) : json(200, { ok: true });
  }
  return json(400, { error: "bad action" });
}

export default async (req) => handle(req, getStore({ name: "jejak-sirah", consistency: "strong" }));

export const config = { path: "/api/scores" };
