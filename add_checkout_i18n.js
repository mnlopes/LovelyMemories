const fs = require('fs');

const keys = [
"step2.unknown",
"step2.after18",
"errors.nameError",
"errors.emailError",
"errors.phoneError",
"errors.countryRequired",
"errors.cityRequired",
"errors.addressRequired",
"errors.zipRequired",
"errors.paymentMethodRequired",
"errors.sessionNotFound",
"errors.sessionExpired",
"errors.exploreProperties",
"step2.couponApplied",
"step2.invalidCoupon",
"errors.genericError",
"errors.serverError",
"success.title",
"success.reference",
"success.date",
"sidebar.total",
"success.paymentMethod",
"success.bankTransfer",
"success.orderDetails",
"success.downloadPdf",
"success.bookingOf",
"success.dates",
"success.duration",
"success.guests",
"sidebar.subtotal",
"sidebar.monthlyDiscount",
"sidebar.weeklyDiscount",
"success.cleaningFee",
"sidebar.cityTax",
"sidebar.coupon",
"sidebar.breakfast",
"sidebar.transfer",
"sidebar.roundTrip",
"sidebar.oneWay",
"step1.billingTitle",
"step1.vat",
"success.returnHome",
"header.cancel",
"header.back",
"header.contact",
"header.details",
"header.payment",
"step1.title",
"step1.subtitle",
"step1.fullName",
"step1.fullNamePlaceholder",
"step1.email",
"step1.emailPlaceholder",
"step1.phone",
"step1.selectCountry",
"step1.international",
"step1.phonePlaceholder",
"step1.billingSubtitle",
"step1.country",
"step1.countryPlaceholder",
"step1.address",
"step1.addressPlaceholder",
"step1.city",
"step1.cityPlaceholder",
"step1.zip",
"step1.vatPlaceholder",
"step2.title",
"step2.subtitle",
"step2.arrivalTime",
"step2.selectTime",
"step2.couponCode",
"step2.couponPlaceholder",
"step2.applyCoupon",
"step3.title",
"step3.subtitle",
"step3.wire",
"step3.manual",
"step3.instructions",
"step3.holder",
"step3.bankName",
"step3.iban",
"step3.swift",
"step3.reference",
"step3.card",
"step3.cardTypes",
"step3.initializing",
"step3.securePayment",
"step3.paypalSubtitle",
"step3.paypalButton",
"step3.paypalIntegration",
"sidebar.propertyDetails",
"sidebar.dateRange",
"sidebar.guestsTitle",
"sidebar.cleaning",
"sidebar.additionalServices",
"sidebar.vatIncluded",
"header.processing",
"header.confirmPayment",
"header.continue",
"footer.secured",
"footer.rights",
"footer.privacy",
"footer.terms"
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
    // Generate a default English string
    let val = k.split('.').pop().replace(/([A-Z])/g, ' $1').trim();
    val = val.charAt(0).toUpperCase() + val.slice(1);
    
    // Default values mapping for some know keys
    const defaults = {
      "step2.unknown": "I don't know yet",
      "step2.after18": "After 18:00",
      "header.cancel": "Cancel",
      "header.back": "Back",
      "step1.title": "Personal Details",
      "step1.subtitle": "Please provide your details",
      "step2.title": "Stay Details",
      "step3.title": "Payment",
      "errors.nameError": "Name is required",
      "errors.emailError": "Valid email is required",
      "sidebar.total": "Total",
      "footer.terms": "Terms & Conditions"
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
