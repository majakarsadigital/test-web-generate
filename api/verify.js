import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

export default async function handler(req, res) {

  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  const { token } = req.body;

  const data =
    await redis.get(
      `token:${token}`
    );

  if (!data) {
    return res.status(404).json({
      valid: false
    });
  }

  return res.status(200).json({
    valid: true,
    username: data.username
  });
}