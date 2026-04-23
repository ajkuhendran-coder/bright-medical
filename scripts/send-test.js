// One-shot test send via Resend.
// Usage: RESEND_API_KEY=re_xxx node scripts/send-test.js <template> <recipient> [subject]
// Example: node scripts/send-test.js e10-teaser kuhendran@me.com
//          node scripts/send-test.js e0a-confirmation kuhendran@me.com
//
// Reads HTML from ./email-templates/<template>.html.
// Replaces {{firstName}} (defaults to "Melanie") for templates that use it.
// Fixed FROM = "Bright Medical <noreply@brightmedical.de>" (matches contact.mts).

import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { Resend } from 'resend'

const __dirname = dirname(fileURLToPath(import.meta.url))
const projectRoot = join(__dirname, '..')

const FROM_EMAIL = 'Bright Medical <noreply@brightmedical.de>'
const REPLY_TO = 'info@brightmedical.de'

const SUBJECTS = {
  'e10-teaser': 'Etwas Neues aus unserer Praxis.',
  'e0a-confirmation': 'Ihre Anfrage ist bei uns angekommen',
}

const TEST_VARS = {
  firstName: process.env.TEST_FIRST_NAME || 'Melanie',
}

const [, , template, recipient, subjectArg] = process.argv

if (!template || !recipient) {
  console.error('Usage: node scripts/send-test.js <template> <recipient> [subject]')
  console.error('Templates: ' + Object.keys(SUBJECTS).join(', '))
  process.exit(1)
}

const apiKey = process.env.RESEND_API_KEY
if (!apiKey) {
  console.error('RESEND_API_KEY not set. Try:')
  console.error('  export RESEND_API_KEY=$(netlify env:get RESEND_API_KEY)')
  console.error('Or grab it from https://resend.com/api-keys')
  process.exit(1)
}

const subject = subjectArg || SUBJECTS[template] || `Test: ${template}`
const htmlPath = join(projectRoot, 'email-templates', `${template}.html`)

let html
try {
  html = await readFile(htmlPath, 'utf8')
} catch (err) {
  console.error(`Could not read ${htmlPath}`)
  console.error(err.message)
  process.exit(1)
}

for (const [k, v] of Object.entries(TEST_VARS)) {
  html = html.replaceAll(`{{${k}}}`, v)
}

const resend = new Resend(apiKey)

console.log(`→ Sending "${subject}"`)
console.log(`  from: ${FROM_EMAIL}`)
console.log(`  to:   ${recipient}`)
console.log(`  html: ${htmlPath} (${html.length} chars)`)

const { data, error } = await resend.emails.send({
  from: FROM_EMAIL,
  replyTo: REPLY_TO,
  to: recipient,
  subject,
  html,
})

if (error) {
  console.error('✗ Resend error:', error)
  process.exit(1)
}

console.log(`✓ Sent. Resend message id: ${data.id}`)
