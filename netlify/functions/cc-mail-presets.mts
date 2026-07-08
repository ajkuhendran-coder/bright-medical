// cc-mail-presets — Command Center holt den Mail-Preset-Katalog (Dropdown + Felder).
// Method: GET oder POST · Auth: Authorization: Bearer <CC_SEND_SECRET>
// Returns: { presets: [{ key, label, target, subject?, fields:[{key,label,type,default,hint,required,half}] }] }
//
// Reiner Lese-Weg (Katalog = statische Definition aus _shared/mail-presets.ts). Kein Versand.
// Eigenes Sende-Secret (getrennt vom Lese-CC_API_SECRET): Least Privilege, Lesen ≠ Senden.

import type { Context } from '@netlify/functions'
import { MAIL_PRESETS } from './_shared/mail-presets.ts'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  'Access-Control-Max-Age': '86400',
}
function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } })
}
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

export default async (req: Request, _context: Context) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS_HEADERS })
  if (req.method !== 'GET' && req.method !== 'POST') return jsonResponse(405, { error: 'Method not allowed' })

  const expected = Netlify.env.get('CC_SEND_SECRET')
  if (!expected) return jsonResponse(500, { error: 'Server-Konfigurationsfehler (CC_SEND_SECRET)' })
  const presented = (req.headers.get('authorization') || '').match(/^Bearer\s+(.+)$/)?.[1] || ''
  if (!presented || !safeEqual(presented, expected)) return jsonResponse(401, { error: 'Unauthorized' })

  return jsonResponse(200, { presets: MAIL_PRESETS })
}
