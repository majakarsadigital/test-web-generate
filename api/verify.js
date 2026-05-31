import { kv } from "@vercel/kv";

export default async function handler(
  req,
  res
){

  const { token } = req.body;

  const data =
    await kv.get(`token:${token}`);

  if(!data){

    return res.json({
      valid:false
    });
  }

  res.json({
    valid:true,
    username:data.username
  });
}