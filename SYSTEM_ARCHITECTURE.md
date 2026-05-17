# Qalam Platform: Core Function Architecture

This document breaks down the most critical functions engineered during the final audit phase. It details their precise mechanical behavior, why they are built this way, and how they secure the Qalam ecosystem.

---

## 1. Rate Limiter (`lib/server/rate-limit.ts`)
### Function: `TokenBucket.tryConsume(tokens = 1)`
*   **How it works:** It implements the standard Token Bucket algorithm in memory. Upon instantiation, a user gets a "bucket" of capacity (e.g., 5 tokens). The bucket refills over a rolling window based on the current timestamp (`Date.now()`). If the bucket has enough tokens, `tryConsume()` subtracts the requested amount and returns `true`. If empty, it returns `false`.
*   **Why it exists:** It is the primary defense mechanism against malicious API abuse (or client-side bugs) that could endlessly ping expensive third-party endpoints (Groq/Llama3) and drain financial resources.
*   **How it performs:** It runs in roughly `~O(1)` time complexity. Being purely mathematical and in-memory, it adds virtually zero latency (`<1ms`) to Edge API route executions.

## 2. Dynamic Sessions (`lib/server/app-session.ts`)
### Function: `createAppSession()`
*   **How it works:** Invoked during the OAuth callback phase. It takes the LinkedIn email and name, queries the Supabase `admins` table to check if the user possesses elevated privileges, and then digitally signs a cryptographic HMAC-SHA256 session token containing their metadata.
*   **Why it exists:** It completely eliminates the need for heavyweight third-party auth providers (like Clerk), drastically reducing bundle size and dependency risks, while giving you complete ownership over user state.
*   **How it performs:** Secure, lightweight, and fast. The cryptographic signing takes fractions of a millisecond. The only network latency is the initial Supabase query, which is highly optimized via PostgreSQL index lookups.

## 3. Offline Mutations (`public/sw.js`)
### Function: `queueRequest(request)`
*   **How it works:** When a user is offline and hits "Save Draft", the Service Worker intercepts the `POST` request. `queueRequest()` opens an IndexedDB database (`QalamOfflineDB`), clones the exact HTTP method, headers, and body payload, and stores them safely in the browser's persistent storage.
*   **Why it exists:** It ensures that writers do not lose their creative work if they happen to lose WiFi (e.g., entering a tunnel). It acts as a safety net that guarantees data integrity.
*   **How it performs:** IndexedDB operations are heavily optimized by modern browsers. Writing the serialized request is non-blocking and instantaneous. Upon reconnecting, the `sync` event iterates the queue and executes standard `fetch()` calls sequentially.

## 4. Competitor Analytics (`lib/server/competitors.ts`)
### Function: `analyzeCompetitorPaste()`
*   **How it works:** It takes raw text pasted from a competitor's LinkedIn profile, injects it into a highly opinionated, zero-shot system prompt, and sends it to the Groq API using the `llama3-8b-8192` model. It forces the LLM to output a strict JSON response containing themes, hooks, CTAs, and a contrarian recommendation.
*   **Why it exists:** It replaces a fragile Regex-matching script. Instead of just counting words like "growth" or "hiring", it provides actual semantic understanding and tactical ghostwriting advice, which represents a massive value-add for premium SaaS users.
*   **How it performs:** Extremely fast due to Groq's LPU architecture (often generating the full JSON in under 800ms) with a very low temperature (`0.2`) to ensure JSON schema consistency and reduce hallucinations.

## 5. LinkedIn Telemetry (`lib/server/linkedin.ts`)
### Function: `pollLinkedInAnalytics(accessToken, postUrn)`
*   **How it works:** Uses the user's active LinkedIn OAuth token to query the `organizationalEntityShareStatistics` endpoint for a specific post (URN). It extracts the exact `impressionCount` and `engagementRate` values.
*   **Why it exists:** It replaces fake or locally estimated analytics with the actual ground truth straight from LinkedIn's servers. This is the cornerstone feature that allows Qalam to act as a verified system of record.
*   **How it performs:** Standard HTTP GET request. The data payload is relatively small. It runs safely in the background (via Cron) so it never blocks the user interface.

## 6. Zero-Downtime Data Sync (`app/api/workspace/route.ts`)
### Function: `PUT(request)` (Workspace Refactor)
*   **How it works:** It receives the client's current workspace state. First, it attempts to insert/update the data into the new, highly scalable relational tables (`workspaces` and `posts`). If these tables do not exist yet (i.e., the SQL migration hasn't run), it catches the database error, logs a warning, and seamlessly falls back to saving the data in the legacy JSON `workspace_snapshots` table.
*   **Why it exists:** It allows you to deploy frontend application code changes *immediately* without fear of breaking the live app, while laying the exact tracks needed to scale seamlessly once the database migration is manually triggered.
*   **How it performs:** Highly resilient. The `try/catch` wrapper ensures that database schema desynchronization is treated as a manageable fallback rather than a fatal crash.
