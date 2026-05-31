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
      error: "Method not allowed"
    });
  }

  const { username } = req.body;

  if (!username) {
    return res.status(400).json({
      error: "Username kosong"
    });
  }

  let token = generateToken();

  while (
    await redis.get(`token:${token}`)
  ) {
    token = generateToken();
  }

  await redis.set(
    `token:${token}`,
    {
      username,
      createdAt: Date.now()
    }
  );

  return res.status(200).json({
    success: true,
    username,
    token
  });
}