import { redirect } from "next/navigation"

// Redirect on each request on the app host rather than baking a static
// redirect page, which would sit under the strict nonce CSP with no nonce.
export const dynamic = "force-dynamic"

export default function CarouselPage() {
  redirect("/carousels")
}
