"use client"

/**
 * Decorative AI presence orb. Pure CSS — no images, no JS animation.
 * The CSS pulses the core, expands concentric rings, and spins two
 * orbiting particles. Respects prefers-reduced-motion via waitlist.css.
 */
export function AIOrb({ className = "" }: { className?: string }) {
  return (
    <div className={`cf-orb ${className}`} aria-hidden>
      <div className="cf-orb-orbit" />
      <span className="cf-orb-ring" />
      <span className="cf-orb-ring" />
      <span className="cf-orb-ring" />
      <div className="cf-orb-core" />
    </div>
  )
}
