#!/usr/bin/env node

/**
 * Load pilot memory records into INDEX.json
 * Used for Milestone A pilot demonstration.
 */

const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..', '..');
const indexPath = path.join(projectRoot, '.kiro', 'memory', 'INDEX.json');
const memoryDir = path.dirname(indexPath);

// Load pilot records
const pilotRecords = [
  'backend-src-shared-database-tenant-context-service.ts.memory.json',
  'backend-src-shared-guards-customer-guard.ts.memory.json'
];

try {
  const index = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
  
  for (const recordFile of pilotRecords) {
    const recordPath = path.join(memoryDir, recordFile);
    const record = JSON.parse(fs.readFileSync(recordPath, 'utf-8'));
    
    // Check if already in index
    const exists = index.records.some(r => r.file_path === record.file_path);
    if (!exists) {
      index.records.push(record);
      console.log(`[OK] Added: ${record.file_path}`);
    } else {
      console.log(`[SKIP] Already in index: ${record.file_path}`);
    }
  }
  
  // Update timestamp
  index.last_reconciliation = new Date().toISOString();
  index.reconciliation_method = 'pilot_load';
  
  fs.writeFileSync(indexPath, JSON.stringify(index, null, 2), 'utf-8');
  console.log(`\n[OK] INDEX.json updated with ${index.records.length} records`);
  process.exitCode = 0;
} catch (error) {
  console.error(`[ERROR] Failed to load pilot records: ${error.message}`);
  process.exitCode = 1;
}
