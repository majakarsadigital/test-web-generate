import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

/* export default async function handler(req, res) {

  if (req.method !== 'POST') {
    return res.status(405).json({
      message: 'Method not allowed'
    });
  }

  try {

    const { token, spinChange } = req.body;

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

    const user = JSON.parse(userRaw);

    // default spin
    let spin = user.spin || 0;

    const change = spinChange ?? -1;

    spin += change;

    if (spin < 0) spin = 0;

    user.spin = spin;

    // update ke redis
    await redis.set(userKey, JSON.stringify(user));

    return res.status(200).json({
      success: true,
      spin: user.spin,
      message: 'Spin berhasil diupdate'
    });

  } catch (err) {

    console.error('[UPDATE SPIN ERROR]', err);

    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: err.message
    });
  }
} */

export default async function handler(req, res) {

  if (req.method !== 'POST') {
    return res.status(405).json({
      message: 'Method not allowed'
    });
  }

  try {

    const { token, spinChange } = req.body;

    console.log('[UPDATE SPIN] Incoming request:', {
      token,
      spinChange
    });

    if (!token) {
      return res.status(400).json({
        message: 'Token diperlukan'
      });
    }

    const userKey = `token:${token}`;
    const userRaw = await redis.get(userKey);

    console.log('[UPDATE SPIN] RAW USER:', userRaw);

    if (!userRaw) {
      console.log('[UPDATE SPIN] USER NOT FOUND');
      return res.status(404).json({
        message: 'User tidak ditemukan'
      });
    }

    // const user = JSON.parse(userRaw);
    let user;

    try {
        user = typeof userRaw === 'string'
            ? JSON.parse(userRaw)
            : userRaw;
    } catch (err) {
        console.error('[PARSE ERROR]', userRaw);
        throw new Error('Data user corrupt di Redis');
    }

    console.log('[UPDATE SPIN] PARSED USER:', user);

    // default spin
    let spin = user.spin || 0;

    const change = spinChange ?? -1;

    console.log('[UPDATE SPIN] BEFORE UPDATE:', {
      username: user.username,
      currentSpin: spin,
      change
    });

    spin += change;

    if (spin < 0) spin = 0;

    user.spin = spin;

    console.log('[UPDATE SPIN] AFTER UPDATE:', {
      username: user.username,
      newSpin: user.spin
    });

    // update ke redis
    await redis.set(userKey, JSON.stringify(user));

    console.log('[UPDATE SPIN] SAVED TO REDIS SUCCESS');

    return res.status(200).json({
      success: true,
      spin: user.spin,
      message: 'Spin berhasil diupdate'
    });

  } catch (err) {

    console.error('[UPDATE SPIN ERROR]', err);

    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: err.message
    });
  }
}