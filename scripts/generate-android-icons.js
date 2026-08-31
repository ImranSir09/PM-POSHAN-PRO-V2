import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const srcIcon = path.join(process.cwd(), 'public', 'icons', 'icon-512.png');

if (!fs.existsSync(srcIcon)) {
  console.error('Source icon not found at', srcIcon);
  process.exit(1);
}

const densities = [
  { folder: 'mipmap-mdpi', size: 48, fgSize: 108 },
  { folder: 'mipmap-hdpi', size: 72, fgSize: 162 },
  { folder: 'mipmap-xhdpi', size: 96, fgSize: 216 },
  { folder: 'mipmap-xxhdpi', size: 144, fgSize: 324 },
  { folder: 'mipmap-xxxhdpi', size: 192, fgSize: 432 },
];

async function generateIcons() {
  console.log('Generating Android native launcher icons from public/icons/icon-512.png...');

  for (const { folder, size, fgSize } of densities) {
    const dirPath = path.join(process.cwd(), 'android', 'app', 'src', 'main', 'res', folder);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    // 1. Standard ic_launcher.png
    await sharp(srcIcon)
      .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .toFile(path.join(dirPath, 'ic_launcher.png'));

    // 2. Round ic_launcher_round.png
    await sharp(srcIcon)
      .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .toFile(path.join(dirPath, 'ic_launcher_round.png'));

    // 3. Adaptive ic_launcher_foreground.png (inner 66% safe area)
    const innerSize = Math.round(fgSize * 0.666);
    const offset = Math.round((fgSize - innerSize) / 2);

    const resizedInner = await sharp(srcIcon)
      .resize(innerSize, innerSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .toBuffer();

    await sharp({
      create: {
        width: fgSize,
        height: fgSize,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      }
    })
      .composite([{ input: resizedInner, top: offset, left: offset }])
      .toFile(path.join(dirPath, 'ic_launcher_foreground.png'));

    console.log(`Generated icons for ${folder}`);
  }

  console.log('Successfully generated all Android launcher icons!');
}

generateIcons().catch(err => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
