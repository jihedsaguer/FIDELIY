# Phase 2: Frontend/Backend Contract Comparison

## Objective

Compare the frontend programme implementation with the verified backend contract to identify:
1. Type mismatches
2. Request/response format differences
3. Root causes of 400 Bad Request errors
4. Required alignment changes

---

## 1. Type Definitions Comparison

### Backend DTOs

#### ProgramConfigurationDto (Original Format)
```typescript
// File: backend/src/features/programs/dto/program-configuration.dto.ts

export type ProgramType = 'stamps' | 'points' | 'both';

export class ProgramConfigurationDto {
  @IsDefined()
  @IsIn(PROGRAM_TYPES)
  type!: ProgramType;

  @IsDefined()
  @IsObject()
  configurations!: Partial<
    Record<ConfigurationType, Record<string, unknown>>
  >;
}
```

#### ProgramConfigurationV2Dto (Enhanced Format)
```typescript
// File: backend/src/features/programs/dto/program-configuration-v2.dto.ts

export class ProgramConfigurationV2Dto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsDefined()
  @IsIn(PROGRAM_TYPES)
  type!: ProgramType;

  @ValidateIf((o) => o.type === 'stamps' || o.type === 'both')
  @ValidateNested()
  @Type(() => StampProgramConfigurationDto)
  stamps?: StampProgramConfigurationDto;

  @ValidateIf((o) => o.type === 'points' || o.type === 'both')
  @ValidateNested()
  @Type(() => PointsProgramConfigurationDto)
  points?: PointsProgramConfigurationDto;
}
```

#### ProgramResponseDto
```typescript
export class ProgramResponseDto {
  id!: string;
  businessId!: string;
  name!: string | null;
  description!: string | null;
  type!: ProgramType;
  version!: number;
  status!: 'active' | 'inactive';
  activatedAt!: Date;
  deactivatedAt!: Date | null;
  createdAt!: Date;
  configurations!: Record<ConfigurationType, Record<string, unknown>>;
}
```

#### ProgramListResponseDto
```typescript
export class ProgramListResponseDto {
  programs!: ProgramResponseDto[];
  total!: number;
}
```

---

### Frontend Types

#### ProgramDto
```typescript
// File: frontend/src/features/merchant/api/programApi.ts

export interface ProgramDto {
  id: string;
  businessId: string;
  name: string | null;
  description: string | null;
  type: ProgramType;  // 'stamps' | 'points' | 'both'
  version: number;
  status: ProgramStatus;  // 'active' | 'inactive'
  activatedAt: string;  // ⚠️ string vs Date
  deactivatedAt: string | null;  // ⚠️ string vs Date
  createdAt: string;  // ⚠️ string vs Date
  configurations: Record<string, Record<string, unknown>>;  // ⚠️ string vs ConfigurationType
}
```

#### ProgramConfigurationRequest
```typescript
export interface ProgramConfigurationRequest {
  type: ProgramType;
  configurations: Record<string, Record<string, unknown>>;  // ⚠️ string vs ConfigurationType
}
```

#### EnhancedProgramConfigurationRequest
```typescript
export interface EnhancedProgramConfigurationRequest {
  name?: string;
  description?: string;
  type: ProgramType;
  stamps?: {
    earningRule: { purchasesPerStamp: number; description?: string };
    rewardThresholds: Array<{
      stampsRequired: number;
      name: string;
      description?: string;
      isActive?: boolean;
    }>;
    stampExpirationDays?: number | null;
  };
  points?: {
    earningRule: { pointsPerCurrency: number; currencyCode?: string; description?: string };
    rewardThresholds: Array<{
      pointsRequired: number;
      name: string;
      description?: string;
      isActive?: boolean;
    }>;
    pointsExpirationDays?: number | null;
  };
}
```

---

## 2. Type Mismatches Analysis

### 🟡 MINOR MISMATCHES (Non-Breaking)

