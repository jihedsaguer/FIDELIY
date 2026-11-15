# Phase 2: Backend Configuration Format Fixes

## Summary

Successfully fixed the configuration format inconsistency in the backend by ensuring all programme endpoints return the **object format** for the `configurations` field.

## Problem Identified

The backend was returning different formats for the `configurations` field:

- **`listPrograms`** and **`getProgram`**: Returned **object format** `{stamps: {...}, points: {...}}`
- **`getCurrent`** and **`getHistory`**: Returned **array format** `[{type: 'stamps', settings: {...}}, {type: 'points', settings: {...}}]`

This inconsistency was causing type mismatches on the frontend, where the `ProgramDto` type expected object format.

## Root Cause

The service methods `getCurrent()` and `getHistory()` were returning `ProgramRecord` directly without applying the `mapToResponseDto()` transformation, which converts the array format to object format.

## Changes Made

### 1. Service Layer (programs.service.ts)

Updated all programme retrieval methods to return `ProgramResponseDto` and use `mapToResponseDto()`:

- **`getCurrent()`**: Now returns `Promise<ProgramResponseDto | null>` and applies `mapToResponseDto()`
- **`getHistory()`**: Now returns `Promise<ProgramResponseDto[]>` and maps each record with `mapToResponseDto()`
- **`createInitial()`**: Now returns `Promise<ProgramResponseDto>` and applies `mapToResponseDto()`
- **`createVersion()`**: Now returns `Promise<ProgramResponseDto>` and applies `mapToResponseDto()`
- **`createEnhanced()`**: Updated to use the new return type from `createVersion()`

### 2. Controller Layer (programs.controller.ts)

Added proper return type annotations to all controller methods:

- **`getCurrent()`**: `Promise<ProgramResponseDto | null>`
- **`getHistory()`**: `Promise<ProgramResponseDto[]>`
- **`createInitial()`**: `Promise<ProgramResponseDto>`
- **`createVersion()`**: `Promise<ProgramResponseDto>`

### 3. Database Migration

Applied migration to add missing `name` and `description` columns to the `programs` table:

```sql
ALTER TABLE "programs" ADD COLUMN "name" VARCHAR(255);
ALTER TABLE "programs" ADD COLUMN "description" VARCHAR(1000);
```

This enables full support for the enhanced programme DTOs.

## Verification

All programme endpoints now return consistent object format for configurations:

### Example Response (listPrograms):
```json
{
  "programs": [
    {
      "id": "...",
      "businessId": "...",
      "name": null,
      "description": null,
      "type": "stamps",
      "version": 5,
      "status": "active",
      "activatedAt": "2026-11-15T16:17:58.446Z",
      "deactivatedAt": null,
      "createdAt": "2026-11-15T16:17:58.446Z",
      "configurations": {
        "stamps": {
          "rewardThresholds": [{"name": "Free Coffee", "isActive": true, "stampsRequired": 10}],
          "purchasesPerStamp": 5
        },
        "points": {}
      }
    }
  ],
  "total": 5
}
```

### Example Response (getHistory):
```json
[
  {
    "id": "...",
    "businessId": "...",
    "name": null,
    "description": null,
    "type": "both",
    "version": 4,
    "status": "inactive",
    "activatedAt": "2026-11-15T15:44:54.154Z",
    "deactivatedAt": "2026-11-15T15:46:19.469Z",
    "createdAt": "2026-11-15T15:44:54.154Z",
    "configurations": {
      "stamps": {"earningRule": {...}, "rewardThresholds": [...], "stampExpirationDays": 30},
      "points": {"earningRule": {...}, "rewardThresholds": [...], "pointsExpirationDays": 60}
    }
  }
]
```

## Files Modified

1. **backend/src/features/programs/programs.service.ts**
   - Updated `getCurrent()` to return `ProgramResponseDto | null`
   - Updated `getHistory()` to return `ProgramResponseDto[]`
   - Updated `createInitial()` to return `ProgramResponseDto`
   - Updated `createVersion()` to return `ProgramResponseDto`
   - Updated `createEnhanced()` to use the new return type

2. **backend/src/features/programs/programs.controller.ts**
   - Added return type annotations to `getCurrent()`, `getHistory()`, `createInitial()`, `createVersion()`

3. **Database**
   - Added `name` and `description` columns to `programs` table

## Impact

- ✅ All programme endpoints now return consistent object format for configurations
- ✅ Frontend `ProgramDto` type is now compatible with all backend responses
- ✅ No more type mismatches between frontend and backend
- ✅ Enhanced programme creation now works with name and description fields

## Next Steps

Proceed to Phase 2 frontend alignment and Phase 3 UI refinement.
