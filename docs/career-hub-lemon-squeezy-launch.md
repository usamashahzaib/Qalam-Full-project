# Career Hub Lemon Squeezy launch

Store: `Qalam` (`366761`)

Store currency: `PKR`

Create six separate products. Each product has one variant with this shared configuration:

- Variant name: `Single software credit`
- Payment type: `Single payment`
- Pricing model: `Standard pricing`
- Pay what you want: off
- Subscription: off
- Free trial: off
- License keys: off
- Files and external delivery links: none
- Product status: published
- Variant availability: enabled
- Fulfillment: signed `order_created` webhook grants one in-app credit per purchased quantity

| Add-on key | Product name | Product description | Price | Environment mapping |
| --- | --- | --- | ---: | --- |
| `extra_resume` | Extra JD-matched resume | One resume, generated and saved inside Qalam. | PKR 399 | `LEMONSQUEEZY_CAREER_ADDON_EXTRA_RESUME_VARIANT_ID` |
| `cover_letter` | Targeted cover letter | One letter, generated and saved inside Qalam. | PKR 199 | `LEMONSQUEEZY_CAREER_ADDON_COVER_LETTER_VARIANT_ID` |
| `interview_pack` | AI interview practice pack | One pack, generated and saved inside Qalam. | PKR 599 | `LEMONSQUEEZY_CAREER_ADDON_INTERVIEW_PACK_VARIANT_ID` |
| `recruiter_review` | Recruiter-style deep resume review | One review, generated and saved inside Qalam. | PKR 799 | `LEMONSQUEEZY_CAREER_ADDON_RECRUITER_REVIEW_VARIANT_ID` |
| `linkedin_rewrite` | Complete LinkedIn profile rewrite | One rewrite, generated and saved inside Qalam. | PKR 1,199 | `LEMONSQUEEZY_CAREER_ADDON_LINKEDIN_REWRITE_VARIANT_ID` |
| `career_blueprint` | Career strategy blueprint | One blueprint, generated and saved inside Qalam. | PKR 1,499 | `LEMONSQUEEZY_CAREER_ADDON_CAREER_BLUEPRINT_VARIANT_ID` |

The webhook endpoint is `https://app.byqalam.com/api/payments/webhook`. Required events are `order_created` and `order_refunded`.

Set `NEXT_PUBLIC_CAREER_ADDON_CHECKOUT_LIVE=true` only after all six unique variant IDs and `LEMONSQUEEZY_API_KEY` are present. `npm run check:career-addons` and the production `prebuild` hook fail closed when this mapping is incomplete or duplicated.
