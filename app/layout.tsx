import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import Script from "next/script"
import "./globals.css"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Filtro Jerárquico - Tableau Extension",
  description: "Extensión de Tableau para filtro jerárquico de usuarios",
    generator: 'v0.app'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es">
      <head>
        <Script
          src="https://public.tableau.com/javascripts/api/tableau.extensions.1.latest.min.js"
          strategy="beforeInteractive"
        />
      </head>
      <body className="font-sans antialiased">{children}</body>
    </html>
  )
}
