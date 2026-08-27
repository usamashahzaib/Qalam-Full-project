import type { Transition } from "framer-motion"

export const MORPH_SPRING: Transition = {
  type: "spring",
  stiffness: 420,
  damping: 34,
  mass: 0.9,
}

export const MORPH_IDS = {
  marketingNav: "qalam-morph-marketing-nav",
  appMobileNav: "qalam-morph-app-mobile-nav",
  careerTabs: "qalam-morph-career-tabs",
  settingsTabs: "qalam-morph-settings-tabs",
} as const
