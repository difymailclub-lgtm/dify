import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// Dev-only bridge: serves /api/*.js (Vercel-style `export const GET/POST = (Request) => Response`)
// from the Vite dev server, with server-only env vars loaded from .env. On Vercel this plugin is unused.
function apiDev() {
  return {
    name: 'api-dev',
    apply: 'serve',
    configureServer(server) {
      const env = loadEnv(server.config.mode, server.config.root, '')
      for (const k of Object.keys(env)) if (!k.startsWith('VITE_') && process.env[k] === undefined) process.env[k] = env[k]
      server.middlewares.use(async (req, res, next) => {
        const m = req.url.match(/^\/api\/([a-z0-9_-]+)(\?.*)?$/i)
        if (!m) return next()
        try {
          const mod = await server.ssrLoadModule(`/api/${m[1]}.js`)
          const fn = mod[req.method]
          if (!fn) { res.statusCode = 405; return res.end('Method not allowed') }
          const chunks = []
          for await (const c of req) chunks.push(c)
          const body = ['GET', 'HEAD'].includes(req.method) ? undefined : Buffer.concat(chunks)
          const headers = new Headers()
          for (const [k, v] of Object.entries(req.headers)) if (typeof v === 'string') headers.set(k, v)
          if (!headers.has('x-forwarded-for')) headers.set('x-forwarded-for', req.socket.remoteAddress || '127.0.0.1')
          const out = await fn(new Request(`http://${req.headers.host}${req.url}`, { method: req.method, headers, body }))
          res.statusCode = out.status
          out.headers.forEach((v, k) => res.setHeader(k, v))
          res.end(Buffer.from(await out.arrayBuffer()))
        } catch (e) {
          console.error(e)
          res.statusCode = 500
          res.end(JSON.stringify({ error: 'Dev API error: ' + e.message }))
        }
      })
    },
  }
}

export default defineConfig({ plugins: [react(), apiDev()] })
