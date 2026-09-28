const { execSync } = require('child_process');

const envs = [
  { key: 'NEXT_PUBLIC_RH_CHAIN_ID', val: '4663' },
  { key: 'NEXT_PUBLIC_RH_RPC_URL', val: 'https://rpc.mainnet.chain.robinhood.com' },
  { key: 'NEXT_PUBLIC_RH_EXPLORER_URL', val: 'https://robinhoodchain.blockscout.com' },
  { key: 'ALCHEMY_API_KEY', val: 'https://robinhood-mainnet.g.alchemy.com/v2/alch_7c1383NWPic6jF3NMm54w' },
  { key: 'UNITSEAL_GUARD_ADDRESS', val: '0x2518853d8a6799734ded70857f0cffc26a175c14' },
  { key: 'NEXT_PUBLIC_UNITSEAL_GUARD_ADDRESS', val: '0x2518853d8a6799734ded70857f0cffc26a175c14' },
  { key: 'UNITSEAL_ATTESTOR_ADDRESS', val: '0xe98ACBD5d8F02A92A5492b5830BA83ffBB684E7f' },
  { key: 'NEXT_PUBLIC_UNITSEAL_ATTESTOR_ADDRESS', val: '0xe98ACBD5d8F02A92A5492b5830BA83ffBB684E7f' },
  { key: 'SERV_API_KEY', val: 'serv_6aba8faf5fccfa8b41934380_d5a0133a14a621835406f35407a5ee97' },
  { key: 'SERV_BASE_URL', val: 'https://inference-api.openserv.ai/v1' },
  { key: 'SERV_MODEL', val: 'serv-standard' },
  { key: 'UNITSEAL_ATTESTOR_PRIVATE_KEY', val: '0xc1221f7f0df0d80cc70ee80d0842d101f0cf983e0fda39486e091bb3bebf72ae' },
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
