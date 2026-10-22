async page => {
  const qs = ['toyota-land-cruiser','toyota-prado','toyota-camry','toyota-corolla','lexus','mercedes-s-class','mercedes-gle','range-rover','toyota-hiace','minibus','hyundai-elantra','black-suv','car-interior','chauffeur','lagos','car-keys','wedding-car','highway-night','black-sedan','car-headlights','mercedes-g-class','bmw-x5','honda-accord','toyota-highlander','kia','airport','abuja','luxury-car','suv-night','sedan-night'];
  const out = {};
  for (const q of qs) {
    try {
      await page.goto('https://unsplash.com/s/photos/'+q+'?orientation=landscape&license=free', { waitUntil: 'domcontentloaded', timeout: 20000 });
      await page.waitForTimeout(1500);
      out[q] = await page.evaluate(() => [...document.querySelectorAll('figure img[src*="images.unsplash.com/photo-"]')].slice(0,10).map(i => [i.alt.slice(0,80), i.src.split('?')[0]]));
    } catch(e) { out[q] = 'ERR ' + e.message.slice(0,60); }
  }
  return JSON.stringify(out);
}
