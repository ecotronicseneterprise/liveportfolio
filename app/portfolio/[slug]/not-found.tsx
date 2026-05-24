export default function PortfolioNotFound() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">Portfolio not found</h1>
        <p className="text-gray-500 mb-6">
          This portfolio may not be published yet, or the URL may be incorrect.
        </p>
        <a
          href="https://liveportfolio.site"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#1D9E75] text-white text-sm font-medium rounded-full hover:bg-[#178a64] transition-colors"
        >
          Create your portfolio →
        </a>
      </div>
    </div>
  )
}
