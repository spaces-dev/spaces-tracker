import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

const links = await fs.readFile('links.json', 'utf-8');
const sourcemapLinks = JSON.parse(links).map((link) => `${link}.map`);

const CONCURRENCY = 10;

const stats = {
  totalFiles: 0,
  totalLinks: 0,
  changed: [],
  failed: [],
  unchanged: 0,
};

function getFileHash(content) {
  return crypto.createHash('md5').update(content).digest('hex');
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function downloadAndExtractSourcemap(url) {
  const results = {
    url,
    success: true,
    files: [],
    error: null
  };

  try {
    const response = await fetch(url);
    if (!response.ok) {
      results.success = false;
      results.error = `HTTP ${response.status}`;
      return results;
    }

    const sourcemap = await response.json();
    if (!sourcemap.sources || !sourcemap.sourcesContent) {
      results.success = false;
      results.error = 'Invalid sourcemap format';
      return results;
    }

    for (let i = 0; i < sourcemap.sources.length; i++) {
      const sourcePath = sourcemap.sources[i];
      const sourceContent = sourcemap.sourcesContent[i];

      if (!sourceContent) {
        continue;
      }

      const cleanPath = sourcePath.replace(/^[a-z]+:\/\/\//, '');
      const localPath = path.join('.', cleanPath);

      let isChanged = false;
      const newHash = getFileHash(sourceContent);

      if (await fileExists(localPath)) {
        const existingContent = await fs.readFile(localPath, 'utf-8');
        const existingHash = getFileHash(existingContent);
        isChanged = newHash !== existingHash;
      } else {
        isChanged = true;
      }

      await fs.mkdir(path.dirname(localPath), { recursive: true });
      await fs.writeFile(localPath, sourceContent, 'utf-8');

      results.files.push({ path: localPath, isChanged });
    }
  } catch (error) {
    results.success = false;
    results.error = error.message;
  }

  return results;
}

async function processInBatches(items, batchSize, processor) {
  const results = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(processor));
    results.push(...batchResults);

    console.log(`Processed ${Math.min(i + batchSize, items.length)}/${items.length} sourcemaps`);
  }

  return results;
}

async function main() {
  console.log(`Starting sourcemap extraction (${sourcemapLinks.length} files, concurrency: ${CONCURRENCY})...\n`);

  const startTime = Date.now();
  const results = await processInBatches(sourcemapLinks, CONCURRENCY, downloadAndExtractSourcemap);

  for (const result of results) {
    stats.totalLinks++;

    if (!result.success) {
      stats.failed.push({ url: result.url, error: result.error });
      console.error(`✗ Failed: ${result.url} - ${result.error}`);
    } else {
      stats.totalFiles += result.files.length;
      const changedFiles = result.files.filter(file => file.isChanged);

      if (changedFiles.length > 0) {
        stats.changed.push(...changedFiles.map(file => file.path));
        console.log(`✓ ${result.url}: ${changedFiles.length} files changed`);
      } else {
        stats.unchanged++;
      }
    }
  }

  console.log(`\nTotal links: ${stats.totalLinks}`);
  console.log(`Total files: ${stats.totalFiles}`);

  if (stats.changed.length > 0) {
    console.log(`\nChanged files (${stats.changed.length}):`);
    stats.changed.forEach(file => console.log(`  - ${file}`));
  }

  if (stats.failed.length > 0) {
    console.log(`\nFailed downloads (${stats.failed.length}):`);
    stats.failed.forEach(({ url, error }) => console.log(`  - ${url}: ${error}`));
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`\nDuration: ${duration}s`);

  if (stats.changed.length === 0) {
    console.log('\nNo files updated. Exiting without commit.');
    process.exit(0);
  }

  const commitMessage = generateCommitMessage();
  await fs.writeFile('commit.txt', commitMessage, 'utf-8');
}

function generateCommitMessage() {
  const lines = [`chore: Changed ${stats.changed.length} file(s)`, ''];

  if (stats.changed.length > 0) {
    stats.changed.forEach(file => {
      lines.push(`- ${file}`);
    });
  }

  if (stats.failed.length > 0) {
    lines.push('');
    lines.push(`Failed: ${stats.failed.length} sourcemap(s):`);
    stats.failed.forEach(({ url }) => {
      lines.push(`- ${url}`);
    });
  }

  return lines.join('\n');
}

main().catch(console.error);
