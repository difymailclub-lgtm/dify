import { useSyncExternalStore, useEffect, lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { subscribe, getVersion, loadCatalog } from './data'
import { CartProvider, AuthProvider, Layout } from './components'
import { Account, OrderPage } from './account'
import { CartPage, Checkout } from './checkout'
const Admin = lazy(() => import('./admin').then((m) => ({ default: m.Admin }))) // shoppers never download admin code
import { ComingSoon, Home, Collection, Product, Bundles, Story, Recipes, Recipe, StoreLocator, FAQ, Info, NotFound } from './pages'

export default function App() {
  useSyncExternalStore(subscribe, getVersion) // re-render once the live catalog arrives
  useEffect(() => { loadCatalog() }, [])
  return (
    <BrowserRouter>
      <AuthProvider>
      <CartProvider>
        <Layout>
          <Routes>
            <Route path="/" element={<ComingSoon />} />
            <Route path="/home" element={<Home />} />
            <Route path="/collections/:handle" element={<Collection />} />
            <Route path="/products/:slug" element={<Product />} />
            <Route path="/pages/bundles" element={<Bundles />} />
            <Route path="/pages/story" element={<Story />} />
            <Route path="/pages/store-locator" element={<StoreLocator />} />
            <Route path="/pages/faq" element={<FAQ />} />
            <Route path="/pages/:page" element={<Info />} />
            <Route path="/blogs/recipes" element={<Recipes />} />
            <Route path="/blogs/recipes/:slug" element={<Recipe />} />
            <Route path="/cart" element={<CartPage />} />
            <Route path="/account" element={<Account />} />
            <Route path="/order" element={<OrderPage />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/admin/*" element={<Suspense fallback={<p className="ad-center">Loading admin…</p>}><Admin /></Suspense>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Layout>
      </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
