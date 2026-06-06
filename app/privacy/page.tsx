import Link from 'next/link'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white text-[#0A0A0A]">
      <nav className="border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-5 py-4 flex items-center justify-between">
          <Link href="/" className="font-bold text-gray-900 tracking-tight">liveportfolio.site</Link>
          <Link
            href="/create"
            className="px-4 py-2 bg-[#0A66C2] text-white text-sm font-semibold rounded-full hover:bg-[#084D9A] transition-colors"
          >
            Create My Portfolio
          </Link>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-5 py-16">
        <p className="text-sm text-gray-400 mb-2">Last updated: May 2026</p>
        <h1 className="text-3xl font-bold text-gray-900 mb-10">Privacy Policy</h1>

        <div className="prose prose-gray max-w-none space-y-8 text-sm leading-relaxed text-gray-600">

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">1. Who We Are</h2>
            <p>
              liveportfolio.site is operated by Ecotronics Enterprise, Lagos, Nigeria. This Privacy Policy
              explains how we collect, use, and protect your personal data when you use our service.
              We are committed to compliance with the Nigeria Data Protection Regulation (NDPR), the Nigeria
              Data Protection Act (NDPA) 2023, and, where applicable, the EU General Data Protection
              Regulation (GDPR).
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">2. Data We Collect</h2>
            <p>We collect the following data:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li><strong>Account data:</strong> email address, password (stored as a hashed value — we never see it in plain text)</li>
              <li><strong>Uploaded CV (PDF):</strong> if you choose to upload your CV, its text content is extracted to auto-fill your portfolio form. The raw file is not stored after extraction.</li>
              <li><strong>Portfolio content:</strong> your name, professional role, biography, work experience, project descriptions, skills, and any URLs or images you provide</li>
              <li><strong>Usage analytics:</strong> view counts on your published portfolio. We collect visitor IP addresses on published portfolio pages to provide analytics to portfolio owners (a plan-gated feature). IP addresses are hashed before storage and used only to identify approximate company affiliation and geography — raw IPs are never stored or shared.</li>
              <li><strong>Payment records:</strong> transaction reference and amount (we do not store card numbers — card data is handled entirely by Paystack)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">3. Why We Collect It</h2>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>To create and host your portfolio website</li>
              <li>To authenticate you and allow you to manage your portfolio</li>
              <li>To process your payment via Paystack</li>
              <li>To send transactional emails (portfolio live confirmation, password reset)</li>
              <li>To provide view count analytics on your dashboard</li>
            </ul>
            <p className="mt-3">We do not use your data for advertising, profiling, or any purpose beyond delivering this service.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">4. Where Your Data Is Stored</h2>
            <p>
              Your data is stored in Supabase, a cloud database provider. Supabase stores data in EU-based
              data centres (AWS eu-west-1, Ireland) with encryption at rest and in transit.
            </p>
            <p className="mt-3">
              Portfolio content you choose to make public (i.e., after publishing) is accessible at
              yourname.liveportfolio.site. This is intentional — it is the product you paid for.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">5. Third-Party Processors</h2>
            <ul className="list-disc pl-5 mt-2 space-y-2">
              <li>
                <strong>Supabase</strong> — database and authentication. Processes email and portfolio content.
                Privacy policy: supabase.com/privacy
              </li>
              <li>
                <strong>Paystack</strong> — payment processing. Processes your card details on their
                PCI-DSS compliant infrastructure. We receive only a transaction reference and amount.
                Privacy policy: paystack.com/privacy
              </li>
              <li>
                <strong>Resend</strong> — transactional email delivery (portfolio live confirmation,
                password resets). Receives your email address for delivery purposes only.
              </li>
              <li>
                <strong>OpenAI</strong> — AI text generation. Your portfolio input (bio, project descriptions)
                is sent to OpenAI to generate professional copy. We do not send identifying information
                such as your email. OpenAI&apos;s API data is not used to train their models per their API
                data usage policies.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">6. Cookies</h2>
            <p>
              We use cookies only for authentication — to keep you signed in to your account. We do not
              use advertising cookies, tracking pixels, or any third-party analytics that identify you
              personally. No cookie consent banner is required under our cookie use policy, but you may
              clear cookies at any time in your browser settings, which will sign you out.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">7. Data Retention</h2>
            <p>
              We retain your data for as long as your account is active. If you delete your account,
              we delete all associated data — your profile, portfolio content, and analytics — within
              14 days. Payment records are retained for 7 years for legal and accounting purposes.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">8. Your Rights</h2>
            <p>Under NDPR, NDPA 2023, and GDPR (where applicable), you have the right to:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Access the personal data we hold about you</li>
              <li>Request correction of inaccurate data</li>
              <li>Request deletion of your account and all associated data</li>
              <li>Object to how we process your data</li>
              <li>Request a copy of your data in a portable format</li>
            </ul>
            <p className="mt-3">
              To exercise any of these rights, email{' '}
              <a href="mailto:support@ecotronicsenterprise.com" className="text-[#0A66C2] hover:underline">
                support@ecotronicsenterprise.com
              </a>
              . We will respond within 30 days.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">9. We Do Not Sell Your Data</h2>
            <p>
              We do not sell, rent, or share your personal data with any third party for marketing purposes.
              Period.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">10. Changes to This Policy</h2>
            <p>
              We may update this policy as our service evolves. We will update the date at the top of
              this page when changes are made. Continued use of the service after changes are posted
              constitutes acceptance of the revised policy.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">11. Contact</h2>
            <p>
              For privacy-related questions or requests, contact us at{' '}
              <a href="mailto:support@ecotronicsenterprise.com" className="text-[#0A66C2] hover:underline">
                support@ecotronicsenterprise.com
              </a>.
            </p>
          </section>

        </div>
      </div>

      <footer className="border-t border-gray-100 py-8 px-5">
        <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-4 text-xs text-gray-400">
          <span>© 2026 Ecotronics Enterprise · liveportfolio.site</span>
          <div className="flex gap-4">
            <a href="https://ecotronicsenterprise.com" className="hover:text-gray-600">Ecotronics</a>
            <Link href="/terms" className="hover:text-gray-600">Terms</Link>
            <Link href="/privacy" className="hover:text-gray-600">Privacy</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
