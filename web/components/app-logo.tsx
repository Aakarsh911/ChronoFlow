export function AppLogo({ size = "md" }: { size?: "sm" | "md" }) {
  const box = size === "sm" ? "h-7 w-7" : "h-9 w-9"
  const icon = size === "sm" ? 14 : 16

  return (
    <span
      aria-hidden
      className={`flex ${box} items-center justify-center rounded-md border border-[var(--cf-border-strong)] bg-[var(--cf-bg-soft)]`}
      style={{
        boxShadow: "0 0 16px -6px rgba(var(--cf-accent-rgb), 0.5)",
      }}
    >
      <svg width={icon} height={icon} viewBox="0 0 16 16" fill="none" aria-hidden>
        <path
          d="M8 1.5a6.5 6.5 0 1 0 6.5 6.5"
          stroke="rgba(var(--cf-accent-rgb), 1)"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <path
          d="M8 4.5V8l2.5 1.5"
          stroke="var(--cf-text)"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  )
}