#### Mismatch #1: Date vs String

**Backend**: Uses `Date` objects in DTOs
**Frontend**: Uses `string` for date fields

**Impact**: ✅ NON-BREAKING
- JSON serialization automatically converts Date to ISO string
- Frontend receives strings, which is standard for JSON APIs
- No action required

**Example**:
```typescript
// Backend DTO: activatedAt: Date
// JSON response: "activatedAt": "2026-11-15T15:12:02.355Z"  // String
// Frontend type: activatedAt: string
// ✅ Compatible
```

#### Mismatch #2: ConfigurationType vs string

**Backend**: `configurations: Record<ConfigurationType, ...>` where ConfigurationType = 'stamps' | 'points'
**Frontend**: `configurations: Record<string, ...>`

**Impact**: ✅ NON-BREAKING
- `Record<string, ...>` is a superset of `Record<ConfigurationType, ...>`
- Frontend can handle any string key, including 'stamps' and 'points'
- No action required

**Example**:
```typescript
// Backend: Record<'stamps' | 'points', ...>
// Frontend: Record<string, ...>
// ✅ Compatible (frontend is more permissive)
```

### ✅ NO MAJOR TYPE MISMATCHES FOUND

The frontend types are generally compatible with backend DTOs. The minor differences (Date vs string, ConfigurationType vs string) are non-breaking and follow standard JSON API conventions.

---

## 3. Request/Response Format Comparison

### POST /programs (Original Format)

**Frontend Request** (from MerchantProgramsPage.tsx):
```typescript
// Uses createInitialProgram mutation
const body: ProgramConfigurationRequest = {
  type: 'stamps',
  configurations: {
    stamps: {
      purchasesPerStamp: 10,
      rewardThresholds: [{ stampsRequired: 10, name: 'Free Coffee', isActive: true }]
    }
  }
};
```

**Backend Expectation**:
```typescript
{
  type: 'stamps',
  configurations: {
    stamps: Record<string, unknown>
  }
}
```

**✅ Compatible** - Frontend request matches backend expectation

### POST /programs/enhanced (Enhanced Format)

**Frontend Request** (from MerchantProgramsPage.tsx):
```typescript
const config: EnhancedProgramConfigurationRequest = {
  name: 'Updated Programme',
  description: 'Test description',
  type: 'stamps',
  stamps: {
    earningRule: {
      purchasesPerStamp: 1,
    },
    rewardThresholds: [
      {
        stampsRequired: 10,
        name: 'Free Coffee',
        isActive: true,
      },
    ],
    stampExpirationDays: null,
  },
};
```

**Backend Expectation** (ProgramConfigurationV2Dto):
```typescript
{
  name?: string;  // optional
  description?: string;  // optional
  type!: ProgramType;
  stamps?: StampProgramConfigurationDto;
  points?: PointsProgramConfigurationDto;
}
```

**✅ Compatible** - Frontend request structure matches backend DTO

**⚠️ WARNING**: Backend will accept name/description but NOT store them (database missing columns). This is a backend defect, not a frontend issue.

### GET /programs responses

**Backend Response** (ProgramResponseDto):
```typescript
{
  id: 'uuid',
  businessId: 'uuid',
  name: null,  // ⚠️ Always null (database issue)
  description: null,  // ⚠️ Always null (database issue)
  type: 'stamps',
  version: 1,
  status: 'active',
  activatedAt: Date,  // JSON: string
  deactivatedAt: null,
  createdAt: Date,  // JSON: string
  configurations: {  // ⚠️ Object format
    stamps: { purchasesPerStamp: 10, rewardThresholds: [...] },
    points: {}
  }
}
```

**Frontend Expectation** (ProgramDto):
```typescript
{
  id: string;
  businessId: string;
  name: string | null;
  description: string | null;
  type: ProgramType;
  version: number;
  status: ProgramStatus;
  activatedAt: string;
  deactivatedAt: string | null;
  createdAt: string;
  configurations: Record<string, Record<string, unknown>>;
}
```

