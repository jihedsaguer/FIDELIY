#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..', '..');
const indexPath = path.join(projectRoot, '.kiro', 'memory', 'INDEX.json');
const memoryDir = path.dirname(indexPath);

// Load pilot records from individual files
const recordFiles = [
  'backend-src-shared-database-tenant-context-service.ts.memory.json',
  'backend-src-shared-guards-customer-guard.ts.memory.json'
];

const records = [];
for (const file of recordFiles) {
  const filePath = path.join(memoryDir, file);
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    records.push(JSON.parse(content));
    console.log(`[OK] Loaded: ${file}`);
  } catch (error) {
    console.error(`[ERROR] Failed to load ${file}: ${error.message}`);
  }
}

// Create INDEX
const index = {
  version: '1.0',
  schema_version: 'corrected_specification_v1',
  records: records,
  deleted_files: [],
  modified_externally: [],
  renames: [],
  last_reconciliation: new Date().toISOString(),
  reconciliation_method: 'pilot_populate',
  metadata: {
    created_at: new Date().toISOString(),
    description: 'FIDELIY Repository Memory Foundation - Master catalog of all file-level memory records'
  }
};

fs.writeFileSync(indexPath, JSON.stringify(index, null, 2), 'utf-8');
console.log(`\n[OK] INDEX.json populated with ${records.length} records`);
