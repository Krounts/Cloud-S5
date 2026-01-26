# Fix: NetworkError lors du signalement (Report Submission)

## Problem
The mobile app (`http://localhost:8100`) was unable to submit reports to the API (`http://localhost:3001`), resulting in:
```
Error: NetworkError when attempting to fetch resource.
```

## Root Causes

1. **Missing CORS Headers**: The PHP API did not include CORS headers, which are required for cross-origin requests from the mobile app to the API server.

2. **Direct Absolute URL in ReportPage**: The ReportPage was using `http://localhost:3001/api/reports` instead of the relative `/api/reports` path, which would bypass the Vite development proxy.

## Solutions Applied

### 1. Added CORS Headers to API
**File**: [packages/api-auth-php/public/index.php](packages/api-auth-php/public/index.php)

```php
// CORS Headers - Allow requests from development servers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Max-Age: 86400');
header('Content-Type: application/json');

// Handle CORS preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}
```

### 2. Fixed ReportPage API Call
**File**: [packages/mobile-app/src/pages/ReportPage.tsx](packages/mobile-app/src/pages/ReportPage.tsx)

Changed from:
```typescript
const response = await fetch('http://localhost:3001/api/reports', {
```

To:
```typescript
const response = await fetch('/api/reports', {
```

This allows the Vite development server proxy to handle the request (configured in `vite.config.ts`).

## How It Works Now

### Development Flow:
1. **Mobile App** (`http://localhost:8100`) makes request to `/api/reports`
2. **Vite Proxy** (configured in `vite.config.ts`) intercepts and forwards to `http://localhost:3001/api/reports`
3. **PHP API** (`http://localhost:3001`) receives request with CORS headers enabled
4. **Response** is sent back through proxy to mobile app

### CORS Preflight:
- Browser automatically sends `OPTIONS` request before POST
- API responds with CORS headers allowing the actual request
- Browser permits the response to be read by the mobile app

## Testing the Fix

1. Start Docker services:
   ```bash
   yarn docker:up
   ```

2. Start development servers:
   ```bash
   yarn dev
   ```

3. Open mobile app at `http://localhost:8100`

4. Navigate to "Signaler un problème" tab

5. Fill in the form and click "Envoyer le signalement"

6. You should see success message: **"✓ Signalement envoyé avec succès!"**

## Additional Notes

- ProfilePage was already using the correct relative path `/api/auth/profile`
- The error message in ReportPage now provides helpful debugging info for future network errors
- CORS headers use `*` for development; in production, specify actual allowed origins
- The timeout is set to 10 seconds; ensure the API responds within this timeframe

## Status
✅ **FIXED** - Both CORS headers added and API call URL corrected
