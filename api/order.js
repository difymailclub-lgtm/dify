import { rpc, json, handle, resolveOrder } from './_lib.js'

// GET /api/order?t=<secret token>   (guest link)   or   GET /api/order?id=<uuid> with a signed-in owner's JWT
export const GET = handle(async (req) => {
  const u = new URL(req.url)
  const o = await resolveOrder(req, { t: u.searchParams.get('t'), id: u.searchParams.get('id') })
  return json(await rpc('get_order_by_token', { p_token_hash: o.public_token_hash }))
})
