import Image from "next/image"
import Link from "next/link"

type QalamMarkProps = {
  size?: number
  className?: string
  priority?: boolean
}

type QalamLogoProps = QalamMarkProps & {
  href?: string
  textClassName?: string
  containerClassName?: string
}

export function QalamMark({ size = 36, className = "", priority = false }: QalamMarkProps) {
  return (
    <span
      className={`relative inline-flex shrink-0 overflow-hidden rounded-xl border border-white/10 bg-teal shadow-sm ${className}`.trim()}
      style={{ width: size, height: size }}
    >
      <Image
        src="/icon.png"
        alt="Qalam"
        fill
        priority={priority}
        sizes={`${size}px`}
        className="object-cover"
      />
    </span>
  )
}

export function QalamLogo({
  href = "/",
  size = 36,
  priority = false,
  textClassName = "text-xl font-bold tracking-tight text-teal",
  containerClassName = "flex select-none items-center gap-2",
}: QalamLogoProps) {
  const content = (
    <>
      <QalamMark size={size} priority={priority} />
      <span className={textClassName}>Qalam</span>
    </>
  )

  return href ? (
    <Link href={href} className={containerClassName}>
      {content}
    </Link>
  ) : (
    <div className={containerClassName}>{content}</div>
  )
}
