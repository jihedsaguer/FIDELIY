#!/usr/bin/env node

/**
 * FIDELIY Repository Memory - Fingerprint Utility
 * 
 * Deterministic SHA-256 fingerprinting for source files and dependencies.
 * Cross-platform: uses Node.js built-in crypto module.
 * No external dependencies; no bash required.
 * 
 * Usage:
 *   node frm-fingerprint.js <file_path>              # Single file
 *   node frm-fingerprint.js --all                     # All tracked files
 *   node frm-fingerprint.js --verify <memory.json>   # Verify record freshness
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

/**
 * Compute SHA-256 fingerprint of file content.
 * @param {string} filePath - Absolute or relative file path
 * @returns {string|null} - "sha256:xxxxx" or null if file not found
 */
function computeFingerprint(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const hash = crypto.createHash('sha256').update(content).digest('hex');
    return `sha256:${hash}`;
  } catch (error) {
    if (error.code === 'ENOENT') {
      return null; // File not found
    }
    throw error;
  }
}

/**
 * Compute fingerprint for package version (dependency identifier).
 * @param {string} packageName - Package name (e.g., "@nestjs/common")
 * @param {string} version - Package version (e.g., "9.0.0")
 * @returns {string} - "pkg:name:version"
 */
function packageFingerprint(packageName, version) {
  return `pkg:${packageName}:${version}`;
}

/**
 * Load and parse memory index.
 * @param {string} indexPath - Path to INDEX.json
 * @returns {object|null} - Parsed index or null
 */
function loadIndex(indexPath) {
  try {
    if (!fs.existsSync(indexPath)) {
      return null;
    }
    const content = fs.readFileSync(indexPath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`[ERROR] Failed to load INDEX.json: ${error.message}`);
    return null;
  }
}

/**
 * Save memory index.
 * @param {string} indexPath - Path to INDEX.json
 * @param {object} index - Index object
 */
function saveIndex(indexPath, index) {
  try {
    fs.writeFileSync(indexPath, JSON.stringify(index, null, 2), 'utf-8');
  } catch (error) {
    console.error(`[ERROR] Failed to save INDEX.json: ${error.message}`);
    process.exit(1);
  }
}

/**
 * Normalize file path for lookup: handle both "backend/src/..." and "src/..." conventions
 */
function normalizePath(filePath, projectRoot) {
  let normalized = filePath;
  if (!normalized.startsWith('backend')) {
    normalized = path.join('backend', normalized);
  }
  return path.join(projectRoot, normalized);
}

/**
 * Check freshness of a single tracked file.
 * Returns exit codes:
 *   0 = fresh (fingerprint matches stored)
 *   1 = stale (fingerprint mismatch)
 *   2 = new (no memory record)
 *   3 = deleted (record exists, file not found)
 * 
 * @param {string} filePath - Relative path to check
 * @param {object} index - Loaded memory index
 * @param {string} projectRoot - Project root directory
 */
function checkFreshness(filePath, index, projectRoot) {
  const record = index.records.find(r => r.file_path === filePath);
  
  if (!record) {
    console.error(`FRESHNESS:NEW:${filePath}`);
    process.exitCode = 2;
    return;
  }

  const fullPath = normalizePath(filePath, projectRoot);
  const currentFingerprint = computeFingerprint(fullPath);
  
  if (currentFingerprint === null) {
    console.error(`FRESHNESS:DELETED:${filePath}`);
    process.exitCode = 3;
    return;
  }

  const storedFingerprint = record.source_validity.source_fingerprint;
  
  if (currentFingerprint === storedFingerprint) {
    console.error(`FRESHNESS:FRESH:${filePath}`);
    process.exitCode = 0;
  } else {
    console.error(`FRESHNESS:STALE:${filePath}`);
    process.exitCode = 1;
  }
}

/**
 * Check freshness of all tracked files in index.
 * Returns summary and updates index stale flags.
 * Clears stale_reason when file becomes fresh.
 * Skips archived records.
 * 
 * @param {object} index - Loaded memory index
 * @param {string} projectRoot - Project root directory
 * @returns {object} - Summary {fresh: count, stale: count, deleted: count}
 */
function checkAllFreshness(index, projectRoot) {
  const summary = { fresh: 0, stale: 0, deleted: 0 };

  for (const record of index.records) {
    // Skip archived records (do not update fingerprints)
    if (record.lifecycle_state === 'archived') {
      continue;
    }

    const fullPath = normalizePath(record.file_path, projectRoot);
    const currentFingerprint = computeFingerprint(fullPath);

    if (currentFingerprint === null) {
      summary.deleted++;
      record.source_validity.stale_reason = 'file_deleted';
    } else if (currentFingerprint === record.source_validity.source_fingerprint) {
      summary.fresh++;
      // Clear stale_reason when file becomes fresh
      if ('stale_reason' in record.source_validity) {
        delete record.source_validity.stale_reason;
      }
    } else {
      summary.stale++;
      record.source_validity.stale_reason = 'content_changed';
    }
  }

  return summary;
}

// Main execution
const args = process.argv.slice(2);

if (args.length === 0) {
  console.error('Usage: frm-fingerprint.js <file_path> | --all | --verify <memory.json>');
  process.exit(1);
}

const projectRoot = path.resolve(__dirname, '..', '..');
const indexPath = path.join(projectRoot, '.kiro', 'memory', 'INDEX.json');

if (args[0] === '--all') {
  const index = loadIndex(indexPath);
  if (!index) {
    console.error('[ERROR] No INDEX.json found');
    process.exit(1);
  }
  
  const summary = checkAllFreshness(index, projectRoot);
  console.log(JSON.stringify(summary));
  saveIndex(indexPath, index);
  process.exitCode = 0;
} else if (args[0] === '--verify') {
  const recordPath = args[1];
  if (!recordPath) {
    console.error('Usage: frm-fingerprint.js --verify <memory.json>');
    process.exit(1);
  }
  
  try {
    const recordContent = fs.readFileSync(recordPath, 'utf-8');
    const record = JSON.parse(recordContent);
    
    // Basic validation
    if (!record.file_path || !record.source_validity) {
      console.error(`[ERROR] Invalid memory record schema`);
      process.exit(1);
    }
    
    const fullPath = normalizePath(record.file_path, projectRoot);
    const currentFingerprint = computeFingerprint(fullPath);
    if (currentFingerprint === null) {
      console.error(`VERIFY:DELETED:${record.file_path}`);
      process.exitCode = 3;
    } else if (currentFingerprint === record.source_validity.source_fingerprint) {
      console.error(`VERIFY:FRESH:${record.file_path}`);
      process.exitCode = 0;
    } else {
      console.error(`VERIFY:STALE:${record.file_path}`);
      process.exitCode = 1;
    }
  } catch (error) {
    console.error(`[ERROR] Failed to verify record: ${error.message}`);
    process.exit(1);
  }
} else {
  // Single file check
  const filePath = args[0];
  const index = loadIndex(indexPath);
  if (!index) {
    console.error('[ERROR] No INDEX.json found');
    process.exit(1);
  }
  checkFreshness(filePath, index, projectRoot);
}
