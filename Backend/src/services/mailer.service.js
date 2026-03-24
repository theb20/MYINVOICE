import nodemailer from 'nodemailer'

import { logInfo, logWarn, logError } from '../logger.js'

let cachedTransport = null

function isSecure(env) {
  if (env.SMTP_SECURE === 'true') return true
  if (env.SMTP_SECURE === 'false') return false
  return env.SMTP_PORT === 465
}

function getTransport(env) {
  if (cachedTransport) return cachedTransport
  if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASS) return null
  cachedTransport = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: isSecure(env),
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
  })
  return cachedTransport
}

export async function sendClientInviteEmail(ctx, { to, clientName, url, expiresAt }) {
  const { env, requestId } = ctx

  if (env.MAIL_MODE === 'log') {
    logInfo('mail_invite_log', { requestId, to, clientName, expiresAt })
    logInfo('mail_invite_url', { requestId, to, url })
    return { sent: true, mode: 'log' }
  }

  const transport = getTransport(env)
  if (!transport) {
    logWarn('mail_disabled_missing_smtp', { requestId, to })
    return { sent: false, mode: 'smtp', reason: 'missing_smtp_config' }
  }
  if (!env.MAIL_FROM) {
    logWarn('mail_disabled_missing_from', { requestId, to })
    return { sent: false, mode: 'smtp', reason: 'missing_mail_from' }
  }

  const subject = 'Informations client - lien sécurisé'
  const safeName = (clientName || '').trim()
  const greeting = safeName ? `Bonjour ${safeName},` : 'Bonjour,'
  const text = `${greeting}\n\nMerci de compléter vos informations via ce lien sécurisé :\n${url}\n\nCe lien expire le ${new Date(expiresAt).toLocaleString('fr-FR')}.\n\nCordialement,\nStack`
  const html = `
  <div style="margin:0;padding:0;background-color:#f9fafb;font-family:ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto;">
    
    <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;">
      <tr>
        <td align="center">

          <table width="100%" max-width="600px" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,0.05);overflow:hidden;">
            
            <!-- Header -->
            <tr>
              <td style="padding:24px 32px;background:#111827;color:#ffffff;font-size:18px;font-weight:600;">
                Stack
              </td>
            </tr>

            <!-- Content -->
            <tr>
              <td style="padding:32px;">
                <p style="margin:0 0 16px 0;font-size:16px;color:#111827;">
                  ${greeting}
                </p>

                <p style="margin:0 0 24px 0;color:#374151;">
                  Merci de compléter vos informations via ce lien sécurisé :
                </p>

                <!-- Button -->
                <table cellpadding="0" cellspacing="0">
                  <tr>
                    <td align="center">
                      <a href="${url}" 
                        style="display:inline-block;padding:12px 20px;background:#bef264;color:#1f2937;text-decoration:none;border-radius:8px;font-weight:600;">
                        Accéder au formulaire
                      </a>
                    </td>
                  </tr>
                </table>

                <!-- Expiration -->
                <p style="margin-top:24px;font-size:12px;color:#9ca3af;">
                  Ce lien expire le ${new Date(expiresAt).toLocaleString('fr-FR')}.
                </p>

                <!-- Signature -->
                <p style="margin-top:24px;color:#111827;">
                  Cordialement,<br/>
                  <strong>Stack</strong>
                </p>
              </td>
            </tr>

          </table>

          <!-- Footer -->
          <table width="600" cellpadding="0" cellspacing="0" style="margin-top:16px;">
            <tr>
              <td style="text-align:center;font-size:12px;color:#9ca3af;">
                © ${new Date().getFullYear()} Stack. Tous droits réservés.
              </td>
            </tr>
          </table>

        </td>
      </tr>
    </table>

  </div>
`;

  try {
    await transport.sendMail({
      from: env.MAIL_FROM,
      to,
      subject,
      text,
      html,
    })
    logInfo('mail_invite_sent', { requestId, to })
    return { sent: true, mode: 'smtp' }
  } catch (e) {
    logError('mail_invite_failed', { requestId, to, error: e instanceof Error ? e.message : String(e) })
    return { sent: false, mode: 'smtp', reason: 'send_failed' }
  }
}

