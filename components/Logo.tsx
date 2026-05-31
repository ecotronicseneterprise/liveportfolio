export default function Logo({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center select-none ${className}`}>
      <svg width="32" height="32" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="28" height="28" rx="7" fill="#0A66C2" />
        <circle cx="14" cy="11" r="4.5" fill="white" />
        <path d="M5 24c0-4.97 4.03-9 9-9s9 4.03 9 9" stroke="white" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </span>
  )
}
