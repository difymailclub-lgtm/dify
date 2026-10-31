import { rpc, json, handle, readJson, HttpError, resolveOrder, limit, clientIp } from './_lib.js'

// POST { t | id, confirm: true|false }  -> cash-on-delivery customer confirms or cancels from the order page
export const POST = handle(async (req) => {
  const b = await readJson(req)
  if (typeof b.confirm !== 'boolean') throw new HttpError(400, 'Missing answer')
  const o = await resolveOrder(req, b)
  const ip = clientIp(req)
  if (ip) await limit(`respond:ip:${ip}`, 30, 3600)
  const order = await rpc('respond_by_order_token', { p_token_hash: o.public_token_hash, p_confirm: b.confirm })
  return json({ status: order.status })
})
