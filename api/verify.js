import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { token } = req.body;

  // 1. Validasi input
  if (!token || typeof token !== "string" || token.trim() === "") {
    return res.status(400).json({ error: "Token is required" });
  }

  try {
    const data = await redis.get(`token:${token}`);

    if (!data) {
      return res.status(404).json({ success: false });
    }

    // 2. Validasi struktur data dari Redis
    if (typeof data !== "object" || !data.username) {
      return res.status(500).json({ error: "Invalid token data" });
    }

    return res.status(200).json({
      success: true,
      username: data.username
    });
  } catch (err) {
    // 3. Handle Redis error
    console.error("Redis error:", err.message); // log pesan, bukan token
    return res.status(503).json({ error: "Service unavailable" });
  }
}