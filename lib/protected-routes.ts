// Shared route list for request authorization and crawler exclusion. Keeping
// this in one module prevents robots.txt from drifting from the proxy gate.
export const PROTECTED_ROUTES = [
  "/dashboard",
  "/write",
  "/writer",
  "/carousel",
  "/carousels",
  "/comment-generator",
  "/library",
  "/analytics",
  "/voice",
  "/career",
  "/settings",
  "/agency",
  "/competitors",
  "/calendar",
  "/approvals",
  "/chat",
  "/admin",
] as const
