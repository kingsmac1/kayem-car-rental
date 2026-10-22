async page => {
  const H = await page.evaluate(() => document.documentElement.scrollHeight);
  await page.mouse.move(700, 450);
  let i = 0;
  for (let y = 0; y < H && i < 40; y += 450) {
    await page.mouse.wheel(0, 450);
    await page.waitForTimeout(900);
    if (i % 2 === 1) await page.screenshot({ path: `research/s-${String(i).padStart(2,'0')}.png` });
    i++;
  }
  return 'H=' + H + ' steps=' + i;
}
