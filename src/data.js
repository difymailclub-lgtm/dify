// All copy is original placeholder content for a fictional brand.
export const BRAND = 'Brinebird'

// tin = colors for the illustrated placeholder tin
export const products = [
  { slug: 'hot-smoked-coho', name: 'Hot-Smoked Coho Salmon', price: 12, cat: ['tinned-fish', 'best-sellers'], badge: 'Best Seller', tin: ['#f04a49', '#fdcd62'], fish: 'Salmon', origin: 'Pacific Northwest', protein: 21, omega: 1.6, mercury: 'Very low',
    desc: 'Coho salmon brined lightly, smoked over alder, then packed in olive oil. Flaky, rich and gently smoky — the tin that converts skeptics.' },
  { slug: 'coho-black-garlic', name: 'Coho Salmon with Black Garlic Oil', price: 14, cat: ['tinned-fish', 'new'], badge: 'New', tin: ['#272d45', '#c7e0c3'], fish: 'Salmon', origin: 'Pacific Northwest', protein: 20, omega: 1.5, mercury: 'Very low',
    desc: 'Our smoked coho finished with slow-roasted black garlic oil. Sweet, savory, a little molasses-y. Spoon it over hot rice.' },
  { slug: 'albacore-chili-oil', name: 'Albacore in Calabrian Chili Oil', price: 13, cat: ['tinned-fish', 'best-sellers'], tin: ['#fdcd62', '#f04a49'], fish: 'Tuna', origin: 'Oregon Coast', protein: 24, omega: 1.1, mercury: 'Low',
    desc: 'Pole-caught young albacore, hand-packed raw and cooked once in the tin with fruity chili oil. Big chunks, real heat.' },
  { slug: 'sardines-orange-fennel', name: 'Sardines with Orange & Fennel', price: 9, cat: ['tinned-fish'], tin: ['#73c3f5', '#fdcd62'], fish: 'Sardines', origin: 'Galicia, Spain', protein: 19, omega: 1.9, mercury: 'Very low',
    desc: 'Plump Galician sardines with sweet orange peel and toasted fennel seed. Bright enough for breakfast toast.' },
  { slug: 'anchovies-evoo', name: 'Cured Anchovy Fillets in EVOO', price: 16, stock: 12, cat: ['tinned-fish', 'best-sellers'], tin: ['#010101', '#fdcd62'], fish: 'Anchovies', origin: 'Bay of Biscay', protein: 25, omega: 2.0, mercury: 'Very low',
    desc: 'Salt-cured for months and hand-filleted. Meaty, buttery, not too salty. Drape over butter and bread and call it dinner.' },
  { slug: 'mackerel-peppercorn', name: 'Smoked Mackerel with Pink Peppercorn', price: 10, cat: ['tinned-fish'], tin: ['#c7e0c3', '#387cc0'], fish: 'Mackerel', origin: 'North Atlantic', protein: 18, omega: 2.4, mercury: 'Low',
    desc: 'Oak-smoked mackerel with crushed pink peppercorn. Floral, smoky, deeply rich — the omega-3 heavyweight.' },
  { slug: 'mussels-saffron', name: 'Mussels in Saffron Escabeche', price: 11, cat: ['tinned-fish', 'new'], badge: 'New', tin: ['#fdcd62', '#272d45'], fish: 'Mussels', origin: 'Galicia, Spain', protein: 15, omega: 0.8, mercury: 'Very low',
    desc: 'Rope-grown mussels fried then pickled in a saffron-paprika escabeche. Tangy, golden, and perfect with chips.' },
  { slug: 'starter-trio', name: 'The First Tin Trio', price: 33, cat: ['bundles', 'gifts', 'best-sellers'], badge: 'Save 10%', tin: ['#387cc0', '#fdcd62'], fish: 'Mixed', origin: 'Various', protein: 21, omega: 1.6, mercury: 'Very low',
    desc: 'Three of our most-loved tins in one box: hot-smoked coho, chili albacore and orange-fennel sardines. The ideal first date with tinned fish.' },
  { slug: 'dinner-party-box', name: 'The Dinner Party Box', price: 89, cat: ['bundles', 'gifts'], badge: 'Gift Ready', tin: ['#f04a49', '#73c3f5'], fish: 'Mixed', origin: 'Various', protein: 21, omega: 1.6, mercury: 'Very low',
    desc: 'Eight tins, a wooden serving board, and a folded card of pairing ideas. Unbox, open, impress.' },
  { slug: 'countdown-calendar', name: 'Seven Seas Countdown Calendar', price: 120, stock: 7, cat: ['gifts'], badge: 'Limited', tin: ['#010101', '#f04a49'], fish: 'Mixed', origin: 'Various', protein: 21, omega: 1.6, mercury: 'Very low',
    desc: 'A seven-door calendar with a surprise behind every flap: tins, a tiny tin opener, and one sweet treat shaped like a fish.' },
  { slug: 'serving-fork', name: 'Brass Tin Fork', price: 18, cat: ['merch', 'gifts'], tin: ['#fdcd62', '#010101'], fish: null,
    desc: 'A slim two-prong brass fork sized to reach every corner of a tin. Ages into a warm patina.' },
  { slug: 'bucket-hat', name: 'Tide Pool Bucket Hat', price: 38, cat: ['merch'], tin: ['#73c3f5', '#fff7e9'], fish: null,
    desc: 'Washed cotton canvas bucket hat with an embroidered sardine. One size fits most heads.' },
  { slug: 'cookbook', name: 'Open the Tin: A Cookbook', price: 30, stock: 0, cat: ['merch', 'gifts'], tin: ['#c7e0c3', '#f04a49'], fish: null,
    desc: 'Sixty-plus recipes built around the pantry tin — from five-minute toasts to slow Sunday stews.' },
  { slug: 'bundle-builder', name: 'Build Your Own Box', price: 0, cat: ['bundles'], tin: ['#fdcd62', '#73c3f5'], fish: null,
    desc: 'Pick six or more tins and save 15%.' },
]

