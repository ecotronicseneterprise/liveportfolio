// next/font/google only runs through Next's compiler. Unit tests render components straight to markup, so each font the app imports is
// stood in by the same shape ({ className, variable, style }). Add a name here when a component imports a new Google font.
const font = (name: string) => () => ({ className: `font-stub-${name}`, variable: `font-stub-var-${name}`, style: { fontFamily: name } })
export const Playfair_Display = font('playfair')
export const DM_Sans = font('dm-sans')
export const Space_Mono = font('space-mono')
export const Sora = font('sora')
