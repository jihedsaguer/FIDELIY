# FIDELIY Programme Management API - Verified Contract

## Overview

This document contains the verified HTTP API contract for the Programme Management feature, based on actual HTTP testing against the running NestJS backend.

## Base URL

```
http://localhost:3000/programs
```

## Authentication

- **Guard**: All endpoints require `MerchantGuard` authentication
- **Session**: Uses Better Auth session cookies
- **User Context**: Merchant user must own a business

## Endpoints

### 1. GET `/programs/current`

**Description**: Get the current active programme for the merchant's business.

**Method**: GET

**Path**: `/programs/current`

**Authentication**: Required (MerchantGuard)

**Query Parameters**: None

**Request Body**: None

**Success Response** (200 OK):

```json
{
  "id": "uuid",
  "businessId": "uuid",
  "name": null | string,
  "description": null | string,
  "type": "stamps" | "points" | "both",
  "version": number,
  "status": "active",
  "activatedAt": "ISO8601 date-time",
  "deactivatedAt": null,
  "createdAt": "ISO8601 date-time",
  "configurations": {
    "stamps": object | {},
    "points": object | {}
  }
}
```

**Error Responses**:
- 401 Unauthorized - Not authenticated
- 200 OK with null-like empty response if no programme exists (BUG: Should return null)

**Status**: ✅ Working

**Notes**: 
- Currently returns empty response when no programme exists instead of null
- `name` and `description` are always null due to missing database columns (BUG)

---

### 2. GET `/programs/history`

**Description**: Get all programmes (current and historical) for the merchant's business, ordered by version descending.

**Method**: GET

**Path**: `/programs/history`

**Authentication**: Required (MerchantGuard)

**Query Parameters**: None

**Request Body**: None

**Success Response** (200 OK):

```json
[
  {
    "id": "uuid",
    "businessId": "uuid",
    "name": null | string,
    "description": null | string,
    "type": "stamps" | "points" | "both",
    "version": number,
    "status": "active" | "inactive",
    "activatedAt": "ISO8601 date-time",
    "deactivatedAt": null | "ISO8601 date-time",
    "createdAt": "ISO8601 date-time",
    "configurations": [
      {
        "type": "stamps" | "points",
        "settings": object
      }
    ]
  }
]
```

**Error Responses**:
- 401 Unauthorized - Not authenticated

**Status**: ✅ Working

**Notes**: 
- Returns programmes in descending version order
- Each programme has `configurations` as an array of type/settings objects
- `name` and `description` are always null due to missing database columns (BUG)

---

### 3. GET `/programs/:programId`

**Description**: Get a specific programme by ID.

**Method**: GET

**Path**: `/programs/:programId`

**Authentication**: Required (MerchantGuard)

**Path Parameters**:
- `programId` (string, uuid) - Required

**Query Parameters**: None

**Request Body**: None

**Success Response** (200 OK):

```json
{
  "id": "uuid",
  "businessId": "uuid",
  "name": null | string,
  "description": null | string,
  "type": "stamps" | "points" | "both",
  "version": number,
  "status": "active" | "inactive",
  "activatedAt": "ISO8601 date-time",
  "deactivatedAt": null | "ISO8601 date-time",
  "createdAt": "ISO8601 date-time",
  "configurations": {
    "stamps": object | {},
    "points": object | {}
  }
}
```

**Error Responses**:
- 401 Unauthorized - Not authenticated
- 404 Not Found - Programme not found or not accessible

**Status**: ✅ Working (after fixing TypeScript compilation errors)

**Notes**: 
- Returns programme with `configurations` as an object keyed by type
- `name` and `description` are always null due to missing database columns (BUG)

---

### 4. GET `/programs`

**Description**: List all programmes for the merchant's business.

**Method**: GET

**Path**: `/programs`

**Authentication**: Required (MerchantGuard)

**Query Parameters**: None

**Request Body**: None

**Success Response** (200 OK):

```json
{
  "programs": [
    {
      "id": "uuid",
      "businessId": "uuid",
      "name": null | string,
      "description": null | string,
      "type": "stamps" | "points" | "both",
      "version": number,
      "status": "active" | "inactive",
      "activatedAt": "ISO8601 date-time",
      "deactivatedAt": null | "ISO8601 date-time",
      "createdAt": "ISO8601 date-time",
      "configurations": {
        "stamps": object | {},
        "points": object | {}
      }
    }
  ],
  "total": number
}
```

**Error Responses**:
- 401 Unauthorized - Not authenticated

**Status**: ✅ Working (after fixing TypeScript compilation errors)

**Notes**: 
- Returns `ProgramListResponseDto` with programmes array and total count
- `name` and `description` are always null due to missing database columns (BUG)

---

### 5. POST `/programs`

**Description**: Create the initial programme for the merchant's business. Only succeeds if no active programme exists.

