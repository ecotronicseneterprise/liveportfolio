import { CREATE_HREF } from '@/lib/onboarding/entry'
import type { Metadata } from 'next'
import Link from 'next/link'
import CookieSettingsLink from '@/components/CookieSettingsLink'

// LEGAL REVIEW REQUIRED before relying on this text. Drafted from what the code actually does. docs/legal-review.md lists the
// claims a lawyer must check: consent rules by region, the data-location and retention statements, the OpenAI statements, and
// whether visitor-IP lookups on published portfolios need their own notice or consent.

export const metadata: Metadata = {
  title: 'Privacy Policy — LivePortfolio',
  description: 'Privacy policy for LivePortfolio. How we collect, use, and protect your data.',
  alternates: {
    canonical: 'https://liveportfolio.site/privacy',
  },
  openGraph: {
    title: 'Privacy Policy — LivePortfolio',
    siteName: 'LivePortfolio',
    url: 'https://liveportfolio.site/privacy',
  },
}

const H2 = 'text-lg font-semibold text-gray-900 mb-3'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white text-[#0A0A0A]">
      <nav className="border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-5 py-4 flex items-center justify-between">
          <Link href="/" className="font-bold text-gray-900 tracking-tight">liveportfolio.site</Link>
          <Link
            href={CREATE_HREF}
            className="px-4 py-2 bg-[#0A66C2] text-white text-sm font-semibold rounded-full hover:bg-[#084D9A] transition-colors"
          >
            Create My Portfolio
          </Link>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-5 py-16">
        <p className="text-sm text-gray-500 mb-2">Last updated: October 2026</p>
        <h1 className="text-3xl font-bold text-gray-900 mb-10">Privacy Policy</h1>

        <div className="prose prose-gray max-w-none space-y-8 text-sm leading-relaxed text-gray-600">

          <section>
            <h2 className={H2}>1. Who We Are</h2>
            <p>
              liveportfolio.site is operated by Ecotronics Enterprise, Lagos, Nigeria. This Privacy Policy
              explains how we collect, use, and protect your personal data when you use our service.
              We are committed to compliance with the Nigeria Data Protection Regulation (NDPR), the Nigeria
              Data Protection Act (NDPA) 2023, and, where applicable, the EU General Data Protection
              Regulation (GDPR).
            </p>
          </section>

          <section>
            <h2 className={H2}>2. Data We Collect</h2>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li><strong>Account data:</strong> email address and password (stored as a hashed value; we never see it in plain text). If you sign in with Google, GitHub or LinkedIn, we receive your name and email from that provider.</li>
              <li><strong>Uploaded CV:</strong> if you upload a CV, its text is extracted to fill in your portfolio. The file itself is not stored.</li>
              <li><strong>Portfolio content:</strong> your name, role, biography, work experience, projects, skills, links and the images you upload (photo, project pictures).</li>
              <li><strong>Visits to your published portfolio:</strong> when someone opens a published portfolio we record the time, the page they came from, their country and, where it can be worked out, the organisation their network belongs to. The visitor&apos;s IP address is sent to IPinfo (see section 5) to look this up, and is stored only as a short hash, never as the address itself. These figures are shown to the portfolio owner on a paid plan.</li>
              <li><strong>Payment records:</strong> transaction reference, plan and amount. Card numbers are handled entirely by Paystack and never reach us.</li>
              <li><strong>Technical logs:</strong> our hosting provider (Vercel) keeps standard request logs, including IP addresses, for security and operation.</li>
            </ul>
          </section>

          <section>
            <h2 className={H2}>3. Why We Collect It</h2>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>To create and host your portfolio website</li>
              <li>To sign you in and let you manage your portfolio</li>
              <li>To process your payment via Paystack</li>
              <li>To send transactional emails (portfolio live confirmation, password reset)</li>
              <li>To show you who has viewed your portfolio, where your plan includes it</li>
              <li>If you accept analytics cookies: to count visits to liveportfolio.site and improve it</li>
            </ul>
            <p className="mt-3">We do not use your data for advertising or profiling.</p>
          </section>

          <section>
            <h2 className={H2}>4. Where Your Data Is Stored</h2>
            <p>
              Your account and portfolio are stored in Supabase, a cloud database provider, in the European Union (Ireland),
              with encryption at rest and in transit. The site itself is served by Vercel.
            </p>
            <p className="mt-3">
              Portfolio content you choose to publish is public at liveportfolio.site/yourname. That is the point of the product.
            </p>
          </section>

          <section>
            <h2 className={H2}>5. Who Else Receives Data</h2>
            <ul className="list-disc pl-5 mt-2 space-y-2">
              <li><strong>Supabase</strong>: database, sign-in and image storage. Holds everything in section 2.</li>
              <li><strong>Vercel</strong>: hosting. Sees every request to the site (IP address, pages, browser).</li>
              <li><strong>Paystack</strong>: payments. Receives your email and payment details on its own secure pages. We receive a reference and the amount.</li>
              <li><strong>Resend</strong>: sends our emails. Receives your email address and the message.</li>
              <li>
                <strong>OpenAI</strong>: AI text processing, in three places.{' '}
                <em>Reading an uploaded CV or a GitHub profile (import):</em> the text of the CV, and short excerpts of the README files of your public
                repositories, are sent to OpenAI. Before sending we replace email addresses, phone numbers, web links and, where we know it, your name
                with placeholders, and put them back afterwards. This is best-effort pseudonymisation, not anonymisation: the rest of the text, such as
                employers, places, dates and skills, is sent as written.{' '}
                <em>Writing your portfolio copy:</em> your name, job title, location, GitHub and LinkedIn links, bio, skills, certifications and the
                project, experience and education text you entered are sent as you typed them, not your email address.{' '}
                <em>Career score (paid plans):</em> your portfolio text, with your name replaced by a placeholder.{' '}
                OpenAI does not use data sent through its API to train its models, according to OpenAI&apos;s API data policy.
              </li>
              <li><strong>IPinfo</strong>: when someone views a published portfolio, the visitor&apos;s IP address is sent to IPinfo to find the country and organisation. We keep the result and a hash of the address, not the address.</li>
              <li><strong>api.qrserver.com</strong>: draws the QR code on your dashboard and preview. It receives your portfolio address and the IP address of the browser that loads the image.</li>
              <li><strong>Cloudflare Turnstile</strong>: a bot check that may appear on sign-up and sign-in. It receives your IP address and browser signals.</li>
              <li><strong>Google Analytics</strong>: only if you accept (section 6).</li>
            </ul>
          </section>

          <section id="cookies">
            <h2 className={H2}>6. Cookies and Analytics</h2>
            <p>
              <strong>Always on, strictly necessary:</strong> a sign-in session so you stay logged in, and a small record in your browser of your cookie choice.
              These do not track you.
            </p>
            <p className="mt-3">
              <strong>Only if you accept:</strong> Google Analytics 4 on liveportfolio.site (not on people&apos;s portfolios). It sets cookies and sends your IP address,
              the pages you view and your device details to Google, to count visits. Until you accept, nothing is loaded and nothing is sent to Google.
              If you reject, nothing is loaded either. You can change your mind at any time: use &quot;Cookie settings&quot; in the footer or the button below.
              Withdrawing removes Google&apos;s cookies from this site.
            </p>
            <p className="mt-3"><CookieSettingsLink className="font-medium text-[#0A66C2] underline" /></p>
          </section>

          <section>
            <h2 className={H2}>7. Data Retention</h2>
            <p>
              We keep your data while your account is active. If you delete your account we delete your profile, portfolio content and analytics
              within 14 days. Payment records are kept for 7 years for legal and accounting reasons.
            </p>
          </section>

          <section>
            <h2 className={H2}>8. Your Rights</h2>
            <p>Under NDPR, NDPA 2023, and GDPR (where applicable), you have the right to:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Access the personal data we hold about you</li>
              <li>Request correction of inaccurate data</li>
              <li>Request deletion of your account and all associated data</li>
              <li>Object to how we process your data, and withdraw consent you gave</li>
              <li>Request a copy of your data in a portable format</li>
            </ul>
            <p className="mt-3">
              To exercise any of these rights, email{' '}
              <a href="mailto:ecotronics.nterprise@gmail.com" className="text-[#0A66C2] hover:underline">
                ecotronics.nterprise@gmail.com
              </a>
              . We will respond within 30 days.
            </p>
          </section>

          <section>
            <h2 className={H2}>9. We Do Not Sell Your Data</h2>
            <p>
              We do not sell or rent your personal data. We share it only with the providers listed above, to run the service.
            </p>
          </section>

          <section>
            <h2 className={H2}>10. Changes to This Policy</h2>
            <p>
              We may update this policy as our service evolves. We will change the date at the top of this page when we do.
            </p>
          </section>

          <section>
            <h2 className={H2}>11. Contact</h2>
            <p>
              For privacy-related questions or requests, contact us at{' '}
              <a href="mailto:ecotronics.nterprise@gmail.com" className="text-[#0A66C2] hover:underline">
                ecotronics.nterprise@gmail.com
              </a>.
            </p>
          </section>

        </div>
      </div>

      <footer className="border-t border-gray-100 py-8 px-5">
        <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-4 text-xs text-gray-500">
          <span>© 2026 Ecotronics Enterprise · liveportfolio.site</span>
          <div className="flex gap-4">
            <a href="https://ecotronicsenterprise.com" className="hover:text-gray-600">Ecotronics</a>
            <Link href="/terms" className="hover:text-gray-600">Terms</Link>
            <Link href="/privacy" className="hover:text-gray-600">Privacy</Link>
            <CookieSettingsLink className="hover:text-gray-600" />
          </div>
        </div>
      </footer>
    </div>
  )
}
