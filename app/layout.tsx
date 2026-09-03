import type { Metadata } from 'next';
import { Special_Elite, Gowun_Batang } from 'next/font/google';
import './globals.css';

// 영문 타자기 느낌 폰트
const specialElite = Special_Elite({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-special-elite',
});

// 한글 레트로 바탕체 폰트
const gowunBatang = Gowun_Batang({
  weight: ['400', '700'],
  subsets: ['latin'],
  variable: '--font-mona', // page.tsx의 var(--font-mona)와 연동
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
    <html lang="ko" className={`${specialElite.variable} ${gowunBatang.variable}`}>
      <body
        style={{
          margin: 0,
          padding: 0,
          fontFamily: 'var(--font-mona), var(--font-special-elite), serif',
        }}
      >
        {children}
      </body>
    </html>
  );
}
