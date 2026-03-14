const fs = require('fs');
const path = require('path');

const dir = 'd:/LovelyMemories/components';
const files = fs.readdirSync(dir).filter(f => f.startsWith('HomeHero') || f === 'Hero.tsx');

for (const f of files) {
  const file = path.join(dir, f);
  if (!fs.statSync(file).isFile()) continue;
  const content = fs.readFileSync(file, 'utf8');
  let newContent = content.split('Booking one of our exquisite, curated Homes').join('Book one of our exquisite, curated homes');
  newContent = newContent.split('Long Last Memories of').join('long lasting Memories of');
  if (content !== newContent) {
    fs.writeFileSync(file, newContent, 'utf8');
    console.log(`Updated ${f}`);
  }
}

const enJsonPath = 'd:/LovelyMemories/messages/en.json';
if (fs.existsSync(enJsonPath)) {
  let enContent = fs.readFileSync(enJsonPath, 'utf8');
  enContent = enContent.split('"heroOverTitle": "Booking one of our exquisite, curated Homes"').join('"heroOverTitle": "Book one of our exquisite, curated homes"');
  enContent = enContent.split('"heroTitle": "And create your own Lovely, Long Last Memories of <scrambler></scrambler>"').join('"heroTitle": "And create your own Lovely,\\nlong lasting Memories of <scrambler></scrambler>"');
  fs.writeFileSync(enJsonPath, enContent, 'utf8');
  console.log('Updated en.json');
}
