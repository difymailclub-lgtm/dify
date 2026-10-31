import { db, rpc, json, handle, readJson, HttpError, clientIp, userFrom, sha256, newToken } from './_lib.js'

const E164 = /^\+[1-9][0-9]{6,14}$/
const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '')
// Pakistani numbers typed the local way (03xx…) become +923xx…; anything else must already be international.
export const normalizePhone = (raw) => {
  const d = String(raw || '').replace(/[\s()-]/g, '')
  if (!d) return null
  if (/^0\d{10}$/.test(d)) return '+92' + d.slice(1)
  if (/^92\d{10}$/.test(d)) return '+' + d
  return E164.test(d) ? d : 'invalid'
}

export const POST = handle(async (req) => {
  const b = await readJson(req)
  const items = Array.isArray(b.items) ? b.items.slice(0, 50) : []
  if (!items.length) throw new HttpError(400, 'Your cart is empty')
  if (!['bank_transfer', 'cod'].includes(b.method)) throw new HttpError(400, 'Choose a payment method')
  const key = str(b.key, 100)
  if (key.length < 16) throw new HttpError(400, 'Missing checkout key')
  const phone = normalizePhone(b.phone)
  if (phone === 'invalid') throw new HttpError(400, 'Enter a valid phone number, e.g. 0300 1234567 or +92 300 1234567')
  const a = b.address || {}
  const address = { name: str(a.name, 120), line1: str(a.line1, 200), line2: str(a.line2, 200), city: str(a.city, 80), region: str(a.region, 80), postal_code: str(a.postal_code, 20), country: str(a.country, 2) || 'PK' }

  // cart lines reference variants by SKU (stable across catalog edits); the DB prices everything itself
  const skus = [...new Set(items.map((i) => str(i.sku, 80)).filter(Boolean))]
  const { data: variants } = await db.from('variants').select('id, sku').in('sku', skus)
  const bySku = Object.fromEntries((variants || []).map((v) => [v.sku, v.id]))
  const p_items = items.map((i) => {
    const id = bySku[str(i.sku, 80)]
    if (!id) throw new HttpError(400, 'One of the items in your cart is no longer available')
    return { variant_id: id, quantity: Number(i.quantity) }
  })

  const user = await userFrom(req)
  const token = newToken()
  const order = await rpc('place_order', {
    p_items, p_email: str(b.email, 254), p_phone: phone, p_address: address, p_method: b.method,
    p_token_hash: sha256(token), p_idempotency_key: key, p_ip: clientIp(req),
    p_discount_code: str(b.code, 32) || null, p_gift_note: str(b.gift_note, 250) || null,
    p_user_id: user?.id || null, p_marketing: !!b.marketing, p_whatsapp: !!b.whatsapp,
  })
  // A retried checkout returns the original order; its token was issued with the first response, so send
  // the id too (signed-in owners can always open /order?id=...).
  const retried = order.public_token_hash !== sha256(token)
  return json({ id: order.id, number: order.number, status: order.status, token: retried ? null : token, retried })
})
