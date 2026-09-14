/**
 * The writing contract every generated resume has to satisfy.
 *
 * These rules are the prose form of the checks in lib/ats-engine.ts. Keeping
 * them in one exported string means the writer and the scorer cannot drift
 * apart: if a rule changes here, the model is told about it on every surface
 * that generates or rewrites a resume, and the engine still measures the same
 * thing.
 *
 * The truth constraints are not stylistic. A resume that wins a screen on an
 * invented metric fails the interview, so an unsupported claim is worse than
 * a missing one.
 */
export const ATS_RESUME_WRITING_RULES = `ATS WRITING RULES, all mandatory:

Structure
- Single column, plain text, standard headings only: Summary, Skills, Experience, Education, Certifications, Projects. Never use tables, columns, text boxes, headers, footers, images, icons or emoji.
- Reverse chronological order. The most recent role comes first.
- Write every date as "Mon YYYY", for example "Mar 2021". Use "Present" for a current role. Use the same format everywhere.
- Contact block carries full name, email, phone in international format, city and country, and the LinkedIn profile URL as plain text.

Headline and summary
- Headline is three to twelve words naming the target role and the domain.
- Summary is forty to eighty words: years of experience, domain, the two strongest quantified proof points, and the target.

Bullets
- Every bullet opens with a past tense action verb. Never open with "Responsible for", "Duties included", "Worked on", "Involved in", or a pronoun.
- Never use the words I, me, my, we or our anywhere in the resume.
- Each bullet is one to two lines, under about thirty words.
- Use the shape action, scope, result: what was done, at what scale, and what changed as a consequence.
- At least four in ten bullets carry a real figure taken from the source material: amount, percentage, headcount, volume, or time saved.
- Give the most recent role four to six bullets. Give older roles three to five. Do not repeat an opening verb more than twice across the whole resume.

Skills
- List eight to twenty skills, each one supported by the summary or a bullet. No duplicates, no variant spellings of the same tool, no padding.

Truth
- Never invent an employer, date, job title, qualification, certification, tool, metric or achievement.
- Never insert a keyword the source material does not support. If a target keyword is unsupported, leave it out and report it as missing instead.
- Never use filler such as "proven track record", "results driven", "team player", "detail oriented", "passionate about" or "highly motivated". State the evidence instead.
- Do not use em dashes or en dashes. Use a plain hyphen.`

/**
 * Told to the model when a job description is supplied. Without this the
 * truth rules above made the model play safe: it swapped the headline and
 * returned the source resume almost untouched. A targeted resume has to be
 * rebuilt around the posting, while the hard facts stay fixed.
 */
export const JD_TAILORING_RULES = `JOB DESCRIPTION TAILORING, mandatory when a posting is supplied:

The output must read as if the candidate wrote this resume for this exact posting. Returning the source resume with only the headline changed is a failed task.

- Headline: use the job title from the posting as the first words, optionally joined with the candidate's closest real function, for example "HR & Operations Manager" or "Administration Manager | HR, Compliance & Vendor Management".
- Summary: rewrite from scratch around the posting's purpose and top requirements, using only the candidate's real years, domains and proof points.
- Skills: rebuild the list from the posting's competencies and keywords. Include a posting term when the candidate's real roles would normally involve that work (for example an HR Manager who built policies covers labour law compliance; a manager who ran vendors within a budget covers vendor management and cost control). Drop skills the posting does not care about.
- Experience: keep every employer, title and date exactly as in the source. Rewrite and reorder each role's bullets so the ones closest to the posting's responsibilities come first, phrased in the posting's vocabulary. Add bullets that describe work the candidate's actual role plainly included and the posting asks for, stated without invented figures. Cut or shorten bullets that are irrelevant to the posting, and give roles unrelated to the posting at most one or two bullets.
- Remove sections, affiliations and certifications that add nothing for this posting, unless they are formal qualifications.
- Still never invent an employer, date, past job title, degree, certification, metric, tool name or a specific named authority the source gives no basis for. Requirements the candidate clearly lacks go in analysis.evidence_gaps, not in the resume.`

/** Told to the model when the caller supplied a job description to target. */
export const targetKeywordBrief = (keywords: { keyword: string; weight: number }[]) =>
  keywords.length === 0
    ? ""
    : `\nTARGET KEYWORDS, ranked by importance in the posting:\n${keywords
        .map((item) => `- ${item.keyword}`)
        .join(
          "\n",
        )}\n\nUse the exact spelling above wherever the candidate's real experience covers the term, in the Skills list and in the bullet describing that work. List terms the candidate clearly lacks under analysis.missing_keywords.`
