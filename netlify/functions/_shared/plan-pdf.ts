// plan-pdf — server-generiertes Design-PDF aus den Portal-Plan-Bausteinen.
// A4-Editorial-Layout mit pdf-lib + eingebetteten Marken-Fonts (Newsreader/Hanken),
// nachgebaut aus dem freigegebenen Claude-Design „Ernährungs- & Trainingsplan".
// KEINE Persistenz: der Aufrufer erzeugt das PDF on-demand und speichert es nirgends.
//
// Datenquelle bleibt unser `sections`-Modell (heading·text·list·meal·training·note).
// Reichere Darstellung wird abgeleitet + über optionale Felder gesteuert (abwärtskompatibel):
//   list.variant: 'cards' | 'checks' | 'plain'   (sonst aus Überschrifts-Kontext abgeleitet)
//   meal.plate:   true  → Teller-Portionsmodell-Foto statt Liste
//   training-Titel „… (2×/Woche)" → Badge-Pill
//   **fett** im Text/Items → Hervorhebung
//   note MIT title → Getränke-Callout · note OHNE title → Schluss-Zitat + Signatur

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { PDFDocument, rgb, type PDFFont, type PDFImage, type PDFPage, type RGB } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'

export type PlanSection = { type: string; title?: string; body?: string; items?: string[]; variant?: string; plate?: boolean }
export type PlanForPdf = {
  title: string
  intro?: string | null
  sections: PlanSection[]
  version?: number | null
  updatedAt?: string | null
}
export type PlanPdfAssets = {
  serifMed: Uint8Array; serifItalic: Uint8Array
  sans: Uint8Array; sansSemi: Uint8Array; sansBold: Uint8Array
  logo?: Uint8Array | null; plate?: Uint8Array | null
}
export type BuildPlanPdfOpts = { name?: string | null; dateLabel?: string | null; assets: PlanPdfAssets }

// Fonts (Pflicht) + Bilder (optional) relativ zum Modul laden — im Function-Bundle via
// netlify.toml included_files vorhanden. Zentralisiert, damit buildPlanPdf rein/testbar bleibt.
export function loadPlanPdfAssets(): PlanPdfAssets {
  const font = (f: string) => readFileSync(fileURLToPath(new URL(`./fonts/${f}`, import.meta.url)))
  const img = (p: string): Uint8Array | null => {
    try { return readFileSync(fileURLToPath(new URL(`../../../public/images/${p}`, import.meta.url))) } catch { return null }
  }
  return {
    serifMed: font('Newsreader-Medium.ttf'),
    serifItalic: font('Newsreader-Italic.ttf'),
    sans: font('HankenGrotesk-Regular.ttf'),
    sansSemi: font('HankenGrotesk-SemiBold.ttf'),
    sansBold: font('HankenGrotesk-Bold.ttf'),
    logo: img('logo-light.png'),
    plate: img('teller-portionsmodell.jpg'),
  }
}

const hex = (h: string): RGB => rgb(parseInt(h.slice(0, 2), 16) / 255, parseInt(h.slice(2, 4), 16) / 255, parseInt(h.slice(4, 6), 16) / 255)
const C = {
  ink: hex('14314D'), acc: hex('1AA3C6'), accDk: hex('0E7E9C'),
  body: hex('40566A'), intro: hex('4A6071'), sub: hex('6B7E8D'),
  hair: hex('E7EDF2'), hair2: hex('EDF1F5'), cardHair: hex('E2EAEF'),
  cardBg: hex('F7F9FB'),
  calloutBg: hex('EAF6F9'), calloutBorder: hex('CDE9F0'), calloutText: hex('2C5266'),
  footDisc: hex('9BAAB6'), footAddr: hex('B4C0CA'), headEyebrow: hex('9BAAB6'),
  quote: hex('2C4256'),
}

const PAGE_W = 595.28, PAGE_H = 841.89
const MX = 50, CW = PAGE_W - MX * 2
const CONTENT_TOP = PAGE_H - 72     // Oberkante Inhalt (unter dem laufenden Kopf)
const MIN_Y = 78                    // Inhalts-Boden (über der Fußzeile)

