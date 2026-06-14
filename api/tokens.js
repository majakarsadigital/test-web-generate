// ─────────────────────────────────────────────────────────────
//  /api/tokens.js  —  Next.js Serverless Route
//
//  GET    /api/tokens              → list semua token dari Redis
//  DELETE /api/tokens?u=username   → hapus token by username
//
//  Redis key convention (sama seperti /api/generate):
//    token:<username>  →  JSON string of TokenRecord
//    token_index       →  Redis SET berisi semua username
// ─────────────────────────────────────────────────────────────

import { Redis } from '@upstash/redis';

const redis = new Redis({
  url:   process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

// ── Bentuk data yang tersimpan di Redis ──────────────────────
//  {
//    username:  string
//    token:     string   (UUID / JWT / random)
//    role:      string
//    note:      string
//    createdAt: ISO string
//    expiresAt: ISO string
//  }
// ─────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  if (req.method === 'GET') {
    return handleGet(req, res);
  }

  if (req.method === 'DELETE') {
    return handleDelete(req, res);
  }

  return res.status(405).json({ message: 'Method not allowed' });
}

// ──────────────────────────────────────────────────────────────
//  GET /api/tokens
//  Ambil semua username dari index set, lalu mget semua record
// ──────────────────────────────────────────────────────────────
async function handleGet(req, res) {
  try {
    // 1. Ambil daftar username dari SET index
    const usernames = await redis.smembers('token_index');

    if (!usernames || usernames.length === 0) {
      return res.status(200).json({ tokens: [] });
    }

    // 2. Ambil semua token record sekaligus (pipeline)
    const keys    = usernames.map(u => `token:${u}`);
    const records = await redis.mget(...keys);

    // 3. Parse & filter null (kalau ada key yang sudah tidak ada)
    const tokens = records
      .map((raw, i) => {
        if (!raw) return null;
        try {
          const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
          return {
            username:  data.username  ?? usernames[i],
            token:     data.token     ?? '—',
            role:      data.role      ?? 'user',
            note:      data.note      ?? '',
            createdAt: data.createdAt ?? null,
            expiresAt: data.expiresAt ?? null,
          };
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    // 4. Urutkan: terbaru di atas
    tokens.sort((a, b) =>
      new Date(b.createdAt ?? 0) - new Date(a.createdAt ?? 0)
    );

    return res.status(200).json({ tokens });

  } catch (err) {
    console.error('[GET /api/tokens]', err);
    return res.status(500).json({ message: 'Gagal memuat token dari Redis' });
  }
}

// ──────────────────────────────────────────────────────────────
//  DELETE /api/tokens?u=username
//  Hapus token record + keluarkan dari index set
// ──────────────────────────────────────────────────────────────
async function handleDelete(req, res) {
  // Username bisa dari query string (?u=...) atau body JSON
  const username =
    req.query?.u ||
    req.query?.username ||
    req.body?.username;

  if (!username) {
    return res.status(400).json({ message: 'Username diperlukan' });
  }

  try {
    // Cek apakah token ada
    const exists = await redis.exists(`token:${username}`);

    if (!exists) {
      return res.status(404).json({ message: `Token untuk "${username}" tidak ditemukan` });
    }

    // Hapus record + keluarkan dari index (atomic via pipeline)
    const pipe = redis.pipeline();
    pipe.del(`token:${username}`);
    pipe.srem('token_index', username);
    await pipe.exec();

    return res.status(200).json({ message: `Token "${username}" berhasil dihapus` });

  } catch (err) {
    console.error('[DELETE /api/tokens]', err);
    return res.status(500).json({ message: 'Gagal menghapus token dari Redis' });
  }
}