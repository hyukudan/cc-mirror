import { createHash } from 'node:crypto';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const DEV_BROWSER_REPO = 'https://github.com/SawyerHood/dev-browser.git';
const DEV_BROWSER_BRANCH = 'main';

const args = process.argv.slice(2);
const refIndex = args.indexOf('--ref');
const refOverride = refIndex >= 0 ? args[refIndex + 1] : undefined;

const readHeadRef = (): string => {
  const output = execSync(`git ls-remote --heads ${DEV_BROWSER_REPO} ${DEV_BROWSER_BRANCH}`, { encoding: 'utf8' });
  const line = output.trim().split('\n')[0];
  const [ref] = line.split('\t');
  if (!ref) throw new Error('Failed to resolve dev-browser ref');
  return ref.trim();
};

const fetchSha256 = async (url: string): Promise<string> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download ${url}: ${response.status} ${response.statusText}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  return createHash('sha256').update(buffer).digest('hex');
};

const updateFile = (filePath: string, ref: string, sha256: string): boolean => {
  const content = fs.readFileSync(filePath, 'utf8');
  const next = content
    .replace(/const DEV_BROWSER_REF = '.*?';/, `const DEV_BROWSER_REF = '${ref}';`)
    .replace(/const DEV_BROWSER_ARCHIVE_SHA256 = '.*?';/, `const DEV_BROWSER_ARCHIVE_SHA256 = '${sha256}';`);
  if (content === next) return false;
  fs.writeFileSync(filePath, next);
  return true;
};

const run = async () => {
  const ref = refOverride || readHeadRef();
  const archiveUrl = `https://github.com/SawyerHood/dev-browser/archive/${ref}.tar.gz`;
  const sha256 = await fetchSha256(archiveUrl);
  const targetFile = path.join(process.cwd(), 'src', 'core', 'skills.ts');

  const updated = updateFile(targetFile, ref, sha256);
  if (!updated) {
    console.log('No changes applied (pin already up to date).');
    return;
  }
  console.log(`Updated dev-browser pin to ${ref}`);
  console.log(`SHA256: ${sha256}`);
};

run().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
