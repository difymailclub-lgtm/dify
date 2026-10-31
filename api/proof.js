import { db, rpc, json, handle, readJson, HttpError, resolveOrder, limit, clientIp } from './_lib.js'

const TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'application/pdf': 'pdf' }

// POST { t | id, step: 'start', type }  -> one-time signed upload URL into the private bucket
// POST { t | id, step: 'done',  path }  -> records the proof and moves the order to payment review
export const POST = handle(async (req) => {
  const b = await readJson(req)
  const o = await resolveOrder(req, b)
  if (o.status !== 'awaiting_payment') throw new HttpError(400, 'This order is not waiting for a payment screenshot')
  const ip = clientIp(req)
  if (ip) await limit(`proof:ip:${ip}`, 20, 3600)

  if (b.step === 'start') {
    const ext = TYPES[b.type]
    if (!ext) throw new HttpError(400, 'Upload a JPG, PNG, WebP or PDF')
    const path = `${o.id}/${Date.now()}.${ext}`
    const { data, error } = await db.storage.from('payment-proofs').createSignedUploadUrl(path)
    if (error) throw new HttpError(500, 'Could not start the upload')
    return json({ path, token: data.token })
  }
  if (b.step === 'done') {
    const path = String(b.path || '')
    if (!path.startsWith(`${o.id}/`)) throw new HttpError(400, 'Invalid file')
    const { data: head } = await db.storage.from('payment-proofs').list(o.id, { search: path.split('/')[1] })
    if (!head?.length) throw new HttpError(400, 'The file did not finish uploading')
    const order = await rpc('submit_payment_proof', { p_token_hash: o.public_token_hash, p_file_path: path })
    return json({ status: order.status })
  }
  throw new HttpError(400, 'Unknown step')
})
