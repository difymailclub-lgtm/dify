// End-to-end smoke test: add to cart -> checkout -> order appears in admin with stock reduced.
// 1) npm run dev
// 2) "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --remote-debugging-port=9333 --user-data-dir=/tmp/smoke-prof about:blank &
// 3) node --experimental-websocket scripts/smoke.mjs [port=9333] [base=http://localhost:5173] [width=390]
const [port = '9333', base = 'http://localhost:5173', width = '390'] = process.argv.slice(2)
const tab = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })).json()
const ws = new WebSocket(tab.webSocketDebuggerUrl)
let id = 0
const pending = {}
const errors = []
ws.onmessage = (m) => {
  const d = JSON.parse(m.data)
  if (d.id && pending[d.id]) pending[d.id](d.result || d.error)
  if (d.method === 'Runtime.exceptionThrown') errors.push(d.params.exceptionDetails.exception?.description?.split('\n')[0])
}
await new Promise((r) => (ws.onopen = r))
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending[i] = r; ws.send(JSON.stringify({ id: i, method, params })) })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const run = async (js) => (await send('Runtime.evaluate', { expression: `(async () => { ${js} })()`, awaitPromise: true, returnByValue: true })).result?.value
const go = async (path) => { await send('Page.navigate', { url: base + path }); await wait(1500) }
// helpers injected per page: click by text, set React-controlled inputs
const H = `const click = (t, sel = 'button,a') => { const el = [...document.querySelectorAll(sel)].find((e) => e.textContent.trim().startsWith(t)); if (!el) throw new Error('no element: ' + t); el.click() };
  const fill = (id, v) => { const el = document.getElementById(id); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, v); el.dispatchEvent(new Event('input', { bubbles: true })) };
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));`
const check = (ok, msg) => { console.log(ok ? 'PASS' : 'FAIL', msg); if (!ok) process.exitCode = 1 }

await send('Runtime.enable')
await send('Page.enable')
await send('Emulation.setDeviceMetricsOverride', { width: +width, height: 844, deviceScaleFactor: 1, mobile: +width < 500 })
await go('/')
await run(`localStorage.clear(); sessionStorage.clear(); localStorage.setItem('popup-seen', 'true')`)

await go('/products/countdown-calendar')
const before = await run(`return JSON.parse(localStorage.getItem('store-v1') || 'null')?.products?.find((p) => p.slug === 'countdown-calendar')?.stock ?? 7`)
await run(`${H} click('Add to Cart —'); await sleep(300); return document.querySelector('.cart-btn em')?.textContent`).then((n) => check(n === '1', `cart badge shows 1 (got ${n})`))

await go('/checkout')
const step2 = await run(`${H} click('Continue to shipping'); await sleep(200); return !!document.querySelector('.err-summary')`)
check(step2, 'empty form shows error summary')
await run(`${H} fill('f-email', 'test@example.test'); fill('f-first', 'Test'); fill('f-last', 'Buyer'); fill('f-address', '1 Demo St'); fill('f-city', 'Portland'); fill('f-state', 'OR'); fill('f-zip', '97201'); await sleep(100);
  click('Continue to shipping'); await sleep(300); click('Continue to payment'); await sleep(300); click('Pay now'); await sleep(800)`)
const ty = await run(`return location.pathname`)
check(ty.startsWith('/checkout/thank-you/'), `lands on thank-you page (${ty})`)

await go('/admin')
await run(`${H} fill('pass', 'admin'); await sleep(50); click('Log in'); await sleep(500)`)
await go('/admin/orders')
const rows = await run(`return document.querySelectorAll('.a-table tbody tr th a').length`)
check(rows === 1, `admin lists 1 order (got ${rows})`)
await go('/admin/products')
const after = await run(`return +[...document.querySelectorAll('.a-table tbody tr')].find((r) => r.textContent.includes('Countdown'))?.querySelector('.a-stock')?.value`)
check(after === before - 1, `stock decremented ${before} -> ${after}`)
check(!errors.length, `no runtime errors ${errors.length ? JSON.stringify(errors) : ''}`)
ws.close()
process.exit()
