/**
 * Maps the error codes returned by the resume parse routes to sentences a
 * person can act on. The routes return codes rather than prose so both the
 * free tool and the signed-in studio can word them for their own context.
 */
const MESSAGES: Record<string, string> = {
  resume_pdf_type_invalid: "Upload a PDF or DOCX resume.",
  resume_pdf_empty: "That file is empty. Upload the resume again.",
  resume_pdf_too_large: "This file is over 5 MB. Upload a smaller PDF or DOCX.",
  resume_pdf_signature_invalid: "That file is not a readable PDF. Re-export it and try again.",
  resume_pdf_too_many_pages: "This file has more than 15 pages. Upload a shorter resume.",
  resume_pdf_text_missing: "This PDF appears to be scanned or image-only. Upload a text-based PDF or DOCX.",
  resume_docx_type_invalid: "Upload a PDF or DOCX resume.",
  resume_docx_empty: "That file is empty. Upload the resume again.",
  resume_docx_too_large: "This file is over 5 MB. Upload a smaller PDF or DOCX.",
  resume_docx_signature_invalid: "That file is not a readable DOCX. Re-save it from Word and try again.",
  resume_docx_archive_invalid: "That DOCX could not be opened. Re-save it from Word and try again.",
  resume_docx_archive_too_large: "That DOCX is too large to read safely. Re-save it without embedded media.",
  resume_docx_parse_failed: "That DOCX could not be read. Export it as a PDF and upload that instead.",
  resume_docx_text_missing: "This DOCX has too little readable text to review.",
  resume_file_missing: "No file was received. Choose the file again.",
  resume_file_type_unsupported: "Upload a PDF or DOCX resume.",
  rate_limit_exceeded: "Too many uploads in a short window. Wait a minute and try again.",
}

export function resumeUploadErrorMessage(code: unknown): string {
  if (typeof code !== "string" || !code) return "The file could not be read. Try a different PDF or DOCX."
  return MESSAGES[code] || "The file could not be read. Try a different PDF or DOCX."
}
