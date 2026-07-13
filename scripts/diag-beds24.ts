import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const BASE = 'https://beds24.com/api/v2';
async function token() {
  const r = await fetch(`${BASE}/authentication/token`, { headers: { refreshToken: process.env.BEDS24_REFRESH_TOKEN! } });
  return (await r.json()).token;
}
async function main() {
  const t = await token();
  // 1. Estado do canal airbnb por propriedade (publish/enabled)
  const cs = await fetch(`${BASE}/channels/settings`, { headers: { token: t } });
  const csj = await cs.json();
  const airbnb = (csj.data || []).find((d:any)=>d.channel==='airbnb');
  console.log('=== channels/settings airbnb (por propriedade) ===');
  for (const p of (airbnb?.properties || [])) {
    for (const rt of (p.roomTypes || [])) {
      console.log(`prop ${p.id} room ${rt.id} listing ${rt.airbnbListingId} enabled=${rt.enabled} publish=${rt.publish}`);
    }
  }
  // 2. synchronization_category atual de cada listing (do lado Airbnb)
  const ls = await fetch(`${BASE}/channels/airbnb/listings?airbnbUserId=391837499`, { headers: { token: t } });
  const lsj = await ls.json();
  console.log('\n=== listings synchronization_category (lado Airbnb) ===');
  for (const d of (lsj.data||[])) {
    const l = d.airbnbListing;
    console.log(`${l.name?.slice(0,35).padEnd(35)} sync=${l.synchronization_category}`);
  }
}
main().catch(e=>console.error(e));
