// Minimaler JWT-Helper für Bright-Medical-Fragebogen-Einladungen.
// HMAC-SHA256 (HS256). Keine externe Abhängigkeit — Node `crypto` only.
//
// Token-Format: <base64url(payload)>.<base64url(signature)>
// Payload: { sub: <email>, iat: <ms>, exp: <ms>, scope: 'fragebogen' }

import { createHmac, timingSafeEqual } from 'node:crypto'

export type FragebogenPayload = {
  sub: string                  // Patient-Email
  iat: number                  // issued-at (ms since epoch)
  exp: number                  // expiry (ms since epoch)
  scope: 'fragebogen'
}

function b64urlEncode(input: Buffer | string): string {
  const buf = typeof input === 'string' ? Buffer.from(input, 'utf8') : input
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
function b64urlDecode(s: string): Buffer {
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4))
  return Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/') + pad, 'base64')
}

export function signFragebogenToken(email: string, ttlDays: number, secret: string): string {
  const now = Date.now()
  const payload: FragebogenPayload = {
    sub: email.toLowerCase().trim(),
    iat: now,
    exp: now + ttlDays * 24 * 60 * 60 * 1000,
    scope: 'fragebogen',
  }
  const payloadB64 = b64urlEncode(JSON.stringify(payload))
  const sig = createHmac('sha256', secret).update(payloadB64).digest()
  const sigB64 = b64urlEncode(sig)
  return `${payloadB64}.${sigB64}`
}

export type VerifyResult =
  | { ok: true; payload: FragebogenPayload }
  | { ok: false; reason: 'malformed' | 'badSignature' | 'expired' | 'wrongScope' }

export function verifyFragebogenToken(token: string, secret: string): VerifyResult {
  if (!token || typeof token !== 'string' || !token.includes('.')) {
    return { ok: false, reason: 'malformed' }
  }
  const [payloadB64, sigB64] = token.split('.')
  if (!payloadB64 || !sigB64) return { ok: false, reason: 'malformed' }

  // Verify signature first (timing-safe)
  const expectedSig = createHmac('sha256', secret).update(payloadB64).digest()
  let providedSig: Buffer
  try {
    providedSig = b64urlDecode(sigB64)
  } catch {
    return { ok: false, reason: 'malformed' }
  }
  if (providedSig.length !== expectedSig.length || !timingSafeEqual(providedSig, expectedSig)) {
    return { ok: false, reason: 'badSignature' }
  }

  let payload: FragebogenPayload
  try {
    payload = JSON.parse(b64urlDecode(payloadB64).toString('utf8'))
  } catch {
    return { ok: false, reason: 'malformed' }
  }
  if (payload.scope !== 'fragebogen') return { ok: false, reason: 'wrongScope' }
  if (typeof payload.exp !== 'number' || payload.exp < Date.now()) {
    return { ok: false, reason: 'expired' }
  }
  return { ok: true, payload }
}

export function tokenIdShort(token: string): string {
  // First 8 chars of the signature — for audit logging.
  const dot = token.indexOf('.')
  return dot < 0 ? token.slice(0, 8) : token.slice(dot + 1, dot + 9)
}
