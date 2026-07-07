// plan-pdf — server-generiertes Design-PDF aus den Portal-Plan-Bausteinen.
// Deterministisches A4-Layout mit pdf-lib (bereits im Repo, bundelt sauber in
// Netlify Functions — kein Chromium/Headless). KEINE Persistenz: der Aufrufer
// erzeugt das PDF on-demand und speichert es nirgends (DSGVO).
//
// Editorialer Look: Times (Serif) für Titel/Überschriften wie das Newsreader-
// Serif des Portals, Helvetica für Fließtext. Echtes BM-Logo im Kopf (optional).
//
// Bausteine (= portal_plans.sections): heading · text · list · meal · training · note.

import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFImage, type PDFPage, type RGB } from 'pdf-lib'

export type PlanSection = { type: string; title?: string; body?: string; items?: string[] }
export type PlanForPdf = {
  title: string
  intro?: string | null
  sections: PlanSection[]
  version?: number | null
  updatedAt?: string | null
}
export type BuildPlanPdfOpts = {
  name?: string | null        // Vorname für die persönliche Kopfzeile
  logoPng?: Uint8Array | null // BM-Wortmarke (logo-light.png), optional
}

// --- Markenfarben (identisch zum Portal MeinProgramm.tsx) ---
const hex = (h: string): RGB => rgb(parseInt(h.slice(0, 2), 16) / 255, parseInt(h.slice(2, 4), 16) / 255, parseInt(h.slice(4, 6), 16) / 255)
const C = {
  ink: hex('14314D'),   // Haupttext
  acc: hex('1AA3C6'),   // Akzent (Cyan)
  ok: hex('1F9C6B'),    // Bewegung/Training (Grün)
  sec: hex('4A6071'),   // Sekundärtext
  mut: hex('6B7E8D'),   // gedämpft
  faint: hex('A9B7C1'), // sehr gedämpft (Fußzeile)
  hair: hex('E1E8EE'),  // Haarlinie
  mealBg: hex('F4FAFC'),
  trainBg: hex('F1F9F5'),
  noteBg: hex('F2F8FA'),
}

const PAGE_W = 595.28, PAGE_H = 841.89
const MX = 54                    // Seitenrand links/rechts
const CW = PAGE_W - MX * 2       // Inhaltsbreite
const TOP = PAGE_H - 48          // Oberkante Inhalt auf Folgeseiten
const MIN_Y = 84                 // Inhalts-Boden (über der Fußzeile)

const DISCLAIMER = 'Bright Medical ist ein Coaching-Angebot und ersetzt keine ärztliche Behandlung.'
const ADDRESS = 'Bright Medical · Am Alten Güterbahnhof 24 · 76646 Bruchsal · brightmedical.de'

// Helvetica/Times (WinAnsi) können nichts außerhalb Latin-1 kodieren. Umlaute, €, •, ·
// und der Halbgeviertstrich – bleiben erhalten; typografische Sonderzeichen werden
// entschärft (em-dash → en-dash, geschweifte Anführungszeichen → gerade), Unbekanntes → Leerzeichen.
function pdfSafe(s: string): string {
  return String(s ?? '')
    .replace(/\r\n?/g, '\n')
    .replace(/\t/g, ' ')
    .replace(/→/g, '->')
    .replace(/—/g, '–')
    .replace(/[‘’‚]/g, "'")
    .replace(/[“”„]/g, '"')
    .replace(/…/g, '...')
    .replace(/[^\n\x20-\x7E\xA0-\xFF€•–]/g, ' ')
}

function formatDate(iso?: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Europe/Berlin' })
}

// Wort-Umbruch (respektiert explizite \n), pro Zeile nie breiter als maxW.
function wrap(text: string, font: PDFFont, size: number, maxW: number): string[] {
  const out: string[] = []
  for (const para of pdfSafe(text).split('\n')) {
    if (!para.trim()) { out.push(''); continue }
    let line = ''
    for (const word of para.split(/\s+/).filter(Boolean)) {
      const test = line ? line + ' ' + word : word
      if (line && font.widthOfTextAtSize(test, size) > maxW) { out.push(line); line = word }
      else line = test
    }
    if (line) out.push(line)
  }
  return out
}

