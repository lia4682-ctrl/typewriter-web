import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './globals.css';

// 폰트 설정
const monaFont = localFont({
  src: './fonts/Mona10x12.ttf',
  variable: '--font-mona',
  display: 'swap',
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
    <html lang="ko" className={monaFont.variable}>
      <body style={{ fontFamily: 'var(--font-mona), sans-serif' }}>
        {children}
      </body>
    </html>
  );
}