export const collections = {
  all: { title: 'Shop All', blurb: 'Every tin, bundle and goodie we make.', bg: '#fff7e9' },
  'tinned-fish': { title: 'Tinned Fish', blurb: 'Responsibly sourced, chef-seasoned, ready the second you open the lid.', bg: '#73c3f5' },
  'best-sellers': { title: 'Best Sellers', blurb: 'The tins everyone keeps coming back for.', bg: '#fdcd62' },
  gifts: { title: 'Gifts', blurb: 'Gifts for the person who has everything except a great tin of fish.', bg: '#c7e0c3' },
  bundles: { title: 'Bundles', blurb: 'More tins, less per tin.', bg: '#f04a49' },
  merch: { title: 'Merch', blurb: 'Wear the fish. Serve the fish.', bg: '#fff7e9' },
  new: { title: 'New Arrivals', blurb: 'Fresh out of the cannery.', bg: '#fdcd62' },
}

export const featured = ['tinned-fish', 'gifts', 'bundles', 'best-sellers', 'merch']

export const valueProps = [
  { title: 'Chef-Seasoned', text: 'Every flavor is developed in a test kitchen, not a lab.' },
  { title: 'Traceable Catch', text: 'We name the boat, the bay and the cannery on every tin.' },
  { title: 'Ready Instantly', text: 'No cooking needed. Lid off, fork in.' },
  { title: 'Shelf-Stable', text: 'Keeps for years in the pantry, tastes like today.' },
]

export const canneries = [
  { name: 'Alder Point Smokehouse', place: 'Washington, USA', product: 'hot-smoked-coho', text: 'A three-generation family smokehouse that still splits its own alder. They taught us patience.' },
  { name: 'Conservas do Porto', place: 'Galicia, Spain', product: 'sardines-orange-fennel', text: 'A seaside cannery where every sardine is packed by hand, in the same building since the 1920s.' },
  { name: 'Cape Dory Tuna Co.', place: 'Oregon, USA', product: 'albacore-chili-oil', text: 'Small troll boats, single-day trips, and a tiny canning line right on the dock.' },
  { name: 'Biscay Salting House', place: 'Cantabria, Spain', product: 'anchovies-evoo', text: 'Anchovies cured in barrels for up to eight months before careful hand-filleting.' },
]

