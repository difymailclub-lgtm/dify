import { createClient } from '@supabase/supabase-js'

// Publishable (browser-safe) values. Secret/service keys must never appear in frontend code.
const url = import.meta.env.VITE_SUPABASE_URL || 'https://pjxbvsgbvgfwbvrbdpct.supabase.co'
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_0_rGqV5nmoS6ukgphPofgA_xIVMvP86'

// Read before the client consumes the URL: invite / password-reset links land with #...&type=invite|recovery
export const authLinkType = typeof location !== 'undefined' ? new URLSearchParams(location.hash.slice(1)).get('type') : null

export const supabase = createClient(url, key)

// Postgres errors come back with a code + message; show the message, keep the code for logic.
export const errText = (e) => e?.message || String(e)
