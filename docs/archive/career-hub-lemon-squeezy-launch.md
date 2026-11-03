# Career commerce Lemon Squeezy launch

Store: `Qalam` (`366761`)

Store currency: `PKR`

Create ten separate products. Each product has one variant with this shared configuration:

- Payment type: `Single payment`
- Pricing model: `Standard pricing`
- Pay what you want: off
- Subscription: off
- Free trial: off
- License keys: off
- Files and external delivery links: none
- Product status: published
- Variant availability: enabled
- Fulfillment: signed `order_created` webhook grants verified in-app credits

| Product key | Product name | Price | Credits granted | Environment mapping |
| --- | --- | ---: | --- | --- |
| `extra_resume` | Extra JD-matched resume | PKR 399 | 1 resume | `LEMONSQUEEZY_CAREER_ADDON_EXTRA_RESUME_VARIANT_ID` |
| `cover_letter` | Targeted cover letter | PKR 199 | 1 cover letter | `LEMONSQUEEZY_CAREER_ADDON_COVER_LETTER_VARIANT_ID` |
| `interview_pack` | AI interview practice pack | PKR 599 | 1 interview pack | `LEMONSQUEEZY_CAREER_ADDON_INTERVIEW_PACK_VARIANT_ID` |
| `recruiter_review` | Recruiter-style deep resume review | PKR 799 | 1 review | `LEMONSQUEEZY_CAREER_ADDON_RECRUITER_REVIEW_VARIANT_ID` |
| `linkedin_rewrite` | Complete LinkedIn profile rewrite | PKR 1,199 | 1 LinkedIn rewrite | `LEMONSQUEEZY_CAREER_ADDON_LINKEDIN_REWRITE_VARIANT_ID` |
| `career_blueprint` | Career strategy blueprint | PKR 1,499 | 1 blueprint | `LEMONSQUEEZY_CAREER_ADDON_CAREER_BLUEPRINT_VARIANT_ID` |
| `application_pack` | Application Pack | PKR 999 | resume, cover letter, interview | `LEMONSQUEEZY_CAREER_PACK_APPLICATION_VARIANT_ID` |
| `job_win_pack` | Job-Win Pack | PKR 1,799 | review, resume, cover letter, interview | `LEMONSQUEEZY_CAREER_PACK_JOB_WIN_VARIANT_ID` |
| `career_reset_pack` | Career Reset Pack | PKR 2,799 | LinkedIn rewrite, blueprint, review | `LEMONSQUEEZY_CAREER_PACK_CAREER_RESET_VARIANT_ID` |
| `executive_career_reset` | Executive Career Reset | PKR 3,999 | all six add-ons | `LEMONSQUEEZY_CAREER_PACK_EXECUTIVE_RESET_VARIANT_ID` |

Plan credits:

| Plan | Monthly | Quarterly | Annual |
| --- | ---: | ---: | ---: |
| Free | 0 | 0 | 0 |
| Solo | 1 | 1 | 4 |
| Pro | 1 | 3 | 12 |

Credit cost: resume, cover letter, and interview cost 1. Deep review costs 2. LinkedIn rewrite costs 3. Career blueprint costs 4. Purchased credits do not expire. Plan credits expire with the paid period.

Webhook endpoint: `https://app.byqalam.com/api/payments/webhook`

Required events: `order_created` and `order_refunded`

Set `NEXT_PUBLIC_CAREER_ADDON_CHECKOUT_READY=true` and `NEXT_PUBLIC_CAREER_ADDON_CHECKOUT_LIVE=true` only after all ten unique variant IDs and `LEMONSQUEEZY_API_KEY` are present. `npm run check:career-addons` and the production `prebuild` hook fail closed when this mapping is incomplete or duplicated.
