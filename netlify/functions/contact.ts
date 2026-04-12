import type { Handler } from '@netlify/functions'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

const ADMIN_EMAIL = 'info@brightmedical.de'
const FROM_EMAIL = 'Bright Medical <noreply@brightmedical.de>'

const handler: Handler = async (event) => {
  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  // Rate limiting headers check
  const ip = event.headers['x-forwarded-for'] || event.headers['client-ip'] || 'unknown'

  try {
    const data = JSON.parse(event.body || '{}')

    // Honeypot check
    if (data.honeypot) {
      return { statusCode: 200, body: JSON.stringify({ success: true }) }
    }

    // Validate required fields
    const { firstName, lastName, email, subject, situation } = data
    if (!firstName || !lastName || !email || !subject || !situation) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Pflichtfelder fehlen' }) }
    }

    // Email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Ungültige E-Mail-Adresse' }) }
    }

    // 1. Send admin notification
    await resend.emails.send({
      from: FROM_EMAIL,
      to: ADMIN_EMAIL,
      subject: `Neue Anfrage: ${subject} — ${firstName} ${lastName}`,
      html: `
        <h2>Neue Coaching-Anfrage über brightmedical.de</h2>
        <table style="border-collapse:collapse;width:100%;max-width:600px;">
          <tr><td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold;">Name</td><td style="padding:8px;border-bottom:1px solid #eee;">${firstName} ${lastName}</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold;">E-Mail</td><td style="padding:8px;border-bottom:1px solid #eee;"><a href="mailto:${email}">${email}</a></td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold;">Telefon</td><td style="padding:8px;border-bottom:1px solid #eee;">${data.phone || '—'}</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold;">Thema</td><td style="padding:8px;border-bottom:1px solid #eee;">${subject}</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold;">Situation</td><td style="padding:8px;border-bottom:1px solid #eee;">${situation}</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold;">Bisher versucht</td><td style="padding:8px;border-bottom:1px solid #eee;">${data.tried || '—'}</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold;">Nachricht</td><td style="padding:8px;border-bottom:1px solid #eee;">${data.message || '—'}</td></tr>
        </table>
        <p style="color:#999;font-size:12px;margin-top:20px;">Gesendet von brightmedical.de · IP: ${ip}</p>
      `,
    })

    // 2. Send confirmation to prospect
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
            <p><strong>Ihre Angaben:</strong></p>
            <ul style="color:#555;">
              <li>Thema: ${subject}</li>
              <li>Situation: ${situation.substring(0, 100)}${situation.length > 100 ? '...' : ''}</li>
            </ul>
            <p>Falls Sie vorab Fragen haben, antworten Sie einfach auf diese E-Mail.</p>
            <p>Herzliche Grüße,<br><strong>Dr. med. Ajanth Kuhendran</strong><br>Bright Medical</p>
            <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;">
            <p style="color:#999;font-size:11px;">
              Coaching-Dienstleistung im zweiten Gesundheitsmarkt. Keine Kassenleistung.<br>
              Bright Medical · Am Alten Güterbahnhof 24 · 76646 Bruchsal
            </p>
          </div>
        </div>
      `,
    })

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true }),
    }
  } catch (error) {
    console.error('Contact form error:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Fehler beim Senden. Bitte versuchen Sie es erneut.' }),
    }
  }
}

export { handler }
