// Shared helpers for Vercel functions. Runs with the Supabase SECRET key: never import from the browser.
import { createClient } from '@supabase/supabase-js'
import { createHash, randomBytes } from 'node:crypto'

const URL = process.env.SUPABASE_URL || 'https://pjxbvsgbvgfwbvrbdpct.supabase.co'
const SECRET = process.env.SUPABASE_SECRET_KEY
if (!SECRET) console.error('SUPABASE_SECRET_KEY is not set')

export const db = createClient(URL, SECRET, { auth: { persistSession: false, autoRefreshToken: false } })

export const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } })
export const fail = (message, status = 400) => json({ error: message }, status)

export class HttpError extends Error { constructor(status, message) { super(message); this.status = status } }

// Postgres errors raised by our functions carry a user-facing message; map SQLSTATE -> HTTP status.
export const dbStatus = (e) => (e?.code === 'PT429' ? 429 : e?.code === '42501' ? 403 : e?.code === 'P0002' ? 404 : e?.code === '22023' ? 400 : e?.code === '23514' ? 400 : 500)
export const rpc = async (fn, args) => {
  const { data, error } = await db.rpc(fn, args)
  if (error) throw new HttpError(dbStatus(error), dbStatus(error) === 500 ? 'Something went wrong on our side. Please try again.' : error.message)
  return data
}

export const sha256 = (s) => createHash('sha256').update(s).digest('hex')
export const newToken = () => randomBytes(32).toString('base64url')

export const clientIp = (req) => {
  const h = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || ''
  const ip = h.split(',')[0].trim()
  return /^[\d.]+$|^[0-9a-f:]+$/i.test(ip) ? ip : null
}

export async function readJson(req, max = 64 * 1024) {
  const text = await req.text()
  if (text.length > max) throw new HttpError(413, 'Request too large')
  try { return JSON.parse(text || '{}') } catch { throw new HttpError(400, 'Invalid JSON') }
}

// Signed-in caller (optional). Returns { id, email } or null; a bad token is treated as anonymous.
export async function userFrom(req) {
  const auth = req.headers.get('authorization') || ''
  const jwt = auth.startsWith('Bearer ') ? auth.slice(7) : null
  if (!jwt) return null
  const { data, error } = await db.auth.getUser(jwt)
  return error ? null : { id: data.user.id, email: data.user.email }
}

// Resolve an order the caller may act on: by secret link token (?t= / body.t) or by id when signed in as its owner.
// Returns the row including public_token_hash so token-based DB functions can be reused.
export async function resolveOrder(req, params) {
  const t = params.t
  if (t) {
    const { data } = await db.from('orders').select('*').eq('public_token_hash', sha256(String(t))).maybeSingle()
    if (!data) throw new HttpError(404, 'Order not found')
    return data
  }
  const user = await userFrom(req)
  if (!user || !params.id) throw new HttpError(404, 'Order not found')
  const { data } = await db.from('orders').select('*').eq('id', params.id).eq('user_id', user.id).maybeSingle()
  if (!data) throw new HttpError(404, 'Order not found')
  return data
}

export const limit = (bucket, max, seconds) => rpc('check_rate_limit', { p_bucket: bucket, p_max: max, p_window_seconds: seconds })

export const handle = (fn) => async (req) => {
  try { return await fn(req) } catch (e) {
    if (e instanceof HttpError) return fail(e.message, e.status)
    console.error(e)
    return fail('Something went wrong on our side. Please try again.', 500)
  }
}
