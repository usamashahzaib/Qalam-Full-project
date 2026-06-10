import { createServiceClient } from "./supabase-rest"

export async function withTransaction<T>(operations: (client: any) => Promise<T>): Promise<T> {
  const supabase = createServiceClient()

  try {
    return await operations(supabase)
  } catch (error) {
    console.error("Transaction failed:", error)
    throw error
  }
}

export async function createPostWithVersion(postData: any, versionData: any) {
  const supabase = createServiceClient()
  const { data, error } = await supabase.rpc("create_post_with_version", {
    p_post_data: postData,
    p_version_data: versionData,
  })

  if (error) throw error
  return data
}
