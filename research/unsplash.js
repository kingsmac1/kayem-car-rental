async page => {
  await page.goto('https://unsplash.com/s/photos/car', { waitUntil: 'domcontentloaded' });
  const qs = ['toyota land cruiser','toyota prado','toyota camry','toyota corolla','lexus suv','mercedes s class','mercedes gle','range rover','toyota hiace van','minibus','hyundai sedan','luxury car night','black suv','car interior dashboard','airport car','chauffeur','lagos city','car keys handover','car wedding','highway night','black sedan studio','yellow car','car headlights dark','g wagon','bmw x5','honda accord','kia sportage','toyota highlander','car rental','nigeria road'];
  const out = {};
  for (const q of qs) {
    const r = await page.evaluate(async (q) => { const res = await fetch('/napi/search/photos?query='+encodeURIComponent(q)+'&per_page=12&orientation=landscape'); if(!res.ok) return 'ERR'+res.status; const d = await res.json(); return d.results.filter(x=>!x.premium && !x.plus).map(x=>[x.id, (x.alt_description||'').slice(0,70), x.urls.raw.split('?')[0]]); }, q);
    out[q] = r;
  }
  return JSON.stringify(out);
}
