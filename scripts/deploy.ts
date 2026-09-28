import fs from 'fs';
import path from 'path';
import { createWalletClient, createPublicClient, http, type Hex, type Address } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { robinhoodChainMainnet, robinhoodChainTestnet } from '../src/robinhood/onchain';

async function deploy() {
  const envPath = path.resolve(__dirname, '..', '.env.local');
  let envContent = '';
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
  }

  // Determine target chain
  const isMainnet = process.argv.includes('--mainnet') || 
    process.env.NEXT_PUBLIC_RH_CHAIN_ID === '4663' || 
    !process.argv.includes('--testnet');

  const targetChain = isMainnet ? robinhoodChainMainnet : robinhoodChainTestnet;
  const rpcUrl = isMainnet
    ? (process.env.ALCHEMY_API_KEY || 'https://robinhood-mainnet.g.alchemy.com/v2/alch_7c1383NWPic6jF3NMm54w')
    : (process.env.NEXT_PUBLIC_RH_RPC_URL || 'https://rpc.testnet.chain.robinhood.com');

  console.log(`=== Deploying UnitSealGuard to ${targetChain.name} (Chain ID: ${targetChain.id}) ===`);
  console.log(`RPC Endpoint: ${rpcUrl}`);

  const attestorPk = (process.env.UNITSEAL_ATTESTOR_PRIVATE_KEY ||
    '0xc1221f7f0df0d80cc70ee80d0842d101f0cf983e0fda39486e091bb3bebf72ae') as Hex;

  const deployerAccount = privateKeyToAccount(attestorPk);
  console.log('Deployer / Attestor Address:', deployerAccount.address);

  const publicClient = createPublicClient({
    chain: targetChain,
    transport: http(rpcUrl),
  });

  const balance = await publicClient.getBalance({ address: deployerAccount.address });
  console.log(`${targetChain.name} Balance: ${balance.toString()} wei (${(Number(balance) / 1e18).toFixed(6)} ETH)`);

  const artifactsPath = path.resolve(__dirname, '..', 'contracts', 'artifacts', 'UnitSealGuard.json');
  if (!fs.existsSync(artifactsPath)) {
    console.error('Artifacts not found. Run "npx tsx scripts/compile.ts" first.');
    process.exit(1);
  }

  const { abi, bytecode } = JSON.parse(fs.readFileSync(artifactsPath, 'utf8'));

  if (balance === 0n) {
    console.warn(`\n[!] Notice: Deployer account has 0 ETH on ${targetChain.name}.`);
    console.warn(`    To fund this account on Robinhood Chain Mainnet:`);
    console.warn(`    Bridge ETH via the canonical Arbitrum bridge: https://docs.robinhood.com/chain/bridging/`);
    console.warn(`    Deployer Target Address: ${deployerAccount.address}`);
    
    const configuredGuard = (process.env.UNITSEAL_GUARD_ADDRESS || '0x9999999999999999999999999999999999999999') as Address;
    console.log(`    Active verification guard address: ${configuredGuard}`);
    return;
  }

  const walletClient = createWalletClient({
    account: deployerAccount,
    chain: targetChain,
    transport: http(rpcUrl),
  });

  console.log('Deploying UnitSealGuard bytecode to Robinhood Chain Mainnet...');
  const hash = await walletClient.deployContract({
    abi,
    bytecode: bytecode as Hex,
    args: [deployerAccount.address, deployerAccount.address],
  });

  console.log('Deployment TX Hash:', hash);
  console.log('Waiting for confirmation on Robinhood Chain...');

  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  console.log('UnitSealGuard deployed successfully at:', receipt.contractAddress);
  console.log(`Blockscout Explorer: https://robinhoodchain.blockscout.com/address/${receipt.contractAddress}`);

  if (receipt.contractAddress) {
    envContent = envContent.replace(
      /UNITSEAL_GUARD_ADDRESS=.*/,
      `UNITSEAL_GUARD_ADDRESS=${receipt.contractAddress}`
    );
    envContent = envContent.replace(
      /NEXT_PUBLIC_UNITSEAL_GUARD_ADDRESS=.*/,
      `NEXT_PUBLIC_UNITSEAL_GUARD_ADDRESS=${receipt.contractAddress}`
    );
    fs.writeFileSync(envPath, envContent);
    console.log('Updated .env.local with deployed contract address!');
  }
}

deploy().catch((err) => {
  console.error('Deployment error:', err);
  process.exit(1);
});
