import type React from "react"
import type { Metadata } from "next"
// Hemos eliminado la importación de Script de "next/script"
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
      {/* ESTA ES LA ZONA CRÍTICA:
        Usar la etiqueta <script> nativa dentro del <head> de React 
        garantiza que el navegador la cargue de forma síncrona, 
        igual que en el modelo MyCSS.
      */}
      <head>
        <script src="https://cdn.jsdelivr.net/gh/tableau/extensions-api/lib/tableau.extensions.1.latest.min.js"></script>
        </head>
      <body className="font-sans antialiased">{children}</body>
    </html>
  )
}
