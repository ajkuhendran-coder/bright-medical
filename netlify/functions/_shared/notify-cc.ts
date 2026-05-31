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
 * Failures dürfen den Haupt-Flow NICHT brechen — der Helper schluckt Errors.
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

export async function notifyCC(input: NotifyCCInput): Promise<void> {
  const url = process.env.CC_WEBHOOK_URL;
  const secret = process.env.CC_WEBHOOK_SECRET;
  if (!url || !secret) return; // Silent no-op when CC isn't wired yet.

  const requestId = `${input.event}-${crypto.randomUUID()}`;
  const body = JSON.stringify({ ...input, requestId });
  const ts = Date.now().toString();
  const signature = crypto
    .createHmac("sha256", secret)
    .update(`${ts}.${body}`)
    .digest("hex");

  try {
    await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-cc-signature": signature,
        "x-cc-timestamp": ts,
      },
      body,
    });
  } catch (err) {
    console.error("[notify-cc] failed", err);
  }
}
