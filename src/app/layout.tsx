import type { Metadata } from 'next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { BackgroundFX } from '@/components/BackgroundFX';
import '@/styles/global.scss';

export const metadata: Metadata = {
  title: 'WASABI · HODL Rewards — Stay Spicy. Stay Winning.',
  description: 'Top holders win every milestone. Stay above your tier for 7 days to qualify.',
  themeColor: '#050807',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,300;12..96,500;12..96,700;12..96,800;12..96,900&family=Caveat:wght@500;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <BackgroundFX />
        {children}
        <SpeedInsights />
      </body>
    </html>
  );
}
