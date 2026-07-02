import "server-only"

import { createServiceClient } from "./supabase-rest"

// withErrorBoundary wraps a set of operations in a try/catch and re-throws
// with logging. It does NOT provide ACID transaction guarantees - use
// createPostWithVersion (which calls an RPC) for true atomicity.
export async function withErrorBoundary<T>(operations: (client: ReturnType<typeof createServiceClient>) => Promise<T>): Promise<T> {
  const supabase = createServiceClient()

  try {
    return await operations(supabase)
  } catch (error) {
    console.error("Operation failed:", error)
    throw error
  }
}

export async function createPostWithVersion(postData: unknown, versionData: unknown) {
  const supabase = createServiceClient()
  const { data, error } = await supabase.rpc("create_post_with_version", {
    p_post_data: postData,
    p_version_data: versionData,
  })

  if (error) throw error
  return data
}