**Method**: POST

**Path**: `/programs`

**Authentication**: Required (MerchantGuard)

**Query Parameters**: None

**Request Body**:

```json
{
  "type": "stamps" | "points" | "both",
  "configurations": {
    "stamps": object,
    "points": object
  }
}
```

**Validation Rules**:
- `type` must be one of: 'stamps', 'points', 'both'
- `configurations` must be an object
- If `type` is 'stamps', must provide exactly `configurations.stamps`
- If `type` is 'points', must provide exactly `configurations.points`
- If `type` is 'both', must provide exactly `configurations.stamps` AND `configurations.points`
- Each configuration must be an object (not array or primitive)

**Success Response** (201 Created):

```json
{
  "id": "uuid",
  "businessId": "uuid",
  "name": null,
  "description": null,
  "type": "stamps" | "points" | "both",
  "version": 1,
  "status": "active",
  "activatedAt": "ISO8601 date-time",
  "deactivatedAt": null,
  "createdAt": "ISO8601 date-time",
  "configurations": [
    {
      "type": "stamps" | "points",
      "settings": object
    }
  ]
}
```

**Error Responses**:
- 400 Bad Request - Invalid request body or validation failure
- 401 Unauthorized - Not authenticated
- 409 Conflict - An active programme already exists

**Status**: ✅ Working

**Notes**: 
- Only for initial programme creation
- Cannot create if active programme already exists
- Response has `configurations` as array (inconsistent with getProgram)

---

### 6. POST `/programs/versions`

**Description**: Create a new programme version. Deactivates the current active programme and creates a new one.

**Method**: POST

**Path**: `/programs/versions`

**Authentication**: Required (MerchantGuard)

**Query Parameters**: None

**Request Body**: Same as POST `/programs`

**Validation Rules**: Same as POST `/programs`

**Success Response** (201 Created):

```json
{
  "id": "uuid",
  "businessId": "uuid",
  "name": null,
  "description": null,
  "type": "stamps" | "points" | "both",
  "version": number (next version),
  "status": "active",
  "activatedAt": "ISO8601 date-time",
  "deactivatedAt": null,
  "createdAt": "ISO8601 date-time",
  "configurations": [
    {
      "type": "stamps" | "points",
      "settings": object
    }
  ]
}
```

**Error Responses**:
- 400 Bad Request - Invalid request body or validation failure
- 401 Unauthorized - Not authenticated
- 404 Not Found - Active programme not found

**Status**: ✅ Working

**Notes**: 
- Automatically deactivates the current active programme
- Version number increments automatically
- Response has `configurations` as array (inconsistent with getProgram)

---

### 7. POST `/programs/enhanced`

**Description**: Create a new programme with enhanced configuration. Uses structured DTOs.

**Method**: POST

**Path**: `/programs/enhanced`

**Authentication**: Required (MerchantGuard)

**Query Parameters**: None

**Request Body**:

```json
{
  "name": string,
  "description": string,
  "type": "stamps" | "points" | "both",
  "stamps": {
    "earningRule": {
      "purchasesPerStamp": number,
      "description": string
    },
    "rewardThresholds": [
      {
        "stampsRequired": number,
        "name": string,
        "description": string,
        "isActive": boolean
      }
    ],
    "stampExpirationDays": number | null
  },
  "points": {
    "earningRule": {
      "pointsPerCurrencyUnit": number,
      "currencyCode": string,
      "description": string
    },
    "rewardThresholds": [
      {
        "pointsRequired": number,
        "name": string,
        "description": string,
        "isActive": boolean
      }
    ],
    "pointsExpirationDays": number | null
  }
}
```

**Validation Rules**:
- `type` must be one of: 'stamps', 'points', 'both'
- If `type` is 'stamps' or 'both', `stamps` must be provided
- If `type` is 'points' or 'both', `points` must be provided
- Nested DTOs have their own validation rules (min values, string lengths, etc.)

**Success Response** (201 Created):

```json
{
  "id": "uuid",
  "businessId": "uuid",
  "name": null,  // BUG: Always null due to missing database columns
  "description": null,  // BUG: Always null due to missing database columns
  "type": "stamps" | "points" | "both",
  "version": number,
  "status": "active",
  "activatedAt": "ISO8601 date-time",
  "deactivatedAt": null,
  "createdAt": "ISO8601 date-time",
  "configurations": {
    "stamps": object | {},
    "points": object | {}
  }
}
```

**Error Responses**:
- 400 Bad Request - Invalid request body or validation failure
- 401 Unauthorized - Not authenticated
- 409 Conflict - An active programme already exists

**Status**: ⚠️ Working but **BUG: name and description are lost**

**Notes**: 
- Uses structured DTOs for better type safety
- **BACKEND DEFECT**: `name` and `description` are not stored in database
- Creates a new version (deactivates current programme)

