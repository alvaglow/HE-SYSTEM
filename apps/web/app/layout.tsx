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
        {/* Batch 3 personalization: apply the saved dark/light theme before
            hydration so there's no flash of the wrong theme. Reads from
            localStorage (mirrored from users.theme on login/toggle — see
            components/ThemeToggle.tsx) since this needs to run synchronously
            before React ever renders. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try { if (localStorage.getItem('he-theme') === 'dark') document.documentElement.classList.add('dark') } catch (e) {}`,
          }}
        />
      </head>
      <body className={`${inter.variable} font-sans bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 antialiased transition-colors`}>
        {children}
      </body>
    </html>
  )
}
