import { readdir, writeFile, mkdir, rm } from 'node:fs/promises';
import { join, extname, basename } from 'node:path';
import { homedir } from 'node:os';
import sharp from 'sharp';
import exifr from 'exifr';

const SOURCE_FOLDER = join(homedir(), 'Pictures/portfolio');
const OUTPUT_MINIFIED = './public/images/minified';
const OUTPUT_FULL = './public/images/full';
const OUTPUT_FILE = './src/app/models/image-data.ts';
const VALID_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.tiff', '.tif'];

const MINIFIED_HEIGHT = 400;
const FULL_SIZE = 1920;
const WEBP_QUALITY = 85;

/**
 * Formats exposure time as a fraction string (e.g., "1/250")
 */
function formatExposureTime(seconds) {
  if (!seconds || seconds <= 0) return undefined;
  if (seconds >= 1) return `${seconds}`;
  const denominator = Math.round(1 / seconds);
  return `1/${denominator}`;
}

/**
 * Extracts EXIF data from the original image
 */
async function extractExif(imagePath) {
  try {
    const exif = await exifr.parse(imagePath, {
      pick: ['Make', 'Model', 'FNumber', 'ExposureTime', 'ISO', 'FocalLength', 'DateTimeOriginal'],
    });
    return exif || {};
  } catch {
    return {};
  }
}

/**
 * Process a single image: extract EXIF, create minified and full versions
 */
async function processImage(sourcePath, filename) {
  const nameWithoutExt = basename(filename, extname(filename));
  const outputName = `${nameWithoutExt}.webp`;

  // Extract EXIF from original before any processing
  const exif = await extractExif(sourcePath);

  // Get original dimensions
  const image = sharp(sourcePath);
  const metadata = await image.metadata();
  const isPortrait = metadata.height > metadata.width;

  // Create minified version (for gallery grid)
  // Scale so the shorter dimension fits the gallery row height
  const minified = sharp(sourcePath).rotate(); // Auto-rotate based on EXIF
  let minifiedMeta;
  if (isPortrait) {
    minifiedMeta = await minified
      .resize({ height: MINIFIED_HEIGHT, withoutEnlargement: true })
      .webp({ quality: WEBP_QUALITY })
      .toFile(join(OUTPUT_MINIFIED, outputName));
  } else {
    minifiedMeta = await minified
      .resize({ height: MINIFIED_HEIGHT, withoutEnlargement: true })
      .webp({ quality: WEBP_QUALITY })
      .toFile(join(OUTPUT_MINIFIED, outputName));
  }

  // Create full-size version (for lightbox)
  const full = sharp(sourcePath).rotate();
  await full
    .resize({
      width: FULL_SIZE,
      height: FULL_SIZE,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({ quality: WEBP_QUALITY })
    .toFile(join(OUTPUT_FULL, outputName));

  // Build image data object
  const data = {
    url: `images/minified/${outputName}`,
    fullUrl: `images/full/${outputName}`,
    timestamp: exif.DateTimeOriginal?.toISOString() || new Date().toISOString(),
    width: minifiedMeta.width,
    height: minifiedMeta.height,
  };

  if (exif.Make) data.cameraMaker = exif.Make.trim();
  if (exif.Model) data.cameraModel = exif.Model.trim();
  if (exif.FNumber) data.fStop = exif.FNumber;
  if (exif.ExposureTime) data.exposureTime = formatExposureTime(exif.ExposureTime);
  if (exif.ISO) data.iso = exif.ISO;
  if (exif.FocalLength) data.focalLength = Math.round(exif.FocalLength);

  return data;
}

/**
 * Generates TypeScript code for the image data array
 */
function generateTypeScript(images) {
  const lines = images.map((img) => {
    const props = Object.entries(img)
      .map(([key, value]) => {
        if (key === 'timestamp') return `${key}: new Date('${value}')`;
        if (typeof value === 'string') return `${key}: '${value}'`;
        return `${key}: ${value}`;
      })
      .join(', ');
    return `  { ${props} }`;
  });

  return `import { Image } from './image.model';

export const ImageData: Image[] = [
${lines.join(',\n')}
];
`;
}

async function main() {
  // Read source images
  let files;
  try {
    files = await readdir(SOURCE_FOLDER);
  } catch (err) {
    console.error(`Error: Cannot read source folder: ${SOURCE_FOLDER}`);
    console.error('Make sure ~/Pictures/portfolio/ exists and contains images.');
    process.exit(1);
  }

  const imageFiles = files.filter((file) =>
    VALID_EXTENSIONS.includes(extname(file).toLowerCase())
  );

  if (imageFiles.length === 0) {
    console.error(`No images found in ${SOURCE_FOLDER}`);
    console.error(`Supported formats: ${VALID_EXTENSIONS.join(', ')}`);
    process.exit(1);
  }

  console.log(`Found ${imageFiles.length} images in ${SOURCE_FOLDER}`);

  // Clean and create output directories
  await rm(OUTPUT_MINIFIED, { recursive: true, force: true });
  await rm(OUTPUT_FULL, { recursive: true, force: true });
  await mkdir(OUTPUT_MINIFIED, { recursive: true });
  await mkdir(OUTPUT_FULL, { recursive: true });

  console.log('Processing images...');

  // Process all images
  const images = [];
  for (const file of imageFiles) {
    const sourcePath = join(SOURCE_FOLDER, file);
    try {
      const data = await processImage(sourcePath, file);
      images.push(data);
      console.log(`  ✓ ${file}`);
    } catch (err) {
      console.error(`  ✗ ${file}: ${err.message}`);
    }
  }

  // Sort by timestamp (newest first) then by filename
  images.sort((a, b) => {
    const dateCompare = new Date(b.timestamp) - new Date(a.timestamp);
    if (dateCompare !== 0) return dateCompare;
    return a.url.localeCompare(b.url);
  });

  // Generate TypeScript
  const typescript = generateTypeScript(images);
  await writeFile(OUTPUT_FILE, typescript, 'utf-8');

  console.log(`\nGenerated ${OUTPUT_FILE} with ${images.length} images.`);
  console.log(`Minified images: ${OUTPUT_MINIFIED}`);
  console.log(`Full-size images: ${OUTPUT_FULL}`);
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
