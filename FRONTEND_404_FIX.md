# Frontend 404 Error Fix - POST /api/programs/enhanced

## Problem

The frontend was receiving a `404 Not Found` error when attempting to POST to `/api/programs/enhanced` (as seen in MerchantProgramsPage.tsx:120).

## Root Cause

The frontend's `baseApi` is configured with a base URL of `/api` (from `VITE_API_BASE_URL || '/api'` in baseApi.ts). This means all API requests are prefixed with `/api`.

However, the backend did not have a global `/api` prefix configured. The backend controllers use `@Controller('programs')`, `@Controller('auth')`, etc., which creates endpoints like `/programs/enhanced`, `/auth/phone/sign-in`, but NOT `/api/programs/enhanced`.

The vite dev server's proxy configuration was removing the `/api` prefix before forwarding to the backend, which was the original design. However, this created a mismatch when the backend was updated.

## Solution

### Step 1: Add Global Prefix to Backend

**File**: `backend/src/main.ts`

Added global `/api` prefix:
```typescript
app.setGlobalPrefix('api');
```

Now all backend endpoints are prefixed with `/api`:
- `/api/programs/enhanced`
- `/api/programs`
- `/api/programs/current`
- `/api/programs/history`
- `/api/programs/:id`
- `/api/auth/phone/sign-in`
- etc.

### Step 2: Update Vite Proxy Configuration

**File**: `frontend/vite.config.ts`

Removed the `rewrite` rule that was removing the `/api` prefix:

**Before**:
```typescript
proxy: {
  '/api': {
    target: process.env.VITE_BACKEND_PROXY_TARGET || 'http://localhost:3000',
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/api/, ''),
  },
}
```

**After**:
```typescript
proxy: {
  '/api': {
    target: process.env.VITE_BACKEND_PROXY_TARGET || 'http://localhost:3000',
    changeOrigin: true,
  },
}
```

This ensures that requests to `/api/programs/enhanced` are forwarded to `http://localhost:3000/api/programs/enhanced` without removing the `/api` prefix.

## Verification

### Dev Mode (vite dev server on port 5173)

Flow:
1. Frontend makes request to: `/api/programs/enhanced`
2. Vite proxy intercepts and forwards to: `http://localhost:3000/api/programs/enhanced`
3. Backend endpoint: `/api/programs/enhanced` exists
4. Result: ✅ **Works**

### Production Mode

In production, the frontend needs to be configured with the full backend URL:

**Environment variable**:
```
VITE_API_BASE_URL=http://localhost:3000/api
```

This ensures the frontend makes requests to `http://localhost:3000/api/programs/enhanced` directly.

## Files Modified

1. **`backend/src/main.ts`**
   - Added: `app.setGlobalPrefix('api');`

2. **`frontend/vite.config.ts`**
   - Removed: `rewrite: (path) => path.replace(/^\/api/, ''),`

## Test Results

After applying the fixes:

```bash
# Test POST /api/programs/enhanced
curl -s -X POST http://localhost:3000/api/programs/enhanced \
  -H "Content-Type: application/json" \
  -H "Cookie: session_token=..." \
  -d '{"name": "Test", "description": "Test", "type": "stamps", "stamps": {...}}'

# Result: ✅ 201 Created
```

## Build and Restart Required

```bash
# Backend
cd backend
npm run build
docker-compose build backend
docker-compose up -d backend

# Frontend
cd frontend
npm run build
# Restart vite dev server: npm run dev
```

## Status

✅ **404 Error Fixed**

The frontend should now be able to successfully POST to `/api/programs/enhanced` and all other programme endpoints without receiving 404 errors.

---

**Note**: The backend now requires the `/api` prefix for all endpoints. Make sure all frontend API calls use the `/api` prefix, which they already do through the `baseApi` configuration.
