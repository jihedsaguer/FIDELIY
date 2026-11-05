#!/usr/bin/env node

/**
 * FIDELIY Repository Memory - Record Update Utility
 * 
 * Create and update memory records for inspected source files.
 * Decoupled from verification results: memory updates when source changes,
 * regardless of test/build outcome.
 * 
 * Responsibilities:
 * - Create new memory records from template
 * - Update source fingerprints
 * - Update timestamps and git revision
 * - Validate record schema
 * 
 * Verification results stored separately (not in memory records).
 * 
 * Usage:
 *   node frm-update-memory.js <file_path> <semantic.json>  # Create/update record
 *   node frm-update-memory.js --validate <memory.json>     # Validate schema
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

/**
 * Memory record schema template (corrected specification).
 */
function memoryRecordTemplate(filePath, semanticData = {}) {
  return {
    file_path: filePath,
    lifecycle_state: 'active',
    archived_at: null,
    archive_reason: null,
    purpose: semanticData.purpose || 'Not yet inspected',
    symbols: semanticData.symbols || [],
    source_validity: {
      source_fingerprint: semanticData.source_fingerprint || null,
      last_source_verified: new Date().toISOString(),
      git_revision: getGitRevision() || 'unknown'
    },
    relationship_validity: {
      direct_dependencies: semanticData.direct_dependencies || [],
      consumers: semanticData.consumers || [],
      relationship_status: 'unknown',
      stale_relationships: {}
    },
    invariants: semanticData.invariants || [],
    tests: {
      file: semanticData.test_file || null,
      count: semanticData.test_count || 0,
      coverage_percent: semanticData.coverage_percent || null,
      verification_level: semanticData.verification_level || 'not_verified'
    },
    known_limitations: semanticData.known_limitations || [],
    confidence_and_evidence: semanticData.confidence_and_evidence || {
      purpose: { confidence: 'low', evidence: 'not_yet_inspected' },
      symbols: { confidence: 'low', evidence: 'not_yet_inspected' },
      invariants: { confidence: 'low', evidence: 'not_yet_inspected' },
      tests: { confidence: 'low', evidence: 'not_yet_inspected' },
      relationship_validity: { confidence: 'low', evidence: 'not_yet_inspected' }
    },
    caveats: semanticData.caveats || [
      'Record created without semantic inspection; awaiting code review'
    ],
    last_full_inspection: semanticData.last_full_inspection || {
      timestamp: null,
      method: null,
      inspector: null
    }
  };
}

/**
 * Get current Git revision.
 */
function getGitRevision() {
  try {
    return execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim();
  } catch {
    return null;
  }
}

/**
 * Compute SHA-256 fingerprint.
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
 * Load and validate INDEX.json.
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
 * Save INDEX.json.
 */
function saveIndex(indexPath, index) {
  try {
    fs.writeFileSync(indexPath, JSON.stringify(index, null, 2), 'utf-8');
    return true;
  } catch (error) {
    console.error(`[ERROR] Failed to save INDEX.json: ${error.message}`);
    return false;
  }
}

/**
 * Save memory record.
 */
function saveRecord(recordPath, record) {
  try {
    fs.writeFileSync(recordPath, JSON.stringify(record, null, 2), 'utf-8');
    return true;
  } catch (error) {
    console.error(`[ERROR] Failed to save memory record: ${error.message}`);
    return false;
  }
}

/**
 * Validate memory record schema.
 */
function validateRecord(record) {
  const required = [
    'file_path', 'purpose', 'symbols', 'source_validity', 'relationship_validity',
    'invariants', 'tests', 'known_limitations', 'confidence_and_evidence', 'caveats'
  ];
  
  for (const field of required) {
    if (!(field in record)) {
      return `Missing required field: ${field}`;
    }
  }
  
  // Validate source_validity structure
  if (!record.source_validity.source_fingerprint || 
      !record.source_validity.last_source_verified ||
      !record.source_validity.git_revision) {
    return 'Invalid source_validity structure';
  }
  
  // Validate relationship_validity structure
  if (!Array.isArray(record.relationship_validity.direct_dependencies) ||
      !Array.isArray(record.relationship_validity.consumers)) {
    return 'Invalid relationship_validity structure';
  }
  
  return null; // Valid
}

/**
 * Create or update a memory record for a source file.
 * @param {string} filePath - Relative file path (backend/src/...)
 * @param {object} semanticData - Semantic inspection data (purpose, symbols, etc.)
 */
