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
        {/* CORRECCIÓN: Usamos una etiqueta script normal en lugar del componente Script de Next.js
            para asegurar que se cargue de forma síncrona antes de que arranque React. 
            También usamos la URL correcta del CDN de extensiones. */}
        <script src="https://extensions.tableauusercontent.com/resources/pex/v1/tableau.extensions.1.latest.min.js"></script>
      </head>
      <body className="font-sans antialiased">{children}</body>
    </html>
  )
}
