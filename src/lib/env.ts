// Mapbox token, injected at build time. Set VITE_MAPBOX_TOKEN as an environment
// variable — locally in a .env file, or in Vercel under Project Settings →
// Environment Variables (Vite exposes any VITE_-prefixed var to the client).
// When present, the map upgrades from the free OSM basemap to Mapbox tiles.
//
// NOTE: Vite inlines this at BUILD time, not at request time. Adding or editing
// the variable in Vercel does nothing until the project is redeployed, and it
// must be enabled for the environment being deployed (Production as well as
// Preview) or the bundle ships an empty string.
export const ENV_MAPBOX_TOKEN: string = normalizeMapboxToken(import.meta.env.VITE_MAPBOX_TOKEN)

// ---------------------------------------------------------------------------
// Groq (GroqCloud) — powers the WhatsApp auto-reply with real conversational
// context. Free tier, OpenAI-compatible API, keys look like "gsk_…".
//
// SECURITY: anything inlined here ships to the browser and is readable by every
// visitor. That is acceptable for a demo key with a spend cap; for anything real
// set VITE_GROQ_PROXY_URL to your own backend (which holds the key server-side)
// and leave VITE_GROQ_API_KEY unset.
// ---------------------------------------------------------------------------
const GROQ_DEFAULT_URL = 'https://api.groq.com/openai/v1'

export const ENV_GROQ_API_KEY: string = normalizeGroqKey(import.meta.env.VITE_GROQ_API_KEY)

/** Default model. Override per-deployment with VITE_GROQ_MODEL. */
export const GROQ_MODEL: string = (import.meta.env.VITE_GROQ_MODEL ?? '').trim() || 'llama-3.3-70b-versatile'

/**
 * Where chat completions are sent. Defaults to GroqCloud directly; point it at
 * your own proxy (same OpenAI-compatible shape) to keep the key off the client.
 */
export const GROQ_API_URL: string =
  ((import.meta.env.VITE_GROQ_PROXY_URL ?? '') as string).trim().replace(/\/$/, '') || GROQ_DEFAULT_URL

/** True when replies can be generated without a key in the browser (proxy mode). */
export const GROQ_USES_PROXY: boolean = GROQ_API_URL !== GROQ_DEFAULT_URL

export function normalizeGroqKey(raw: unknown): string {
  if (typeof raw !== 'string') return ''
  return raw.trim().replace(/^['"]|['"]$/g, '').trim()
}

export type TokenProblem = 'empty' | 'quoted' | 'secret' | 'malformed' | null

/**
 * Clean up a pasted token. Dashboard copy/paste (and some env UIs) commonly add
 * surrounding quotes, stray whitespace or a trailing newline — all of which make
 * Mapbox reject the token with a 401 that otherwise looks like "the token is
 * just wrong". Anything that still isn't a usable public token comes back as ''
 * so the map falls straight through to the free basemap instead of rendering
 * blank tiles.
 */
export function normalizeMapboxToken(raw: unknown): string {
  if (typeof raw !== 'string') return ''
  const t = raw.trim().replace(/^['"]|['"]$/g, '').trim()
  if (!t || !t.startsWith('pk.')) return ''
  return t
}

/** Why a token was rejected before it ever reached Mapbox — used by Settings. */
export function inspectMapboxToken(raw: string): TokenProblem {
  const t = (raw ?? '').trim()
  if (!t) return 'empty'
  if (/^['"]|['"]$/.test(t)) return 'quoted'
  if (t.startsWith('sk.')) return 'secret'
  if (!t.startsWith('pk.')) return 'malformed'
  return null
}

/**
 * Ask Mapbox whether a token actually works, using the same style request the
 * map makes — so URL restrictions on the token are enforced exactly as they are
 * for the real map. Runs in the browser, which is the only place the deployed
 * token exists.
 */
export async function pingMapboxToken(token: string): Promise<{ ok: boolean; status: number; message: string }> {
  const t = normalizeMapboxToken(token)
  if (!t) {
    const problem = inspectMapboxToken(token)
    return {
      ok: false,
      status: 0,
      message:
        problem === 'empty' ? 'No token set. In Vercel the variable must be named VITE_MAPBOX_TOKEN, enabled for Production, and the project redeployed.'
        : problem === 'secret' ? 'That is a secret token (sk.…). Browsers can only use a public token (pk.…).'
        : problem === 'quoted' ? 'Token has quotes around it — paste the raw value with no quotes.'
        : 'Token does not look like a Mapbox public token (should start with "pk.").',
    }
  }
  try {
    const res = await fetch(`https://api.mapbox.com/styles/v1/mapbox/streets-v12?access_token=${encodeURIComponent(t)}`)
    if (res.ok) return { ok: true, status: res.status, message: 'Token valid — Mapbox tiles will load.' }
    const body = await res.json().catch(() => ({}) as { message?: string })
    const detail = body?.message ? ` (${body.message})` : ''
    return {
      ok: false,
      status: res.status,
      message:
        res.status === 401 ? `Mapbox rejected the token: 401 Unauthorized${detail}.`
        : res.status === 403 ? `Mapbox returned 403 Forbidden${detail} — usually a URL restriction on the token that does not include this site's origin (${location.origin}), or an account limit.`
        : `Mapbox returned ${res.status}${detail}.`,
    }
  } catch (e) {
    return { ok: false, status: 0, message: `Could not reach api.mapbox.com (${String(e)}). Network, ad-blocker or CSP is blocking it.` }
  }
}
