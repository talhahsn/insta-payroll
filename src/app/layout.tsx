import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Toaster } from '@/components/ui/sonner'
import { QueryProvider } from '@/components/providers/query-provider'
import NextTopLoader from 'nextjs-toploader'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'Insta Payroll',
  description: 'Payroll management for restaurants',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-dvh antialiased`}>
      <body className="flex h-dvh flex-col overflow-hidden">
        <NextTopLoader showSpinner={false} />
        <QueryProvider>
          <div className="flex min-h-0 flex-1 flex-col">{children}</div>
        </QueryProvider>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  )
}
