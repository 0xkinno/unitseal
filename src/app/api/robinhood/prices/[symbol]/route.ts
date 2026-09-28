import { NextResponse } from 'next/server';
import { fetchStockPrice } from '@/robinhood/prices';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const { symbol } = await params;
  const price = await fetchStockPrice(symbol);
  return NextResponse.json({
    success: true,
    price: {
      ...price,
      bidUsd: price.bidUsd.toString(),
      askUsd: price.askUsd.toString(),
      midUsd: price.midUsd.toString(),
    },
  });
}