const DISCLAIMER = 'Bright Medical ist ein Coaching-Angebot und ersetzt keine ärztliche Behandlung.'
const ADDRESS = 'Bright Medical · Am Alten Güterbahnhof 24 · 76646 Bruchsal · brightmedical.de'
const HEADER_EYEBROW = 'Ernährungs- & Trainingsplan'
const SIGNATURE = { name: 'Ajanth Kuhendran', lines: ['Facharzt für Allgemeinmedizin', 'Spezialist in funktionelle und integrative Medizin', 'Bright Medical'] }

// Newsreader/Hanken decken Latin-1 + wichtige Typo-Zeichen ab (subset). Nur Exoten entschärfen.
function sanitize(s: string): string {
  return String(s ?? '').replace(/\r\n?/g, '\n').replace(/\t/g, ' ').replace(/→/g, '->').replace(/[^\n\x20-\x7E\xA0-\xFF–—‘’“”„•…€]/g, ' ')
}

function formatDate(iso?: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  return 'Stand ' + d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Europe/Berlin' })
}

type Word = { text: string; bold: boolean; space: boolean }
// **fett**-Markup → Wortliste mit bold-Flag + „führendes Leerzeichen?" (behält Satzzeichen-Nähe).
function richWords(s: string): Word[] {
  const out: Word[] = []
  const parts = sanitize(s).split('**')
  let first = true, prevEndsSpace = true
  for (let i = 0; i < parts.length; i++) {
    const seg = parts[i]
    if (!seg) continue
    const bold = i % 2 === 1
    const leadSpace = /^\s/.test(seg)
    const toks = seg.split(/\s+/).filter((t) => t !== '')
    toks.forEach((tok, j) => {
      const space = first ? false : j === 0 ? leadSpace || prevEndsSpace : true
      out.push({ text: tok, bold, space })
      first = false
    })
    prevEndsSpace = /\s$/.test(seg)
  }
  return out
}

