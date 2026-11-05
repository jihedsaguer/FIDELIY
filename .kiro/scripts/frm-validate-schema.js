#!/usr/bin/env node

/**
 * FIDELIY Repository Memory - Schema Validator
 * 
 * Validates memory index and record files against approved schema.
 * No semantic knowledge required; validates structure only.
 * 
 * Usage:
 *   node frm-validate-schema.js                  # Validate INDEX.json
 *   node frm-validate-schema.js <record.json>    # Validate single record
 *   node frm-validate-schema.js --all            # Validate all records
 */

const fs = require('fs');
const path = require('path');

/**
 * Validate INDEX.json schema.
 */
function validateIndex(indexPath) {
  if (!fs.existsSync(indexPath)) {
    console.error(`[ERROR] INDEX.json not found: ${indexPath}`);
    return false;
  }

  try {
    const content = fs.readFileSync(indexPath, 'utf-8');
    const index = JSON.parse(content);

    // Required top-level fields
    const required = [
      'version', 'schema_version', 'records', 'deleted_files',
      'modified_externally', 'renames', 'last_reconciliation', 'reconciliation_method'
    ];

    for (const field of required) {
      if (!(field in index)) {
        console.error(`[ERROR] INDEX.json missing required field: ${field}`);
        return false;
      }
    }

    // Validate records array
    if (!Array.isArray(index.records)) {
      console.error(`[ERROR] INDEX.json records is not an array`);
      return false;
    }

    // Validate each record entry
    for (let i = 0; i < index.records.length; i++) {
      const record = index.records[i];
      const error = validateRecordStructure(record);
      if (error) {
        console.error(`[ERROR] INDEX.json record[${i}]: ${error}`);
        return false;
      }

      // Validate lifecycle_state consistency (NEW)
      if (record.lifecycle_state && !['active', 'archived'].includes(record.lifecycle_state)) {
        console.error(`[ERROR] Invalid lifecycle_state at record ${i}: ${record.lifecycle_state}`);
        return false;
      }

      // Archived records MUST have archived_at
      if (record.lifecycle_state === 'archived') {
        if (!record.archived_at) {
          console.error(`[ERROR] Archived record ${i} missing archived_at timestamp`);
          return false;
        }
        if (!record.archive_reason) {
          console.error(`[ERROR] Archived record ${i} missing archive_reason`);
          return false;
        }
      }

      // Active records MUST NOT have archived_at
      if (record.lifecycle_state === 'active') {
        if (record.archived_at) {
          console.error(`[ERROR] Active record ${i} has archived_at (inconsistent state)`);
          return false;
        }
      }

      // Validate stale_relationships structure if present
      if (record.relationship_validity?.stale_relationships) {
        const stale = record.relationship_validity.stale_relationships;
        if (stale.direct_dependencies && typeof stale.direct_dependencies !== 'object') {
          console.error(`[ERROR] Invalid stale_relationships.direct_dependencies at record ${i}`);
          return false;
        }
        if (stale.consumers && typeof stale.consumers !== 'object') {
          console.error(`[ERROR] Invalid stale_relationships.consumers at record ${i}`);
          return false;
        }
      }
    }

    console.log(`[OK] INDEX.json is valid (${index.records.length} records)`);
    return true;
  } catch (error) {
    console.error(`[ERROR] Failed to validate INDEX.json: ${error.message}`);
    return false;
  }
}

/**
 * Validate memory record structure.
 * Returns error message or null if valid.
 */