export const press = [
  { outlet: 'The Pantry Report', quote: 'Tins that taste like a restaurant made them.' },
  { outlet: 'Weeknight Weekly', quote: 'The smoked salmon is dangerously snackable.' },
  { outlet: 'Coastal Living Mag', quote: 'Finally, tinned fish with personality.' },
  { outlet: 'Gift Guide Daily', quote: 'Our most-gifted food item this season.' },
  { outlet: 'Food Nerd Pod', quote: 'Bold flavors, honest sourcing.' },
]

export const recipes = [
  { slug: 'crispy-rice-salmon-bowl', title: 'Crispy Rice Bowl with Smoked Coho', time: '20 min', serves: 2, product: 'coho-black-garlic', color: '#fdcd62',
    ingredients: ['2 cups day-old cooked rice', '1 tin Coho with Black Garlic Oil', '1 cucumber, thinly sliced', '2 scallions', '1 tbsp rice vinegar', 'Toasted sesame seeds', '1 soft-boiled egg (optional)'],
    steps: ['Heat a nonstick pan over medium-high and add a spoonful of oil from the tin.', 'Press the rice into an even layer and cook untouched for 6–8 minutes until deeply golden.', 'Toss the cucumber with rice vinegar and a pinch of salt.', 'Break the rice into crisp shards, top with salmon, cucumber, scallions and sesame.', 'Finish with the egg and a drizzle of the remaining tin oil.'] },
  { slug: 'chili-albacore-melt', title: 'Chili Albacore Melt', time: '15 min', serves: 2, product: 'albacore-chili-oil', color: '#f04a49',
    ingredients: ['1 tin Albacore in Calabrian Chili Oil', '2 tbsp mayonnaise', '1 tbsp chopped pickles', '4 slices sourdough', '4 slices sharp cheddar', 'Butter'],
    steps: ['Mix the tuna with mayo and pickles, keeping some chunks intact.', 'Butter the outside of each bread slice.', 'Layer cheese, tuna, then more cheese between two slices.', 'Cook in a skillet over medium heat, 3–4 minutes per side, until melty.'] },
  { slug: 'sardine-citrus-toast', title: 'Sardine Toast with Citrus & Herbs', time: '10 min', serves: 1, product: 'sardines-orange-fennel', color: '#73c3f5',
    ingredients: ['1 thick slice country bread', '1 tin Sardines with Orange & Fennel', 'Soft butter', 'A handful of parsley and dill', 'Flaky salt', 'Lemon wedge'],
    steps: ['Toast the bread until crisp at the edges.', 'Spread generously with butter.', 'Lay the sardines across and spoon over a little tin oil.', 'Pile on the herbs, squeeze lemon, finish with flaky salt.'] },
  { slug: 'escabeche-mussel-pasta', title: 'Five-Ingredient Mussel Pasta', time: '25 min', serves: 2, product: 'mussels-saffron', color: '#c7e0c3',
    ingredients: ['200g spaghetti', '1 tin Mussels in Saffron Escabeche', '2 garlic cloves', 'Splash of white wine', 'Parsley'],
    steps: ['Boil pasta in well-salted water.', 'Gently sizzle sliced garlic in the escabeche oil.', 'Add wine and reduce by half, then add the mussels.', 'Toss in the pasta with a splash of pasta water and parsley.'] },
  { slug: 'anchovy-butter-radishes', title: 'Anchovy Butter Radishes', time: '10 min', serves: 4, product: 'anchovies-evoo', color: '#fff7e9',
    ingredients: ['4 tbsp soft butter', '4 anchovy fillets', '1 bunch radishes', 'Lemon zest', 'Flaky salt'],
    steps: ['Mash anchovies into the butter with lemon zest.', 'Halve the radishes.', 'Swipe each radish through the butter and sprinkle with salt.'] },
  { slug: 'mackerel-potato-salad', title: 'Smoky Mackerel Potato Salad', time: '30 min', serves: 4, product: 'mackerel-peppercorn', color: '#387cc0',
    ingredients: ['500g small potatoes', '1 tin Smoked Mackerel with Pink Peppercorn', '3 tbsp crème fraîche', '1 tbsp Dijon', 'Chives', 'Capers'],
    steps: ['Boil potatoes until tender, then halve while warm.', 'Whisk crème fraîche with Dijon and a little tin oil.', 'Fold in potatoes, flaked mackerel, capers and chives.'] },
]

