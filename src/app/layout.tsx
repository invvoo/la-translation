import type { Metadata } from 'next'
import localFont from 'next/font/local'
import './globals.css'

const geistSans = localFont({
  src: './fonts/GeistVF.woff',
  variable: '--font-geist-sans',
  weight: '100 900',
})
const geistMono = localFont({
  src: './fonts/GeistMonoVF.woff',
  variable: '--font-geist-mono',
  weight: '100 900',
})

export const metadata: Metadata = {
  title: 'L.A. Translation & Interpretation',
  description: 'Professional certified translation, interpretation, equipment rental, and notary/apostille services in Los Angeles. 200+ languages, 2,000+ certified professionals, serving translation_clients since 2003.',
  keywords: 'translation services Los Angeles, certified translation, court interpreter, medical interpreter, apostille, USCIS translation, simultaneous interpretation equipment',
  authors: [{ name: 'L.A. Translation & Interpretation' }],
  openGraph: {
    title: 'L.A. Translation & Interpretation',
    description: 'Professional certified translation and interpretation services in Los Angeles. 200+ languages since 2003.',
    type: 'website',
  },
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  )
}
