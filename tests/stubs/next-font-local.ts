// next/font/local only works through Next's compiler. In unit tests components are rendered to markup directly, so this
// stands in with the same shape ({ className, variable, style }).
export default function localFont() {
  return { className: 'font-stub', variable: 'font-stub-var', style: { fontFamily: 'stub' } }
}
