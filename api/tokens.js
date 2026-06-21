import { Redis } from '@upstash/redis';

const redis = new Redis({
  url:   process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export default async function handler(req, res) {
  if (req.method === 'GET')    return handleGet(req, res);
  if (req.method === 'DELETE') return handleDelete(req, res);
  return res.status(405).json({ message: 'Method not allowed' });
}

// ──────────────────────────────────────────────────────────────
//  GET /api/tokens
//  SCAN semua key "token:*" → mget → return array
// ──────────────────────────────────────────────────────────────
async function handleGet(req, res) {
  try {
    // 1. Scan seluruh keyspace dengan pattern token:*
    //    Upstash scan: redis.scan(cursor, { match, count })
    const allKeys = [];
    let cursor = 0;

    do {
      const [nextCursor, keys] = await redis.scan(cursor, {
        match: 'token:*',
        count: 100,
      });
      allKeys.push(...keys);
      cursor = Number(nextCursor);
    } while (cursor !== 0);

    if (allKeys.length === 0) {
      return res.status(200).json({ tokens: [] });
    }

    // 2. mget semua sekaligus
    const records = await redis.mget(...allKeys);

    // 3. Parse tiap record
    const tokens = records.map((raw, i) => {
        if (raw === null || raw === undefined) return null;

        try {
          const data = typeof raw === 'string' ? JSON.parse(raw) : raw;

          // Ekstrak username dari key kalau field tidak ada
          const usernameFromKey = allKeys[i].replace(/^token:/, '');

          const tokenValue = allKeys[i].replace(/^token:/, '');

          return {
            username:  data.username  ?? usernameFromKey,
            token:     data.token     ?? tokenValue,
            role:      data.role      ?? 'user',
            note:      data.note      ?? '',
            createdAt: normalizeDate(data.createdAt),
            expiresAt: normalizeDate(data.expiresAt),
          };
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    // 4. Sort: terbaru di atas
    tokens.sort((a, b) => {
      const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return tb - ta;
    });

    return res.status(200).json({ tokens });

  } catch (err) {
    console.error('[GET /api/tokens]', err);
    return res.status(500).json({ message: 'Gagal memuat token dari Redis', error: err.message });
  }
}

// ──────────────────────────────────────────────────────────────
//  DELETE /api/tokens?u=username
//  Del key token:<username>, dan srem dari index jika ada
// ──────────────────────────────────────────────────────────────
async function handleDelete(req, res) {
  const token =
  req.query?.token ||
  req.body?.token;

  if (!token) {
    return res.status(400).json({ message: 'Token diperlukan' });
  }

  try {
    const key    = `token:${token}`;
    const exists = await redis.exists(key);

    if (!exists) {
      return res.status(404).json({ message: `Token untuk "${token}" tidak ditemukan` });
    }

    // Hapus key + srem dari index kalau ada (tidak error kalau tidak ada)
    const pipe = redis.pipeline();
    pipe.del(key);
    pipe.srem('token_index', token); // aman meski SET tidak ada
    await pipe.exec();

    return res.status(200).json({ message: `Token "${token}" berhasil dihapus` });

  } catch (err) {
    console.error('[DELETE /api/tokens]', err);
    return res.status(500).json({ message: 'Gagal menghapus token', error: err.message });
  }
}

// ──────────────────────────────────────────────────────────────
//  HELPER: normalizeDate
//  Terima Unix ms (number/string) atau ISO string → ISO string
//  Return null kalau tidak valid
// ──────────────────────────────────────────────────────────────
function normalizeDate(value) {
  if (!value) return null;

  // Kalau angka atau string angka → Unix ms
  const num = Number(value);
  if (!isNaN(num) && num > 1_000_000_000_000) {
    return new Date(num).toISOString();
  }

  // Coba parse sebagai ISO / date string
  const d = new Date(value);
  if (!isNaN(d.getTime())) return d.toISOString();

  return null;
}