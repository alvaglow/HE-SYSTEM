import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: 'HE-SYSTEM — Happy English Platform',
  description: 'Learning management and operations platform for Happy English',
  icons: { icon: '/HE-SYSTEM_Icon.svg' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Oswald:wght@400;600;700&family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={`${inter.variable} font-sans bg-gray-50 text-gray-900 antialiased`}>
        {children}
      </body>
    </html>
  )
}