export async function sendAdminClientCompletedEmail(ctx, { to, client }) {
  const { env, requestId, origins } = ctx
  const recipient = String(to || '').trim()
  if (!recipient) return { sent: false, mode: env.MAIL_MODE || 'smtp', reason: 'missing_to' }

  const origin = (Array.isArray(origins) && origins[0]) || env.FRONTEND_ORIGIN?.split(',')?.[0]?.trim() || 'http://localhost:5173'
  const clientsUrl = `${origin}/clients`

  const safeName = String(client?.name || '').trim()
  const subject = safeName ? `Client complété: ${safeName}` : 'Client complété'

  const lines = [
    'Un client vient de compléter sa fiche via le lien sécurisé.',
    '',
    `Nom: ${safeName || '—'}`,
    `Email: ${client?.email || '—'}`,
    `Téléphone: ${client?.phone || '—'}`,
    `Ville: ${client?.city || '—'}`,
    `Pays: ${client?.country || '—'}`,
    `Complété le: ${client?.lastCompletedAt ? new Date(client.lastCompletedAt).toLocaleString('fr-FR') : '—'}`,
    '',
    `Voir les clients: ${clientsUrl}`,
  ]
  const text = lines.join('\n')

  const html = `
    <div style="font-family: ui-sans-serif, system-ui; line-height: 1.5;">
      <p>Un client vient de compléter sa fiche via le lien sécurisé.</p>
      <ul>
        <li><strong>Nom:</strong> ${safeName || '—'}</li>
        <li><strong>Email:</strong> ${client?.email || '—'}</li>
        <li><strong>Téléphone:</strong> ${client?.phone || '—'}</li>
        <li><strong>Ville:</strong> ${client?.city || '—'}</li>
        <li><strong>Pays:</strong> ${client?.country || '—'}</li>
        <li><strong>Complété le:</strong> ${client?.lastCompletedAt ? new Date(client.lastCompletedAt).toLocaleString('fr-FR') : '—'}</li>
      </ul>
      <p><a href="${clientsUrl}">Voir les clients</a></p>
    </div>
  `

  if (env.MAIL_MODE === 'log') {
    logInfo('mail_admin_client_completed_log', { requestId, to: recipient, clientName: safeName })
    logInfo('mail_admin_client_completed_text', { requestId, to: recipient, text: String(text || '').slice(0, 500) })
    return { sent: true, mode: 'log' }
  }

  const transport = getTransport(env)
  if (!transport) {
    logWarn('mail_disabled_missing_smtp', { requestId, to: recipient })
    return { sent: false, mode: 'smtp', reason: 'missing_smtp_config' }
  }
  if (!env.MAIL_FROM) {
    logWarn('mail_disabled_missing_from', { requestId, to: recipient })
    return { sent: false, mode: 'smtp', reason: 'missing_mail_from' }
  }

  try {
    await transport.sendMail({
      from: env.MAIL_FROM,
      to: recipient,
      subject,
      text,
      html,
    })
    logInfo('mail_admin_client_completed_sent', { requestId, to: recipient })
    return { sent: true, mode: 'smtp' }
  } catch (e) {
    logError('mail_admin_client_completed_failed', { requestId, to: recipient, error: e instanceof Error ? e.message : String(e) })
    return { sent: false, mode: 'smtp', reason: 'send_failed' }
  }
}

export async function sendInvoiceEmail(ctx, { to, cc, subject, text, html }) {
  const { env, requestId } = ctx

  if (env.MAIL_MODE === 'log') {
    logInfo('mail_invoice_log', { requestId, to, cc, subject })
    logInfo('mail_invoice_text', { requestId, to, text: String(text || '').slice(0, 500) })
    return { sent: true, mode: 'log' }
  }

  const transport = getTransport(env)
  if (!transport) {
    logWarn('mail_disabled_missing_smtp', { requestId, to })
    return { sent: false, mode: 'smtp', reason: 'missing_smtp_config' }
  }
  if (!env.MAIL_FROM) {
    logWarn('mail_disabled_missing_from', { requestId, to })
    return { sent: false, mode: 'smtp', reason: 'missing_mail_from' }
  }

  try {
    await transport.sendMail({
      from: env.MAIL_FROM,
      to,
      cc: Array.isArray(cc) && cc.length ? cc : undefined,
      subject,
      text,
      html,
    })
    logInfo('mail_invoice_sent', { requestId, to })
    return { sent: true, mode: 'smtp' }
  } catch (e) {
    logError('mail_invoice_failed', { requestId, to, error: e instanceof Error ? e.message : String(e) })
    return { sent: false, mode: 'smtp', reason: 'send_failed' }
  }
}