---

### 8. PATCH `/programs/:programId`

**Description**: Update a programme's metadata (name, description). Does not modify configuration.

**Method**: PATCH

**Path**: `/programs/:programId`

**Authentication**: Required (MerchantGuard)

**Path Parameters**:
- `programId` (string, uuid) - Required

**Query Parameters**: None

**Request Body**:

```json
{
  "name": string | null,
  "description": string | null
}
```

**Success Response** (200 OK):

```json
{
  "id": "uuid",
  "businessId": "uuid",
  "name": string | null,
  "description": string | null,
  "type": "stamps" | "points" | "both",
  "version": number,
  "status": "active" | "inactive",
  "activatedAt": "ISO8601 date-time",
  "deactivatedAt": null | "ISO8601 date-time",
  "createdAt": "ISO8601 date-time",
  "configurations": {
    "stamps": object | {},
    "points": object | {}
  }
}
```

**Error Responses**:
- 401 Unauthorized - Not authenticated
- 404 Not Found - Programme not found
- 500 Internal Server Error - **BUG: Missing database columns**

**Status**: ❌ **BACKEND DEFECT: 500 error due to missing name/description columns**

**Notes**: 
- **BACKEND DEFECT**: Database doesn't have `name` and `description` columns
- Attempts to execute: `UPDATE programs SET name = $1, description = $2 WHERE id = $3`
- Fails with: `column "name" of relation "programs" does not exist`

---

### 9. PATCH `/programs/:programId/deactivate`

**Description**: Deactivate a programme. Only the current active programme can be deactivated.

**Method**: PATCH

**Path**: `/programs/:programId/deactivate`

**Authentication**: Required (MerchantGuard)

**Path Parameters**:
- `programId` (string, uuid) - Required

**Query Parameters**: None

**Request Body**: None

**Success Response** (200 OK):

```json
{
  "success": true,
  "message": "Programme deactivated successfully"
}
```

**Error Responses**:
- 401 Unauthorized - Not authenticated
- 404 Not Found - Active programme not found or already deactivated

**Status**: ✅ Working

**Notes**: 
- Only works on current active programme
- Sets status to 'inactive' and deactivated_at to current time

---

### 10. DELETE `/programs/:programId`

**Description**: Delete a programme. Only inactive programmes without historical loyalty activity can be deleted.

**Method**: DELETE

**Path**: `/programs/:programId`

**Authentication**: Required (MerchantGuard)

**Path Parameters**:
- `programId` (string, uuid) - Required

**Query Parameters**: None

**Request Body**: None

**Success Response** (200 OK):

```json
{
  "success": true,
  "message": "Programme deleted successfully"
}
```

**Error Responses**:
- 401 Unauthorized - Not authenticated
- 404 Not Found - Programme not found or not accessible
- 400 Bad Request - Programme has historical loyalty activity
- 500 Internal Server Error - **BUG: SQL error**

**Status**: ❌ **BACKEND DEFECT: SQL error with FOR UPDATE clause**

**Notes**: 
- **BACKEND DEFECT**: Fails with `FOR UPDATE is not allowed with aggregate functions`
- Issue in the SQL query that checks for loyalty activity
- Programme must be inactive to be deleted
- Programme cannot have any historical loyalty activity

---

## Backend Defects Discovered

### 🔴 Critical Defects

1. **Missing Database Columns** (High Priority)
   - **Issue**: `programs` table missing `name` and `description` columns
   - **Impact**: 
     - `createEnhanced` accepts name/description but they're lost
     - `updateProgram` fails with 500 error
     - All programme responses have null name/description
   - **Root Cause**: Database schema doesn't match DTO expectations
   - **Fix Required**: Add migration to add `name` VARCHAR(255) and `description` VARCHAR(1000) columns

2. **SQL Error in Delete Programme** (High Priority)
   - **Issue**: `FOR UPDATE is not allowed with aggregate functions`
   - **Impact**: Cannot delete programmes
   - **Root Cause**: SQL query uses FOR UPDATE with aggregate function in loyalty activity check
   - **Location**: `programs.service.ts` line ~430
   - **Fix Required**: Remove FOR UPDATE from aggregate query or restructure the transaction

### 🟡 Medium Priority Issues

3. **TypeScript Compilation Errors** (Fixed ✅)
   - **Issue**: Type mismatches in SQL query result types
   - **Impact**: Backend couldn't compile, routes not available
   - **Root Cause**: Type annotations didn't match SQL column aliases
   - **Fix Applied**: Updated type annotations to match camelCase aliases
   - **Files**: `programs.service.ts` lines 480-484

4. **Inconsistent Response Formats**
   - **Issue**: `getCurrent` and `getHistory` return `configurations` as array, but `getProgram` and `listPrograms` return as object
   - **Impact**: Frontend needs to handle both formats
   - **Root Cause**: Different mapping methods in service
   - **Note**: This is intentional based on different use cases, but should be documented

