type Props = {
  children: React.ReactNode
  delay?: number
  className?: string
  as?: keyof React.JSX.IntrinsicElements
}

/**
 * Lightweight reveal wrapper — always renders visible content in the initial HTML
 * so crawlers, LLM fetchers, and no-JS clients can read the page. Motion is a
 * transform-only entrance (opacity stays 1) and is disabled when the user
 * prefers reduced motion.
 */
export function ScrollReveal({ children, delay = 0, className = "", as = "div" }: Props) {
  const Tag = as as unknown as "div"
  return (
    <Tag
      className={`cf-reveal ${className}`}
      style={{ ["--cf-reveal-delay" as string]: `${delay}ms` }}
    >
      {children}
    </Tag>
  )
}
