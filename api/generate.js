import { kv } from "@vercel/kv";
import crypto from "crypto";

function createToken() {

  return crypto
    .randomBytes(8)
    .toString("hex")
    .toUpperCase();
}

export default async function handler(
  req,
  res
){

  if(req.method !== "POST"){
    return res.status(405).end();
  }

  const { username } = req.body;

  if(!username){
    return res.status(400).json({
      error:"Username required"
    });
  }

  const token = createToken();

  await kv.set(
    `token:${token}`,
    {
      username,
      createdAt: Date.now()
    }
  );

  await kv.set(
    `user:${username}`,
    token
  );

  res.json({
    username,
    token
  });
}