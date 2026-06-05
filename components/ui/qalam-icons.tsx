import type { SVGProps } from "react"

type IconProps = SVGProps<SVGSVGElement>

const base = "h-5 w-5"

function Svg({ className, children, ...props }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className ?? base}
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  )
}

export function BrandMarkIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={props.className ?? "h-4 w-4"} aria-hidden="true" {...props}>
      <path d="M3 13C3 13 5 11 8 7C11 3 13 2 13 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="13" cy="2" r="1.5" fill="currentColor" stroke="none" />
      <path d="M3 13L2 14.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

export const VoiceIcon = (props: IconProps) => (
  <Svg {...props}>
    <path d="M12 4a3 3 0 0 1 3 3v4a3 3 0 1 1-6 0V7a3 3 0 0 1 3-3Z" />
    <path d="M6.5 10.5a5.5 5.5 0 0 0 11 0" />
    <path d="M12 16v4" />
  </Svg>
)

export const AnalyticsIcon = (props: IconProps) => (
  <Svg {...props}>
    <path d="M4 19V9" />
    <path d="M10 19V5" />
    <path d="M16 19v-7" />
    <path d="M22 19v-11" />
  </Svg>
)

export const HookIcon = (props: IconProps) => (
  <Svg {...props}>
    <path d="M14 7a4 4 0 1 1 4 4h-4v4a4 4 0 1 1-4-4" />
    <path d="M14 11V7" />
  </Svg>
)

export const LibraryIcon = (props: IconProps) => (
  <Svg {...props}>
    <path d="M4 6.5h11" />
    <path d="M4 10.5h11" />
    <path d="M4 14.5h11" />
    <path d="M18 5v14" />
  </Svg>
)

export const CalendarIcon = (props: IconProps) => (
  <Svg {...props}>
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M16 3v4" />
    <path d="M8 3v4" />
    <path d="M3 10h18" />
  </Svg>
)

export const TeamIcon = (props: IconProps) => (
  <Svg {...props}>
    <circle cx="9" cy="8" r="3" />
    <path d="M4 19a5 5 0 0 1 10 0" />
    <circle cx="17" cy="9" r="2.5" />
    <path d="M15 19a4 4 0 0 1 5 0" />
  </Svg>
)

export const ComposeIcon = (props: IconProps) => (
  <Svg {...props}>
    <path d="m4 20 4.5-1 9-9a2.1 2.1 0 0 0-3-3l-9 9L4 20Z" />
    <path d="M13 7l4 4" />
  </Svg>
)

export const BrainIcon = (props: IconProps) => (
  <Svg {...props}>
    <path d="M9 5a3 3 0 0 0-5 2.2A3.5 3.5 0 0 0 5 14v1a3 3 0 0 0 3 3h1" />
    <path d="M15 5a3 3 0 0 1 5 2.2A3.5 3.5 0 0 1 19 14v1a3 3 0 0 1-3 3h-1" />
    <path d="M12 4v16" />
    <path d="M9 8h3" />
    <path d="M12 12h3" />
    <path d="M9 16h3" />
  </Svg>
)

export const GrowthIcon = (props: IconProps) => (
  <Svg {...props}>
    <path d="M4 18 10 12l4 3 6-7" />
    <path d="M20 11V8h-3" />
  </Svg>
)

export const ArchiveIcon = (props: IconProps) => (
  <Svg {...props}>
    <rect x="3" y="5" width="18" height="4" rx="1.5" />
    <path d="M5 9v9a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9" />
    <path d="M10 13h4" />
  </Svg>
)

export const ShieldIcon = (props: IconProps) => (
  <Svg {...props}>
    <path d="M12 3 5 6v5c0 4.5 2.7 7.7 7 10 4.3-2.3 7-5.5 7-10V6l-7-3Z" />
    <path d="m9.5 12 1.7 1.7 3.8-4.2" />
  </Svg>
)

export const ProfileIcon = (props: IconProps) => (
  <Svg {...props}>
    <circle cx="12" cy="8" r="3.5" />
    <path d="M5 20a7 7 0 0 1 14 0" />
  </Svg>
)

export const CarouselIcon = (props: IconProps) => (
  <Svg {...props}>
    <rect x="4" y="6" width="10" height="12" rx="2" />
    <path d="M10 6h6a2 2 0 0 1 2 2v8" />
    <path d="M8 10h4" />
    <path d="M8 13h2" />
  </Svg>
)

export const MicroscopeIcon = (props: IconProps) => (
  <Svg {...props}>
    <path d="M10 6a2 2 0 0 1 4 0v3h-4Z" />
    <path d="M8 10h8" />
    <path d="M13 10v4a4 4 0 0 0 4 4" />
    <path d="M7 18h12" />
    <path d="M5 22h14" />
  </Svg>
)

export const PenIcon = (props: IconProps) => (
  <Svg {...props}>
    <path d="m4 20 3.5-1 8.5-8.5-2.5-2.5L5 16.5 4 20Z" />
    <path d="m13.5 8 2.5 2.5" />
  </Svg>
)

export const CheckIcon = (props: IconProps) => (
  <Svg {...props}>
    <path d="m5 12 4 4 10-10" />
  </Svg>
)

export const CommentIcon = (props: IconProps) => (
  <Svg {...props}>
    <path d="M5 18.5 3 21V6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10.5a2 2 0 0 1-2 2H5Z" />
  </Svg>
)

export const RepostIcon = (props: IconProps) => (
  <Svg {...props}>
    <path d="M7 7h10l-2.5-2.5" />
    <path d="M17 7 14.5 9.5" />
    <path d="M17 17H7l2.5 2.5" />
    <path d="M7 17 9.5 14.5" />
  </Svg>
)

export const LinkedInIcon = (props: IconProps) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={props.className ?? base} aria-hidden="true" {...props}>
    <path d="M6.94 8.5H3.56V20h3.38V8.5ZM5.25 7.06A1.96 1.96 0 1 0 5.2 3.14a1.96 1.96 0 0 0 .05 3.92ZM20 20h-3.37v-5.57c0-1.33-.02-3.03-1.85-3.03-1.86 0-2.14 1.45-2.14 2.94V20H9.27V8.5h3.24v1.57h.05c.45-.86 1.56-1.77 3.21-1.77 3.43 0 4.06 2.26 4.06 5.2V20Z" />
  </svg>
)

export const InstagramIcon = (props: IconProps) => (
  <Svg {...props}>
    <rect x="3" y="3" width="18" height="18" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
  </Svg>
)

export const ChevronRightIcon = (props: IconProps) => (
  <Svg {...props}>
    <path d="m9 6 6 6-6 6" />
  </Svg>
)