export async function buildPlanPdf(plan: PlanForPdf, opts: BuildPlanPdfOpts): Promise<Uint8Array> {
  const a = opts.assets
  const doc = await PDFDocument.create()
  doc.registerFontkit(fontkit)
  doc.setTitle('Bright Medical - Ihr Ernährungs- & Trainingsplan')
  doc.setAuthor('Bright Medical'); doc.setCreator('Bright Medical'); doc.setProducer('Bright Medical')

  const serif = await doc.embedFont(a.serifMed, { subset: true })
  const serifI = await doc.embedFont(a.serifItalic, { subset: true })
  const sans = await doc.embedFont(a.sans, { subset: true })
  const sansS = await doc.embedFont(a.sansSemi, { subset: true })
  const sansB = await doc.embedFont(a.sansBold, { subset: true })
  let logo: PDFImage | null = null, plate: PDFImage | null = null
  if (a.logo?.length) { try { logo = await doc.embedPng(a.logo) } catch { logo = null } }
  if (a.plate?.length) { try { plate = await doc.embedJpg(a.plate) } catch { plate = null } }

  const pages: PDFPage[] = []
  let page!: PDFPage
  let y = 0
  const newPage = () => { page = doc.addPage([PAGE_W, PAGE_H]); pages.push(page); y = CONTENT_TOP }

  const T = (s: string, x: number, baseY: number, size: number, font: PDFFont, color: RGB) => page.drawText(sanitize(s), { x, y: baseY, size, font, color })
  const wText = (s: string, size: number, font: PDFFont) => font.widthOfTextAtSize(sanitize(s), size)
  const TR = (s: string, xRight: number, baseY: number, size: number, font: PDFFont, color: RGB) => T(s, xRight - wText(s, size, font), baseY, size, font, color)
  const wSpaced = (s: string, size: number, font: PDFFont, tr: number) => { const t = sanitize(s); let w = 0; for (const ch of t) w += font.widthOfTextAtSize(ch, size) + tr; return t.length ? w - tr : 0 }
  const spaced = (s: string, x: number, baseY: number, size: number, font: PDFFont, color: RGB, tr: number) => { let cx = x; for (const ch of sanitize(s)) { page.drawText(ch, { x: cx, y: baseY, size, font, color }); cx += font.widthOfTextAtSize(ch, size) + tr } }

  // abgerundetes Rechteck (Fill + optional 1px-Rahmen) via Rechtecke + Eck-Kreise
  const rrFill = (x: number, yb: number, w: number, h: number, r: number, color: RGB) => {
    r = Math.max(0, Math.min(r, w / 2, h / 2))
    page.drawRectangle({ x: x + r, y: yb, width: w - 2 * r, height: h, color })
    page.drawRectangle({ x, y: yb + r, width: w, height: h - 2 * r, color })
    for (const [cx, cy] of [[x + r, yb + r], [x + w - r, yb + r], [x + r, yb + h - r], [x + w - r, yb + h - r]] as const) page.drawCircle({ x: cx, y: cy, size: r, color })
  }
  const rrBox = (x: number, yb: number, w: number, h: number, r: number, fill: RGB, border?: RGB, bw = 1) => {
    if (border) { rrFill(x, yb, w, h, r, border); rrFill(x + bw, yb + bw, w - 2 * bw, h - 2 * bw, Math.max(0, r - bw), fill) }
    else rrFill(x, yb, w, h, r, fill)
  }

  // --- Rich-Text (mit **fett**): Umbruch in Zeilen, korrekte Wort-Zwischenräume ---
  const layout = (s: string, maxW: number, size: number, reg: PDFFont, bold: PDFFont): { lines: Word[][]; sp: number } => {
    const sp = reg.widthOfTextAtSize(' ', size)
    const lines: Word[][] = []; let line: Word[] = [], lw = 0
    for (const wd of richWords(s)) {
      const ww = (wd.bold ? bold : reg).widthOfTextAtSize(wd.text, size)
      const ns = line.length > 0 && wd.space
      if (line.length && lw + (ns ? sp : 0) + ww > maxW) { lines.push(line); line = []; lw = 0 }
      const ns2 = line.length > 0 && wd.space
      line.push(wd); lw += (ns2 ? sp : 0) + ww
    }
    if (line.length) lines.push(line)
    return { lines, sp }
  }
  const drawLine = (line: Word[], x: number, baseY: number, size: number, reg: PDFFont, bold: PDFFont, color: RGB, boldColor: RGB, sp: number) => {
    let cx = x
    for (let i = 0; i < line.length; i++) { const wd = line[i]; if (i > 0 && wd.space) cx += sp; page.drawText(wd.text, { x: cx, y: baseY, size, font: wd.bold ? bold : reg, color: wd.bold ? boldColor : color }); cx += (wd.bold ? bold : reg).widthOfTextAtSize(wd.text, size) }
  }
  // Fließtext ab Cursor; paginiert zeilenweise.
  const rich = (s: string, o: { x?: number; size?: number; color?: RGB; lh?: number; maxW?: number; reg?: PDFFont; bold?: PDFFont; boldColor?: RGB }) => {
    const x = o.x ?? MX, size = o.size ?? 14.5, color = o.color ?? C.body, lh = o.lh ?? size * 1.55
    const reg = o.reg ?? sans, bold = o.bold ?? sansS, boldColor = o.boldColor ?? C.ink, maxW = o.maxW ?? (MX + CW - x)
    const { lines, sp } = layout(s, maxW, size, reg, bold)
    for (const ln of lines) { if (y - size < MIN_Y) newPage(); drawLine(ln, x, y - size, size, reg, bold, color, boldColor, sp); y -= lh }
  }
  const richLines = (s: string, maxW: number, size: number, reg = sans, bold = sansS) => layout(s, maxW, size, reg, bold).lines.length

  // ---------- Cover (Seite 1) ----------
  newPage()
  spaced((opts.name && opts.name.trim() ? `Für ${opts.name.trim()}` : 'Ihr Plan').toUpperCase(), MX, y - 9, 11, sansB, C.acc, 1.6)
  const dateLabel = opts.dateLabel || formatDate(plan.updatedAt)
  if (dateLabel) TR(dateLabel, MX + CW, y - 9, 11, sansS, C.headEyebrow)
  y -= 28
  { const size = 40, lh = 42, maxW = CW; let line = ''
    const flush = (ln: string) => { if (y - size < MIN_Y) newPage(); T(ln, MX, y - size + 6, size, serif, C.ink); y -= lh }
    for (const w of sanitize(plan.title || 'Ihr Ernährungs- & Trainingsplan').split(/\s+/)) { const test = line ? line + ' ' + w : w; if (line && wText(test, size, serif) > maxW) { flush(line); line = w } else line = test }
    if (line) flush(line) }
  if (plan.intro && plan.intro.trim()) { y -= 12; rich(plan.intro, { size: 15.5, color: C.intro, lh: 26, maxW: Math.min(CW, 430) }) }
  y -= 8

  // ---------- Baustein-Renderer ----------
  const sectionHeading = (title: string) => {
    y -= 30
    const size = 22
    if (y - size < MIN_Y) newPage()
    T(title, MX, y - size + 4, size, serif, C.ink)
    const tw = wText(title, size, serif)
    if (MX + tw + 14 < MX + CW) page.drawRectangle({ x: MX + tw + 14, y: y - size / 2 + 1, width: CW - tw - 14, height: 1, color: C.hair })
    y -= size + 6
  }
  const kicker = (label: string, color = C.acc) => {
    const size = 10, tr = 1.8
    spaced(label.toUpperCase(), MX, y - size, size, sansB, color, tr)
    const kw = wSpaced(label.toUpperCase(), size, sansB, tr)
    if (MX + kw + 12 < MX + CW) page.drawRectangle({ x: MX + kw + 12, y: y - size / 2 - 1, width: CW - kw - 12, height: 1, color: C.hair2 })
    y -= size + 8
  }
  const cards = (items: string[]) => {
    y -= 12
    const n = Math.min(items.length, 3) || 1
    const gap = 14, cw = (CW - gap * (n - 1)) / n, pad = 18, numH = 34, ruleGap = 12, textLh = 20
    let maxTextH = 0
    const laid = items.slice(0, n).map((it) => layout(it, cw - pad * 2, 13.5, sans, sansS))
    for (const l of laid) maxTextH = Math.max(maxTextH, l.lines.length * textLh)
    const h = 20 + (numH - 8) + ruleGap + 1 + ruleGap + maxTextH + (pad - 6)
    if (y - h < MIN_Y) newPage()
    const top = y
    laid.forEach((l, i) => {
      const x = MX + i * (cw + gap)
      rrBox(x, top - h, cw, h, 14, C.cardBg, C.hair)
      T(String(i + 1).padStart(2, '0'), x + pad, top - 20 - 26, 34, serif, C.acc)
      page.drawRectangle({ x: x + pad, y: top - 20 - numH - ruleGap, width: cw - pad * 2, height: 1, color: C.cardHair })
      let ty = top - 20 - numH - ruleGap - ruleGap
      for (const ln of l.lines) { drawLine(ln, x + pad, ty - 13.5, 13.5, sans, sansS, C.body, C.ink, l.sp); ty -= textLh }
    })
    y = top - h
  }
  const bullets = (items: string[], markerColor = C.acc) => {
    y -= 4
    for (const it of items) {
      const { lines, sp } = layout(it, MX + CW - (MX + 20), 14.5, sans, sansS)
      if (y - 14.5 < MIN_Y) newPage()
      page.drawCircle({ x: MX + 6, y: y - 11, size: 3, color: markerColor })
      lines.forEach((ln, i) => { if (i > 0 && y - 14.5 < MIN_Y) newPage(); drawLine(ln, MX + 20, y - 14.5, 14.5, sans, sansS, C.body, C.ink, sp); y -= 21 })
      y -= 4
    }
  }
  const checks = (items: string[]) => {
    y -= 6
    for (const it of items) {
      const { lines, sp } = layout(it, MX + CW - (MX + 38), 15, sans, sansS)
      if (y - 15 < MIN_Y) newPage()
      const cy = y - 13
      rrBox(MX, cy - 13, 26, 26, 13, C.calloutBg, C.calloutBorder)
      page.drawLine({ start: { x: MX + 8, y: cy }, end: { x: MX + 11.5, y: cy - 3.5 }, thickness: 1.8, color: C.accDk })
      page.drawLine({ start: { x: MX + 11.5, y: cy - 3.5 }, end: { x: MX + 18, y: cy + 4.5 }, thickness: 1.8, color: C.accDk })
      lines.forEach((ln, i) => { if (i > 0 && y - 15 < MIN_Y) newPage(); drawLine(ln, MX + 38, y - 15, 15, sans, sansS, C.body, C.ink, sp); y -= 22 })
      y -= 6
    }
  }
  const plateFig = () => {
    if (!plate) return
    y -= 14
    const w = CW, h = w * (plate.height / plate.width)
    if (y - h < MIN_Y && h <= CONTENT_TOP - MIN_Y) newPage()
    page.drawImage(plate, { x: MX, y: y - h, width: w, height: h })
    page.drawRectangle({ x: MX, y: y - h, width: w, height: h, borderColor: C.hair, borderWidth: 1 })
    y -= h + 4
  }
  const badge = (text: string, atX: number, baseY: number) => {
    const size = 10.5, padX = 10, h = 18
    const bw = wText(text, size, sansS) + padX * 2
    rrBox(atX, baseY - 4, bw, h, 9, C.calloutBg, C.calloutBorder)
    T(text, atX + padX, baseY, size, sansS, C.accDk)
  }
  const callout = (label: string, body: string) => {
    y -= 12
    const size = 14.5, lh = 20, pad = 16
    const kickW = wSpaced(label.toUpperCase(), 10, sansB, 1.5) + 16
    const availW = CW - pad * 2 - kickW
    const h = pad * 2 + Math.max(richLines(body, availW, size) * lh, 16)
    if (y - h < MIN_Y) newPage()
    const top = y
    rrBox(MX, top - h, CW, h, 14, C.calloutBg, C.calloutBorder)
    spaced(label.toUpperCase(), MX + pad, top - pad - 10, 10, sansB, C.accDk, 1.5)
    rich(body, { x: MX + pad + kickW, size, color: C.calloutText, lh, maxW: availW })
    y = top - h - 4
  }
  const closing = (body: string) => {
    y -= 24
    const size = 17, lh = 25, pad = 22
    const need = richLines(body, CW - pad, size, serifI, serifI) * lh + 18 + 20 + SIGNATURE.lines.length * 18
    if (y - need < MIN_Y) newPage()
    const top = y
    rich(body, { x: MX + pad, size, color: C.quote, lh, reg: serifI, bold: serifI, boldColor: C.quote, maxW: CW - pad })
    y -= 16
    T(SIGNATURE.name, MX + pad, y - 14, 14, sansB, C.ink); y -= 20
    for (const ln of SIGNATURE.lines) { T(ln, MX + pad, y - 12.5, 12.5, sans, C.sub); y -= 18 }
    page.drawRectangle({ x: MX, y: y + 4, width: 3, height: top - (y + 4), color: C.acc })
    y -= 2
  }

  const HEAD = 30 + 22 + 6
  const guardRe = /leitplanke|grundregel|grundsatz|prinzip|regel/i
  const successRe = /erfolg|messen|merken|dranbleib|erkenne/i
  const itemsHeight = (items: string[], size: number, lh: number, maxW: number) => { let h = 0; for (const it of items) h += richLines(it, maxW, size) * lh + 4; return h }
  // geschätzte Höhe eines Mahlzeit-/Bewegungs-Blocks (fürs keep-together)
  const mtHeight = (s: PlanSection, items: string[]) => {
    const showPlate = s.type !== 'training' && !!s.plate && !!plate
    const subH = s.body && s.body.trim() && !showPlate ? richLines(s.body, CW, 15.5, serifI, serifI) * 22 + 4 : 0
    const bodyBlock = showPlate ? 14 + CW * ((plate?.height || 1) / (plate?.width || 1)) + 4 : itemsHeight(items, 14.5, 21, MX + CW - (MX + 20))
    return 22 + 18 + 30 + subH + 4 + bodyBlock
  }

  const secs = Array.isArray(plan.sections) ? plan.sections : []
  let headingKind: 'guard' | 'success' | 'other' = 'other'
  let firstListSeen = false
  for (let idx = 0; idx < secs.length; idx++) {
    const s = secs[idx] || ({} as PlanSection)
    const items = Array.isArray(s.items) ? s.items.filter((x) => typeof x === 'string' && x.trim()) : []
    switch (s.type) {
      case 'heading': {
        headingKind = guardRe.test(s.title || '') ? 'guard' : successRe.test(s.title || '') ? 'success' : 'other'
        const next = secs[idx + 1]
        let reserve = HEAD + 30
        if (next) {
          const nItems = Array.isArray(next.items) ? next.items.filter((x) => typeof x === 'string' && x.trim()) : []
          if (next.type === 'list') {
            const asCards = headingKind === 'guard' && nItems.length >= 2 && nItems.length <= 3
            if (asCards) { const nc = Math.min(nItems.length, 3), cw = (CW - 14 * (nc - 1)) / nc; let m = 0; for (const it of nItems.slice(0, nc)) m = Math.max(m, richLines(it, cw - 36, 13.5) * 20); reserve = HEAD + 71 + m }
            else reserve = HEAD + (next.title ? 18 : 0) + itemsHeight(nItems, 14.5, 21, MX + CW - (MX + 20))
          } else if (next.type === 'meal' || next.type === 'training') { const np = next.type === 'meal' && !!next.plate && !!plate; reserve = HEAD + (np ? mtHeight(next, nItems) : Math.min(mtHeight(next, nItems), 132)) }
          else if (next.type === 'note') reserve = HEAD + (next.title ? 64 : 130)
          else if (next.body) reserve = HEAD + richLines(next.body, CW, 14.5) * 22 + 10
          reserve = Math.min(reserve, CONTENT_TOP - MIN_Y)
        }
        if (y - reserve < MIN_Y) newPage()
        sectionHeading(s.title || '')
        break
      }
      case 'list': {
        const variant = s.variant || (headingKind === 'guard' || (!firstListSeen && items.length >= 2 && items.length <= 3) ? 'cards' : headingKind === 'success' ? 'checks' : 'plain')
        firstListSeen = true
        if (variant === 'cards' && items.length >= 2 && items.length <= 3) cards(items)
        else if (variant === 'checks') checks(items)
        else { if (s.title) { y -= 10; if (y - 12 < MIN_Y) newPage(); T(s.title, MX, y - 12, 12, sansS, C.ink); y -= 18 } bullets(items) }
        break
      }
      case 'meal':
      case 'training': {
        const isTraining = s.type === 'training'
        let title = s.title || (isTraining ? 'Bewegung' : 'Mahlzeit'), badgeText = ''
        if (isTraining) { const m = title.match(/^(.*?)\s*\(([^)]+)\)\s*$/); if (m) { title = m[1].trim(); badgeText = m[2].trim() } }
        const showPlate = !isTraining && !!s.plate && !!plate
        const subH = s.body && s.body.trim() && !showPlate ? richLines(s.body, CW, 15.5, serifI, serifI) * 22 + 4 : 0
        const blockH = mtHeight(s, items)
        const reserveMt = showPlate ? blockH : Math.min(blockH, 132)
        if (y - reserveMt < MIN_Y && y < CONTENT_TOP - 4 && reserveMt <= CONTENT_TOP - MIN_Y) newPage()
        y -= 22
        kicker(isTraining ? 'Bewegung' : 'Mahlzeit')
        T(title, MX, y - 24 + 3, 24, serif, C.ink)
        if (badgeText) badge(badgeText, MX + wText(title, 24, serif) + 12, y - 24 + 8)
        y -= 30
        if (subH) { rich(s.body || '', { size: 15.5, color: C.sub, lh: 22, reg: serifI, bold: serifI, boldColor: C.sub }); y -= 4 }
        if (showPlate) plateFig()
        else bullets(items)
        break
      }
      case 'note': {
        if (s.title && s.title.trim()) callout(s.title, s.body || '')
        else closing(s.body || '')
        break
      }
      case 'text':
      default: if (s.body) { y -= 10; rich(s.body, { size: 14.5, color: C.body, lh: 22 }) }
    }
  }

  // ---------- laufender Kopf + Fuß auf jeder Seite ----------
  for (const p of pages) {
    if (logo) { const lw = 96, lh = lw * (logo.height / logo.width); p.drawImage(logo, { x: MX, y: PAGE_H - 32 - lh, width: lw, height: lh }) }
    else p.drawText('BRIGHT MEDICAL', { x: MX, y: PAGE_H - 44, size: 12, font: serif, color: C.ink })
    { const str = HEADER_EYEBROW.toUpperCase(), size = 10.5, tr = 1.6; let w = 0; for (const ch of str) w += sansS.widthOfTextAtSize(ch, size) + tr; w -= tr
      let cx = MX + CW - w; for (const ch of str) { p.drawText(ch, { x: cx, y: PAGE_H - 46, size, font: sansS, color: C.headEyebrow }); cx += sansS.widthOfTextAtSize(ch, size) + tr } }
    p.drawRectangle({ x: MX, y: PAGE_H - 56, width: CW, height: 1, color: C.hair })
    p.drawRectangle({ x: MX, y: 60, width: CW, height: 1, color: C.hair })
    p.drawText(sanitize(DISCLAIMER), { x: MX, y: 46, size: 10, font: serifI, color: C.footDisc })
    p.drawText(sanitize(ADDRESS), { x: MX, y: 32, size: 10, font: sans, color: C.footAddr })
  }

  return doc.save()
}
