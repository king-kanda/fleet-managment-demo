/**
 * WhatsApp Business Cloud API wiring — STUBBED for the demo.
 *
 * The demo runs entirely client-side, so no real messages are sent. This module
 * documents exactly where and how you would plug in Meta's WhatsApp Business
 * Cloud API in a production deployment, and provides a single swap point.
 *
 * PRODUCTION FLOW
 * ---------------
 * 1. Outbound (dispatch → driver): POST to the Cloud API messages endpoint.
 *
 *      POST https://graph.facebook.com/v21.0/{PHONE_NUMBER_ID}/messages
 *      Authorization: Bearer {WHATSAPP_ACCESS_TOKEN}
 *      Content-Type: application/json
 *      {
 *        "messaging_product": "whatsapp",
 *        "to": "<driver E.164 number>",
 *        "type": "text",
 *        "text": { "body": "<message>" }
 *      }
 *
 *    NOTE: these secrets must live on a server, never in the browser. In a real
 *    app `sendWhatsApp` below would call your own backend endpoint, which holds
 *    the token and forwards to Meta.
 *
 * 2. Inbound (driver → dispatch): Meta calls your webhook.
 *
 *      GET  /webhook   → verify with hub.challenge / verify token
 *      POST /webhook   → delivery statuses + inbound messages
 *
 *    Your webhook handler would translate each inbound message into a call to
 *    `receiveMessage(driverId, body)` from actions.ts, which is what the demo's
 *    simulator does directly.
 */

export interface WhatsAppConfig {
  phoneNumberId: string
  accessToken: string
  apiVersion: string
}

export const DEMO_MODE = true

/**
 * Swap point for outbound messages. In the demo this is a no-op resolving to a
 * fake message id; wire it to your backend to go live.
 */
export async function sendWhatsApp(to: string, body: string, config?: WhatsAppConfig): Promise<{ id: string }> {
  if (DEMO_MODE || !config) {
    return { id: `demo-${Date.now()}` }
  }
  // Example real call (would run server-side):
  // const res = await fetch(`https://graph.facebook.com/${config.apiVersion}/${config.phoneNumberId}/messages`, {
  //   method: 'POST',
  //   headers: { Authorization: `Bearer ${config.accessToken}`, 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ messaging_product: 'whatsapp', to, type: 'text', text: { body } }),
  // })
  // const data = await res.json()
  // return { id: data.messages?.[0]?.id ?? `unknown-${Date.now()}` }
  void to
  void body
  return { id: `demo-${Date.now()}` }
}
