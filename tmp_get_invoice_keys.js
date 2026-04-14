const fs = require('fs');
const path = require('path');

const dir = 'd:/LovelyMemories/components/booking/';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx'));

const matches = new Set();
const regex = /t\(['"]([^'"]+)['"][\),]/g;

files.forEach(file => {
  const content = fs.readFileSync(path.join(dir, file), 'utf8');
  let match;
  while ((match = regex.exec(content)) !== null) {
    if (match[1].includes('.')) {
       matches.add(match[1]);
    } else {
       // if it doesn't have a dot but we know it's missing, we only care if we namespace it
    }
  }
});

console.log('Found keys in components/booking:');
const keys = Array.from(matches);
console.log(keys.join('\n'));

// Now add them
function setDeep(obj, p, value) {
  const parts = p.split('.');
  let current = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!current[parts[i]]) current[parts[i]] = {};
    current = current[parts[i]];
  }
  if (!current[parts[parts.length - 1]]) {
    current[parts[parts.length - 1]] = value;
  }
}

function processLocale(file, lang) {
  const filepath = `d:/LovelyMemories/messages/${file}`;
  let data;
  try {
    data = JSON.parse(fs.readFileSync(filepath, 'utf8'));
  } catch (e) {
    console.error(`Failed to parse ${file}:`, e.message);
    return;
  }

  if (!data.Checkout) {
    data.Checkout = {};
  }

  let count = 0;
  keys.forEach(k => {
    // some keys might lack 'Checkout.', but if they do, we assume they are under Checkout
    // If the key in code is literally "success.property", the namespace from useTranslations('Checkout') adds it.
    
    let pureKey = k;
    if (pureKey.startsWith('Checkout.')) {
        pureKey = pureKey.replace('Checkout.', '');
    }

    // Check if it exists
    const parts = pureKey.split('.');
    let exists = true;
    let curr = data.Checkout;
    for (let p of parts) {
        if (!curr[p]) { exists = false; break; }
        curr = curr[p];
    }
    if (exists) return; // already there

    let val = pureKey.split('.').pop().replace(/([A-Z])/g, ' $1').trim();
    val = val.charAt(0).toUpperCase() + val.slice(1);
    
    let finalVal = val;
    if (lang !== 'en') {
      finalVal = `[${lang.toUpperCase()}] ${finalVal}`;
    }

    setDeep(data.Checkout, pureKey, finalVal);
    count++;
  });

  if (count > 0) {
      fs.writeFileSync(filepath, JSON.stringify(data, null, 4));
      console.log(`Updated ${file} with ${count} new keys.`);
  } else {
      console.log(`${file} is already up to date.`);
  }
}

['en.json', 'pt.json', 'he.json'].forEach(f => {
  const lang = f.split('.')[0];
  processLocale(f, lang);
});
