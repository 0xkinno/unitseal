const { execSync } = require('child_process');

const envs = [
  { key: 'NEXT_PUBLIC_RH_CHAIN_ID', val: process.env.NEXT_PUBLIC_RH_CHAIN_ID || '4663' },
  { key: 'NEXT_PUBLIC_RH_RPC_URL', val: process.env.NEXT_PUBLIC_RH_RPC_URL || 'https://rpc.mainnet.chain.robinhood.com' },
  { key: 'NEXT_PUBLIC_RH_EXPLORER_URL', val: process.env.NEXT_PUBLIC_RH_EXPLORER_URL || 'https://robinhoodchain.blockscout.com' },
  { key: 'ALCHEMY_API_KEY', val: process.env.ALCHEMY_API_KEY || '' },
  { key: 'UNITSEAL_GUARD_ADDRESS', val: process.env.UNITSEAL_GUARD_ADDRESS || '0x2518853d8a6799734ded70857f0cffc26a175c14' },
  { key: 'NEXT_PUBLIC_UNITSEAL_GUARD_ADDRESS', val: process.env.NEXT_PUBLIC_UNITSEAL_GUARD_ADDRESS || '0x2518853d8a6799734ded70857f0cffc26a175c14' },
  { key: 'UNITSEAL_ATTESTOR_ADDRESS', val: process.env.UNITSEAL_ATTESTOR_ADDRESS || '0xe98ACBD5d8F02A92A5492b5830BA83ffBB684E7f' },
  { key: 'NEXT_PUBLIC_UNITSEAL_ATTESTOR_ADDRESS', val: process.env.NEXT_PUBLIC_UNITSEAL_ATTESTOR_ADDRESS || '0xe98ACBD5d8F02A92A5492b5830BA83ffBB684E7f' },
  { key: 'SERV_API_KEY', val: process.env.SERV_API_KEY || '' },
  { key: 'SERV_BASE_URL', val: process.env.SERV_BASE_URL || 'https://inference-api.openserv.ai/v1' },
  { key: 'SERV_MODEL', val: process.env.SERV_MODEL || 'serv-standard' },
  { key: 'UNITSEAL_ATTESTOR_PRIVATE_KEY', val: process.env.UNITSEAL_ATTESTOR_PRIVATE_KEY || '' },
];

for (const { key, val } of envs) {
  try {
    console.log(`Adding ${key} to Vercel production...`);
    execSync(`npx vercel env rm ${key} production --yes`, { stdio: 'ignore' });
  } catch {}

  try {
    execSync(`echo ${val} | npx vercel env add ${key} production`, { stdio: 'inherit' });
    console.log(`✓ Added ${key}`);
  } catch (err) {
    console.warn(`Could not set ${key}:`, err.message);
  }
}
console.log('All Vercel environment variables configured!');
