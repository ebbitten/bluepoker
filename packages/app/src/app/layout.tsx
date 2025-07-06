import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'BluPoker',
  description: 'Play-money Texas Hold\'em poker',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}