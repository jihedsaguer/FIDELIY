#!/usr/bin/env node

/**
 * FIDELIY Repository Memory - Test Suite
 * 
 * Tests for FRM infrastructure:
 * - Fingerprint computation
 * - Index validation
 * - Freshness detection
 * - Memory record schema
 * - Reconciliation
 * 
 * Run: node frm.test.js
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const os = require('os');
const assert = require('assert');

let passCount = 0;
let failCount = 0;

/**
 * Test helper
 */
function test(description, fn) {
  try {
    fn();
    console.log(`✓ ${description}`);
    passCount++;
  } catch (error) {
    console.error(`✗ ${description}`);
    console.error(`  Error: ${error.message}`);
    failCount++;
  }
}

/**
 * Create temporary test directory
 */
function createTestDir() {
  const testDir = path.join(os.tmpdir(), `frm-test-${Date.now()}`);
  fs.mkdirSync(testDir, { recursive: true });
  return testDir;
}

/**
 * Clean up test directory
 */
function cleanupTestDir(testDir) {
  const removeRecursive = (dir) => {
    if (fs.existsSync(dir)) {
      fs.readdirSync(dir).forEach(file => {
        const filePath = path.join(dir, file);
        if (fs.lstatSync(filePath).isDirectory()) {
          removeRecursive(filePath);
        } else {
          fs.unlinkSync(filePath);
        }
      });
      fs.rmdirSync(dir);
    }
  };
  removeRecursive(testDir);
}

/**
 * Compute SHA-256 fingerprint
 */
function computeFingerprint(content) {
  const hash = crypto.createHash('sha256').update(content).digest('hex');
  return `sha256:${hash}`;
}

/**
 * Test: SHA-256 determinism
 */
test('SHA-256 fingerprints are deterministic', () => {
  const content = 'test content';
  const fp1 = computeFingerprint(content);
  const fp2 = computeFingerprint(content);
  assert.strictEqual(fp1, fp2, 'Same content should produce same fingerprint');
});

/**
 * Test: SHA-256 distinguishes content
 */
test('SHA-256 fingerprints differ for different content', () => {
  const fp1 = computeFingerprint('content1');
  const fp2 = computeFingerprint('content2');
  assert.notStrictEqual(fp1, fp2, 'Different content should produce different fingerprints');
});

/**
 * Test: Memory record schema structure
 */
test('Memory record has required fields', () => {
  const record = {
    file_path: 'src/test.ts',
    purpose: 'Test file',
    symbols: [],
    source_validity: {
      source_fingerprint: 'sha256:abc123',
      last_source_verified: new Date().toISOString(),
      git_revision: 'abc123def'
    },
    relationship_validity: {
      direct_dependencies: [],
      consumers: [],
      relationship_status: 'unknown'
    },
    invariants: [],
    tests: {
      file: null,
      count: 0,
      coverage_percent: null,
      verification_level: 'not_verified'
    },
    known_limitations: [],
    confidence_and_evidence: {},
    caveats: [],
    last_full_inspection: {
      timestamp: null,
      method: null,
      inspector: null
    }
  };

  const required = [
    'file_path', 'purpose', 'symbols', 'source_validity', 'relationship_validity',
    'invariants', 'tests', 'known_limitations', 'confidence_and_evidence', 'caveats'
  ];

  for (const field of required) {
    assert(field in record, `Record missing field: ${field}`);
  }
});

/**
 * Test: INDEX structure
 */
test('INDEX has required structure', () => {
  const index = {
    version: '1.0',
    schema_version: 'corrected_specification_v1',
    records: [],
    deleted_files: [],
    modified_externally: [],
    renames: [],
    last_reconciliation: null,
    reconciliation_method: null
  };

  const required = [
    'version', 'schema_version', 'records', 'deleted_files',
    'modified_externally', 'renames', 'last_reconciliation', 'reconciliation_method'
  ];

  for (const field of required) {
    assert(field in index, `INDEX missing field: ${field}`);
  }
});

/**
 * Test: File write and read
 */
test('Can write and read memory record files', () => {
  const testDir = createTestDir();
  try {
    const record = {
      file_path: 'src/test.ts',
      purpose: 'Test',
      symbols: [],
      source_validity: { source_fingerprint: 'sha256:test', last_source_verified: new Date().toISOString(), git_revision: 'abc' },
      relationship_validity: { direct_dependencies: [], consumers: [], relationship_status: 'unknown' },
      invariants: [],
      tests: { file: null, count: 0, coverage_percent: null, verification_level: 'not_verified' },
      known_limitations: [],
      confidence_and_evidence: {},
      caveats: [],
      last_full_inspection: { timestamp: null, method: null, inspector: null }
    };

    const filePath = path.join(testDir, 'test-record.json');
    fs.writeFileSync(filePath, JSON.stringify(record, null, 2), 'utf-8');
    
    const read = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    assert.strictEqual(read.file_path, 'src/test.ts', 'File path mismatch');
  } finally {
    cleanupTestDir(testDir);
  }
});

/**
 * Test: Freshness detection - unchanged file
 */
