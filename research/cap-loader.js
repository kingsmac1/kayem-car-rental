async page => {
  await page.goto('https://nickho-motorsports.nl/', { waitUntil: 'commit' });
  for (let i = 0; i < 8; i++) {
    await page.waitForTimeout(350);
    await page.screenshot({ path: `research/load-${i}.png` }).catch(()=>{});
  }
  const scripts = await page.evaluate(() => [...document.scripts].map(s => s.src || ('inline:' + s.textContent.slice(0,120))));
  const fonts = await page.evaluate(() => [...new Set([...document.querySelectorAll('*')].slice(0,400).map(e => getComputedStyle(e).fontFamily))]);
  return JSON.stringify({ scripts, fonts }, null, 1);
}
