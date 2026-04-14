const fs = require('fs');

const keys = [
"errors.invalidFormat",
"success.subtitle",
"sidebar.nights",
"sidebar.adults",
"sidebar.children",
"sidebar.infants"
];

function setDeep(obj, path, value) {
  const parts = path.split('.');
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
  const path = `d:/LovelyMemories/messages/${file}`;
  let data;
  try {
    data = JSON.parse(fs.readFileSync(path, 'utf8'));
  } catch (e) {
    console.error(`Failed to parse ${file}:`, e.message);
    return;
  }

  if (!data.Checkout) {
    data.Checkout = {};
  }

  keys.forEach(k => {
    let val = k.split('.').pop().replace(/([A-Z])/g, ' $1').trim();
    val = val.charAt(0).toUpperCase() + val.slice(1);
    
    const defaults = {
      "errors.invalidFormat": "Invalid format",
      "success.subtitle": "Booking completed successfully",
      "sidebar.nights": "{count, plural, =1 {1 night} other {# nights}}",
      "sidebar.adults": "{count, plural, =1 {1 adult} other {# adults}}",
      "sidebar.children": "{count, plural, =1 {1 child} other {# children}}",
      "sidebar.infants": "{count, plural, =1 {1 infant} other {# infants}}"
    };

    let finalVal = defaults[k] || val;
    if (lang !== 'en') {
      finalVal = `[${lang.toUpperCase()}] ${finalVal}`;
    }

    setDeep(data.Checkout, k, finalVal);
  });

  fs.writeFileSync(path, JSON.stringify(data, null, 4));
  console.log(`Updated ${file}`);
}

['en.json', 'pt.json', 'he.json'].forEach(f => {
  const lang = f.split('.')[0];
  processLocale(f, lang);
});
