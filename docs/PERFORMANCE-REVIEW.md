# Performance Review

Date: 2026-08-25. Localhost measurements are laboratory evidence, not field Core Web Vitals.

## Corrected lab findings

The measured LCP element was the hero heading at 375 and 1280 pixels. `qalam-voice-demo.png` was several viewports below the fold, so assigning it priority would compete with critical resources and was correctly rejected.

Earlier corrected measurements found LCP between 104 and 240 milliseconds on four of five audited routes and CLS between 0.0045 and 0.0094. Pricing had a single 948-millisecond LCP sample and remains worth repeated field measurement.

## Bundle reduction shipped

Next 16 route diagnostics identified `framer-motion` in the shared navbar path. The navbar, homepage checker, and FAQ used it only for simple transitions. CSS now implements those interactions and disables animation when reduced motion is requested.

| Route | Before bytes | After bytes | Reduction |
|---|---:|---:|---:|
| `/` | 815,893 | 675,917 | 17.2% |
| `/blog` | 804,243 | 664,929 | 17.3% |
| `/free-tools/ats-resume-checker` | 829,134 | 689,820 | 16.8% |
| `/writer` | 1,015,613 | 876,299 | 13.7% |
| `/pricing` | 838,200 | 837,266 | 0.1% |

These are first-load uncompressed JavaScript bytes from `.next/diagnostics/route-bundle-stats.json`, not transfer bytes. The production Playwright suite passed after the change, including reduced motion, mobile menu behavior, keyboard dismissal, runtime health, and all audited viewports.

## What is healthy

- LCP is text on the main audited routes.
- CLS has substantial headroom against 0.1.
- Image dimensions reserve layout space.
- GA loads asynchronously and its inline bootstrap uses a CSP hash.
- Marketing routes remain statically generated.
- Audited public routes had no failed requests or console errors.

## Remaining work

1. Pricing still imports `framer-motion` for plan switching, cards, comparison rows, and FAQ transitions. It is now the heaviest audited marketing route and needs a dedicated refactor.
2. `next-auth/react` remains global because public navigation displays account state and authenticated routes require the provider.
3. Measure encoded transfer, parse time, and interaction delay with 4x CPU throttling and a Slow 4G profile.
4. Add real-user monitoring before making field LCP, INP, or CLS claims.

## Explicitly not claimed

- No field Core Web Vitals.
- No production INP.
- No claim that localhost represents Pakistani mobile devices and networks.
- No production database query profile.
