import type { Metadata } from 'next'
import ReturnClient from './ReturnClient'

export const metadata: Metadata = {
  title: 'Confirming your payment — LivePortfolio',
  robots: { index: false, follow: false },
}

export default function CheckoutReturnPage() {
  return <ReturnClient />
}
