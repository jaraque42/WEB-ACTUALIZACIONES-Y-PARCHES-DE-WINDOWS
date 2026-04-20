import './globals.css'

export const metadata = {
  title: 'Microsoft Updates Tracker',
  description: 'Recopilación de actualizaciones de sistemas Microsoft',
}

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}