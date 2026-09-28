import type { Metadata } from 'next';
import './globals.css';
import { WalletProvider } from '@/wallet/context';
import { Navbar } from '@/components/layout/navbar';

export const metadata: Metadata = {
  title: 'UNITSEAL — State-Bound Execution Guard for Robinhood Chain',
  description:
    'UnitSeal lets treasury operators safely automate Stock Token transfers without executing against stale unit economics, by sealing actions to exact verified multiplier and market state.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-stone-50 text-stone-900 font-sans">
        <WalletProvider>
          <Navbar />
          <main className="flex flex-1 flex-col">{children}</main>
        </WalletProvider>
      </body>
    </html>
  );
}
