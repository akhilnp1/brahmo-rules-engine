import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'BRAHMO — Rules Engine Pipeline',
  description: 'BFS Traversal + 5-Check Filter Pipeline',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
