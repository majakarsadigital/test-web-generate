import { Redis } from '@upstash/redis';
export default async function handler(req, res) {

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

    // ambil user dari redis (sesuaikan struktur kamu)
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

    // kalau tidak kirim parameter, default -1 (dipakai untuk spin)
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
}