function validateRecordStructure(record) {
  if (typeof record !== 'object' || record === null) {
    return 'Record is not an object';
  }

  // Required top-level fields
  const required = [
    'file_path', 'purpose', 'symbols', 'source_validity', 'relationship_validity',
    'invariants', 'tests', 'known_limitations', 'confidence_and_evidence', 'caveats'
  ];

  for (const field of required) {
    if (!(field in record)) {
      return `Missing required field: ${field}`;
    }
  }

  // Validate field types
  if (typeof record.file_path !== 'string') {
    return 'file_path must be string';
  }

  if (typeof record.purpose !== 'string') {
    return 'purpose must be string';
  }

  if (!Array.isArray(record.symbols)) {
    return 'symbols must be array';
  }

  if (!Array.isArray(record.invariants)) {
    return 'invariants must be array';
  }

  if (!Array.isArray(record.known_limitations)) {
    return 'known_limitations must be array';
  }

  if (!Array.isArray(record.caveats)) {
    return 'caveats must be array';
  }

  // Validate source_validity
  if (typeof record.source_validity !== 'object' || record.source_validity === null) {
    return 'source_validity must be object';
  }

  const sv = record.source_validity;
  if (typeof sv.source_fingerprint !== 'string' && sv.source_fingerprint !== null) {
    return 'source_validity.source_fingerprint must be string or null';
  }

  if (typeof sv.last_source_verified !== 'string' && sv.last_source_verified !== null) {
    return 'source_validity.last_source_verified must be ISO datetime string or null';
  }

  if (typeof sv.git_revision !== 'string' && sv.git_revision !== null) {
    return 'source_validity.git_revision must be string or null';
  }

  // Validate relationship_validity
  if (typeof record.relationship_validity !== 'object' || record.relationship_validity === null) {
    return 'relationship_validity must be object';
  }

  const rv = record.relationship_validity;
  if (!Array.isArray(rv.direct_dependencies)) {
    return 'relationship_validity.direct_dependencies must be array';
  }

  if (!Array.isArray(rv.consumers)) {
    return 'relationship_validity.consumers must be array';
  }

  if (typeof rv.relationship_status !== 'string') {
    return 'relationship_validity.relationship_status must be string';
  }

  // Validate each dependency
  for (let i = 0; i < rv.direct_dependencies.length; i++) {
    const dep = rv.direct_dependencies[i];
    if (typeof dep !== 'object') {
      return `direct_dependencies[${i}] must be object`;
    }
    if (typeof dep.target !== 'string') {
      return `direct_dependencies[${i}].target must be string`;
    }
    if (!Array.isArray(dep.symbols)) {
      return `direct_dependencies[${i}].symbols must be array`;
    }
    if (typeof dep.dependency_fingerprint !== 'string') {
      return `direct_dependencies[${i}].dependency_fingerprint must be string`;
    }
  }

  // Validate each consumer
  for (let i = 0; i < rv.consumers.length; i++) {
    const consumer = rv.consumers[i];
    if (typeof consumer !== 'object') {
      return `consumers[${i}] must be object`;
    }
    if (typeof consumer.source !== 'string') {
      return `consumers[${i}].source must be string`;
    }
    if (typeof consumer.contract !== 'string') {
      return `consumers[${i}].contract must be string`;
    }
  }

  // Validate tests
  if (typeof record.tests !== 'object' || record.tests === null) {
    return 'tests must be object';
  }

  const tests = record.tests;
  if (typeof tests.file !== 'string' && tests.file !== null) {
    return 'tests.file must be string or null';
  }

  if (typeof tests.count !== 'number') {
    return 'tests.count must be number';
  }

  if (typeof tests.coverage_percent !== 'number' && tests.coverage_percent !== null) {
    return 'tests.coverage_percent must be number or null';
  }

  if (typeof tests.verification_level !== 'string') {
    return 'tests.verification_level must be string';
  }

  // Validate confidence_and_evidence
  if (typeof record.confidence_and_evidence !== 'object' || record.confidence_and_evidence === null) {
    return 'confidence_and_evidence must be object';
  }

  return null; // Valid
}

/**
 * Validate a single record file.
 */
function validateRecordFile(filePath) {
  if (!fs.existsSync(filePath)) {
    console.error(`[ERROR] Record file not found: ${filePath}`);
    return false;
  }

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const record = JSON.parse(content);

    const error = validateRecordStructure(record);
    if (error) {
      console.error(`[ERROR] Record validation failed: ${error}`);
      return false;
    }

    console.log(`[OK] Record is valid: ${path.basename(filePath)}`);
    return true;
  } catch (error) {
    console.error(`[ERROR] Failed to validate record: ${error.message}`);
    return false;
  }
}

/**
 * Validate all record files in memory directory.
 */
function validateAllRecords(projectRoot) {
  const memoryDir = path.join(projectRoot, '.kiro', 'memory');
  
  if (!fs.existsSync(memoryDir)) {
    console.error(`[ERROR] Memory directory not found: ${memoryDir}`);
    return false;
  }

  try {
    const files = fs.readdirSync(memoryDir).filter(f => f.endsWith('.memory.json'));
    
    if (files.length === 0) {
      console.log(`[INFO] No memory records found to validate`);
      return true;
    }

    let valid = 0;
    let invalid = 0;

    for (const file of files) {
      const filePath = path.join(memoryDir, file);
      if (validateRecordFile(filePath)) {
        valid++;
      } else {
        invalid++;
      }
    }

    console.log(`\n[SUMMARY] ${valid} valid, ${invalid} invalid out of ${files.length} records`);
    return invalid === 0;
  } catch (error) {
    console.error(`[ERROR] Failed to validate records: ${error.message}`);
    return false;
  }
}

// Main execution
const args = process.argv.slice(2);
const projectRoot = path.resolve(__dirname, '..', '..');

if (args[0] === '--all') {
  // Validate INDEX.json and all records
  const indexPath = path.join(projectRoot, '.kiro', 'memory', 'INDEX.json');
  const indexValid = validateIndex(indexPath);
  const recordsValid = validateAllRecords(projectRoot);
  process.exitCode = (indexValid && recordsValid) ? 0 : 1;
} else if (args.length > 0) {
  // Validate specific record file
  if (validateRecordFile(args[0])) {
    process.exitCode = 0;
  } else {
    process.exitCode = 1;
  }
} else {
  // Validate INDEX.json only
  const indexPath = path.join(projectRoot, '.kiro', 'memory', 'INDEX.json');
  if (validateIndex(indexPath)) {
    process.exitCode = 0;
  } else {
    process.exitCode = 1;
  }
}
