import localFont from 'next/font/local'

// Journal: Source Serif 4 (display) + Hanken Grotesk (text).
const journalDisplay = localFont({ src: [{ path: '../fonts/SourceSerif4-latin.woff2', weight: '400 700', style: 'normal' }], variable: '--f-journal-display', display: 'swap', adjustFontFallback: 'Times New Roman' })
const journalDisplayExt = localFont({ src: [{ path: '../fonts/SourceSerif4-latin-ext.woff2', weight: '400 700', style: 'normal' }], variable: '--f-journal-display-ext', display: 'swap', preload: false, adjustFontFallback: false })
const journalText = localFont({ src: [{ path: '../fonts/HankenGrotesk-latin.woff2', weight: '400 700', style: 'normal' }], variable: '--f-journal-text', display: 'swap', adjustFontFallback: 'Arial' })
const journalTextExt = localFont({ src: [{ path: '../fonts/HankenGrotesk-latin-ext.woff2', weight: '400 700', style: 'normal' }], variable: '--f-journal-text-ext', display: 'swap', preload: false, adjustFontFallback: false })

export const journalFonts = [journalDisplay.variable, journalDisplayExt.variable, journalText.variable, journalTextExt.variable].join(' ')
