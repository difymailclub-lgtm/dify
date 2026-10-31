import { db, json, handle, readJson, HttpError, limit, clientIp } from './_lib.js'

// POST { email, source }  -> newsletter signup (rate limited per IP; table is not writable from the browser)
export const POST = handle(async (req) => {
  const b = await readJson(req)
  const email = String(b.email || '').trim().toLowerCase().slice(0, 254)
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new HttpError(400, 'Enter a valid email address')
  const ip = clientIp(req)
  if (ip) await limit(`subscribe:ip:${ip}`, 5, 3600)
  const { error } = await db.from('subscribers').upsert({ email, source: String(b.source || 'site').slice(0, 40) }, { onConflict: 'email', ignoreDuplicates: true })
  if (error) throw new HttpError(500, 'Could not save your email right now')
  return json({ ok: true })
})
