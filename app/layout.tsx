import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
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
        <script src="https://extensions.tableauusercontent.com/resources/pex/v1/tableau.extensions.1.latest.min.js" />
      </head>
      <body className="font-sans antialiased">{children}</body>
    </html>
  )
}
