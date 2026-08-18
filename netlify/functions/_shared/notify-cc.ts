/**
 * Notify-CC Helper für bright-medical/netlify/functions/_shared/notify-cc.ts
 * ===========================================================================
 * Wird von contact.mts, invite-questionnaire.mts, submit-questionnaire.mts
 * und send-mail.mts aufgerufen. Sendet HMAC-signiertes JSON an das Command
 * Center.
 *
 * Setup in bright-medical:
 *   1. Diese Datei nach `netlify/functions/_shared/notify-cc.ts` kopieren
 *   2. CC_WEBHOOK_URL + CC_WEBHOOK_SECRET als Netlify-Env-Vars setzen
 *   3. In den relevanten Functions aufrufen (siehe Beispiele unten)
 *
 * Beispiel-Einbau in `contact.mts` (nach erfolgreichem Mail-Versand):
 *
 *     import { notifyCC } from "./_shared/notify-cc.ts";
 *     // …
 *     await notifyCC({
 *       event: "bm.lead.captured",
 *       email,
 *       name,
 *       phone,
 *       data: { message },
 *     });
 *
 * Failures dürfen den Haupt-Flow NICHT brechen — der Helper wirft nie. ABER: er schweigt
 * nicht mehr. Jede Nicht-Zustellung (fehlende Env, HTTP-Fehler, Netzwerk) wird laut geloggt
 * und über den Rückgabewert gemeldet, damit Aufrufer sie protokollieren können.
 */

import crypto from "node:crypto";

export interface NotifyCCInput {
  event: string;            // z.B. "bm.lead.captured", "bm.questionnaire.submitted"
  email: string;
  name?: string;
  phone?: string;
  origin?: string;
  notionPageId?: string;
  data?: Record<string, unknown>;
}

/** Ergebnis der Zustellung — damit Aufrufer protokollieren können, ob der Event ankam. */
export type NotifyCCResult = { ok: boolean; status: number | null; reason?: string };

export async function notifyCC(input: NotifyCCInput): Promise<NotifyCCResult> {
  const url = process.env.CC_WEBHOOK_URL;
  const secret = process.env.CC_WEBHOOK_SECRET;
  // Früher ein STILLER no-op: fehlten die Env-Vars, ging jeder Event spurlos verloren.
  // Jetzt laut — sonst merkt niemand, dass das Command Center gar nicht benachrichtigt wird.
  if (!url || !secret) {
    console.error(
      `[notify-cc] ⚠️ NICHT VERSCHICKT (${input.event}) — ${!url ? 'CC_WEBHOOK_URL' : 'CC_WEBHOOK_SECRET'} fehlt in den Netlify-Env-Vars.`,
      `| Betroffen: ${input.email}`,
    );
    return { ok: false, status: null, reason: 'env-missing' };
  }

  const requestId = `${input.event}-${crypto.randomUUID()}`;
  const body = JSON.stringify({ ...input, requestId });
  const ts = Date.now().toString();
  const signature = crypto
    .createHmac("sha256", secret)
    .update(`${ts}.${body}`)
    .digest("hex");

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-cc-signature": signature,
        "x-cc-timestamp": ts,
      },
      body,
    });
    // fetch wirft bei 401/500 NICHT — ohne diese Prüfung blieb eine abgewiesene
    // Zustellung unsichtbar (z. B. auseinandergelaufenes CC_WEBHOOK_SECRET → dauerhaft 401,
    // ohne dass es auf einer der beiden Seiten auffällt).
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error(
        `[notify-cc] ⚠️ CC HAT ABGELEHNT — HTTP ${res.status} (${input.event}) | Betroffen: ${input.email}`,
        res.status === 401 ? "| 401 = Signatur/Secret stimmt nicht: CC_WEBHOOK_SECRET in Netlify UND Vercel byte-identisch setzen, dann BEIDE neu deployen." : "",
        detail.slice(0, 200),
      );
      return { ok: false, status: res.status, reason: `http-${res.status}` };
    }
    return { ok: true, status: res.status };
  } catch (err) {
    console.error(`[notify-cc] Netzwerkfehler (${input.event}) für ${input.email}:`, err);
    return { ok: false, status: null, reason: "network" };
  }
}