// type: 'article' entries render as stories (body paragraphs); recipes keep ingredients/steps
export const articles = [
  { slug: 'how-tinned-fish-is-made', type: 'article', title: 'From Boat to Tin: How Canning Works', time: '5 min read', color: '#73c3f5', body: ['Most tinned fish is caught, cleaned and packed within hours. The fish is either cooked first or packed raw and cooked once in the sealed tin.', 'Sealing and heating the tin makes it shelf-stable for years without preservatives. The oil, brine or sauce you see is part of the flavor, not filler.', 'That is why we print the producer and region on every tin: the process is short, so the quality of the catch is everything.'] },
  { slug: 'what-is-escabeche', type: 'article', title: 'What Is Escabeche, Anyway?', time: '3 min read', color: '#fdcd62', body: ['Escabeche is a tangy marinade of vinegar, oil and spices, traditionally used to preserve fried fish and shellfish.', 'In a tin it does double duty: it seasons the seafood and becomes a ready-made dressing. Toss it with potatoes, beans or a pile of greens.'] },
  { slug: 'how-to-build-a-tin-board', type: 'article', title: 'How to Build a Tin Board in 10 Minutes', time: '4 min read', color: '#c7e0c3', body: ['Pick three tins with different textures: something smoky, something bright and something rich.', 'Add crunch (chips, toast), fat (butter, aioli), acid (pickles, lemon) and something fresh (herbs, radishes). Open the tins last and serve them in the can.'] },
]

export const bundleIncludes = {
  'starter-trio': ['hot-smoked-coho', 'albacore-chili-oil', 'sardines-orange-fennel'],
  'dinner-party-box': ['hot-smoked-coho', 'coho-black-garlic', 'albacore-chili-oil', 'sardines-orange-fennel', 'anchovies-evoo', 'mackerel-peppercorn', 'mussels-saffron', 'serving-fork'],
  'countdown-calendar': ['hot-smoked-coho', 'coho-black-garlic', 'sardines-orange-fennel', 'albacore-chili-oil', 'mussels-saffron', 'mackerel-peppercorn', 'serving-fork'],
}

export const boxSizes = [{ n: 6 }, { n: 9 }, { n: 12 }]

export const faqs = [
  { group: 'Orders & Shipping', items: [
    ['How long does shipping take?', 'Most orders leave our warehouse within 2 business days and arrive in 3–7 business days.'],
    ['Do you ship internationally?', 'Not yet — this demo store ships within the continental US only.'],
    ['Can I change my order?', 'Email us within an hour of ordering and we will do our best.'],
  ]},
  { group: 'Our Fish', items: [
    ['Is tinned fish cooked?', 'Yes. Everything is fully cooked in the tin and ready to eat straight away.'],
    ['How long does a tin last?', 'Unopened tins are best within 4–5 years. Once opened, refrigerate and eat within 2 days.'],
    ['Are your tins BPA-free?', 'Yes, all of our tin linings are BPA-free.'],
  ]},
  { group: 'Gifting', items: [
    ['Can I add a gift note?', 'Absolutely — add one in the cart before checkout.'],
    ['Do you offer corporate gifting?', 'Yes! Orders of 25+ boxes get custom notes and bulk pricing.'],
  ]},
]

