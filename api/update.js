import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

export default async function handler(req, res) {

  if (req.method !== 'POST') {
    return res.status(405).json({
      message: 'Method not allowed'
    });
  }

  try {

    const { token, spinChange, matchResult } = req.body;

    if (!token) {
      return res.status(400).json({
        message: 'Token diperlukan'
      });
    }

    const userKey = `token:${token}`;
    const userRaw = await redis.get(userKey);

    if (!userRaw) {
      return res.status(404).json({
        message: 'User tidak ditemukan'
      });
    }

    let user;

    try {
        user = typeof userRaw === 'string'
            ? JSON.parse(userRaw)
            : userRaw;
    } catch (err) {
        throw new Error('Data user corrupt di Redis');
    }


    // default spin
    let spin = user.spin || 0;

    const change = spinChange ?? -1;

    spin += change;

    if (spin < 0) spin = 0;

    user.spin = spin;

    if (matchResult && matchResult.length === 3) {

        const winCategory = calculateWinnerCategory(matchResult);

        if (winCategory === 'Legendary') user.legendary++;
        if (winCategory === 'Langka') user.langka++;
        if (winCategory === 'Common') user.common++;
    }

    // update ke redis
    await redis.set(userKey, JSON.stringify(user));

    return res.status(200).json({
      success: true,
      spin: user.spin,
      message: 'Spin berhasil diupdate'
    });

  } catch (err) {

    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: err.message
    });
  }
  
}

function calculateWinnerCategory(matchResult) {

  const count = {
    Legendary: 0,
    Langka: 0,
    Common: 0
  };

  for (const r of matchResult) {
    count[r.category]++;
  }

  let winner = 'Common';
  let max = 0;

  for (const key in count) {
    if (count[key] > max) {
      max = count[key];
      winner = key;
    }
  }

  return winner;
}