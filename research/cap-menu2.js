async page => {
  await page.mouse.click(1344, 44);
  const out=[];
  for (let i=0;i<4;i++){ await page.waitForTimeout(250); await page.screenshot({path:`m-open-${i}.png`}); }
  await page.mouse.move(300, 400); await page.waitForTimeout(300);
  await page.screenshot({path:`m-hover.png`});
  await page.mouse.click(1344, 44);
  for (let i=0;i<3;i++){ await page.waitForTimeout(200); await page.screenshot({path:`m-close-${i}.png`}); }
  return 'ok';
}
