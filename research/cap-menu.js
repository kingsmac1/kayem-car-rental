async page => {
  await page.evaluate(() => window.scrollTo(0,0)); await page.waitForTimeout(800);
  const btn = page.locator('nav button').first();
  await btn.hover(); await page.waitForTimeout(300);
  await btn.click();
  for (let i=0;i<4;i++){ await page.waitForTimeout(250); await page.screenshot({path:`m-open-${i}.png`}); }
  await page.locator('nav a:has-text("History")').first().hover(); await page.waitForTimeout(150);
  await page.screenshot({path:`m-hover.png`});
  await btn.click({force:true});
  for (let i=0;i<3;i++){ await page.waitForTimeout(200); await page.screenshot({path:`m-close-${i}.png`}); }
  const css = await page.evaluate(() => { const b=document.querySelector('nav button'); return getComputedStyle(b).transition; });
  return css;
}
