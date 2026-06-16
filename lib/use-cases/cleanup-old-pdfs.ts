import "server-only"

import { createServiceClient } from "@/lib/server/supabase-rest"
import { ok, err } from "@/lib/errors"
import type { Result } from "@/lib/errors"
import { log } from "@/lib/server/logging"

const PDF_TTL_DAYS = 15

export async function cleanupOldPdfs(): Promise<Result<{ cleared: number }>> {
  const cutoff = new Date(Date.now() - PDF_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString()

  try {
    const supabase = createServiceClient()

    // Find carousel projects with a PDF that was generated before the cutoff
    const { data: stale, error: findErr } = await supabase
      .from("carousel_projects")
      .select("id")
      .not("pdf_url", "is", null)
      .lt("updated_at", cutoff)
      .limit(200)

    if (findErr) {
      return err({ code: "INTERNAL_ERROR", message: `Failed to query stale PDFs: ${findErr.message}` })
    }

    if (!stale?.length) {
      log.info("cleanup.pdfs.none", { cutoff })
      return ok({ cleared: 0 })
    }

    const ids = stale.map((r) => r.id as string)

    const { error: clearErr } = await supabase
      .from("carousel_projects")
      .update({ pdf_url: null, updated_at: new Date().toISOString() })
      .in("id", ids)

    if (clearErr) {
      return err({ code: "INTERNAL_ERROR", message: `Failed to clear PDF URLs: ${clearErr.message}` })
    }

    log.info("cleanup.pdfs.done", { cleared: ids.length, cutoff })
    return ok({ cleared: ids.length })
  } catch (cause) {
    return err({ code: "INTERNAL_ERROR", message: "PDF cleanup failed unexpectedly", cause })
  }
}
