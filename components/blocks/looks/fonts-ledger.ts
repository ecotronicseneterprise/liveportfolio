import localFont from 'next/font/local'

// Ledger: Schibsted Grotesk (text and display) + Space Mono (labels and figures).
const ledgerDisplay = localFont({ src: [{ path: '../fonts/SchibstedGrotesk-latin.woff2', weight: '400 800', style: 'normal' }], variable: '--f-ledger-display', display: 'swap', adjustFontFallback: 'Arial' })
const ledgerDisplayExt = localFont({ src: [{ path: '../fonts/SchibstedGrotesk-latin-ext.woff2', weight: '400 800', style: 'normal' }], variable: '--f-ledger-display-ext', display: 'swap', preload: false, adjustFontFallback: false })
const ledgerLabel = localFont({
  src: [
    { path: '../fonts/SpaceMono-latin-400.woff2', weight: '400', style: 'normal' },
    { path: '../fonts/SpaceMono-latin-700.woff2', weight: '700', style: 'normal' },
  ],
  variable: '--f-ledger-label', display: 'swap', preload: false, adjustFontFallback: false,
})
const ledgerLabelExt = localFont({
  src: [
    { path: '../fonts/SpaceMono-latin-ext-400.woff2', weight: '400', style: 'normal' },
    { path: '../fonts/SpaceMono-latin-ext-700.woff2', weight: '700', style: 'normal' },
  ],
  variable: '--f-ledger-label-ext', display: 'swap', preload: false, adjustFontFallback: false,
})

export const ledgerFonts = [ledgerDisplay.variable, ledgerDisplayExt.variable, ledgerLabel.variable, ledgerLabelExt.variable].join(' ')
