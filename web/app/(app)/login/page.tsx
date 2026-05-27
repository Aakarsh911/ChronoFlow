import { AuthForm } from "@/components/auth-form"
import { AppLogo } from "@/components/app-logo"
import { ThemeToggle } from "@/app/waitlist/theme-toggle"

export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[var(--cf-bg)] px-4 py-12">
      <div className="cf-login-scene" aria-hidden>
        <div className="cf-aurora-field absolute inset-0">
          <div className="cf-aurora cf-aurora-a" />
          <div className="cf-aurora cf-aurora-b" />
          <div className="cf-aurora cf-aurora-c" />
        </div>
        <div className="absolute inset-0 cf-glow" />
        <div className="absolute inset-0 cf-grid opacity-60" />
      </div>

      <div className="absolute right-4 top-4 z-20 sm:right-6 sm:top-6">
        <ThemeToggle />
      </div>

      <div className="relative z-10 grid w-full max-w-5xl items-center gap-12 lg:grid-cols-2 lg:gap-16">
        <div className="hidden space-y-8 lg:block">
          <div className="flex items-center gap-3">
            <AppLogo />
            <div>
              <p className="font-mono text-sm font-semibold tracking-tight text-[var(--cf-text)]">
                chronoflow
              </p>
              <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--cf-text-muted)]">
                Private beta
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <h1 className="text-balance text-4xl font-semibold leading-tight tracking-tight text-[var(--cf-text)]">
              Turn Teams, email, and Jira into{" "}
              <span className="text-[rgba(var(--cf-accent-rgb),1)]">one actionable plan.</span>
            </h1>
            <p className="max-w-md text-[16px] leading-relaxed text-[var(--cf-text-muted)]">
              Sign in to your unified workspace — calendar, inbox, tasks, and team
              scheduling in one place.
            </p>
          </div>

          <ul className="space-y-3 font-mono text-[12px] text-[var(--cf-text-dim)]">
            <li>OAuth-only — your data stays in your accounts</li>
            <li>AI task extraction from Gmail and Outlook</li>
            <li>Google Calendar, Microsoft Teams, and Jira connected</li>
          </ul>
        </div>

        <AuthForm />
      </div>
    </div>
  )
}
