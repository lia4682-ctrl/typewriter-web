import type { Metadata } from 'next';
import { Special_Elite } from 'next/font/google';

const specialElite = Special_Elite({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-special-elite',
});

export const metadata: Metadata = {
  title: 'Vintage Typewriter',
  description: 'A vintage typewriter journaling web app',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" className={specialElite.variable}>
      <head>
        <style>{`
          @font-face {
            font-family: 'UnJaeum';
            src: url('https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_two@1.0/UnJaeum.woff') format('woff');
            font-weight: normal;
            font-style: normal;
          }
          :root {
            --font-mona: 'UnJaeum', cursive, monospace;
          }
        `}</style>
      </head>
      <body
        style={{
          margin: 0,
          padding: 0,
          fontFamily: 'var(--font-mona), var(--font-special-elite), monospace',
        }}
      >
        {children}
      </body>
    </html>
  );
}