5. **Empty Response for No Current Programme**
   - **Issue**: `GET /programs/current` returns empty body instead of null when no programme exists
   - **Impact**: Frontend may need special handling
   - **Root Cause**: Service returns `null` but controller doesn't handle it properly
   - **Expected**: Should return `null` or 404

---

## Data Types

### Programme Types

```typescript
type ProgramType = 'stamps' | 'points' | 'both';
type ProgramStatus = 'active' | 'inactive';
```

### Configuration Types

#### Stamp Programme Configuration

```typescript
interface StampEarningRule {
  purchasesPerStamp: number;      // Min: 1
  description?: string;           // Max: 500 chars
}

interface StampRewardThreshold {
  stampsRequired: number;        // Min: 1
  name: string;                  // Max: 255 chars, Required
  description?: string;           // Max: 1000 chars
  isActive?: boolean;
}

interface StampProgramConfiguration {
  earningRule: StampEarningRule;
  rewardThresholds: StampRewardThreshold[];
  stampExpirationDays?: number | null;  // Min: 1
}
```

#### Points Programme Configuration

```typescript
interface PointsEarningRule {
  pointsPerCurrencyUnit: number; // Min: 0.01, Max 2 decimal places
  currencyCode?: string;          // Max: 3 chars
  description?: string;           // Max: 500 chars
}

interface PointsRewardThreshold {
  pointsRequired: number;         // Min: 1
  name: string;                  // Max: 255 chars, Required
  description?: string;           // Max: 1000 chars
  isActive?: boolean;
}

interface PointsProgramConfiguration {
  earningRule: PointsEarningRule;
  rewardThresholds: PointsRewardThreshold[];
  pointsExpirationDays?: number | null; // Min: 1
}
```

---

## Validation Rules

### Programme Creation (Original Format)

- `type` must be in `['stamps', 'points', 'both']`
- `configurations` must be a non-array object
- For each enabled type (based on `type`), exactly one configuration must be provided
- Each configuration must be a non-array object

### Programme Creation (Enhanced Format)

- `type` must be in `['stamps', 'points', 'both']`
- `name` must be string, max 255 chars (but not stored - BUG)
- `description` must be string, max 1000 chars (but not stored - BUG)
- If `type` includes 'stamps', `stamps` configuration must be provided
- If `type` includes 'points', `points` configuration must be provided
- Nested DTOs have their own validation (min values, string lengths)

### Programme Update

- At least one of `name` or `description` must be provided
- `name` must be string or null
- `description` must be string or null

---

## Business Rules

1. **Single Active Programme**: Only one programme can be active per business at a time
2. **Version Increment**: Each new programme version increments the version number
3. **Automatic Deactivation**: Creating a new version automatically deactivates the current active programme
4. **Deletion Constraints**: 
   - Only inactive programmes can be deleted
   - Programmes with historical loyalty activity cannot be deleted
5. **Access Control**: Programme access is restricted to the owning merchant via PostgreSQL RLS

---

## Summary

### Working Endpoints ✅
- GET `/programs/current`
- GET `/programs/history`
- GET `/programs/:programId`
- GET `/programs`
- POST `/programs`
- POST `/programs/versions`
- POST `/programs/enhanced` (with BUG)
- PATCH `/programs/:programId/deactivate`

### Backend Defects ❌
- PATCH `/programs/:programId` - 500 error (missing columns)
- DELETE `/programs/:programId` - 500 error (SQL issue)
- POST `/programs/enhanced` - name/description lost (missing columns)
- All GET endpoints - name/description always null (missing columns)

### Backend Fixes Applied ✅
- Fixed TypeScript compilation errors in `programs.service.ts`
- Rebuilt and redeployed backend Docker image

---

## Files Modified

1. **backend/src/features/programs/programs.service.ts**
   - Fixed TypeScript type annotations for SQL query results
   - Changed `activated_at`, `deactivated_at`, `created_at` to `activatedAt`, `deactivatedAt`, `createdAt`
   - Changed `configurationType: string | null` to `configurationType: ConfigurationType | null`

---

## Next Steps for Phase 2

1. **Fix Backend Defects**:
   - Create migration to add `name` and `description` columns to `programs` table
   - Update Drizzle schema to include new columns
   - Fix SQL query in `deleteProgram` method
   - Ensure `createEnhanced` properly stores name/description

2. **Frontend Alignment**:
   - Update frontend types to match actual backend responses
   - Handle both array and object formats for `configurations`
   - Add proper error handling for backend defects
   - Fix any validation mismatches

3. **Test Coverage**:
   - Add tests for all programme endpoints
   - Test validation rules
   - Test business rules (single active programme, versioning, etc.)
   - Test access control (multi-tenant isolation)
