import Link from 'next/link'

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white text-[#0A0A0A]">
      <nav className="border-b border-gray-100 sticky top-0 z-50 bg-white/95 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-5 py-4 flex items-center justify-between">
          <Link href="/" className="font-bold text-gray-900 tracking-tight text-sm">
            liveportfolio.site
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/blog" className="text-sm text-gray-500 hover:text-gray-800 transition-colors">
              Blog
            </Link>
            <Link
              href="/create"
              className="px-4 py-2 bg-[#0A66C2] text-white text-sm font-semibold rounded-full hover:bg-[#084D9A] transition-colors"
            >
              Create My Portfolio
            </Link>
          </div>
        </div>
      </nav>

      {children}

      <footer className="border-t border-gray-100 py-8 px-5 mt-16">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-gray-400">
          <span>© 2026 Ecotronics Enterprise</span>
          <div className="flex gap-4">
            <Link href="/blog" className="hover:text-gray-600">Blog</Link>
            <Link href="/terms" className="hover:text-gray-600">Terms</Link>
            <Link href="/privacy" className="hover:text-gray-600">Privacy</Link>
            <Link href="/create" className="hover:text-gray-600">Create portfolio</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
