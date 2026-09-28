const fs = require('fs');

const oldText = fs.readFileSync('c:/Users/hp/Downloads/UNITSEAL/serv_instruction.md', 'utf8');
const newText = fs.readFileSync('c:/Users/hp/Downloads/UNITSEAL/serv_instruction_mainnet.md', 'utf8');

const oldLines = oldText.split(/\r?\n/);
const newLines = newText.split(/\r?\n/);

console.log('--- Differences between lines 480 and 850 (Sections 12-19) ---');
for (let i = 480; i < 850; i++) {
  if (oldLines[i] !== newLines[i]) {
    console.log(`[Line ${i+1}]`);
    console.log(`  OLD: ${oldLines[i]}`);
    console.log(`  NEW: ${newLines[i]}`);
  }
}
