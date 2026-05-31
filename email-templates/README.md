# Bright Medical — E-Mail-Templates

Statisches, Outlook-/Apple-Mail-taugliches Tabellen-HTML mit `{{PLATZHALTER}}`-Konvention. Versand über Resend API — entweder automatisch via `netlify/functions/contact.mts` (nur `e0a-confirmation`) oder manuell via `npm run send:test`.

## Übersicht

| Datei | Zweck | Trigger |
|---|---|---|
| **e0a-confirmation.html** | Auto-Reply nach Klick auf „Erstgespräch sichern" / Kontaktformular-Submit | automatisch via `contact.mts` |
| **e1a-welcome.html** | Onboarding-Mail nach gebuchtem Erstgespräch — warmes Willkommen, Termin-Übersicht, nächste Schritte | manuell |
| **e1b-reminder-erstgespraech.html** | Termin-Erinnerung 24h vor dem telefonischen Erstgespräch — minimal, persönlich | manuell |
| **e1c-reminder-folgetermin.html** | Erinnerung an Coaching-Folgetermin — mit Vorbereitungs-Checkliste | manuell |
| **e10-teaser.html** | Newsletter-Pilot (kürzere Variante) | manuell |
| **e11-newsletter.html** | Voller Editorial-Newsletter „Der Rundgang" — Feature + Programm + Tipp + Stats | manuell |
| **e2a-program-launch.html** | Programm-Launch-Ankündigung — dunkler Editorial-Hero, 3 USPs, Testimonial | manuell |

## Platzhalter-Konvention

`{{KEY}}` — wird via `String#replaceAll` ersetzt. Variablen-Namen sind in `scripts/send-test.js` pro Template hinterlegt (Map `TEMPLATES`).

Beispiel — `e1b-reminder-erstgespraech.html`:
- `{{ANREDE_KURZ}}` → „Frau Bechtel"
- `{{WOCHENTAG}}` · `{{TAG_MONAT}}` · `{{JAHR}}` → „DONNERSTAG · 30. APRIL · 2026"
- `{{UHRZEIT}}` · `{{DAUER}}` → „13:15" · „20 min"
- `{{TELEFON_HINWEIS}}` → frei formulierbarer Hinweis (z.B. Bitte um Telefonnummer)
- `{{PERSÖNLICHE_NOTIZ}}` → individueller Satz pro Klientin

## Versand

Drei Wege — vom einfachsten zum komfortabelsten:

### A) Lokal vom Mac via `send-test.js`

```bash
# 1. RESEND_API_KEY aus Netlify ziehen
export RESEND_API_KEY=$(npx netlify env:get RESEND_API_KEY)

# 2. Test an dich selbst (alle Defaults aus TEMPLATES greifen)
npm run send:test e1b-reminder-erstgespraech kuhendran@me.com

# 3. Live an Klientin — Variablen einzeln überschreiben
node scripts/send-test.js e1b-reminder-erstgespraech klientin@example.com \
  --var ANREDE_KURZ="Frau Müller" \
  --var TAG_MONAT="15. MAI" \
  --var UHRZEIT="10:00"
```

Logos werden automatisch als Inline-Base64 aus `_assets/logos-base64.txt` eingefügt.

### B) Über die HTTPS-API (vom Handy / unterwegs)

`POST https://brightmedical.de/.netlify/functions/send-mail` — Bearer-Token-geschützt.

→ Vollständige Anleitung inkl. iOS-Shortcut-Setup: **[SEND-MAIL-API.md](./SEND-MAIL-API.md)**

### C) Automatisches Auto-Reply (bestehend)

`e0a-confirmation` wird automatisch ausgelöst, wenn jemand das Kontaktformular auf brightmedical.de absendet — über `netlify/functions/contact.mts`. Kein manueller Aufruf nötig.

Subject lässt sich als 3. positionales Argument überschreiben:
```bash
node scripts/send-test.js e1b-reminder-erstgespraech klientin@example.com "Bis morgen, 13:15 Uhr"
```

Das Skript warnt am Ende, wenn `{{...}}`-Platzhalter im finalen HTML übrig geblieben sind — bei Live-Versand prüfen!

## Branding-Tokens (verbindlich)

```
Navy        #0B2040    Header/Footer/Hero-Hintergrund
Ink         #0A2540    Primärtext auf hell
Cyan        #00B8D4    Akzent (Eyebrow, Borders, Highlights)
CyanDeep    #0099B3    Gradient-Endfarbe
Cream       #F6F8FA    Sektion-Hintergrund / Persönliche-Notiz-Box
Ice         #EAF3F7    Sanfter Akzent-Hintergrund
Line        #E3E8EE    Trennlinien
Muted       #5A6A80    Sekundärtext

Serif (Headlines):  Fraunces, Georgia, Times New Roman, serif
Sans (Body):        Inter, -apple-system, BlinkMacSystemFont, Arial, sans-serif
```

Logo-Assets liegen unter `https://brightmedical.de/images/logo-light.png` und `.../logo-dark.png` (live-deployed via Netlify).

## Ordner `_design-handover/`

Originale aus dem Claude-Design-Handover (Stand 28.04.2026). **Nur Referenz** — nicht produktiv. Enthält JSX-Mocks (`emails/*.jsx`), brand tokens (`tokens.jsx`), den Design-Canvas und den Original-Designer-Prompt für die Reminder-Mail.

Falls ein neues Template gebaut wird: visuell an JSX-Mock orientieren, strukturell an `e0a-confirmation.html` (XHTML-Tabellen, Mobile-Media-Query, Footer-Block).

## Rechtliche Hinweise (HWG/DSGVO)

- **Coaching ≠ Behandlung:** Footer-Disclaimer in jedem Template („Coaching-Dienstleistung im zweiten Gesundheitsmarkt").
- **Keine Medikamentennamen:** GLP-1, Ozempic, Testosteron, Peptide, NAD+, BPC-157 etc. dürfen nicht erwähnt werden.
- **Keine Heilversprechen:** Statt „Sie werden 10 kg abnehmen" → „Häufige Ergebnisse, abhängig von Ausgangslage".
- **Testimonials** (z.B. in `e2a-program-launch.html`): immer als „Beispielhafter Erfahrungsbericht" gekennzeichnet, keine konkreten Heilungsversprechen.
- **Newsletter-Mails** (`e10`, `e11`): Abmelde-Link Pflicht (`{{ABMELDE_LINK}}` in `e11`).

## Outlook-Kompatibilität

Alle Templates nutzen XHTML 1.0 Transitional, `<table role="presentation">` für Layout, Inline-Styles für jede sichtbare Eigenschaft, `@media (max-width:620px)` im `<head>` für Mobile-Stack-Verhalten. **Kein** CSS-Grid, **kein** Flexbox in der gerenderten Mail. Logos via absolute HTTPS-URLs (kein CID-Embedding nötig, da Resend SMTP korrekt setzt).
