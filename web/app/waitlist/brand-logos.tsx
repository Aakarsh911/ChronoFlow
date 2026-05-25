/**
 * Brand marks for the integration tiles. Each logo is a small inline SVG
 * sized via the parent. We keep the marks simple and recognizable — these
 * are used to identify the products ChronoFlow integrates with.
 *
 * `dim` is used for the "Coming soon" state — we render the same logo in
 * the dimmed text color so the tile clearly reads as not-yet-available.
 */

type LogoProps = { className?: string; dim?: boolean }

const sizeClass = "h-5 w-5"

export function GmailLogo({ className = "", dim = false }: LogoProps) {
  if (dim) {
    return (
      <svg
        viewBox="0 0 24 24"
        className={`${sizeClass} ${className}`}
        fill="currentColor"
        aria-hidden
      >
        <path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z" />
      </svg>
    )
  }
  // Multi-color version that mirrors the official Gmail mark.
  return (
    <svg
      viewBox="0 0 24 24"
      className={`${sizeClass} ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path d="M1.636 21.819h3.819V11.73L0 7.638v12.364c0 1.005.731 1.817 1.636 1.817Z" fill="#4285F4" />
      <path d="M18.545 21.819h3.819c.905 0 1.636-.812 1.636-1.817V7.638l-5.455 4.092v10.089Z" fill="#34A853" />
      <path d="M18.545 5.821v5.91L24 7.638V4.547c0-2.023-2.31-3.178-3.927-1.964l-1.528 1.145v2.093Z" fill="#FBBC04" />
      <path d="M5.455 11.731V5.82L12 10.731l6.545-4.91v5.91L12 16.64l-6.545-4.91Z" fill="#EA4335" />
      <path d="M0 4.547v3.091l5.455 4.093V5.82L3.927 4.676C2.31 3.462 0 2.524 0 4.547Z" fill="#C5221F" />
    </svg>
  )
}

export function GitHubLogo({ className = "" }: LogoProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`${sizeClass} ${className}`}
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23a11.5 11.5 0 0 1 3-.405c1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"
      />
    </svg>
  )
}

export function GoogleCalendarLogo({ className = "", dim = false }: LogoProps) {
  if (dim) {
    return (
      <svg
        viewBox="0 0 24 24"
        className={`${sizeClass} ${className}`}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        aria-hidden
      >
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M3 9h18" />
        <path d="M8 3v4M16 3v4" />
      </svg>
    )
  }
  return (
    <svg
      viewBox="0 0 200 200"
      className={`${sizeClass} ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path fill="#FFFFFF" d="M152.6 47.4H47.4v105.2h105.2z" />
      <path fill="#1A73E8" d="m104.7 130.8-12.8-1.9 1.5-9.1 8 1c1-.5 1.7-1.3 2.2-2.4.5-1.1.7-2.3.7-3.6 0-2-.6-3.5-1.8-4.5-1.2-1-2.7-1.6-4.5-1.6-1.5 0-2.8.3-3.9 1-1 .7-1.8 1.6-2.4 2.7l-8.4-3.5c1-2.3 2.6-4.2 4.9-5.7 2.3-1.5 5.3-2.3 8.9-2.3 2.7 0 5.1.5 7.3 1.6 2.2 1 4 2.5 5.3 4.5 1.3 1.9 1.9 4.2 1.9 6.8 0 2.2-.5 4.2-1.6 5.9-1 1.7-2.4 3-4 3.9v.4c2.1.9 3.9 2.3 5.2 4.2 1.3 1.9 2 4.2 2 6.8 0 2.7-.7 5.1-2.1 7.2-1.4 2.1-3.3 3.8-5.7 5-2.4 1.2-5.2 1.8-8.2 1.8-3.6 0-6.9-.9-9.7-2.6-2.8-1.7-4.8-4.1-6-7.1l8.7-3.6c.6 1.6 1.5 2.9 2.7 3.7 1.2.8 2.6 1.3 4.3 1.3 1.9 0 3.6-.5 4.9-1.6 1.3-1.1 2-2.5 2-4.2 0-1.7-.7-3.1-2-4.2-1.3-1.1-3-1.6-5-1.6h-2.2zm26.7-25h-9.7l-2 .3-2.1 6.7 5.2-2v36.2h8.6z" />
      <path fill="#EA4335" d="M152.6 200H47.4L42 175.4l5.4-22.8h105.2l5.4 23.5z" />
      <path fill="#34A853" d="M0 152.6v36.9C0 195.3 4.7 200 10.5 200h36.9v-47.4z" />
      <path fill="#188038" d="M152.6 47.4v105.2H200V47.4L176.3 42z" />
      <path fill="#FBBC04" d="M200 47.4V10.5C200 4.7 195.3 0 189.5 0h-36.9l-5.4 23.7 5.4 23.7L176.3 53z" />
      <path fill="#1967D2" d="M152.6 0H10.5C4.7 0 0 4.7 0 10.5v142.1h47.4V47.4h105.2z" />
    </svg>
  )
}

export function SlackLogo({ className = "", dim = false }: LogoProps) {
  if (dim) {
    return (
      <svg
        viewBox="0 0 24 24"
        className={`${sizeClass} ${className}`}
        fill="currentColor"
        aria-hidden
      >
        <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zm1.271 0a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zm0 1.271a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zm10.122 2.521a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zm-1.268 0a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zm-2.523 10.122a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zm0-1.268a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" />
      </svg>
    )
  }
  return (
    <svg
      viewBox="0 0 24 24"
      className={`${sizeClass} ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52z" fill="#E01E5A" />
      <path d="M6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313z" fill="#E01E5A" />
      <path d="M8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834z" fill="#36C5F0" />
      <path d="M8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312z" fill="#36C5F0" />
      <path d="M18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834z" fill="#2EB67D" />
      <path d="M17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312z" fill="#2EB67D" />
      <path d="M15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52z" fill="#ECB22E" />
      <path d="M15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" fill="#ECB22E" />
    </svg>
  )
}

export function JiraLogo({ className = "", dim = false }: LogoProps) {
  const color = dim ? "currentColor" : "#2684FF"
  return (
    <svg
      viewBox="0 0 24 24"
      className={`${sizeClass} ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        fill={color}
        d="M11.571 11.513H0a5.218 5.218 0 0 0 5.215 5.215h2.129v2.057A5.215 5.215 0 0 0 12.559 24V12.502a.99.99 0 0 0-.988-.989zm5.715-5.799H5.715a5.215 5.215 0 0 0 5.215 5.214h2.129v2.058a5.218 5.218 0 0 0 5.215 5.214V6.703a.99.99 0 0 0-.988-.989zm5.726-5.714H11.43a5.215 5.215 0 0 0 5.215 5.214h2.129v2.058A5.218 5.218 0 0 0 24 12.488V.989A.99.99 0 0 0 23.012 0z"
      />
    </svg>
  )
}

export function LinearLogo({ className = "", dim = false }: LogoProps) {
  const color = dim ? "currentColor" : "#5E6AD2"
  return (
    <svg
      viewBox="0 0 24 24"
      className={`${sizeClass} ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        fill={color}
        d="M.403 13.795c-.077-.388.4-.633.68-.353l9.475 9.475c.28.28.035.757-.353.68A12.005 12.005 0 0 1 .403 13.795zM.012 9.998a.486.486 0 0 0 .142.382l13.466 13.466a.486.486 0 0 0 .382.142 12.067 12.067 0 0 0 2.617-.642L.654 7.381a12.067 12.067 0 0 0-.642 2.617zM1.93 5.302a.486.486 0 0 0 .073.6L18.098 21.997a.486.486 0 0 0 .6.073 12.097 12.097 0 0 0 2.022-1.547L3.477 3.28A12.097 12.097 0 0 0 1.93 5.302zM5.302 1.93A12.06 12.06 0 0 1 12 0c6.627 0 12 5.373 12 12a12.06 12.06 0 0 1-1.93 6.698c-.15.226-.456.246-.643.06L5.242 2.573c-.187-.187-.166-.494.06-.643z"
      />
    </svg>
  )
}

export function NotionLogo({ className = "", dim = false }: LogoProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`${sizeClass} ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <rect x="2.5" y="2.5" width="19" height="19" rx="2.5" fill={dim ? "transparent" : "#fff"} stroke="currentColor" strokeWidth={dim ? "1.6" : "0"} />
      <path
        fill={dim ? "currentColor" : "#000"}
        d="M8.4 7.9v8.2h1.6V11l4 5.1h1.6V7.9h-1.6v5.1l-4-5.1H8.4z"
      />
    </svg>
  )
}

export function TeamsLogo({ className = "", dim = false }: LogoProps) {
  // Simplified placeholder mark for Microsoft Teams — purple rounded
  // square with a stylized chat bubble + person silhouette. Used in a
  // nominative-fair-use context to identify the integration partner.
  const fill = dim ? "currentColor" : "#4B53BC"
  return (
    <svg
      viewBox="0 0 24 24"
      className={`${sizeClass} ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <rect x="2" y="2" width="20" height="20" rx="4.5" fill={fill} />
      <circle cx="12" cy="9" r="2.4" fill="#fff" />
      <path
        d="M7.5 17.5c0-2.49 2.02-4.5 4.5-4.5s4.5 2.01 4.5 4.5v.5h-9v-.5z"
        fill="#fff"
      />
      <circle cx="17.6" cy="8" r="1.7" fill="#fff" opacity="0.85" />
      <path
        d="M14.6 14.6a4.6 4.6 0 0 1 2.5-.7c1.55 0 2.9.94 2.9 2.5v1.6h-3.8a5.7 5.7 0 0 0-1.6-3.4z"
        fill="#fff"
        opacity="0.85"
      />
    </svg>
  )
}
