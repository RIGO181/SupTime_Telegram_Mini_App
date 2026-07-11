import { Analytics } from "@vercel/analytics/next"
import type { Metadata, Viewport } from "next"
import { Nunito_Sans, Baloo_2 } from "next/font/google"
import Script from "next/script"
import { Toaster } from "@/components/ui/sonner"
import "./globals.css"

const nunito = Nunito_Sans({ subsets: ["latin", "cyrillic"], variable: "--font-nunito" })
const baloo = Baloo_2({ subsets: ["latin"], variable: "--font-baloo" })

export const metadata: Metadata = {
  title: "Прогулки на сапбордах",
  description: "Бронирование прогулок на сапбордах — расписание, запись и напоминания",
  generator: "v0.app",
}

export const viewport: Viewport = {
  colorScheme: "light",
  themeColor: "#2596be",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ru" className={`light bg-background ${nunito.variable} ${baloo.variable}`} suppressHydrationWarning>
      <head>
        <Script src="https://telegram.org/js/telegram-web-app.js" strategy="beforeInteractive" />
      </head>
      <body className="antialiased font-sans">
        {children}
        <Toaster position="top-center" richColors />
        {process.env.NODE_ENV === "production" && <Analytics />}
      </body>
    </html>
  )
}
