import { readdir, readFile, writeFile, mkdir, stat, access, unlink } from 'node:fs/promises';
import { join, extname, basename } from 'node:path';
import { homedir } from 'node:os';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import exifr from 'exifr';

const SOURCE_FOLDER = join(homedir(), 'Pictures/portfolio');
const OUTPUT_MINIFIED = './public/images/minified';
const OUTPUT_FULL = './public/images/full';
const OUTPUT_FILE = './src/app/models/image-data.ts';
const TAG_MODEL_FILE = './src/app/models/tag.model.ts';
const CACHE_FILE = './scripts/.image-cache.json';
const VALID_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.tiff', '.tif'];
const MINIFIED_HEIGHT = 400;
const FULL_SIZE = 1920;
const WEBP_QUALITY = 85;

async function loadValidTags() {
  const content = await readFile(TAG_MODEL_FILE, 'utf-8');
  const match = content.match(/TAG_LABELS\s*=\s*\{([^}]+)\}/);
  if (!match) throw new Error('Could not parse TAG_LABELS from tag.model.ts');
  return new Set([...match[1].matchAll(/(\w+)\s*:/g)].map((m) => m[1]));
}

function parseFilename(filename, validTags) {
  const nameWithoutExt = basename(filename, extname(filename));
  const tagMatches = [...nameWithoutExt.matchAll(/#(\w+)/g)];
  const tags = tagMatches.map((m) => m[1].toLowerCase());

  const invalidTags = tags.filter((tag) => !validTags.has(tag));
  if (invalidTags.length > 0) {
    throw new Error(
      `Invalid tag(s): ${invalidTags.map((t) => `#${t}`).join(', ')}. ` +
      `Valid tags are: ${[...validTags].map((t) => `#${t}`).join(', ')}`
    );
  }

  let textWithoutTags = nameWithoutExt.replace(/#\w+/g, '').trim();
  const trailingNumberMatch = textWithoutTags.match(/^(.+?)\s+(\d+)$/);

  const alt = trailingNumberMatch ? trailingNumberMatch[1].trim() : textWithoutTags;
  const duplicateNumber = trailingNumberMatch?.[2];

  if (!alt) throw new Error('Filename must contain alt text before any hashtags');

  let sanitizedName = alt.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  if (duplicateNumber) sanitizedName += `-${duplicateNumber}`;

  return { alt, tags, sanitizedName };
}

async function loadCache() {
  try {
    return JSON.parse(await readFile(CACHE_FILE, 'utf-8'));
  } catch {
    return {};
  }
}

async function saveCache(cache) {
  await writeFile(CACHE_FILE, JSON.stringify(cache, null, 2), 'utf-8');
}

function generateCacheKey(fileStat, exif, filename) {
  const data = JSON.stringify({
    mtime: fileStat.mtimeMs,
    size: fileStat.size,
    filename,
    exif: {
      Make: exif.Make,
      Model: exif.Model,
      FNumber: exif.FNumber,
      ExposureTime: exif.ExposureTime,
      ISO: exif.ISO,
      FocalLength: exif.FocalLength,
      DateTimeOriginal: exif.DateTimeOriginal?.toISOString(),
    },
  });
  return createHash('md5').update(data).digest('hex');
}

async function fileExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function formatExposureTime(seconds) {
  if (!seconds || seconds <= 0) return undefined;
  if (seconds >= 1) return `${seconds}`;
  return `1/${Math.round(1 / seconds)}`;
}

async function extractExif(imagePath) {
  try {
    return await exifr.parse(imagePath, {
      pick: ['Make', 'Model', 'FNumber', 'ExposureTime', 'ISO', 'FocalLength', 'DateTimeOriginal'],
    }) || {};
  } catch {
    return {};
  }
}

function buildImageData(outputName, alt, tags, exif, minifiedMeta, fullMeta) {
  const data = {
    url: `images/minified/${outputName}`,
    alt,
    timestamp: exif.DateTimeOriginal?.toISOString() || new Date().toISOString(),
    width: minifiedMeta.width,
    height: minifiedMeta.height,
    fullWidth: fullMeta.width,
    fullHeight: fullMeta.height,
  };

  if (tags.length > 0) data.tags = tags;
  if (exif.Make) data.cameraMaker = exif.Make.trim();
  if (exif.Model) data.cameraModel = exif.Model.trim();
  if (exif.FNumber) data.fStop = exif.FNumber;
  if (exif.ExposureTime) data.exposureTime = formatExposureTime(exif.ExposureTime);
  if (exif.ISO) data.iso = exif.ISO;
  if (exif.FocalLength) data.focalLength = Math.round(exif.FocalLength);

  return data;
}

async function processImage(sourcePath, filename, validTags, cache) {
  const { alt, tags, sanitizedName } = parseFilename(filename, validTags);
  const outputName = `${sanitizedName}.webp`;
  const exif = await extractExif(sourcePath);
  const fileStat = await stat(sourcePath);
  const cacheKey = generateCacheKey(fileStat, exif, filename);
  const hasNoExif = !exif.Make && !exif.Model;

  const cached = cache[filename];
  if (cached?.cacheKey === cacheKey) {
    const minifiedPath = join(OUTPUT_MINIFIED, outputName);
    const fullPath = join(OUTPUT_FULL, outputName);
    if (await fileExists(minifiedPath) && await fileExists(fullPath)) {
      return { data: cached.data, cacheKey, skipped: true, hasNoExif };
    }
  }

  const minifiedMeta = await sharp(sourcePath)
    .rotate()
    .resize({ height: MINIFIED_HEIGHT, withoutEnlargement: true })
    .webp({ quality: WEBP_QUALITY })
    .toFile(join(OUTPUT_MINIFIED, outputName));

  const fullMeta = await sharp(sourcePath)
    .rotate()
    .resize({ width: FULL_SIZE, height: FULL_SIZE, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: WEBP_QUALITY })
    .toFile(join(OUTPUT_FULL, outputName));

  const data = buildImageData(outputName, alt, tags, exif, minifiedMeta, fullMeta);
  return { data, cacheKey, skipped: false, hasNoExif };
}

function generateTypeScript(images) {
  const lines = images.map((img) => {
    const props = Object.entries(img)
      .map(([key, value]) => {
        if (key === 'timestamp') return `${key}: new Date('${value}')`;
        if (key === 'tags') return `${key}: [${value.map((t) => `'${t}'`).join(', ')}]`;
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
  let validTags;
  try {
    validTags = await loadValidTags();
    console.log(`Valid tags: ${[...validTags].map((t) => `#${t}`).join(', ')}`);
  } catch (err) {
    console.error(`Error loading tags: ${err.message}`);
    process.exit(1);
  }

  let files;
  try {
    files = await readdir(SOURCE_FOLDER);
  } catch {
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

  const cache = await loadCache();
  await mkdir(OUTPUT_MINIFIED, { recursive: true });
  await mkdir(OUTPUT_FULL, { recursive: true });

  console.log('Processing images...');

  const expectedOutputFiles = new Set();
  const newCache = {};
  const images = [];
  let processedCount = 0;
  let skippedCount = 0;

  for (const file of imageFiles) {
    const sourcePath = join(SOURCE_FOLDER, file);
    try {
      const { data, cacheKey, skipped, hasNoExif } = await processImage(sourcePath, file, validTags, cache);
      images.push(data);
      newCache[file] = { cacheKey, data };

      const outputName = data.url.replace('images/minified/', '');
      expectedOutputFiles.add(outputName);

      if (hasNoExif) console.warn(`  ⚠ ${file}: No camera EXIF data found`);
      if (skipped) {
        skippedCount++;
        console.log(`  ○ ${file} (unchanged)`);
      } else {
        processedCount++;
        console.log(`  ✓ ${file}`);
      }
    } catch (err) {
      console.error(`  ✗ ${file}: ${err.message}`);
      process.exit(1);
    }
  }

  let removedCount = 0;
  try {
    const existingMinified = await readdir(OUTPUT_MINIFIED);
    for (const file of existingMinified) {
      if (!expectedOutputFiles.has(file)) {
        await unlink(join(OUTPUT_MINIFIED, file));
        await unlink(join(OUTPUT_FULL, file)).catch(() => {});
        removedCount++;
        console.log(`  🗑 Removed orphaned: ${file}`);
      }
    }
  } catch {}

  await saveCache(newCache);

  images.sort((a, b) => {
    const dateCompare = new Date(b.timestamp) - new Date(a.timestamp);
    return dateCompare !== 0 ? dateCompare : a.url.localeCompare(b.url);
  });

  await writeFile(OUTPUT_FILE, generateTypeScript(images), 'utf-8');

  console.log(`\nGenerated ${OUTPUT_FILE} with ${images.length} images.`);
  console.log(`  Processed: ${processedCount}, Skipped: ${skippedCount}, Removed: ${removedCount}`);
  console.log(`Minified images: ${OUTPUT_MINIFIED}`);
  console.log(`Full-size images: ${OUTPUT_FULL}`);
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