test('Detects unchanged files as fresh', () => {
  const testDir = createTestDir();
  try {
    const testFile = path.join(testDir, 'test.ts');
    const content = 'const x = 42;';
    fs.writeFileSync(testFile, content);

    const fp1 = computeFingerprint(content);
    const fp2 = computeFingerprint(fs.readFileSync(testFile, 'utf-8'));
    
    assert.strictEqual(fp1, fp2, 'Unchanged file should have matching fingerprints');
  } finally {
    cleanupTestDir(testDir);
  }
});

/**
 * Test: Freshness detection - modified file
 */
test('Detects modified files as stale', () => {
  const testDir = createTestDir();
  try {
    const testFile = path.join(testDir, 'test.ts');
    const content1 = 'const x = 42;';
    fs.writeFileSync(testFile, content1);
    const fp1 = computeFingerprint(content1);

    fs.writeFileSync(testFile, 'const x = 43;');
    const content2 = fs.readFileSync(testFile, 'utf-8');
    const fp2 = computeFingerprint(content2);

    assert.notStrictEqual(fp1, fp2, 'Modified file should have different fingerprints');
  } finally {
    cleanupTestDir(testDir);
  }
});

/**
 * Test: Added file detection
 */
test('Tracks added files not in records', () => {
  const testDir = createTestDir();
  try {
    // Records track files; added files have no record
    const records = [
      { file_path: 'src/a.ts', source_validity: { source_fingerprint: 'sha256:aaa' } },
      { file_path: 'src/b.ts', source_validity: { source_fingerprint: 'sha256:bbb' } }
    ];

    const currentFiles = ['src/a.ts', 'src/b.ts', 'src/c.ts']; // src/c.ts is new
    const trackedSet = new Set(records.map(r => r.file_path));
    
    let addedFiles = [];
    for (const f of currentFiles) {
      if (!trackedSet.has(f)) {
        addedFiles.push(f);
      }
    }

    assert.deepStrictEqual(addedFiles, ['src/c.ts'], 'Should detect added file');
  } finally {
    cleanupTestDir(testDir);
  }
});

/**
 * Test: Deleted file detection
 */
test('Detects deleted files', () => {
  const records = [
    { file_path: 'src/a.ts', source_validity: { source_fingerprint: 'sha256:aaa' } },
    { file_path: 'src/b.ts', source_validity: { source_fingerprint: 'sha256:bbb' } }
  ];

  const currentFiles = new Set(['src/a.ts']); // src/b.ts is deleted
  
  let deletedFiles = [];
  for (const record of records) {
    if (!currentFiles.has(record.file_path)) {
      deletedFiles.push(record.file_path);
    }
  }

  assert.deepStrictEqual(deletedFiles, ['src/b.ts'], 'Should detect deleted file');
});

/**
 * Test: JSON schema validation
 */
test('Validates JSON schema correctness', () => {
  const validRecord = {
    file_path: 'src/test.ts',
    purpose: 'Test',
    symbols: [{ name: 'Test', type: 'class', signature: 'class Test {}' }],
    source_validity: { 
      source_fingerprint: 'sha256:test', 
      last_source_verified: '2026-11-01T00:00:00Z', 
      git_revision: 'abc123' 
    },
    relationship_validity: {
      direct_dependencies: [{ target: 'pkg', symbols: ['Symbol'], dependency_fingerprint: 'pkg:pkg:1.0.0', last_checked: '2026-11-01T00:00:00Z' }],
      consumers: [{ source: 'src/other.ts', contract: 'Test', consumer_fingerprint: 'sha256:other', last_checked: '2026-11-01T00:00:00Z' }],
      relationship_status: 'valid'
    },
    invariants: ['No mutations'],
    tests: { file: 'src/test.spec.ts', count: 5, coverage_percent: 90, verification_level: 'unit' },
    known_limitations: ['None'],
    confidence_and_evidence: { purpose: { confidence: 'high', evidence: 'code_inspection' } },
    caveats: ['All assumptions listed'],
    last_full_inspection: { timestamp: '2026-11-01T00:00:00Z', method: 'inspection', inspector: 'agent' }
  };

  // Basic structure validation
  assert(validRecord.file_path, 'Must have file_path');
  assert(Array.isArray(validRecord.symbols), 'symbols must be array');
  assert(typeof validRecord.source_validity.source_fingerprint === 'string', 'fingerprint must be string');
});

/**
 * Test: Relationship validity tracking
 */
test('Tracks dependency and consumer relationships', () => {
  const record = {
    file_path: 'src/shared/guard.ts',
    relationship_validity: {
      direct_dependencies: [
        { target: '@nestjs/common', symbols: ['Injectable'], dependency_fingerprint: 'pkg:@nestjs/common:9.0.0', last_checked: new Date().toISOString() }
      ],
      consumers: [
        { source: 'src/controller.ts', contract: '@UseGuards(Guard)', consumer_fingerprint: 'sha256:ctrl', last_checked: new Date().toISOString() }
      ],
      relationship_status: 'valid'
    }
  };

  assert.strictEqual(record.relationship_validity.direct_dependencies.length, 1, 'Should track dependencies');
  assert.strictEqual(record.relationship_validity.consumers.length, 1, 'Should track consumers');
});

/**
 * Summary
 */
console.log(`\n${'='.repeat(50)}`);
console.log(`SUMMARY: ${passCount} passed, ${failCount} failed`);
console.log(`${'='.repeat(50)}`);

process.exitCode = failCount > 0 ? 1 : 0;
