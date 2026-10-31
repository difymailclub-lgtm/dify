import { useSyncExternalStore } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { subscribe, getVersion } from './data'
import { CartProvider, Layout } from './components'
import { CartPage, Checkout, ThankYou } from './checkout'
import { Admin } from './admin'
import { Home, Collection, Product, Bundles, Story, Recipes, Recipe, StoreLocator, FAQ, Info, NotFound } from './pages'

export default function App() {
  useSyncExternalStore(subscribe, getVersion) // re-render storefront when admin edits data
  return (
    <BrowserRouter>
      <CartProvider>
        <Layout>
          <Routes>
            <Route path="/" element={<Home />} />
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
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/checkout/thank-you/:id" element={<ThankYou />} />
            <Route path="/admin/*" element={<Admin />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Layout>
      </CartProvider>
    </BrowserRouter>
  )
}