**✅ Compatible** - Frontend types match backend response format

**⚠️ NOTE**: The `configurations` field in `getCurrent` and `getHistory` returns an **array** format, not object format:
```typescript
// getCurrent/getHistory response:
configurations: [
  { type: 'stamps', settings: {...} },
  { type: 'points', settings: {...} }
]

// getProgram/listPrograms response:
configurations: {
  stamps: {...},
  points: {...}
}
```

**🔴 CRITICAL ISSUE**: Frontend expects object format, but some endpoints return array format!

---

## 4. Configuration Format Inconsistency

### The Problem

Different backend endpoints return different formats for the `configurations` field:

#### Array Format (from getCurrent, getHistory):
```json
{
  "configurations": [
    {"type": "stamps", "settings": {"purchasesPerStamp": 10}},
    {"type": "points", "settings": {"pointsPerCurrencyUnit": 1}}
  ]
}
```

#### Object Format (from getProgram, listPrograms):
```json
{
  "configurations": {
    "stamps": {"purchasesPerStamp": 10},
    "points": {"pointsPerCurrencyUnit": 1}
  }
}
```

### Impact on Frontend

The frontend `ProgramDto` expects:
```typescript
configurations: Record<string, Record<string, unknown>>;
```

This type can accept both formats:
- Object format: `{stamps: {...}, points: {...}}` ✅
- Array format: Would be a type error, but TypeScript doesn't validate at runtime

However, **array format is NOT compatible** with `Record<string, Record<string, unknown>>` type.

### Root Cause

Looking at the backend service:

1. **`getCurrent`** calls `programsService.getCurrent()` which returns `ProgramRecord | null`
   - `ProgramRecord.configurations` is `ProgramConfigurationRecord[]` (array)
   - Not transformed to object format

2. **`getHistory`** calls `programsService.getHistory()` which returns `ProgramRecord[]`
   - Each `ProgramRecord.configurations` is an array
   - Not transformed to object format

3. **`getProgram`** calls `programsService.getProgram()` which returns `Promise<ProgramResponseDto>`
   - Uses `mapToResponseDto()` which converts array to object format

4. **`listPrograms`** calls `programsService.listPrograms()` which returns `Promise<ProgramListResponseDto>`
   - Uses `mapToResponseDto()` which converts array to object format

### Frontend Impact

The frontend `ProgramDto` type expects object format, but:
- ✅ `getProgram` returns object format
- ✅ `listPrograms` returns object format  
- ❌ `getCurrent` returns array format
- ❌ `getHistory` returns array format

This means that when the frontend calls `useGetCurrentProgramQuery()` or `useGetProgramHistoryQuery()`, it will receive data with `configurations` as an array, which doesn't match the `ProgramDto` type.

### Severity

**🔴 HIGH**: This is a type mismatch that will cause runtime errors if the frontend tries to access `configurations.stamps` when `configurations` is an array.

### Fix Required

The backend should return consistent format. Two options:

#### Option 1: Always return object format (Recommended)
Update `getCurrent` and `getHistory` to use `mapToResponseDto()`:

```typescript
@Get('current')
getCurrent(@CurrentUser() user: CurrentUserPayload) {
  return this.programsService.getCurrent(user.id).then(program => 
    program ? this.mapToResponseDto(program) : null
  );
}

@Get('history')
getHistory(@CurrentUser() user: CurrentUserPayload) {
  return this.programsService.getHistory(user.id).then(programs =>
    programs.map(this.mapToResponseDto)
  );
}
```

#### Option 2: Update frontend to handle both formats
Update `ProgramDto` type to accept both:

```typescript
export type ProgramConfigurations = 
  | Record<string, Record<string, unknown>>
  | Array<{type: string; settings: Record<string, unknown>}>;

export interface ProgramDto {
  // ... other fields
  configurations: ProgramConfigurations;
}
```

