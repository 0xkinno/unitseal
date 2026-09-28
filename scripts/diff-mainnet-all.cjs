const fs = require('fs');

const oldText = fs.readFileSync('c:/Users/hp/Downloads/UNITSEAL/serv_instruction.md', 'utf8');
const newText = fs.readFileSync('c:/Users/hp/Downloads/UNITSEAL/serv_instruction_mainnet.md', 'utf8');

const oldLines = oldText.split(/\r?\n/);
const newLines = newText.split(/\r?\n/);

// Find all lines in newLines that contain "mainnet" or "4663" or differences
console.log('--- ALL DIFF SECTIONS SUMMARY ---');
let diffCount = 0;
let currentSec = 'PREAMBLE';

const secChanges = {};

for (let i = 0; i < newLines.length; i++) {
  if (newLines[i].startsWith('# ')) {
    currentSec = newLines[i];
  }
  const oldLine = oldLines[i];
  const newLine = newLines[i];
  if (oldLine !== newLine) {
    if (!secChanges[currentSec]) {
      secChanges[currentSec] = [];
    }
    secChanges[currentSec].push({ line: i + 1, old: oldLine, new: newLine });
  }
}

for (const [sec, diffs] of Object.entries(secChanges)) {
  console.log(`\n### ${sec} (${diffs.length} diffs)`);
  // Look for lines containing 4663, mainnet, or substantial keywords
  diffs.forEach(d => {
    if (d.new && (d.new.includes('4663') || d.new.includes('mainnet') || d.new.includes('Mainnet') || d.new.includes('explorer') || d.new.includes('Blockscout') || d.new.startsWith('# '))) {
      console.log(`  [Line ${d.line}]`);
      if (d.old) console.log(`   - OLD: ${d.old}`);
      console.log(`   + NEW: ${d.new}`);
    }
  });
}
