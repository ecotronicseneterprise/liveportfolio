import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Terms of Service — LivePortfolio',
  description: 'Terms of service for LivePortfolio. Build and publish professional portfolio websites online.',
  alternates: {
    canonical: 'https://liveportfolio.site/terms',
  },
  openGraph: {
    title: 'Terms of Service — LivePortfolio',
    siteName: 'LivePortfolio',
  },
}

export default function TermsPage() {
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
        <h1 className="text-3xl font-bold text-gray-900 mb-10">Terms of Service</h1>

        <div className="prose prose-gray max-w-none space-y-8 text-sm leading-relaxed text-gray-600">

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">1. What This Service Provides</h2>
            <p>
              liveportfolio.site is an AI-powered portfolio generation platform operated by Ecotronics Enterprise
              (Lagos, Nigeria). We allow users to create, preview, and publish professional portfolio websites
              at a subdomain of liveportfolio.site. By using this service, you agree to these terms.
            </p>
            <p className="mt-3">
              liveportfolio.site is a software tool. We are not a recruiter, employment agency, or guarantor
              of any employment outcome. We make no promise that using this service will result in job offers,
              interviews, or any other professional outcome.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">2. Your Account</h2>
            <p>
              You are responsible for maintaining the security of your account credentials. You must provide
              accurate information during registration. You may not create accounts on behalf of others without
              their explicit consent.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">3. User Content Ownership</h2>
            <p>
              You retain full ownership of all content you submit — your work experience, project descriptions,
              biographical information, and any images you upload. By submitting this content, you grant
              liveportfolio.site a non-exclusive licence to display it on your published portfolio page.
            </p>
            <p className="mt-3">
              AI-generated content (rewritten bios, project descriptions, and headlines) produced using your
              input belongs to you once generated. We do not claim any rights over it.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">4. Prohibited Content</h2>
            <p>You may not use liveportfolio.site to publish content that:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Is false, misleading, or impersonates another person</li>
              <li>Violates any applicable law or regulation</li>
              <li>Contains hate speech, harassment, or threats</li>
              <li>Infringes the intellectual property rights of others</li>
              <li>Is designed to deceive recruiters or employers</li>
            </ul>
            <p className="mt-3">
              We reserve the right to remove content or suspend accounts that violate these rules without notice.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">5. Payment Terms</h2>
            <p>
              Publishing your portfolio requires an annual subscription. We offer two plans: Basic at ₦15,000/year
              (approx. $10) and Pro at ₦45,000/year (approx. $30). All charges are processed in Nigerian Naira (NGN)
              regardless of your location; your bank will convert to your local currency at the prevailing exchange rate.
              Subscriptions are billed annually and renew automatically unless cancelled.
              Payment is processed securely by Paystack — we never handle or store your card details.
            </p>
            <p className="mt-3">
              You may cancel your subscription at any time. Upon cancellation, your portfolio remains live
              until the end of your current billing period, after which it will be unpublished.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">6. Refunds</h2>
            <p>
              We offer refund requests within 7 days of your initial purchase date. To request a refund, email
              us at{' '}
              <a href="mailto:support@liveportfolio.site" className="text-[#0A66C2] hover:underline">support@liveportfolio.site</a>{' '}
              with your account email and reason for the request.
            </p>
            <p className="mt-3">
              Refunds are granted at our discretion and are generally approved for users who have not yet
              published a portfolio. Once a portfolio has been published and made live, the core service has
              been delivered and refunds may not apply.
            </p>
            <p className="mt-3">
              We aim to respond to all refund requests within 3 business days. Approved refunds are processed
              through Paystack and may take 5–10 business days to reflect depending on your bank.
            </p>
            <p className="mt-3">
              If you have any issues with the product, contact us first — we will do our best to resolve it
              before processing a refund.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">7. Service Availability</h2>
            <p>
              We aim to keep liveportfolio.site available at all times but do not guarantee uninterrupted
              service. We may carry out maintenance that temporarily affects availability, and will endeavour
              to minimise disruption.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">8. Account Termination</h2>
            <p>
              You may request deletion of your account at any time by emailing
              {' '}<a href="mailto:support@ecotronicsenterprise.com" className="text-[#0A66C2] hover:underline">support@ecotronicsenterprise.com</a>.
              We will delete your account and all associated portfolio data within 14 days of your request.
              Deletion is permanent and irreversible.
            </p>
            <p className="mt-3">
              We may terminate accounts that repeatedly violate these terms, with or without prior notice.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">9. Limitation of Liability</h2>
            <p>
              liveportfolio.site is provided &quot;as is&quot; without warranties of any kind. We are not liable for
              any indirect, incidental, or consequential damages arising from your use of the service,
              including but not limited to loss of data, loss of business opportunity, or employment outcomes.
              Our total liability is limited to the amount you paid for the service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">10. Governing Law</h2>
            <p>
              These terms are governed by the laws of the Federal Republic of Nigeria. Any disputes shall
              be resolved under Nigerian jurisdiction.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">11. Changes to These Terms</h2>
            <p>
              We may update these terms from time to time. Continued use of the service after changes are
              posted constitutes acceptance of the revised terms. We will update the date at the top of
              this page when changes are made.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">12. Contact</h2>
            <p>
              For any questions about these terms, email us at{' '}
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
