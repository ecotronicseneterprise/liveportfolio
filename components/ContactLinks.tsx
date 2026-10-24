// Support contact: email, and WhatsApp as a plain icon link (replaces the old floating chat button, whose position was
// computed once from window.innerWidth and ended up outside the viewport after a rotation or resize).
// Static markup only: no client JS, no animation, no fixed positioning.
const WA_URL = 'https://wa.me/2349014545622?text=Hi%2C%20I%20have%20a%20question%20about%20liveportfolio.site'
const EMAIL = 'support@ecotronicsenterprise.com'

export default function ContactLinks() {
  return (
    <div className="flex items-center gap-5">
      <a href={`mailto:${EMAIL}`} className="flex items-center gap-1.5 min-h-11 hover:text-[#0A66C2] transition-colors" aria-label="Email us">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
          <polyline points="22,6 12,13 2,6" />
        </svg>
        Email us
      </a>
      <a href={WA_URL} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center min-h-11 min-w-11 hover:text-[#0A66C2] transition-colors" aria-label="Chat with us on WhatsApp">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12.04 2a9.9 9.9 0 0 0-8.5 14.9L2 22l5.27-1.38A9.9 9.9 0 1 0 12.04 2zm0 1.8a8.1 8.1 0 1 1-4.2 15.02l-.3-.18-3.13.82.84-3.05-.2-.31A8.1 8.1 0 0 1 12.04 3.8zm-3.2 4.3c-.17 0-.45.06-.69.32-.24.26-.9.88-.9 2.15s.92 2.5 1.05 2.67c.13.17 1.78 2.83 4.4 3.85 2.18.86 2.62.69 3.1.64.47-.04 1.53-.63 1.74-1.23.22-.6.22-1.12.15-1.23-.06-.1-.24-.17-.5-.3-.27-.13-1.53-.76-1.77-.84-.24-.09-.4-.13-.58.13-.17.26-.67.84-.82 1.01-.15.17-.3.2-.56.07-.26-.13-1.1-.4-2.1-1.3-.77-.69-1.3-1.55-1.45-1.8-.15-.26-.02-.4.11-.53.12-.12.26-.3.39-.45.13-.15.17-.26.26-.43.09-.17.04-.32-.02-.45-.07-.13-.58-1.4-.8-1.9-.2-.5-.42-.43-.58-.44z" />
        </svg>
      </a>
    </div>
  )
}
