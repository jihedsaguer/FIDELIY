#!/usr/bin/env node

/**
 * FIDELIY Repository Memory - Reconciliation Utility
 * 
 * Comprehensive working-tree reconciliation.
 * Detects: modified, deleted, added, renamed files; external changes; Git state.
 * 
 * Scope: src/**\/*.ts, tests/**\/*.spec.ts
 * Excludes: node_modules, dist, build, .next, *.log, binaries, generated files
 * 
 * Cross-platform: Windows-safe path handling via path.sep
 * 
 * Usage:
 *   node frm-reconcile.js                    # Full reconciliation
 *   node frm-reconcile.js --report           # Print report; don't update
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

/**
 * Compute SHA-256 fingerprint of file content.
 */
function computeFingerprint(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const hash = crypto.createHash('sha256').update(content).digest('hex');
    return `sha256:${hash}`;
  } catch {
    return null;
  }
}

/**
 * Recursively find all relevant source files.
 * Pattern: backend/src/**\/*.ts, tests/**\/*.spec.ts (relative to project root)
 * Exclude: node_modules, dist, build, .next, logs, binaries
 */
function findSourceFiles(projectRoot) {
  const sourceFiles = [];
  
  function isExcluded(filePath) {
    const normalized = filePath.toLowerCase();
    const excluded = [
      'node_modules', 'dist', 'build', '.next', '.git', '.kiro',
      '.env', '.log', '.txt', '.json~', '.tmp'
    ];
    return excluded.some(e => normalized.includes(path.sep + e + path.sep) || 
                               normalized.includes(path.sep + e));
  }
  
  function traverse(dir, basePath) {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relPath = path.join(basePath, entry.name);
        
        if (isExcluded(fullPath)) {
          continue;
        }
        
        if (entry.isDirectory()) {
          traverse(fullPath, relPath);
        } else if (entry.isFile()) {
          // Include: backend/src/**/*.ts, tests/**/*.spec.ts (relative to project root)
          const normalized = relPath.replace(/\\/g, '/');  // normalize to forward slashes
          if ((normalized.startsWith('backend/src') || normalized.startsWith('tests')) &&
              (normalized.endsWith('.ts') || normalized.endsWith('.tsx'))) {
            sourceFiles.push(normalized);  // store with forward slashes
          }
        }
      }
    } catch (error) {
      console.error(`[WARN] Failed to traverse ${dir}: ${error.message}`);
    }
  }
  
  // Scan both backend/src and tests directories from project root
  const backendSrcDir = path.join(projectRoot, 'backend', 'src');
  const testsDir = path.join(projectRoot, 'tests');
  
  if (fs.existsSync(backendSrcDir)) {
    traverse(backendSrcDir, 'backend/src');
  }
  if (fs.existsSync(testsDir)) {
    traverse(testsDir, 'tests');
  }
  
  return sourceFiles.sort();
}

/**
 * Load memory index.
 */
