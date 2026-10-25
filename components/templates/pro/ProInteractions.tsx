'use client'

import { useEffect, useRef, useState } from 'react'

export function Picture({ src, alt, portrait = false }: { src?: string; alt: string; portrait?: boolean }) {
  const [failed, setFailed] = useState<string | null>(null)
  const image = useRef<HTMLImageElement>(null)
  useEffect(() => {
    if (src && image.current?.complete && image.current.naturalWidth === 0) setFailed(src)
  }, [src])
  if (!src || failed === src) return null
  // Browser fetch only; never proxy arbitrary user images through the server.
  // eslint-disable-next-line @next/next/no-img-element
  return <img ref={image} className={portrait ? 'pro-portrait' : 'pro-project-image'} src={src} alt={alt} loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={() => setFailed(src)} />
}

/** Only navigation and image failures need hydration; the public portfolio body stays server-rendered. */
export function PortfolioNav({ prefix, label, mark, links }: { prefix: string; label: string; mark: string; links: { href: string; label: string }[] }) {
  const [open, setOpen] = useState(false)
  const menuId = `${prefix}-menu`
  const items = links.map((link) => <a key={link.href} href={link.href} onClick={() => setOpen(false)}>{link.label}</a>)
  return <>
    <header className="pro-topbar"><span className="pro-mark" aria-hidden="true">{mark}</span><span className="pro-edition">{label}</span>
      {!!links.length && <><nav className="pro-nav" aria-label="Portfolio">{items}</nav>
        <button className="pro-menu-button" type="button" aria-label={open ? 'Close portfolio menu' : 'Open portfolio menu'} aria-expanded={open} aria-controls={menuId} onClick={() => setOpen(!open)}>Menu <span aria-hidden="true">{open ? '−' : '+'}</span></button></>}
    </header>
    {!!links.length && <nav id={menuId} className="pro-mobile-nav" aria-label="Mobile portfolio" hidden={!open}>{items}</nav>}
  </>
}