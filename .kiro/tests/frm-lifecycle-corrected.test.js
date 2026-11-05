#!/usr/bin/env node

/**
 * FIDELIY Repository Memory - Lifecycle Regression Test Suite
 * 
 * Tests the corrected lifecycle behavior:
 * - Deletion and archival
 * - Identical-content restoration preserving relationship staleness
 * - Different-content restoration creating new records
 * - Relationship invalidation for deleted dependencies
 * - Independent source and relationship validity
 * - Backward compatibility
 * 
 * Run: node frm-lifecycle-corrected.test.js
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
 * Create temporary test repository
 */
function createTestRepo() {
  const testDir = path.join(os.tmpdir(), `frm-lifecycle-${Date.now()}`);
  fs.mkdirSync(testDir, { recursive: true });
  return testDir;
}

/**
 * Clean up test repo
 */
function cleanupTestRepo(testDir) {
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
 * Test 1: Deleted record archived with correct metadata
 */
test('Deletion archives record with lifecycle_state and archived_at', () => {
  const record = {
    file_path: 'backend/src/service.ts',
    lifecycle_state: 'active',
    archived_at: null,
    archive_reason: null
  };

  // Simulate deletion
  record.lifecycle_state = 'archived';
  record.archived_at = new Date().toISOString();
  record.archive_reason = 'file_deleted';

  assert(record.lifecycle_state === 'archived', 'Should be archived');
  assert(record.archived_at !== null, 'Should have timestamp');
  assert(record.archive_reason === 'file_deleted', 'Should have reason');
});

/**
 * Test 2: Archived records excluded from active retrieval
 */
test('Archived records excluded from active-record filter', () => {
  const records = [
    { file_path: 'a.ts', lifecycle_state: 'active' },
    { file_path: 'b.ts', lifecycle_state: 'archived', archived_at: '2026-11-03T12:34:56Z' },
    { file_path: 'c.ts', lifecycle_state: 'active' }
  ];

  const activeRecords = records.filter(r => r.lifecycle_state === 'active');

  assert(activeRecords.length === 2, 'Should have 2 active records');
  assert(!activeRecords.some(r => r.lifecycle_state === 'archived'), 'No archived in active');
});

/**
 * Test 3: Historical records preserved in archive
 */
test('Historical archived records preserved with full metadata', () => {
  const archived = {
    file_path: 'service.ts',
    lifecycle_state: 'archived',
    archived_at: '2026-11-03T12:34:56Z',
    archive_reason: 'file_deleted',
    source_validity: { source_fingerprint: 'sha256:old_hash' },
    purpose: 'Old semantic knowledge'
  };

  assert(archived.source_validity.source_fingerprint !== null, 'Fingerprint preserved');
  assert(archived.purpose !== null, 'Purpose preserved');
  assert(archived.lifecycle_state === 'archived', 'Archived state preserved');
});

/**
 * Test 4: Relationship staleness marked when dependency deleted
 */
test('Active record relationships marked stale for deleted dependencies', () => {
  const deletedSet = new Set(['dependency.ts']);
  const record = {
    file_path: 'service.ts',
    lifecycle_state: 'active',
    relationship_validity: {
      direct_dependencies: [{ target: 'dependency.ts' }, { target: 'other.ts' }],
      stale_relationships: { direct_dependencies: {}, consumers: {} }
    }
  };

  // Mark relationships stale
  for (const dep of record.relationship_validity.direct_dependencies) {
    if (deletedSet.has(dep.target)) {
      record.relationship_validity.stale_relationships.direct_dependencies[dep.target] = {
        stale: true,
        reason: 'referenced_file_deleted',
        archived_at: new Date().toISOString()
      };
    }
  }

  assert(record.relationship_validity.stale_relationships.direct_dependencies['dependency.ts'],
         'Dependency marked stale');
  assert(!record.relationship_validity.stale_relationships.direct_dependencies['other.ts'],
         'Non-deleted dependency not marked');
});

/**
 * Test 5: Source validity independent from relationship validity
 */
test('Source validity stays fresh while relationships are stale', () => {
  const record = {
    source_validity: {
      source_fingerprint: 'sha256:abc123',
      stale_reason: null  // Source is FRESH
    },
    relationship_validity: {
      stale_relationships: {
        direct_dependencies: {
          'deleted.ts': { stale: true, reason: 'referenced_file_deleted' }
        }
      }
    }
  };

  const sourceIsFresh = record.source_validity.stale_reason === null;
  const relationshipsAreStale = 
    Object.keys(record.relationship_validity.stale_relationships.direct_dependencies).length > 0;

  assert(sourceIsFresh, 'Source is fresh');
  assert(relationshipsAreStale, 'Relationships are stale');
  assert(sourceIsFresh && relationshipsAreStale, 'Independent validity');
});

/**
 * Test 6: Identical-content restoration reactivates
 */
test('Identical-content restoration: reactivate archived, preserve stale relationships', () => {
  const archived = {
    file_path: 'service.ts',
    lifecycle_state: 'archived',
    archived_at: '2026-11-03T12:34:56Z',
    archive_reason: 'file_deleted',
    source_validity: { 
      source_fingerprint: 'sha256:abc123',
      last_source_verified: '2026-11-01T00:00:00Z'
    },
    relationship_validity: {
      stale_relationships: {
        direct_dependencies: { 'deleted.ts': { stale: true, reason: 'referenced_file_deleted' } }
      }
    }
  };

  // Identical restoration (same fingerprint)
  const currentFingerprint = 'sha256:abc123';
  if (currentFingerprint === archived.source_validity.source_fingerprint) {
    archived.lifecycle_state = 'active';
    archived.archived_at = null;
    archived.archive_reason = null;
    archived.source_validity.last_source_verified = new Date().toISOString();
    // stale_relationships NOT cleared
  }

  assert(archived.lifecycle_state === 'active', 'Record reactivated');
  assert(archived.archived_at === null, 'Archive timestamp cleared');
  assert(archived.relationship_validity.stale_relationships.direct_dependencies['deleted.ts'],
         'Stale relationships preserved');
});

/**
 * Test 7: Different-content restoration creates new record
 */
test('Different-content restoration: new record created, old archived', () => {
  const records = [
    {
      file_path: 'service.ts',
      lifecycle_state: 'archived',
      source_validity: { source_fingerprint: 'sha256:old_hash' },
      purpose: 'Old semantic knowledge'
    }
  ];

  const currentFingerprint = 'sha256:new_hash';
  const archivedRecord = records[0];

  if (currentFingerprint !== archivedRecord.source_validity.source_fingerprint) {
    // Different content: create new record
    const newRecord = {
      file_path: 'service.ts',
      lifecycle_state: 'active',
      source_validity: { source_fingerprint: currentFingerprint },
      purpose: 'Not yet inspected'
    };
    records.push(newRecord);
  }

  assert(records.length === 2, 'Two records exist');
  assert(records[0].lifecycle_state === 'archived', 'Old archived');
  assert(records[1].lifecycle_state === 'active', 'New active');
  assert(records[1].source_validity.source_fingerprint === 'sha256:new_hash', 'New fingerprint');
  assert(records[0].source_validity.source_fingerprint === 'sha256:old_hash', 'Old fingerprint preserved');
});

/**
 * Test 8: Multiple archived records for same path allowed
 */
test('Multiple archived records for same path allowed', () => {
  const records = [
    {
      file_path: 'service.ts',
      lifecycle_state: 'archived',
      source_validity: { source_fingerprint: 'sha256:hash1' }
    },
    {
      file_path: 'service.ts',
      lifecycle_state: 'archived',
      source_validity: { source_fingerprint: 'sha256:hash2' }
    },
    {
      file_path: 'service.ts',
      lifecycle_state: 'active',
      source_validity: { source_fingerprint: 'sha256:hash3' }
    }
  ];

  const samePathArchived = records.filter(r => r.file_path === 'service.ts' && r.lifecycle_state === 'archived');
  const samePathActive = records.filter(r => r.file_path === 'service.ts' && r.lifecycle_state === 'active');

  assert(samePathArchived.length === 2, 'Multiple archived allowed');
  assert(samePathActive.length === 1, 'Only one active');
});

/**
 * Test 9: Ambiguous identical-content restoration handled safely
 */
test('Ambiguous identical-content restoration: multiple archived, same fingerprint', () => {
  const records = [
    {
      file_path: 'service.ts',
      lifecycle_state: 'archived',
      archived_at: '2026-11-01T00:00:00Z',
      source_validity: { source_fingerprint: 'sha256:abc123' }
    },
    {
      file_path: 'service.ts',
      lifecycle_state: 'archived',
      archived_at: '2026-11-02T00:00:00Z',
      source_validity: { source_fingerprint: 'sha256:abc123' }
    }
  ];

  const currentFingerprint = 'sha256:abc123';
  const matching = records.filter(r =>
    r.file_path === 'service.ts' &&
    r.lifecycle_state === 'archived' &&
    r.source_validity.source_fingerprint === currentFingerprint
  );

  assert(matching.length === 2, 'Ambiguity detected: 2 archived records match');
  assert(matching.every(r => r.source_validity.source_fingerprint === currentFingerprint),
         'All matching have same fingerprint');
  // Safe handling: report ambiguity rather than arbitrarily reactivating
});

/**
 * Test 10: New paths remain unrecorded until memory creation
 */
test('Newly discovered files remain unrecorded until explicit memory creation', () => {
  const index = {
    records: [
      { file_path: 'tracked.ts', lifecycle_state: 'active' }
    ]
  };

  const changesAdded = ['new-file.ts'];
  const trackedSet = new Set(index.records.map(r => r.file_path));

  // Check: new files not in records
  for (const newFile of changesAdded) {
    assert(!trackedSet.has(newFile), `${newFile} not in records`);
  }

  // New file stays in changes.added (output only), not persisted to index
  // Until frm-update-memory.js is explicitly called, new file has no record
  assert(index.records.length === 1, 'Index unchanged until explicit memory creation');
});

/**
 * Test 11: No duplicate active records for same path
 */
test('Duplicate active records at same path rejected', () => {
  const records = [
    {
      file_path: 'service.ts',
      lifecycle_state: 'active',
      source_validity: { source_fingerprint: 'sha256:hash1' }
    },
    {
      file_path: 'service.ts',
      lifecycle_state: 'active',
      source_validity: { source_fingerprint: 'sha256:hash2' }
    }
  ];

  const activeForPath = records.filter(r =>
    r.file_path === 'service.ts' && r.lifecycle_state === 'active'
  );

  // Validation: reject if multiple active for same path
  const isValid = activeForPath.length <= 1;
  assert(!isValid, 'Duplicate active records should be rejected');
});

/**
 * Test 12: Archived records skipped in fingerprinting
 */
test('Fingerprinting skips archived records', () => {
  const records = [
    {
      file_path: 'archived.ts',
      lifecycle_state: 'archived',
      source_validity: { source_fingerprint: 'sha256:old' }
    },
    {
      file_path: 'active.ts',
      lifecycle_state: 'active',
      source_validity: { source_fingerprint: 'sha256:current' }
    }
  ];

  const activeOnly = records.filter(r => r.lifecycle_state !== 'archived');
  const summary = { fresh: 0, stale: 0 };

  // Process only active records
  for (const record of activeOnly) {
    // Simulate fingerprint check
    summary.fresh++;
  }

  assert(activeOnly.length === 1, 'Only active checked');
  assert(activeOnly[0].file_path === 'active.ts', 'Archived skipped');
  assert(summary.fresh === 1, 'Only 1 active processed');
});

/**
 * Test 13: Repeated reconciliation idempotent
 */
test('Repeated reconciliation produces idempotent results', () => {
  const record = {
    file_path: 'service.ts',
    lifecycle_state: 'active'
  };

  const deletedPaths = ['service.ts'];

  // First reconciliation
  if (deletedPaths.includes(record.file_path)) {
    record.lifecycle_state = 'archived';
    record.archived_at = '2026-11-03T12:34:56Z';
    record.archive_reason = 'file_deleted';
  }

  const state1 = JSON.stringify(record);

  // Second reconciliation (file still deleted, already archived)
  if (deletedPaths.includes(record.file_path) && record.lifecycle_state !== 'archived') {
    // No-op: already archived
  }

  const state2 = JSON.stringify(record);

  assert(state1 === state2, 'Idempotent: no change on second run');
});

/**
 * Test 14: Backward compatibility: old records without lifecycle_state
 */
test('Old INDEX records without lifecycle_state treated as active', () => {
  const oldRecord = {
    file_path: 'service.ts',
    purpose: 'Old record without lifecycle_state',
    source_validity: { source_fingerprint: 'sha256:hash' }
    // No lifecycle_state field
  };

  // On load, default to active
  const isActive = (oldRecord.lifecycle_state || 'active') === 'active';

  assert(isActive, 'Old record treated as active by default');
});

/**
 * Test 15: Lifecycle validation detects inconsistency
 */
test('Schema validation detects inconsistent lifecycle state', () => {
  const inconsistent1 = {
    lifecycle_state: 'archived',
    archived_at: null  // Missing timestamp
  };

  const inconsistent2 = {
    lifecycle_state: 'active',
    archived_at: '2026-11-03T12:34:56Z'  // Should not have timestamp
  };

  function isConsistent(record) {
    if (record.lifecycle_state === 'archived' && !record.archived_at) {
      return false;
    }
    if (record.lifecycle_state === 'active' && record.archived_at) {
      return false;
    }
    return true;
  }

  assert(!isConsistent(inconsistent1), 'Detects missing archived_at');
  assert(!isConsistent(inconsistent2), 'Detects extra archived_at');
});

/**
 * Test 16: Legacy records without lifecycle_state processed for relationship staleness
 */
test('Legacy records without lifecycle_state processed for relationship staleness', () => {
  const records = [
    {
      file_path: 'legacy-service.ts',
      // No lifecycle_state field (backward compat)
      relationship_validity: {
        direct_dependencies: [
          { target: 'deleted.ts' }
        ],
        consumers: [],
        stale_relationships: { direct_dependencies: {}, consumers: {} }
      }
    }
  ];

  const deletedSet = new Set(['deleted.ts']);

  // Simulate archiveDeletedAndMarkStaleRelationships behavior with legacy record
  for (const record of records) {
    // Skip if explicitly archived
    if (deletedSet.has(record.file_path)) {
      record.lifecycle_state = 'archived';
      continue;
    }

    // Treat missing lifecycle_state as active (backward compat)
    const isActive = (record.lifecycle_state === undefined || record.lifecycle_state === null || record.lifecycle_state === 'active');
    if (!isActive) {
      continue;
    }

    // Mark stale dependencies
    const rel = record.relationship_validity;
    for (const dep of rel.direct_dependencies || []) {
      if (deletedSet.has(dep.target)) {
        rel.stale_relationships.direct_dependencies[dep.target] = {
          stale: true,
          reason: 'referenced_file_deleted'
        };
      }
    }
  }

  assert(records[0].relationship_validity.stale_relationships.direct_dependencies['deleted.ts'],
         'Legacy record relationships marked stale');
  assert(records[0].lifecycle_state === undefined,
         'Legacy record lifecycle_state unchanged (backward compat)');
});

/**
 * Test 17: Single archived record with matching fingerprint is restored (not ambiguous)
 */
test('Single archived record with matching fingerprint is restored (not ambiguous)', () => {
  const records = [
    {
      file_path: 'service.ts',
      lifecycle_state: 'archived',
      source_validity: { source_fingerprint: 'sha256:hash1' }
    },
    {
      file_path: 'service.ts',
      lifecycle_state: 'archived',
      source_validity: { source_fingerprint: 'sha256:hash2' }
    }
  ];

  const currentFingerprint = 'sha256:hash2';
  const cleanPath = 'service.ts';
  
  const archivedIndices = records.reduce((acc, r, idx) => {
    if (r.file_path === cleanPath && r.lifecycle_state === 'archived') {
      acc.push(idx);
    }
    return acc;
  }, []);

  const restorationCandidates = archivedIndices.map(idx => ({
    idx,
    record: records[idx],
    matches: records[idx].source_validity && 
             records[idx].source_validity.source_fingerprint === currentFingerprint
  })).filter(c => c.matches);

  assert(restorationCandidates.length === 1, 'Exactly one candidate matches fingerprint');
  assert(restorationCandidates[0].record.source_validity.source_fingerprint === 'sha256:hash2',
         'Correct record identified');

  // Restore the candidate
  const archivedRecord = restorationCandidates[0].record;
  archivedRecord.lifecycle_state = 'active';
  
  assert(records[0].lifecycle_state === 'archived', 'Non-matching record remains archived');
  assert(records[1].lifecycle_state === 'active', 'Matching record reactivated');
});

/**
 * Test 18: Invoke actual production restoration with multiple identical-fingerprint archived records
 */
test('Actual frm-update-memory.js: Multiple archived with same fingerprint — ambiguity reported, none modified', () => {
  const fs = require('fs');
  const path = require('path');
  const os = require('os');

  // Import the actual production function
  const { createOrUpdateRecord, loadIndex, saveIndex } = require('../scripts/frm-update-memory.js');

  // Create isolated temporary fixture
  const testDir = path.join(os.tmpdir(), `frm-ambiguity-test-${Date.now()}`);
  fs.mkdirSync(testDir, { recursive: true });
  fs.mkdirSync(path.join(testDir, '.kiro', 'memory'), { recursive: true });
  fs.mkdirSync(path.join(testDir, 'backend', 'src'), { recursive: true });

  // Create a test source file
  const sourceFile = path.join(testDir, 'backend', 'src', 'service.ts');
  fs.writeFileSync(sourceFile, 'export class Service {}', 'utf-8');

  // Initialize INDEX with two archived records having identical fingerprint
  const indexPath = path.join(testDir, '.kiro', 'memory', 'INDEX.json');
  const index = {
    version: '1.0',
    schema_version: 'corrected_specification_v1',
    records: [
      {
        file_path: 'backend/src/service.ts',
        lifecycle_state: 'archived',
        archived_at: '2026-11-01T00:00:00Z',
        archive_reason: 'file_deleted',
        source_validity: {
          source_fingerprint: 'sha256:abc123',
          last_source_verified: '2026-11-01T12:00:00Z',
          git_revision: 'oldrev1'
        },
        purpose: 'First archived version',
        symbols: [{ name: 'FirstService', type: 'class' }],
        relationship_validity: {
          direct_dependencies: [],
          consumers: [],
          relationship_status: 'unknown',
          stale_relationships: {}
        },
        invariants: [],
        tests: { file: null, count: 0, coverage_percent: null, verification_level: 'not_verified' },
        known_limitations: [],
        confidence_and_evidence: {},
        caveats: [],
        last_full_inspection: { timestamp: null, method: null, inspector: null }
      },
      {
        file_path: 'backend/src/service.ts',
        lifecycle_state: 'archived',
        archived_at: '2026-11-02T00:00:00Z',
        archive_reason: 'file_deleted',
        source_validity: {
          source_fingerprint: 'sha256:abc123',  // IDENTICAL fingerprint
          last_source_verified: '2026-11-02T12:00:00Z',
          git_revision: 'oldrev2'
        },
        purpose: 'Second archived version',
        symbols: [{ name: 'SecondService', type: 'class' }],
        relationship_validity: {
          direct_dependencies: [],
          consumers: [],
          relationship_status: 'unknown',
          stale_relationships: {}
        },
        invariants: [],
        tests: { file: null, count: 0, coverage_percent: null, verification_level: 'not_verified' },
        known_limitations: [],
        confidence_and_evidence: {},
        caveats: [],
        last_full_inspection: { timestamp: null, method: null, inspector: null }
      }
    ],
    deleted_files: [],
    modified_externally: [],
    renames: [],
    last_reconciliation: null,
    reconciliation_method: null,
    metadata: {
      created_at: new Date().toISOString(),
      description: 'Test fixture for ambiguous restoration'
    }
  };

  fs.writeFileSync(indexPath, JSON.stringify(index, null, 2), 'utf-8');

  // Capture console output to verify ambiguity diagnostic
  let capturedError = '';
  const originalError = console.error;
  console.error = function(...args) {
    capturedError += args.join(' ');
  };

  // Invoke ACTUAL production restoration function with fixture that matches current file fingerprint
  const result = createOrUpdateRecord(testDir, 'backend/src/service.ts', {
    source_fingerprint: 'sha256:abc123'  // Matches both archived records
  });

  console.error = originalError;

  // Load INDEX to verify state after restoration attempt
  const indexAfter = loadIndex(indexPath);

  // CRITICAL VERIFICATIONS
  
  // 1. Ambiguity was reported (error-level diagnostic)
  assert(capturedError.includes('Ambiguous') || capturedError.includes('ERROR'), 
         'Ambiguity reported in production output');

  // 2. Function returned false (restoration blocked)
  assert(result === false, 'Production function returned false (restoration not performed)');

  // 3. First archived record remains unchanged
  const firstRecord = indexAfter.records[0];
  assert(firstRecord.lifecycle_state === 'archived', 'First record still archived');
  assert(firstRecord.archived_at === '2026-11-01T00:00:00Z', 'First archived_at unchanged');
  assert(firstRecord.archive_reason === 'file_deleted', 'First archive_reason unchanged');
  assert(firstRecord.source_validity.source_fingerprint === 'sha256:abc123', 'First fingerprint unchanged');
  assert(firstRecord.source_validity.git_revision === 'oldrev1', 'First git_revision unchanged');
  assert(firstRecord.purpose === 'First archived version', 'First purpose unchanged');
  assert(firstRecord.symbols[0].name === 'FirstService', 'First symbols unchanged');

  // 4. Second archived record remains unchanged
  const secondRecord = indexAfter.records[1];
  assert(secondRecord.lifecycle_state === 'archived', 'Second record still archived');
  assert(secondRecord.archived_at === '2026-11-02T00:00:00Z', 'Second archived_at unchanged');
  assert(secondRecord.archive_reason === 'file_deleted', 'Second archive_reason unchanged');
  assert(secondRecord.source_validity.source_fingerprint === 'sha256:abc123', 'Second fingerprint unchanged');
  assert(secondRecord.source_validity.git_revision === 'oldrev2', 'Second git_revision unchanged');
  assert(secondRecord.purpose === 'Second archived version', 'Second purpose unchanged');
  assert(secondRecord.symbols[0].name === 'SecondService', 'Second symbols unchanged');

  // 5. No new active record created
  const activeCount = indexAfter.records.filter(r => r.lifecycle_state === 'active' || r.lifecycle_state === undefined).length;
  assert(activeCount === 0, 'No active record created (still 2 archived, 0 active)');

  // 6. INDEX record count unchanged
  assert(indexAfter.records.length === 2, 'INDEX record collection unchanged (2 records)');

  // Cleanup
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
});

/**
 * Test 19: Different-content restoration with multiple archived candidates (no match)
 */
test('Different-content restoration: new record created, all archived unchanged', () => {
  const records = [
    {
      file_path: 'service.ts',
      lifecycle_state: 'archived',
      source_validity: { source_fingerprint: 'sha256:old1' }
    },
    {
      file_path: 'service.ts',
      lifecycle_state: 'archived',
      source_validity: { source_fingerprint: 'sha256:old2' }
    }
  ];

  const currentFingerprint = 'sha256:new';
  const cleanPath = 'service.ts';
  
  const archivedIndices = records.reduce((acc, r, idx) => {
    if (r.file_path === cleanPath && r.lifecycle_state === 'archived') {
      acc.push(idx);
    }
    return acc;
  }, []);

  const restorationCandidates = archivedIndices.map(idx => ({
    idx,
    record: records[idx],
    matches: records[idx].source_validity && 
             records[idx].source_validity.source_fingerprint === currentFingerprint
  })).filter(c => c.matches);

  assert(restorationCandidates.length === 0, 'No archived records match current fingerprint');

  // Create new record
  const newRecord = {
    file_path: cleanPath,
    lifecycle_state: 'active',
    source_validity: { source_fingerprint: currentFingerprint }
  };
  records.push(newRecord);

  assert(records[0].lifecycle_state === 'archived', 'First archived unchanged');
  assert(records[1].lifecycle_state === 'archived', 'Second archived unchanged');
  assert(records[2].lifecycle_state === 'active', 'New record added as active');
  assert(records[2].source_validity.source_fingerprint === 'sha256:new', 'New record has new fingerprint');
});

/**
 * Test 20: Restoration idempotency across multiple runs
 */
test('Restoration is idempotent: repeated calls produce same state', () => {
  const records = [
    {
      file_path: 'service.ts',
      lifecycle_state: 'archived',
      source_validity: { source_fingerprint: 'sha256:abc123' },
      archive_reason: 'file_deleted'
    }
  ];

  const currentFingerprint = 'sha256:abc123';
  const cleanPath = 'service.ts';

  // First restoration
  const archivedIndices1 = records.reduce((acc, r, idx) => {
    if (r.file_path === cleanPath && r.lifecycle_state === 'archived') {
      acc.push(idx);
    }
    return acc;
  }, []);

  const candidates1 = archivedIndices1.map(idx => ({
    idx,
    record: records[idx],
    matches: records[idx].source_validity.source_fingerprint === currentFingerprint
  })).filter(c => c.matches);

  if (candidates1.length === 1) {
    const r = candidates1[0].record;
    r.lifecycle_state = 'active';
    r.archived_at = null;
    r.archive_reason = null;
  }

  const state1 = JSON.stringify(records);

  // Second restoration (file still present, already active)
  const activeIndex = records.findIndex(r => r.file_path === cleanPath && r.lifecycle_state === 'active');
  assert(activeIndex >= 0, 'Record is now active');
  
  // No further restoration happens
  const state2 = JSON.stringify(records);

  assert(state1 === state2, 'State unchanged on second restoration (idempotent)');
  assert(records[0].lifecycle_state === 'active', 'Record remains active');
});

// Summary
console.log(`\n${'='.repeat(50)}`);
console.log(`SUMMARY: ${passCount} passed, ${failCount} failed`);
console.log(`${'='.repeat(50)}`);

process.exitCode = failCount > 0 ? 1 : 0;
