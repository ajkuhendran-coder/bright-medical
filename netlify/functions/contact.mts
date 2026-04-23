import { Resend } from 'resend'
import type { Context } from '@netlify/functions'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const ADMIN_EMAIL = 'info@brightmedical.de'
const FROM_EMAIL = 'Bright Medical <noreply@brightmedical.de>'

// Load E0a template once at module init (file is bundled via netlify.toml `included_files`).
const E0A_TEMPLATE = readFileSync(
  fileURLToPath(new URL('../../email-templates/e0a-confirmation.html', import.meta.url)),
  'utf8'
)
function renderE0a(firstName: string): string {
  return E0A_TEMPLATE.replaceAll('{{firstName}}', firstName)
}

// --- XSS Protection ---
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// --- Rate Limiting (in-memory, resets on cold start) ---
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000 // 10 minutes
const RATE_LIMIT_MAX = 5
const rateLimitMap = new Map<string, { count: number; firstRequest: number }>()

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)

  if (!entry || now - entry.firstRequest > RATE_LIMIT_WINDOW_MS) {
    rateLimitMap.set(ip, { count: 1, firstRequest: now })
    return false
  }

  entry.count++
  return entry.count > RATE_LIMIT_MAX
}

// --- CORS Origin Check ---
const ALLOWED_ORIGINS = [
  'https://brightmedical.de',
  'https://www.brightmedical.de',
  'http://localhost',
]

function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false
  return ALLOWED_ORIGINS.some(
    (allowed) => origin === allowed || origin.startsWith(allowed + ':')
  )
}

// --- Input Length Limits ---
const MAX_LENGTHS = {
  name: 200,
  email: 254,
  phone: 50,
  message: 5000,
} as const

export default async (req: Request, _context: Context) => {
  // Only allow POST
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 })
  }

  // CORS origin check
  const origin = req.headers.get('origin')
  if (!isAllowedOrigin(origin)) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 })
  }

  const apiKey = Netlify.env.get('RESEND_API_KEY')
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'Server-Konfigurationsfehler' }), { status: 500 })
  }

  const resend = new Resend(apiKey)
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('client-ip') || 'unknown'

  // Rate limiting
  if (isRateLimited(ip)) {
    return new Response(
      JSON.stringify({ error: 'Zu viele Anfragen. Bitte versuchen Sie es später erneut.' }),
      { status: 429 }
    )
  }

  try {
    const data = await req.json()

    // Honeypot check
    if (data.honeypot) {
      return new Response(JSON.stringify({ success: true }), { status: 200 })
    }

    // Validate required fields
    const { name, email, message } = data
    const phone = data.phone || ''
    if (!name || !email || !message) {
      return new Response(JSON.stringify({ error: 'Pflichtfelder fehlen' }), { status: 400 })
    }

    // Input length validation
    if (
      typeof name !== 'string' || name.length > MAX_LENGTHS.name ||
      typeof email !== 'string' || email.length > MAX_LENGTHS.email ||
      typeof message !== 'string' || message.length > MAX_LENGTHS.message ||
      (phone && (typeof phone !== 'string' || phone.length > MAX_LENGTHS.phone))
    ) {
      return new Response(
        JSON.stringify({ error: 'Eingabe überschreitet die maximal zulässige Länge.' }),
        { status: 400 }
      )
    }

    // Email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return new Response(JSON.stringify({ error: 'Ungültige E-Mail-Adresse' }), { status: 400 })
    }

    // Escape all user inputs for safe HTML embedding
    const safeName = escapeHtml(name)
    const safeEmail = escapeHtml(email)
    const safePhone = escapeHtml(phone || '—')
    const safeMessage = escapeHtml(message)
    const safeFirstName = escapeHtml(name.split(' ')[0])

    // 1. Send admin notification
    await resend.emails.send({
      from: FROM_EMAIL,
      to: ADMIN_EMAIL,
      subject: `Neue Anfrage — ${safeName}`,
      html: `
        <h2>Neue Coaching-Anfrage über brightmedical.de</h2>
        <table style="border-collapse:collapse;width:100%;max-width:600px;">
          <tr><td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold;">Name</td><td style="padding:8px;border-bottom:1px solid #eee;">${safeName}</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold;">E-Mail</td><td style="padding:8px;border-bottom:1px solid #eee;"><a href="mailto:${safeEmail}">${safeEmail}</a></td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold;">Telefon</td><td style="padding:8px;border-bottom:1px solid #eee;">${safePhone}</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold;">Nachricht</td><td style="padding:8px;border-bottom:1px solid #eee;">${safeMessage}</td></tr>
        </table>
        <p style="color:#999;font-size:12px;margin-top:20px;">Gesendet von brightmedical.de · IP: ${escapeHtml(ip)}</p>
      `,
    })

    // 2. Send confirmation to prospect (E0a template)
    await resend.emails.send({
      from: FROM_EMAIL,
      replyTo: ADMIN_EMAIL,
      to: email,
      subject: 'Ihre Anfrage ist bei uns angekommen',
      html: renderE0a(safeFirstName),
    })

    return new Response(JSON.stringify({ success: true }), { status: 200 })
  } catch (error) {
    console.error('Contact form error:', error)
    return new Response(
      JSON.stringify({ error: 'Fehler beim Senden. Bitte versuchen Sie es erneut.' }),
      { status: 500 }
    )
  }
}