export const stores = [
  { name: 'Corner Provisions', city: 'Brooklyn, NY', addr: '120 Example Ave' },
  { name: 'Salt & Shelf', city: 'Portland, OR', addr: '44 Sample St' },
  { name: 'Harbor Market', city: 'San Francisco, CA', addr: '9 Placeholder Pier' },
  { name: 'The Little Larder', city: 'Austin, TX', addr: '701 Demo Blvd' },
  { name: 'Pantry Club', city: 'Chicago, IL', addr: '55 Mockup Rd' },
  { name: 'Cove Grocery', city: 'Seattle, WA', addr: '18 Fixture Ln' },
]

export const nav = [
  { label: 'Try the First Tin Trio', to: '/products/starter-trio', cta: true },
  { label: 'Shop', to: '/collections/tinned-fish', mega: ['tinned-fish', 'best-sellers', 'new', 'all'] },
  { label: 'Gifts', to: '/collections/gifts', mega: ['gifts', 'bundles', 'merch'] },
  { label: 'Build Your Own Box', to: '/pages/bundles' },
  { label: 'Recipes', to: '/blogs/recipes' },
  { label: 'Store Locator', to: '/pages/store-locator' },
  { label: 'Story', to: '/pages/story' },
]

export const bySlug = (s) => products.find((p) => p.slug === s)
export const inCollection = (c) => (c === 'all' ? products.filter((p) => p.price > 0) : products.filter((p) => p.cat.includes(c)))

/* ---------- Commerce rules (prices, stock and discounts are decided by the database; this is display logic) ---------- */
export const settings = {
  currency: 'USD', freeShip: 75, shipFlat: 8.95, taxRate: 0.08, lowStock: 15, bankOn: true, codOn: true, codMax: null,
  announcements: ['Free shipping on orders $75+', 'Pay by bank transfer or cash on delivery', 'Gift notes available at checkout'],
}
export const canGiftTin = (p) => (p.variants || []).some((v) => v.gift_tin)
export const canSubscribe = () => false // subscriptions are not offered with bank transfer / cash on delivery
export const packsFor = (p) => [...new Set((p.variants || []).filter((v) => !v.gift_tin).map((v) => v.units))].sort((a, b) => a - b).concat((p.variants || []).length ? [] : [1])
const r2 = (n) => Math.round(n * 100) / 100
export const variantFor = (p, { pack = 1, gift = false } = {}) => (p.variants || []).find((v) => v.units === pack && !!v.gift_tin === !!gift) || (p.variants || [])[0]

export function makeLine(p, { pack = 1, gift = false } = {}) {
  const v = variantFor(p, { pack, gift })
  const unit = v ? v.price_cents / 100 : p.price
  const compare = v?.compare_at_cents ? v.compare_at_cents / 100 : unit
  return {
    id: v ? v.sku : `${p.slug}|${pack}|${+gift}`, sku: v?.sku, slug: p.slug, name: p.name, pack, gift,
    unit: r2(unit), compare: r2(compare), label: v && v.title !== 'Single' ? v.title : '',
  }
}

// Cart estimate. Discount codes and the final total are applied by the server when the order is placed.
export function totals(lines) {
  const subtotal = r2(lines.reduce((s, l) => s + l.unit * l.q, 0))
  const savings = r2(lines.reduce((s, l) => s + Math.max(0, l.compare - l.unit) * l.q, 0))
  const free = subtotal >= settings.freeShip
  const shipCost = !lines.length || free ? 0 : settings.shipFlat
  const tax = r2(subtotal * settings.taxRate)
  return { subtotal, savings, discount: 0, shipCost, tax, total: r2(subtotal + shipCost + tax), free }
}

export const money = (n) => `$${(n ?? 0).toFixed(2)}`

