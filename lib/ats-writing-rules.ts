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

/** Told to the model when the caller supplied a job description to target. */
export const targetKeywordBrief = (keywords: { keyword: string; weight: number }[]) =>
  keywords.length === 0
    ? ""
    : `\nTARGET KEYWORDS, ranked by importance in the posting:\n${keywords
        .map((item) => `- ${item.keyword}`)
        .join(
          "\n",
        )}\n\nUse the exact spelling above wherever the source material genuinely supports the term, in the Skills list and in the bullet describing the work where it was used. Leave out every term the source does not support and list it under analysis.missing_keywords.`
