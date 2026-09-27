const fs = require('fs');
const text = fs.readFileSync('dist/engine.mjs', 'utf8');
const lines = text.split('\n');
lines.forEach((l, i) => {
  if (l.includes('.commander') || l.includes('conqueror') || l.includes('guardian') || l.includes('industrial') || l.includes('strategist') || l.includes('diplomat') || l.includes("'spy'")) {
    console.log(`${i+1}: ${l.slice(0, 140)}`);
  }
});