export async function buildPlanPdf(plan: PlanForPdf, opts: BuildPlanPdfOpts = {}): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  doc.setTitle('Bright Medical - Ihr Ernährungs- & Trainingsplan')
  doc.setAuthor('Bright Medical')
  doc.setCreator('Bright Medical')
  doc.setProducer('Bright Medical')

  const helv = await doc.embedFont(StandardFonts.Helvetica)
  const helvB = await doc.embedFont(StandardFonts.HelveticaBold)
  const helvI = await doc.embedFont(StandardFonts.HelveticaOblique)
  const serif = await doc.embedFont(StandardFonts.TimesRoman)
  const serifB = await doc.embedFont(StandardFonts.TimesRomanBold)

  let logo: PDFImage | null = null
  if (opts.logoPng && opts.logoPng.length) {
    try { logo = await doc.embedPng(opts.logoPng) } catch { logo = null }
  }

  const pages: PDFPage[] = []
  let page!: PDFPage
  let y = 0 // Oberkanten-Cursor: Basislinie der nächsten Zeile = y - size

  const newPage = () => { page = doc.addPage([PAGE_W, PAGE_H]); pages.push(page); y = TOP }
  const ensure = (h: number) => { if (y - h < MIN_Y) newPage() }
  const line = (s: string, x: number, baseY: number, size: number, font: PDFFont, color: RGB) =>
    page.drawText(pdfSafe(s), { x, y: baseY, size, font, color })
  const spacedWidth = (s: string, font: PDFFont, size: number, tr: number): number => {
    const t = pdfSafe(s); let w = 0
    for (const ch of t) w += font.widthOfTextAtSize(ch, size) + tr
    return w - (t.length ? tr : 0)
  }
  const spaced = (s: string, x: number, baseY: number, size: number, font: PDFFont, color: RGB, tr: number) => {
    let cx = x
    for (const ch of pdfSafe(s)) { page.drawText(ch, { x: cx, y: baseY, size, font, color }); cx += font.widthOfTextAtSize(ch, size) + tr }
  }

  // Fließtext ab dem aktuellen Cursor; bricht zeilenweise über Seiten um.
  const paragraph = (
    s: string,
    o: { x?: number; size?: number; font?: PDFFont; color?: RGB; lh?: number; maxW?: number; indent?: number } = {},
  ) => {
    const x = o.x ?? MX
    const size = o.size ?? 10.5
    const font = o.font ?? helv
    const color = o.color ?? C.sec
    const lh = o.lh ?? size * 1.45
    const maxW = o.maxW ?? (MX + CW - x)
    const lines = wrap(s, font, size, maxW - (o.indent ?? 0))
    lines.forEach((ln, i) => {
      if (y - size < MIN_Y) newPage()
      if (ln) line(ln, i === 0 ? x : x + (o.indent ?? 0), y - size, size, font, color)
      y -= lh
    })
  }

  // --- Kopf (nur Seite 1) ---
  newPage()
  if (logo) {
    const lw = 152
    const lh = (logo.height / logo.width) * lw
    page.drawImage(logo, { x: MX, y: PAGE_H - 44 - lh, width: lw, height: lh })
    const stand = formatDate(plan.updatedAt)
    if (stand) line(`Stand ${stand}`, MX + CW - helv.widthOfTextAtSize(`Stand ${stand}`, 8.5), PAGE_H - 44 - lh / 2 - 3, 8.5, helv, C.mut)
    y = PAGE_H - 44 - lh - 22
  } else {
    spaced('BRIGHT MEDICAL', MX, PAGE_H - 62, 13, serifB, C.ink, 1)
    y = PAGE_H - 86
  }
  page.drawLine({ start: { x: MX, y }, end: { x: MX + CW, y }, thickness: 1, color: C.hair })
  y -= 24

  // Eyebrow + Titel + Intro
  const eyebrow = opts.name && opts.name.trim() ? `FÜR ${opts.name.trim().toUpperCase()}` : 'IHR PERSÖNLICHER PLAN'
  spaced(eyebrow, MX, y - 9, 9, helvB, C.acc, 1.5)
  y -= 22
  paragraph(plan.title || 'Ihr Ernährungs- & Trainingsplan', { font: serifB, size: 23, color: C.ink, lh: 27 })
  if (plan.intro && plan.intro.trim()) { y -= 6; paragraph(plan.intro, { font: helv, size: 11, color: C.sec, lh: 16 }) }
  y -= 6

  // --- Bausteine ---
  const heading = (title: string) => {
    y -= 18
    ensure(34)
    const size = 15
    line(title, MX, y - size, size, serifB, C.ink)
    page.drawLine({ start: { x: MX, y: y - size - 7 }, end: { x: MX + 30, y: y - size - 7 }, thickness: 2, color: C.acc })
    y -= size + 16
  }

  const bulletList = (title: string | undefined, items: string[]) => {
    y -= 10
    if (title && title.trim()) { ensure(20); line(title, MX, y - 11, 11, helvB, C.ink); y -= 20 }
    const size = 10.5, lh = 15.5, textX = MX + 16, maxW = MX + CW - textX
    for (const it of items) {
      const lines = wrap(it, helv, size, maxW)
      lines.forEach((ln, i) => {
        if (y - size < MIN_Y) newPage()
        if (i === 0) line('•', MX + 3, y - size, size, helvB, C.acc)
        line(ln, textX, y - size, size, helv, C.sec)
        y -= lh
      })
      y -= 3
    }
    y -= 4
  }

  const note = (body: string) => {
    y -= 12
    const size = 10, lh = 14.5, pad = 13, bar = 3, innerX = MX + pad + bar + 3
    const maxW = MX + CW - pad - innerX
    const lines = wrap(body, helv, size, maxW)
    const h = pad * 2 + lines.length * lh
    if (y - h < MIN_Y && h <= TOP - MIN_Y) newPage()
    const top = y
    page.drawRectangle({ x: MX, y: top - h, width: CW, height: h, color: C.noteBg })
    page.drawRectangle({ x: MX, y: top - h, width: bar, height: h, color: C.acc })
    let ty = top - pad
    for (const ln of lines) { line(ln, innerX, ty - size, size, helv, C.sec); ty -= lh }
    y = top - h - 8
  }

  const card = (kind: 'meal' | 'training', title: string, body: string | undefined, items: string[]) => {
    const isMeal = kind === 'meal'
    const bg = isMeal ? C.mealBg : C.trainBg
    const accent = isMeal ? C.acc : C.ok
    const tag = isMeal ? 'MAHLZEIT' : 'BEWEGUNG'
    y -= 12
    const pad = 14, bar = 4, innerX = MX + pad + bar + 2, innerW = CW - pad * 2 - bar - 2
    const tSize = 11.5, bSize = 10, iSize = 10, bLh = 14.5, iLh = 15
    const bodyLines = body && body.trim() ? wrap(body, helv, bSize, innerW) : []
    const itemLines = items.map((it) => wrap(it, helv, iSize, innerW - 16))

    let inner = tSize + 6
    if (bodyLines.length) inner += 6 + bodyLines.length * bLh
    if (items.length) { inner += 8; for (const w of itemLines) inner += w.length * iLh + 2 }
    const h = pad * 2 + inner
    const fits = h <= TOP - MIN_Y

    if (!fits) {
      // Sehr langer Baustein: ohne Kasten fließend rendern (kein Inhaltsverlust).
      paragraph(title, { font: helvB, size: tSize, color: C.ink, lh: tSize + 7 })
      if (bodyLines.length) paragraph(body!, { size: bSize, color: C.sec, lh: bLh })
      for (const it of items) bulletList(undefined, [it])
      return
    }
    if (y - h < MIN_Y) newPage()

    const top = y
    page.drawRectangle({ x: MX, y: top - h, width: CW, height: h, color: bg })
    page.drawRectangle({ x: MX, y: top - h, width: bar, height: h, color: accent })
    let ty = top - pad
    line(title, innerX, ty - tSize, tSize, helvB, C.ink)
    const tagW = spacedWidth(tag, helvB, 7.5, 1.2)
    spaced(tag, MX + CW - pad - tagW, ty - tSize + 1.5, 7.5, helvB, accent, 1.2)
    ty -= tSize + 6
    if (bodyLines.length) { ty -= 6; for (const ln of bodyLines) { line(ln, innerX, ty - bSize, bSize, helv, C.sec); ty -= bLh } }
    if (items.length) {
      ty -= 8
      for (const w of itemLines) {
        w.forEach((ln, i) => {
          if (i === 0) line('•', innerX, ty - iSize, iSize, helvB, accent)
          line(ln, innerX + 16, ty - iSize, iSize, helv, C.ink)
          ty -= iLh
        })
        ty -= 2
      }
    }
    y = top - h - 4
  }

  // Höhe eines Bausteins vorab schätzen (spiegelt die Zeichen-Mathematik) — nur
  // fürs „keep-with-next": eine Überschrift soll nie allein am Seitenfuß landen.
  const HEAD_H = 18 + 15 + 16
  const measure = (s: PlanSection, items: string[]): number => {
    switch (s.type) {
      case 'heading': return HEAD_H
      case 'text': return 8 + wrap(s.body || '', helv, 10.5, CW).length * 15.5
      case 'note': {
        const pad = 13, innerX = MX + pad + 3 + 3
        return 12 + pad * 2 + wrap(s.body || '', helv, 10, MX + CW - pad - innerX).length * 14.5 + 8
      }
      case 'list': {
        let h = 10 + (s.title && s.title.trim() ? 20 : 0)
        for (const it of items) h += wrap(it, helv, 10.5, CW - 16).length * 15.5 + 3
        return h + 4
      }
      case 'meal': case 'training': {
        const innerW = CW - 14 * 2 - 4 - 2
        const bodyLines = s.body && s.body.trim() ? wrap(s.body, helv, 10, innerW) : []
        let inner = 11.5 + 6
        if (bodyLines.length) inner += 6 + bodyLines.length * 14.5
        if (items.length) { inner += 8; for (const it of items) inner += wrap(it, helv, 10, innerW - 16).length * 15 + 2 }
        return 12 + 14 * 2 + inner + 4
      }
      default: return s.body ? 8 + wrap(s.body, helv, 10.5, CW).length * 15.5 : 0
    }
  }
  const secItems = (s: PlanSection) => (Array.isArray(s.items) ? s.items.filter((x) => typeof x === 'string' && x.trim()) : [])

  const secs = Array.isArray(plan.sections) ? plan.sections : []
  for (let idx = 0; idx < secs.length; idx++) {
    const s = secs[idx] || ({} as PlanSection)
    const items = secItems(s)
    switch (s.type) {
      case 'heading': {
        // Überschrift zusammen mit dem Folge-Baustein halten (max. eine Seite reservieren).
        const next = secs[idx + 1]
        let reserve = HEAD_H
        if (next) reserve += Math.min(measure(next, secItems(next)), TOP - MIN_Y - HEAD_H)
        ensure(reserve)
        heading(s.title || '')
        break
      }
      case 'text': y -= 8; paragraph(s.body || '', { size: 10.5, lh: 15.5 }); break
      case 'note': note(s.body || ''); break
      case 'list': bulletList(s.title, items); break
      case 'meal': card('meal', s.title || 'Mahlzeit', s.body, items); break
      case 'training': card('training', s.title || 'Training', s.body, items); break
      default: if (s.body) { y -= 8; paragraph(s.body, { size: 10.5, lh: 15.5 }) }
    }
  }

  // --- Fußzeile auf jeder Seite (Seitenzahl kennt die Gesamtzahl erst am Ende) ---
  const n = pages.length
  pages.forEach((p, i) => {
    p.drawLine({ start: { x: MX, y: 66 }, end: { x: MX + CW, y: 66 }, thickness: 0.75, color: C.hair })
    p.drawText(pdfSafe(DISCLAIMER), { x: MX, y: 52, size: 8, font: helvI, color: C.mut })
    p.drawText(pdfSafe(ADDRESS), { x: MX, y: 36, size: 7.5, font: helv, color: C.faint })
    const pg = `Seite ${i + 1} / ${n}`
    p.drawText(pg, { x: MX + CW - helv.widthOfTextAtSize(pg, 7.5), y: 36, size: 7.5, font: helv, color: C.faint })
  })

  return doc.save()
}
