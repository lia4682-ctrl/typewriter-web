export const metadata = {
  title: 'Vintage Typewriter',
  description: 'A vintage typewriter journaling web app',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  )
}