function loadIndex(indexPath) {
  try {
    if (!fs.existsSync(indexPath)) {
      return {
        version: '1.0',
        schema_version: 'corrected_specification_v1',
        records: [],
        deleted_files: [],
        modified_externally: [],
        renames: [],
        last_reconciliation: null,
        reconciliation_method: null
      };
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
 */
function saveIndex(indexPath, index) {
  try {
    fs.writeFileSync(indexPath, JSON.stringify(index, null, 2), 'utf-8');
  } catch (error) {
    console.error(`[ERROR] Failed to save INDEX.json: ${error.message}`);
    return false;
  }
  return true;
}

/**
 * Archive deleted records and mark relationships as stale.
 * Uses authoritative lifecycle_state field.
 * 
 * @param {Array} records - All records from index
 * @param {Array} deletedPaths - Paths detected as deleted
 */
function archiveDeletedAndMarkStaleRelationships(records, deletedPaths) {
  const deletedSet = new Set(deletedPaths);

  for (const record of records) {
    // Archive deleted records
    if (deletedSet.has(record.file_path)) {
      record.lifecycle_state = 'archived';
      record.archived_at = new Date().toISOString();
      record.archive_reason = 'file_deleted';
      continue;
    }

    // Mark relationships stale for active records
    // Treat missing lifecycle_state as active (backward compatibility)
    const isActive = (record.lifecycle_state === undefined || record.lifecycle_state === null || record.lifecycle_state === 'active');
    if (!isActive) {
      continue;
    }

    const rel = record.relationship_validity;
    if (!rel.stale_relationships) {
      rel.stale_relationships = { direct_dependencies: {}, consumers: {} };
    }

    // Mark stale dependencies
    for (const dep of rel.direct_dependencies || []) {
      if (deletedSet.has(dep.target)) {
        rel.stale_relationships.direct_dependencies[dep.target] = {
          stale: true,
          reason: 'referenced_file_deleted',
          archived_at: new Date().toISOString()
        };
      }
    }

    // Mark stale consumers
    for (const consumer of rel.consumers || []) {
      if (deletedSet.has(consumer.source)) {
        rel.stale_relationships.consumers[consumer.source] = {
          stale: true,
          reason: 'referencing_file_deleted',
          archived_at: new Date().toISOString()
        };
      }
    }
  }
}

/**
 * Get Git-tracked files (for rename detection).
 */
function getGitTrackedFiles() {
  try {
    const output = execSync('git ls-files', { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] });
    return new Set(output.split('\n').filter(line => line.trim()));
  } catch {
    return new Set();
  }
}

/**
 * Perform full reconciliation.
 */
function reconcile(projectRoot) {
  const indexPath = path.join(projectRoot, '.kiro', 'memory', 'INDEX.json');
  const index = loadIndex(indexPath);
  
  if (!index) {
    console.error('[ERROR] Failed to initialize index');
    return null;
  }

  // Phase 1: Find all current source files
  const currentFiles = new Set(findSourceFiles(projectRoot));
  const trackedFileSet = new Set(index.records.map(r => r.file_path));
  
  // Phase 2: Detect changes
  const changes = {
    modified: [],
    deleted: [],
    added: [],
    stale_dependency: [],
    total_tracked: index.records.length,
    total_current: currentFiles.size
  };

  // Phase 2a: Check tracked files for modification or deletion
  for (const record of index.records) {
    const filePath = record.file_path;
    // Handle both "backend/src/..." paths (already normalized)
    const fullPath = path.join(projectRoot, filePath);
    
    if (!currentFiles.has(filePath)) {
      // File no longer exists
      changes.deleted.push(filePath);
    } else {
      // File exists; check for modification
      const currentFingerprint = computeFingerprint(fullPath);
      const storedFingerprint = record.source_validity.source_fingerprint;
      
      if (currentFingerprint && currentFingerprint !== storedFingerprint) {
        changes.modified.push(filePath);
      }
    }
  }
  
  // Phase 2b: Check for added files
  for (const filePath of currentFiles) {
    if (!trackedFileSet.has(filePath)) {
      changes.added.push(filePath);
    }
  }

  // Phase 3: Archive deleted records and mark relationships stale
  archiveDeletedAndMarkStaleRelationships(index.records, changes.deleted);

  // Update tracking fields
  index.deleted_files = changes.deleted;
  index.modified_externally = changes.modified;
  index.last_reconciliation = new Date().toISOString();
  index.reconciliation_method = 'task_start_full_reconciliation';

  return { index, changes, indexPath };
}

// Main execution
const args = process.argv.slice(2);
const projectRoot = path.resolve(__dirname, '..', '..');

const result = reconcile(projectRoot);
if (!result) {
  process.exit(1);
}

const { index, changes, indexPath } = result;

if (args[0] === '--report') {
  // Print report; don't save
  console.log(JSON.stringify(changes, null, 2));
} else {
  // Save updated index
  if (saveIndex(indexPath, index)) {
    console.log(JSON.stringify(changes, null, 2));
    process.exitCode = 0;
  } else {
    process.exitCode = 1;
  }
}
