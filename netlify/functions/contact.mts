import { Resend } from 'resend'
import type { Context } from '@netlify/functions'

const ADMIN_EMAIL = 'info@brightmedical.de'
const FROM_EMAIL = 'Bright Medical <noreply@brightmedical.de>'

export default async (req: Request, _context: Context) => {
  // Only allow POST
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 })
  }

  const apiKey = Netlify.env.get('RESEND_API_KEY')
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'Server-Konfigurationsfehler' }), { status: 500 })
  }

  const resend = new Resend(apiKey)
  const ip = req.headers.get('x-forwarded-for') || req.headers.get('client-ip') || 'unknown'

  try {
    const data = await req.json()

    // Honeypot check
    if (data.honeypot) {
      return new Response(JSON.stringify({ success: true }), { status: 200 })
    }

    // Validate required fields
    const { name, email, message } = data
    if (!name || !email || !message) {
      return new Response(JSON.stringify({ error: 'Pflichtfelder fehlen' }), { status: 400 })
    }

    // Email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return new Response(JSON.stringify({ error: 'Ungültige E-Mail-Adresse' }), { status: 400 })
    }

    // 1. Send admin notification
    await resend.emails.send({
      from: FROM_EMAIL,
      to: ADMIN_EMAIL,
      subject: `Neue Anfrage — ${name}`,
      html: `
        <h2>Neue Coaching-Anfrage über brightmedical.de</h2>
        <table style="border-collapse:collapse;width:100%;max-width:600px;">
          <tr><td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold;">Name</td><td style="padding:8px;border-bottom:1px solid #eee;">${name}</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold;">E-Mail</td><td style="padding:8px;border-bottom:1px solid #eee;"><a href="mailto:${email}">${email}</a></td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold;">Telefon</td><td style="padding:8px;border-bottom:1px solid #eee;">${data.phone || '—'}</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold;">Nachricht</td><td style="padding:8px;border-bottom:1px solid #eee;">${message}</td></tr>
        </table>
        <p style="color:#999;font-size:12px;margin-top:20px;">Gesendet von brightmedical.de · IP: ${ip}</p>
      `,
    })

    // 2. Send confirmation to prospect
    const firstName = name.split(' ')[0]
    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: 'Ihre Anfrage bei Bright Medical — wir melden uns!',
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
          <div style="background:#0F2A55;padding:30px;text-align:center;border-radius:12px 12px 0 0;">
            <h1 style="color:white;margin:0;font-size:24px;">Bright Medical</h1>
            <p style="color:#06B6D4;margin:5px 0 0;font-size:14px;">Ärztlich begleitet. Individuell optimiert.</p>
          </div>
          <div style="padding:30px;background:#f8fafc;border-radius:0 0 12px 12px;">
            <p>Hallo ${firstName},</p>
            <p>vielen Dank für Ihre Anfrage! Wir haben Ihre Nachricht erhalten und melden uns innerhalb von <strong>24 Stunden</strong> bei Ihnen.</p>
            <p>Falls Sie vorab Fragen haben, antworten Sie einfach auf diese E-Mail.</p>
            <p>Herzliche Grüße,</p>
            <p style="margin:0;">
              <strong>Ajanth Kuhendran</strong><br>
              <span style="color:#555;font-size:13px;">Facharzt für Allgemeinmedizin</span><br>
              <span style="color:#555;font-size:13px;">Spezialist für funktionelle & integrative Medizin</span>
            </p>
            <p style="margin:16px 0 0;">
              <img src="https://brightmedical.de/images/logo-light.png" alt="Bright Medical" style="height:36px;width:auto;" />
            </p>
            <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;">
            <p style="color:#999;font-size:11px;">
              Coaching-Dienstleistung im zweiten Gesundheitsmarkt. Keine Kassenleistung.<br>
              Bright Medical · Am Alten Güterbahnhof 24 · 76646 Bruchsal
            </p>
          </div>
        </div>
      `,
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
