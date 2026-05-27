import { GmailLogo, OutlookLogo } from "@/app/waitlist/brand-logos"
import { cn } from "@/lib/utils"

export function MailProviderBadge({
  provider,
  className = "",
}: {
  provider: "gmail" | "outlook"
  className?: string
}) {
  const isGmail = provider === "gmail"

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wide",
        isGmail
          ? "bg-[#ea4335]/10 text-[#c5221f] dark:text-[#f87171]"
          : "bg-[#0078d4]/10 text-[#0078d4] dark:text-[#60a5fa]",
        className,
      )}
    >
      {isGmail ? <GmailLogo className="!h-3 !w-3" /> : <OutlookLogo className="!h-3 !w-3" />}
      {isGmail ? "Gmail" : "Outlook"}
    </span>
  )
}