And add runtime checks in frontend code:

```typescript
function getConfigurationsObject(program: ProgramDto): Record<string, Record<string, unknown>> {
  if (Array.isArray(program.configurations)) {
    return program.configurations.reduce((acc, {type, settings}) => {
      acc[type] = settings;
      return acc;
    }, {} as Record<string, Record<string, unknown>>);
  }
  return program.configurations;
}
```

---

## 5. Root Causes of 400 Bad Request Errors

Based on the analysis, here are the potential causes:

### ❌ NOT FOUND: Request format issues

The frontend request formats appear to be correct based on static analysis. The `EnhancedProgramConfigurationRequest` matches the backend `ProgramConfigurationV2Dto` structure.

### ❌ NOT FOUND: Validation errors

The backend DTOs have validation decorators:
- `@IsDefined()` for required fields
- `@IsIn()` for enum values
- `@ValidateIf()` for conditional fields
- `@ValidateNested()` for nested DTOs
- `@Min()`, `@MaxLength()`, etc.

The frontend form values appear to satisfy these constraints:
- `type` is one of 'stamps' | 'points' | 'both' ✅
- `name` is string, max 255 chars ✅
- `description` is string, max 1000 chars ✅
- `purchasesPerStamp` is number, min 1 ✅
- `stampRewardThreshold` is number, min 1 ✅
- `pointsPerCurrency` is number, min 0.01 ✅
- `pointsRewardThreshold` is number, min 1 ✅

### ⚠️ POTENTIAL CAUSE: Missing required fields

The backend `StampEarningRuleDto` has:
```typescript
@IsInt()
@Min(1)
purchasesPerStamp!: number;  // Required (no @IsOptional())
```

If the frontend sends `purchasesPerStamp: 0` or `undefined`, this would cause a 400 error.

**Check**: The frontend form default is `stampPurchasesPerStamp: 1`, and the input has `min={1}`, so this should be OK.

### ⚠️ POTENTIAL CAUSE: TypeScript validation mismatch

Before the TypeScript fixes were applied, the backend wasn't compiling, which means the validation decorators might not have been working correctly. With the fixes applied, validation should work properly.

### ❌ NOT FOUND: GET request issues

The task mentions 400 errors during GET requests. This is unusual because GET requests typically return 404 (Not Found) or 401 (Unauthorized), not 400 (Bad Request).

Possible causes:
1. **Invalid query parameters** - But the endpoints don't use query parameters
2. **Invalid URL format** - But the URLs are hardcoded in the frontend
3. **Validation pipe issues** - The global validation pipe might be rejecting valid requests

### 🔴 MOST LIKELY CAUSE: Configuration format mismatch

If the frontend sends a configuration that doesn't match the expected structure, the backend validation will reject it with 400.

**Example**: If the frontend sends:
```json
{
  "type": "stamps",
  "configurations": {
    "stamps": null  // or undefined or wrong structure
  }
}
```

The backend validation would fail because:
- `@IsDefined()` requires the field to exist
- `@IsObject()` requires it to be an object
- `@ValidateNested()` requires nested DTOs to be valid

### 🔍 INVESTIGATION NEEDED

To find the actual cause of 400 errors:

1. **Check frontend network requests**
   - Inspect actual HTTP requests in browser dev tools
   - Check request body format
   - Check response error messages

2. **Test with Postman/curl**
   - Send requests matching frontend format
   - Check if 400 errors occur
   - Read error messages

3. **Check backend logs**
   - Look for validation error details
   - Check what specific validation is failing

---

## 6. Frontend Implementation Review

### MerchantProgramsPage.tsx Analysis

