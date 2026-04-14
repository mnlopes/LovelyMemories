const fs = require('fs');
const content = fs.readFileSync('d:/LovelyMemories/app/[locale]/(main)/booking/checkout/page.tsx', 'utf8');
const regex = /t\(['"]([^'"]+)['"]\)/g;
let match;
const matches = new Set();
while ((match = regex.exec(content)) !== null) {
  matches.add(match[1]); // The key inside t('key')
}
console.log(Array.from(matches).join('\n'));
