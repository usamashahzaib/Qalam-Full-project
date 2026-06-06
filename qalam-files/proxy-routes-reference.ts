// ============================================================
// FILE 14: proxy.ts - ADD THESE TO YOUR PROTECTED ROUTES ARRAY
// ============================================================
// Find your existing protectedRoutes array in proxy.ts or middleware.ts
// ADD the entries below that are missing from your current list
// DO NOT replace the whole file - just add these lines to the array

// ADD THESE ROUTES:
// '/library',
// '/carousel',
// '/voice',
// '/strategist',
// '/dashboard',
// '/api/posts',
// '/api/carousel',
// '/api/plan',
// '/api/dashboard',
// '/api/free-tools',
// '/api/linkedin',

// YOUR FINAL ARRAY SHOULD LOOK LIKE THIS:
const protectedRoutes = [
  '/write',
  '/library',
  '/carousel',
  '/voice',
  '/strategist',
  '/dashboard',
  '/api/generate',
  '/api/posts',
  '/api/carousel',
  '/api/voice',
  '/api/strategist',
  '/api/plan',
  '/api/dashboard',
  '/api/free-tools',
  '/api/linkedin',
];

export { protectedRoutes };