#### Form State
```typescript
type ProgramFormData = {
  name: string;
  description: string;
  type: 'stamps' | 'points' | 'both';
  stampPurchasesPerStamp: number;
  stampRewardName: string;
  stampRewardThreshold: number;
  stampExpirationDays: number | null;
  pointsPerCurrency: number;
  pointsRewardName: string;
  pointsRewardThreshold: number;
  pointsExpirationDays: number | null;
};
```

**Issues**:
1. **Missing currencyCode**: The backend expects `currencyCode` in `PointsEarningRuleDto`, but the frontend doesn't have this field
2. **Missing earningRule descriptions**: The frontend has `stampRewardName` but not `earningRule.description`

#### Form Submission
```typescript
const config: EnhancedProgramConfigurationRequest = {
  name,
  description: formData.description || undefined,
  type: formData.type,
};

if (formData.type === 'stamps' || formData.type === 'both') {
  config.stamps = {
    earningRule: {
      purchasesPerStamp: formData.stampPurchasesPerStamp,
    },
    rewardThresholds: [
      {
        stampsRequired: formData.stampRewardThreshold,
        name: formData.stampRewardName,
        isActive: true,
      },
    ],
    stampExpirationDays: formData.stampExpirationDays ?? undefined,
  };
}
```

**⚠️ MISSING FIELDS**:
1. `earningRule.description` - Not included in request
2. `rewardThresholds[0].description` - Not included in request
3. `points.earningRule.currencyCode` - Not included in request

### Validation Against Backend DTOs

#### StampEarningRuleDto
```typescript
@IsInt()
@Min(1)
purchasesPerStamp!: number;  // Required

@IsOptional()
@IsString()
@MaxLength(500)
description?: string;
```