/* ---------- Sample reviews (clearly labeled demo content) ---------- */
const reviewPool = [
  [5, 'New pantry staple', 'Opened one on a Tuesday night, ordered six more by Wednesday.'],
  [5, 'Gift was a hit', 'Gave this to my dad, who now texts me photos of his tin lunches.'],
  [4, 'Great flavor, wish it was bigger', 'Delicious. I could easily eat two in one sitting.'],
  [5, 'Converted a skeptic', 'My partner "doesn’t like fish." He finished the tin.'],
  [5, 'Perfect on rice', 'Rice, a soft egg, scallions, done. Ten minutes.'],
  [4, 'Pretty packaging', 'Looks great on the shelf. The flavor is milder than expected but good.'],
  [5, 'Worth it', 'Pricey compared to grocery tins but not even close in quality.'],
]
export function reviewsFor(slug) {
  const seed = [...slug].reduce((a, c) => a + c.charCodeAt(0), 0)
  return Array.from({ length: 6 }, (_, i) => {
    const [stars, title, body] = reviewPool[(seed + i * 3) % reviewPool.length]
    return { id: i, stars, title, body, name: `Sample Reviewer ${String.fromCharCode(65 + ((seed + i) % 26))}.`, date: `2026-${String(1 + ((seed + i) % 9)).padStart(2, '0')}-${String(1 + ((seed * (i + 1)) % 27)).padStart(2, '0')}`, helpful: (seed * (i + 2)) % 23 }
  })
}

/* ---------- Live catalog from Supabase ---------- */
const listeners = new Set()
let version = 0
const bump = () => { version++; listeners.forEach((f) => f()) }
export const subscribe = (f) => (listeners.add(f), () => listeners.delete(f))
export const getVersion = () => version
export let catalogReady = false

export async function loadCatalog() {
  const { supabase } = await import('./lib/supabase')
  const [p, c, st] = await Promise.all([
    supabase.from('products').select('id, slug, name, description, status, badge, species, origin, nutrition, art, colors, image_path, stock, sort_order, variants(id, sku, title, units, gift_tin, price_cents, compare_at_cents, sort_order), product_collections(collection)').eq('status', 'active').order('sort_order'),
    supabase.from('collections').select('handle, title, blurb, color, sort_order').order('sort_order'),
    supabase.from('settings').select('currency, free_ship_threshold_cents, shipping_flat_cents, tax_rate, low_stock_threshold, announcements, bank_transfer_enabled, cod_enabled, cod_max_total_cents').maybeSingle(),
  ])
  if (p.error || !p.data?.length) { console.warn('Catalog unavailable, showing demo data', p.error); return }
  const rows = p.data.map((r, i) => {
    const variants = (r.variants || []).sort((a, b) => a.sort_order - b.sort_order)
    const single = variants.find((v) => v.units === 1 && !v.gift_tin) || variants[0]
    return {
      id: r.id, slug: r.slug, name: r.name, desc: r.description, badge: r.badge || undefined, fish: r.species, origin: r.origin,
      protein: r.nutrition?.protein_g, omega: r.nutrition?.omega3_g, mercury: r.nutrition?.mercury, art: r.art || undefined,
      tin: r.colors?.length === 2 ? r.colors : ['#fdcd62', '#73c3f5'], image: r.image_path ? supabase.storage.from('product-images').getPublicUrl(r.image_path).data.publicUrl : null,
      stock: r.stock ?? undefined, price: single ? single.price_cents / 100 : 0, variants,
      cat: (r.product_collections || []).map((x) => x.collection), sort: i,
    }
  })
  products.splice(0, products.length, ...rows)
  for (const col of c.data || []) if (collections[col.handle]) Object.assign(collections[col.handle], { title: col.title, blurb: col.blurb, bg: col.color || collections[col.handle].bg })
  if (st.data) Object.assign(settings, {
    currency: st.data.currency, freeShip: st.data.free_ship_threshold_cents / 100, shipFlat: st.data.shipping_flat_cents / 100, taxRate: Number(st.data.tax_rate),
    lowStock: st.data.low_stock_threshold, bankOn: st.data.bank_transfer_enabled, codOn: st.data.cod_enabled,
    codMax: st.data.cod_max_total_cents != null ? st.data.cod_max_total_cents / 100 : null,
    announcements: st.data.announcements?.length ? st.data.announcements : settings.announcements,
  })
  catalogReady = true
  bump()
}
