import { Redis } from "@upstash/redis";
import crypto from "crypto";

const redis = Redis.fromEnv();

function generateToken() {
  return crypto
    .randomBytes(8)
    .toString("hex")
    .toUpperCase();
}

export default async function handler(req, res) {

  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed",
    });
  }

  let { username } = req.body;
  let { role } = req.body;

  if (!username) {
    return res.status(400).json({
      error: "Username kosong",
    });
  }

  if (!role) {
    return res.status(400).json({
      error: "Role kosong",
    });
  }

  // Cari jumlah username yang sama
  const usernameCountKey = `username_count:${username}`;
  const count = await redis.incr(usernameCountKey);

  // Username pertama tetap asli
  if (count > 1) {
    username = `${username} (${count})`;
  }

  let token = generateToken();

  while (await redis.get(`token:${token}`)) {
    token = generateToken();
  }

  await redis.set(`token:${token}`, {
    username,
    role: role,
    createdAt: Date.now(),
  });

  return res.status(200).json({
    success: true,
    username,
    token
  });
}