**Frontend sends**: `purchasesPerStamp: number` ✅
**Frontend MISSING**: `description` (but it's optional) ✅

#### StampRewardThresholdDto
```typescript
@IsInt()
@Min(1)
stampsRequired!: number;  // Required

@IsString()
@IsNotEmpty()
@MaxLength(255)
name!: string;  // Required

@IsOptional()
@IsString()
@MaxLength(1000)
description?: string;

@IsOptional()
isActive!: boolean;
```

**Frontend sends**: `stampsRequired: number`, `name: string`, `isActive: true` ✅
**Frontend MISSING**: `description` (but it's optional) ✅

#### PointsEarningRuleDto
```typescript
@IsNumber({ maxDecimalPlaces: 2 })
@Min(0.01)
pointsPerCurrencyUnit!: number;  // Required

@IsOptional()
@IsString()
@MaxLength(3)
currencyCode?: string;

@IsOptional()
@IsString()
@MaxLength(500)
description?: string;
```

**Frontend sends**: `pointsPerCurrency: number` ✅
**Frontend MISSING**: 
- `currencyCode` (but it's optional) ✅
- `description` (but it's optional) ✅

**⚠️ POTENTIAL ISSUE**: The frontend uses `pointsPerCurrency` but the backend expects `pointsPerCurrencyUnit`!

This is a **field name mismatch** that would cause the backend to not receive the value, resulting in validation error (missing required field).

### 🔴 CRITICAL FIELD NAME MISMATCH

**Frontend**:
```typescript
pointsPerCurrency: number;
```

**Backend**:
```typescript
pointsPerCurrencyUnit: number;
```

**Impact**: The backend expects `pointsPerCurrencyUnit` but the frontend sends `pointsPerCurrency`. This will cause the backend to see `pointsPerCurrencyUnit` as missing/undefined, which will fail the `@IsDefined()` validation.

**Error**: 400 Bad Request - "pointsPerCurrencyUnit must be a number" or similar

---

## 7. Summary of Issues Found

### 🔴 CRITICAL ISSUES (Causing 400 Errors)

#### Issue #1: Field Name Mismatch
- **Field**: `pointsPerCurrency` vs `pointsPerCurrencyUnit`
- **Location**: Frontend form state and request building
- **Impact**: Backend validation fails because required field is missing
- **Fix**: Update frontend to use `pointsPerCurrencyUnit`

#### Issue #2: Configuration Format Inconsistency
- **Field**: `configurations` format (array vs object)
- **Location**: Backend endpoints return different formats
- **Impact**: Frontend type expects object but receives array from some endpoints
- **Fix**: Standardize backend to always return object format

### 🟡 MINOR ISSUES (Non-Breaking)

#### Issue #3: Missing Optional Fields
- **Fields**: `currencyCode`, `earningRule.description`, `rewardThresholds[].description`
- **Impact**: None (fields are optional)
- **Fix**: Optional - add these fields to frontend for completeness

#### Issue #4: Date vs String Types
- **Fields**: `activatedAt`, `deactivatedAt`, `createdAt`
- **Impact**: None (JSON serialization handles conversion)
- **Fix**: None required

#### Issue #5: ConfigurationType vs string
- **Field**: `configurations` key type
- **Impact**: None (frontend type is more permissive)
- **Fix**: None required

---

## 8. Required Fixes for Phase 2

### High Priority (Fix Before Testing)

1. **Fix Field Name in Frontend**
   ```typescript
   // In MerchantProgramsPage.tsx
   // Change:
   pointsPerCurrency: number;
   // To:
   pointsPerCurrencyUnit: number;
   
   // Update form:
   <input
     id="points-per-currency"
     // onChange should set pointsPerCurrencyUnit, not pointsPerCurrency
   />
   ```

2. **Standardize Backend Configuration Format**
   Update `getCurrent` and `getHistory` in programs.controller.ts:
   ```typescript
   @Get('current')
   getCurrent(@CurrentUser() user: CurrentUserPayload) {
     return this.programsService.getCurrent(user.id).then(program => 
       program ? this.programsService.mapToResponseDto(program) : null
     );
   }
   
   @Get('history')
   getHistory(@CurrentUser() user: CurrentUserPayload) {
     return this.programsService.getHistory(user.id).then(programs =>
       programs.map(this.programsService.mapToResponseDto)
     );
   }
   ```

3. **Update Frontend Type to Handle Both Formats**
   Or ensure backend always returns object format

### Medium Priority (Fix for Completeness)

4. **Add Missing Optional Fields**
   - Add `currencyCode` to points configuration
   - Add `description` fields to earning rules and reward thresholds

---

## 9. Files to Modify

### Backend Files
1. `backend/src/features/programs/programs.controller.ts`
   - Update `getCurrent` to use `mapToResponseDto`
   - Update `getHistory` to use `mapToResponseDto`

### Frontend Files
1. `frontend/src/features/merchant/pages/MerchantProgramsPage.tsx`
   - Change `pointsPerCurrency` to `pointsPerCurrencyUnit`
   - Update all references to this field
   - Consider adding missing optional fields

2. `frontend/src/features/merchant/api/programApi.ts`
   - Consider updating `ProgramDto` to handle both array and object formats
   - Or wait for backend fix

---

## 10. Next Steps

1. **Fix field name mismatch** in MerchantProgramsPage.tsx
2. **Standardize configuration format** in programs.controller.ts
3. **Test with updated frontend** to verify 400 errors are resolved
4. **Apply backend migration** to enable full functionality
5. **Rebuild and restart backend** with all fixes

---

## Conclusion

The **root cause of the 400 Bad Request errors** is likely:

### 🎯 PRIMARY CAUSE: Field Name Mismatch
**`pointsPerCurrency` vs `pointsPerCurrencyUnit`**

The frontend sends `pointsPerCurrency` but the backend expects `pointsPerCurrencyUnit`. This causes the backend validation to fail because the required field is missing.

### 🎯 SECONDARY CAUSE: Configuration Format Inconsistency
**Array vs Object format**

Some backend endpoints return `configurations` as an array, others as an object. The frontend expects an object, which could cause runtime errors.

These issues need to be fixed to resolve the 400 errors and ensure proper frontend/backend integration.
