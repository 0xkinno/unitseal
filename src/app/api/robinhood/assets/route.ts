import { NextResponse } from 'next/server';
import { fetchStockAssets } from '@/robinhood/assets';

export async function GET() {
  const assets = await fetchStockAssets();
  const serialized = assets.map((a) => ({
    ...a,
    currentMultiplier: a.currentMultiplier.toString(),
    pendingMultiplier: a.pendingMultiplier?.toString(),
  }));
  return NextResponse.json({ success: true, assets: serialized });
}
