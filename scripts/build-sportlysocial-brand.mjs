import sharp from "sharp";

const source = process.argv[2] || "/Users/mumdad/Desktop/headband.png";
const output = new URL("../public/brand/", import.meta.url).pathname;

async function removeWhite(input, reverseNavy = false) {
  const { data, info } = await input
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const min = Math.min(r, g, b);
    const alpha = Math.max(0, Math.min(255, (255 - min) * 3));

    if (alpha < 12) {
      data[i + 3] = 0;
      continue;
    }

    if (reverseNavy && b > g && g < 115) {
      data[i] = 243;
      data[i + 1] = 247;
      data[i + 2] = 250;
    }
    data[i + 3] = alpha;
  }

  return sharp(data, {
    raw: {
      width: info.width,
      height: info.height,
      channels: 4,
    },
  }).png().toBuffer();
}

const mascotCrop = await sharp(source)
  .extract({ left: 380, top: 260, width: 580, height: 480 })
  .png()
  .toBuffer();

const wordmarkCrop = sharp(source)
  .extract({ left: 160, top: 730, width: 940, height: 180 });

const wordmark = await removeWhite(wordmarkCrop.clone());
const wordmarkReverse = await removeWhite(wordmarkCrop.clone(), true);

const mascotTile = await sharp({
  create: {
    width: 512,
    height: 512,
    channels: 4,
    background: { r: 255, g: 255, b: 255, alpha: 1 },
  },
})
  .composite([
    {
      input: await sharp(mascotCrop)
        .resize({ width: 470, height: 390, fit: "contain", background: "#FFFFFF" })
        .png()
        .toBuffer(),
      left: 21,
      top: 61,
    },
  ])
  .png()
  .toBuffer();

const roundedMask = Buffer.from(
  '<svg width="512" height="512"><rect width="512" height="512" rx="116" fill="white"/></svg>',
);

const appIcon = await sharp(mascotTile)
  .composite([{ input: roundedMask, blend: "dest-in" }])
  .png()
  .toBuffer();

await sharp(appIcon).toFile(`${output}sportlysocial-app-icon.png`);
await sharp(appIcon).resize(512, 512).toFile(`${output}icon-512.png`);
await sharp(appIcon).resize(512, 512).toFile(`${output}maskable-icon-512.png`);
await sharp(appIcon).resize(192, 192).toFile(`${output}icon-192.png`);
await sharp(appIcon).resize(180, 180).toFile(`${output}apple-touch-icon.png`);
await sharp(appIcon).resize(64, 64).toFile(`${output}favicon.png`);

const tileHorizontal = await sharp(appIcon).resize(190, 190).png().toBuffer();
const wordmarkHorizontal = await sharp(wordmark)
  .resize({ width: 760, height: 146, fit: "contain" })
  .png()
  .toBuffer();
const wordmarkHorizontalReverse = await sharp(wordmarkReverse)
  .resize({ width: 760, height: 146, fit: "contain" })
  .png()
  .toBuffer();

for (const [name, mark] of [
  ["sportlysocial-logo-horizontal.png", wordmarkHorizontal],
  ["sportlysocial-logo-reverse.png", wordmarkHorizontalReverse],
]) {
  await sharp({
    create: {
      width: 990,
      height: 210,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([
      { input: tileHorizontal, left: 0, top: 10 },
      { input: mark, left: 220, top: 32 },
    ])
    .png()
    .toFile(`${output}${name}`);
}

const stackedWordmark = await sharp(wordmark)
  .resize({ width: 760, height: 146, fit: "contain" })
  .png()
  .toBuffer();
await sharp({
  create: {
    width: 800,
    height: 720,
    channels: 4,
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  },
})
  .composite([
    { input: await sharp(appIcon).resize(500, 500).png().toBuffer(), left: 150, top: 0 },
    { input: stackedWordmark, left: 20, top: 540 },
  ])
  .png()
  .toFile(`${output}sportlysocial-logo-stacked.png`);

await sharp({
  create: {
    width: 1200,
    height: 630,
    channels: 4,
    background: "#07131C",
  },
})
  .composite([
    { input: await sharp(appIcon).resize(330, 330).png().toBuffer(), left: 92, top: 118 },
    { input: await sharp(wordmarkHorizontalReverse).resize({ width: 650 }).png().toBuffer(), left: 452, top: 178 },
    {
      input: Buffer.from(
        `<svg width="690" height="180">
          <text x="0" y="58" fill="#A7B4C0" font-family="Arial, sans-serif" font-size="39" font-weight="600">Live scores. Real fans.</text>
          <text x="0" y="118" fill="#F3F7FA" font-family="Arial, sans-serif" font-size="39" font-weight="700">One room for every game.</text>
        </svg>`,
      ),
      left: 470,
      top: 340,
    },
  ])
  .png()
  .toFile(`${output}sportlysocial-social-preview.png`);