function createOrUpdateRecord(projectRoot, filePath, semanticData = {}) {
  // Ensure path is relative to backend
  const cleanPath = filePath.startsWith('backend' + path.sep) ? 
    filePath.substring(8) : 
    filePath;
  
  const indexPath = path.join(projectRoot, '.kiro', 'memory', 'INDEX.json');
  const memoryDir = path.dirname(indexPath);
  
  // Compute current fingerprint
  const fullPath = path.join(projectRoot, 'backend', cleanPath);
  const currentFingerprint = computeFingerprint(fullPath);
  
  if (!currentFingerprint) {
    console.error(`[ERROR] File not found or unreadable: ${fullPath}`);
    return false;
  }

  // Load or initialize index
  let index = loadIndex(indexPath);
  if (!index) {
    console.error(`[ERROR] Failed to load INDEX.json`);
    return false;
  }

  // Merge semantic data with fingerprint
  const recordData = {
    ...semanticData,
    source_fingerprint: currentFingerprint
  };

  // Create record from template
  const record = memoryRecordTemplate(cleanPath, recordData);

  // Validate record
  const validationError = validateRecord(record);
  if (validationError) {
    console.error(`[ERROR] Record validation failed: ${validationError}`);
    return false;
  }

  // Find existing records: active and archived
  const activeIndex = index.records.findIndex(r => 
    r.file_path === cleanPath && r.lifecycle_state === 'active'
  );
  const archivedIndices = index.records.reduce((acc, r, idx) => {
    if (r.file_path === cleanPath && (r.lifecycle_state === 'archived' || r.lifecycle_state === undefined || r.lifecycle_state === null)) {
      acc.push(idx);
    }
    return acc;
  }, []);

  if (activeIndex >= 0) {
    // Update existing active record
    index.records[activeIndex] = record;
    console.log(`[INFO] Updated existing record: ${cleanPath}`);
  } else if (archivedIndices.length > 0) {
    // Archived records exist; find candidates matching current fingerprint
    const restorationCandidates = archivedIndices.map(idx => ({
      idx,
      record: index.records[idx],
      matches: index.records[idx].source_validity && 
               index.records[idx].source_validity.source_fingerprint === currentFingerprint
    })).filter(c => c.matches);

    if (restorationCandidates.length === 0) {
      // No archived record matches current fingerprint: different-content restoration
      record.lifecycle_state = 'active';
      index.records.push(record);
      console.log(`[INFO] Created new record for modified content: ${cleanPath}`);
      console.log(`[INFO] Previous archived records remain unchanged: ${cleanPath}`);
    } else if (restorationCandidates.length === 1) {
      // Exactly one match: identical-content restoration
      const archivedRecord = restorationCandidates[0].record;
      archivedRecord.lifecycle_state = 'active';
      archivedRecord.archived_at = null;
      archivedRecord.archive_reason = null;
      // Preserve stale_relationships (dependencies may still be missing)
      // Update source verification timestamp
      archivedRecord.source_validity.last_source_verified = new Date().toISOString();
      console.log(`[INFO] Restored archived record: ${cleanPath}`);
    } else {
      // Multiple candidates: ambiguous restoration — report and stop without modifying any record
      console.error(`[ERROR] Ambiguous identical-content restoration for ${cleanPath}: ${restorationCandidates.length} archived records match fingerprint. No restoration performed. Manual review required.`);
      // Do NOT modify any archived records
      // Do NOT create a new active record
      // Return early to preserve INDEX state
      return false;
    }
  } else {
    // New record (no history)
    record.lifecycle_state = 'active';
    index.records.push(record);
    console.log(`[INFO] Created new record: ${cleanPath}`);
  }

  // Save both index and record file
  if (!saveIndex(indexPath, index)) {
    return false;
  }

  // Save individual record file for backup/reference
  const recordFileName = cleanPath.replace(/\//g, '-').replace(/\\/g, '-');
  const recordPath = path.join(memoryDir, `${recordFileName}.memory.json`);
  if (!saveRecord(recordPath, record)) {
    return false;
  }

  console.log(`[INFO] Saved record file: ${recordFileName}.memory.json`);
  return true;
}

/**
 * Validate schema of a memory record file.
 */
function validateRecordFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const record = JSON.parse(content);
    
    const error = validateRecord(record);
    if (error) {
      console.error(`[ERROR] Validation failed: ${error}`);
      process.exitCode = 1;
    } else {
      console.log(`[OK] Record is valid: ${filePath}`);
      process.exitCode = 0;
    }
  } catch (error) {
    console.error(`[ERROR] Failed to read or parse record: ${error.message}`);
    process.exitCode = 1;
  }
}

// Main execution
const args = process.argv.slice(2);
const projectRoot = path.resolve(__dirname, '..', '..');

// Only run CLI logic if this script is executed directly (not required as a module)
if (require.main === module) {
  if (args[0] === '--validate') {
    const recordPath = args[1];
    if (!recordPath) {
      console.error('Usage: frm-update-memory.js --validate <memory.json>');
      process.exit(1);
    }
    validateRecordFile(recordPath);
  } else if (args.length >= 1) {
    const filePath = args[0];
    const semanticDataPath = args[1];
    
    let semanticData = {};
    if (semanticDataPath && fs.existsSync(semanticDataPath)) {
      try {
        const content = fs.readFileSync(semanticDataPath, 'utf-8');
        semanticData = JSON.parse(content);
      } catch (error) {
        console.error(`[WARN] Failed to load semantic data: ${error.message}`);
      }
    }

    if (createOrUpdateRecord(projectRoot, filePath, semanticData)) {
      process.exitCode = 0;
    } else {
      process.exitCode = 1;
    }
  } else {
    console.error('Usage:');
    console.error('  frm-update-memory.js <file_path> [semantic.json]');
    console.error('  frm-update-memory.js --validate <memory.json>');
    process.exit(1);
  }
}

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { createOrUpdateRecord, loadIndex, saveIndex };
}
