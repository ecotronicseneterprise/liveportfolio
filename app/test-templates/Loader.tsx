'use client'

import dynamic from 'next/dynamic'

const TestTemplatesClient = dynamic(() => import('./TestTemplatesClient'), { ssr: false })

export default function Loader() {
  return <TestTemplatesClient />
}
