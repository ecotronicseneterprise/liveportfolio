import localFont from 'next/font/local'

// Studio: Bricolage Grotesque (display) + Hanken Grotesk (text). Self-hosted variable fonts. The "-ext" faces hold the Latin Extended glyphs
// (Yoruba and Igbo letters such as ẹ ọ ṣ) and are only downloaded when a page actually contains one (preload: false).
const studioDisplay = localFont({ src: [{ path: '../fonts/BricolageGrotesque-latin.woff2', weight: '400 800', style: 'normal' }], variable: '--f-studio-display', display: 'swap', adjustFontFallback: 'Arial' })
const studioDisplayExt = localFont({ src: [{ path: '../fonts/BricolageGrotesque-latin-ext.woff2', weight: '400 800', style: 'normal' }], variable: '--f-studio-display-ext', display: 'swap', preload: false, adjustFontFallback: false })
const studioText = localFont({ src: [{ path: '../fonts/HankenGrotesk-latin.woff2', weight: '400 700', style: 'normal' }], variable: '--f-studio-text', display: 'swap', adjustFontFallback: 'Arial' })
const studioTextExt = localFont({ src: [{ path: '../fonts/HankenGrotesk-latin-ext.woff2', weight: '400 700', style: 'normal' }], variable: '--f-studio-text-ext', display: 'swap', preload: false, adjustFontFallback: false })

export const studioFonts = [studioDisplay.variable, studioDisplayExt.variable, studioText.variable, studioTextExt.variable].join(' ')
