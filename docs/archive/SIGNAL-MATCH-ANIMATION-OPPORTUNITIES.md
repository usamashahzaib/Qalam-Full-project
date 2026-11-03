# Signal Match animation opportunities

This is a read-only motion review. It proposes no source changes.

## Opportunities

| # | Location | Today | Purpose | Frequency | Suggested motion |
|---|---|---|---|---|---|
| 1 | `app/(app)/career/match/page.tsx` opt-in control | The state changes color immediately | State indication | Occasional | Transition `background-color`, `color`, and `transform` for 160ms with `var(--default-transition-timing-function)`. Add `:active { transform: scale(0.98) }`. Under reduced motion, keep the color change and remove the transform. |
| 2 | `app/(app)/career/match/page.tsx` private-draft notice | Loading content is replaced by the saved, prefilled, or empty state | Preventing a jarring change | Rare onboarding | Cross-fade opacity from 0 to 1 over 180ms with `var(--default-transition-timing-function)`. Do not slide the full form. Under reduced motion, use the same short opacity transition. |

## Rejected candidates

- `components/tools/AtsResumeCheckerTool.tsx` scorecard bars. Rejected because this is functional assessment data the user is reading. Decorative motion would delay evaluation.
- `app/(app)/career/resumes/page.tsx` resume creation form. Rejected because the form is dense product UI and its open state already has clear spatial placement. Motion would add little information.
- `app/(app)/career/match/page.tsx` weekly suggestion grid. Rejected because returning users may see it often and need to scan profiles immediately. A stagger would slow access to functional content.

## Verdict

The flow needs very little motion. The opt-in state transition has the highest leverage because it confirms the exact privacy action the member just took. If implemented later, start with that control and keep the rest still.
