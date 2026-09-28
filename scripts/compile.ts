import fs from 'fs';
import path from 'path';
import solc from 'solc';

function findImports(importPath: string) {
  if (importPath.startsWith('@openzeppelin/')) {
    const fullPath = path.resolve(__dirname, '..', 'node_modules', importPath);
    if (fs.existsSync(fullPath)) {
      return { contents: fs.readFileSync(fullPath, 'utf8') };
    }
  }
  const localPath = path.resolve(__dirname, '..', 'contracts', importPath);
  if (fs.existsSync(localPath)) {
    return { contents: fs.readFileSync(localPath, 'utf8') };
  }
  return { error: 'File not found: ' + importPath };
}

async function compile() {
  console.log('Compiling contracts with solc...');
  const contractsDir = path.resolve(__dirname, '..', 'contracts');
  const artifactsDir = path.resolve(contractsDir, 'artifacts');
  if (!fs.existsSync(artifactsDir)) {
    fs.mkdirSync(artifactsDir, { recursive: true });
  }

  const guardSource = fs.readFileSync(path.resolve(contractsDir, 'UnitSealGuard.sol'), 'utf8');
  const tokenSource = fs.readFileSync(path.resolve(contractsDir, 'MockStockToken.sol'), 'utf8');

  const input = {
    language: 'Solidity',
    sources: {
      'UnitSealGuard.sol': { content: guardSource },
      'MockStockToken.sol': { content: tokenSource },
    },
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      outputSelection: {
        '*': {
          '*': ['abi', 'evm.bytecode.object'],
        },
      },
    },
  };

  const output = JSON.parse(solc.compile(JSON.stringify(input), { import: findImports }));

  if (output.errors) {
    let hasError = false;
    for (const error of output.errors) {
      if (error.severity === 'error') {
        console.error('Compilation Error:', error.formattedMessage);
        hasError = true;
      } else {
        console.warn('Compilation Warning:', error.formattedMessage);
      }
    }
    if (hasError) {
      process.exit(1);
    }
  }

  const guard = output.contracts['UnitSealGuard.sol']['UnitSealGuard'];
  const mockToken = output.contracts['MockStockToken.sol']['MockStockToken'];

  fs.writeFileSync(
    path.resolve(artifactsDir, 'UnitSealGuard.json'),
    JSON.stringify({ abi: guard.abi, bytecode: '0x' + guard.evm.bytecode.object }, null, 2)
  );
  fs.writeFileSync(
    path.resolve(artifactsDir, 'MockStockToken.json'),
    JSON.stringify({ abi: mockToken.abi, bytecode: '0x' + mockToken.evm.bytecode.object }, null, 2)
  );

  console.log('Successfully compiled UnitSealGuard and MockStockToken into contracts/artifacts/');
}

compile().catch((err) => {
  console.error(err);
  process.exit(1);
});
