import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string
  subject: string
  html: string
}) {
  try {
    const { data, error } = await resend.emails.send({
      from: 'liveportfolio.site <noreply@liveportfolio.site>',
      to,
      subject,
      html,
    })
    if (error) {
      console.error('[Resend error]', error)
      return { success: false, error }
    }
    return { success: true, data }
  } catch (err) {
    console.error('[Resend exception]', err)
    return { success: false, error: err }
  }
}

export const emailTemplates = {
  portfolioLive: (portfolioUrl: string) => ({
    subject: 'Your portfolio is live 🚀',
    html: `
      <div style="font-family: -apple-system, sans-serif; max-width: 520px;
                  margin: 0 auto; padding: 40px 24px; color: #0A0A0A;">
        <h1 style="font-size: 24px; font-weight: 700; margin-bottom: 8px;">
          Welcome.
        </h1>
        <p style="color: #555; font-size: 15px; line-height: 1.6; margin-bottom: 24px;">
          Paste this link into your next job application, your LinkedIn bio,
          and your WhatsApp status.
        </p>
        <a href="${portfolioUrl}"
           style="display: inline-block; background: #0A66C2; color: white;
                  padding: 12px 24px; border-radius: 8px; text-decoration: none;
                  font-weight: 600; font-size: 15px;">
          View my portfolio →
        </a>
        <p style="color: #888; font-size: 13px; margin-top: 32px;
                  border-top: 1px solid #eee; padding-top: 16px;">
          liveportfolio.site — Professional portfolios for tech talent
        </p>
      </div>
    `,
  }),

  welcomeNewUser: (name: string) => ({
    subject: 'Welcome to liveportfolio.site',
    html: `
      <div style="font-family: -apple-system, sans-serif; max-width: 520px;
                  margin: 0 auto; padding: 40px 24px; color: #0A0A0A;">
        <h1 style="font-size: 24px; font-weight: 700; margin-bottom: 8px;">
          Hi ${name}, welcome aboard.
        </h1>
        <p style="color: #555; font-size: 15px; line-height: 1.6; margin-bottom: 24px;">
          Your account is set up. Complete your portfolio and go live in minutes.
        </p>
        <a href="https://liveportfolio.site/create"
           style="display: inline-block; background: #0A66C2; color: white;
                  padding: 12px 24px; border-radius: 8px; text-decoration: none;
                  font-weight: 600; font-size: 15px;">
          Build my portfolio →
        </a>
        <p style="color: #888; font-size: 13px; margin-top: 32px;
                  border-top: 1px solid #eee; padding-top: 16px;">
          liveportfolio.site — Professional portfolios for tech talent
        </p>
      </div>
    `,
  }),

  savedProgress: (previewUrl: string) => ({
    subject: 'Your portfolio is saved and waiting',
    html: `
      <div style="font-family: -apple-system, sans-serif; max-width: 520px;
                  margin: 0 auto; padding: 40px 24px; color: #0A0A0A;">
        <h1 style="font-size: 24px; font-weight: 700; margin-bottom: 8px;">
          Your portfolio is ready.
        </h1>
        <p style="color: #555; font-size: 15px; line-height: 1.6; margin-bottom: 24px;">
          You were this close. One click publishes it permanently for $9.
        </p>
        <a href="${previewUrl}"
           style="display: inline-block; background: #0A66C2; color: white;
                  padding: 12px 24px; border-radius: 8px; text-decoration: none;
                  font-weight: 600; font-size: 15px;">
          Publish my portfolio →
        </a>
        <p style="color: #888; font-size: 13px; margin-top: 32px;
                  border-top: 1px solid #eee; padding-top: 16px;">
          liveportfolio.site — Professional portfolios for tech talent
        </p>
      </div>
    `,
  }),
}
