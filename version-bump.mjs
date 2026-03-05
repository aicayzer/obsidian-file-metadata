/**
 * version-bump.mjs
 *
 * Called automatically by `npm version` via the "version" script in package.json.
 * Reads the new version from package.json, writes it to manifest.json,
 * and appends a new entry to versions.json.
 *
 * Usage (via npm):
 *   npm version patch   →  1.0.0 → 1.0.1
 *   npm version minor   →  1.0.0 → 1.1.0
 *   npm version major   →  1.0.0 → 2.0.0
 *
 * After this script runs, git add and commit are handled by the "version" script.
 * Then push the commit + tag, and the GitHub Action creates the release automatically.
 */

import { readFileSync, writeFileSync } from 'fs';

// Read the new version that npm just wrote into package.json
const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const version = pkg.version;

// Update manifest.json
const manifest = JSON.parse(readFileSync('manifest.json', 'utf8'));
manifest.version = version;
writeFileSync('manifest.json', JSON.stringify(manifest, null, '\t') + '\n');

// Append to versions.json
const versions = JSON.parse(readFileSync('versions.json', 'utf8'));
versions[version] = manifest.minAppVersion;
writeFileSync('versions.json', JSON.stringify(versions, null, '\t') + '\n');

console.log(`Bumped to version ${version}`);
