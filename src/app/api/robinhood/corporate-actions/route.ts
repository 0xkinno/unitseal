import { NextResponse } from 'next/server';
import { fetchCorporateActionsContext } from '@/robinhood/corporateActions';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get('symbol') || 'AAPL';
  const ca = await fetchCorporateActionsContext(symbol);
  return NextResponse.json({ success: true, corporateActions: ca });
}
