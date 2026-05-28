import type { BlogPost } from "@/lib/blog"
import { H2, H3, P, A, Callout } from "@/components/blog/prose"

const post: BlogPost = {
  slug: "scheduling-across-google-and-microsoft-teams",
  title: "Scheduling When Your Team Uses Google and Microsoft",
  description:
    "Practical strategies for finding meeting times across Gmail Calendar and Outlook — without the back-and-forth email chains.",
  date: "2025-05-15",
  tags: ["team-scheduling", "google-calendar", "microsoft-outlook", "remote-teams", "productivity"],
  author: "ChronoFlow Team",
  readTime: "6 min",
  sections: [
    { id: "mixed-stacks", title: "Mixed stacks are the default now" },
    { id: "failure-modes", title: "Why scheduling breaks down" },
    { id: "manual-workarounds", title: "Workarounds teams use today" },
    { id: "better-approach", title: "A better approach" },
    { id: "checklist", title: "Scheduling checklist" },
  ],
  content: () => (
    <article>
      <P>
        “What times work for you this week?” is easy when everyone shares one calendar system. It is
        painful when your team spans Google Workspace and Microsoft 365 — which is most startups,
        most enterprises after a merger, and most consulting teams working with clients on different
        stacks.
      </P>
      <P>
        The friction is not laziness. Free/busy data lives in two APIs with different sharing rules,
        time zone edge cases, and privacy defaults. This post covers why mixed-stack scheduling
        fails, what teams do today, and what actually helps.
      </P>

      <H2 id="mixed-stacks">Mixed stacks are the default now</H2>
      <P>
        Acquisitions, client work, and personal preference mean your eng lead might live in Google
        Calendar while PM and legal live in Outlook. External guests often cannot see your full
        calendar even when they can see you are “busy.”
      </P>
      <P>
        Tools built for one ecosystem — scheduling links tied to Google, Outlook add-ins that assume
        everyone is on Microsoft — solve half the problem and leave the other half to email threads.
      </P>

      <H2 id="failure-modes">Why scheduling breaks down</H2>
      <H3>Free/busy without context</H3>
      <P>
        Seeing a green slot does not mean it is a good slot. That hour might be focus time, a
        recurring hold, or travel after an in-office day. Availability without intent produces
        meetings stacked back-to-back with no prep buffer.
      </P>
      <H3>Time zone mistakes</H3>
      <P>
        “3 PM works” without a time zone has launched a thousand accidental 6 AM meetings. Mixed
        stacks make this worse because Outlook and Google display defaults differently for guests.
      </P>
      <H3>Email as the coordination layer</H3>
      <P>
        When tools cannot see across providers, humans become the integration layer. Seven replies to
        find a forty-minute slot is a tax on every cross-functional project.
      </P>

      <H2 id="manual-workarounds">Workarounds teams use today</H2>
      <P>
        <strong>Shared scheduling links</strong> (Calendly, Cal.com) work for external booking but
        break when you need four internal calendars at once across providers.
      </P>
      <P>
        <strong>“Throw options in a doc”</strong> — someone lists three times; three people reply
        with conflicts; repeat. Works, slowly.
      </P>
      <P>
        <strong>Delegate to an EA or team lead</strong> — effective, not scalable for most eng teams.
      </P>
      <P>
        <strong>Force everyone onto one provider</strong> — politically expensive and often impossible
        with clients.
      </P>

      <H2 id="better-approach">A better approach</H2>
      <P>
        What high-functioning mixed-stack teams converge on:
      </P>
      <P>
        <strong>One view of your own calendars first.</strong> Before you can schedule others, you
        need your Google and Outlook events in one place — with correct time zones and no duplicates.
      </P>
      <P>
        <strong>Team availability without full calendar sharing.</strong> Free/busy overlays for
        teammates (with permission) beat exporting screenshots of calendars into Slack.
      </P>
      <P>
        <strong>Propose, don&apos;t poll.</strong> Tools that suggest two or three optimal slots
        based on combined availability cut email rounds from seven to one.
      </P>
      <P>
        <strong>Write meetings to the right calendar.</strong> Creating the event on the organizer&apos;s
        provider and inviting guests on the other stack should Just Work — that is an integration
        problem, not a meeting problem.
      </P>
      <Callout type="tip">
        ChronoFlow is built for this exact split: unified Google + Outlook calendar, team scheduling
        with shared availability, and tasks that link back to the email thread that created the
        meeting prep.
      </Callout>

      <H2 id="checklist">Scheduling checklist</H2>
      <P>Before your next cross-provider meeting, confirm:</P>
      <P>
        Everyone confirmed time zone explicitly (city or UTC offset, not “afternoon”).<br />
        Video link and agenda are in the invite body, not a follow-up email.<br />
        Prep work is on someone&apos;s task list, not implied by the invite title.<br />
        Recurring meetings have an owner who checks attendance quarterly — stale recurrences clog
        calendars silently.
      </P>

      <P className="mt-10 border-t border-[var(--cf-border)] pt-8 text-[var(--cf-text-muted)]">
        See also:{" "}
        <A href="/blog/syncing-google-and-microsoft-calendars-programmatically">
          how unified calendar sync works under the hood
        </A>
        . Compare scheduling tools on our{" "}
        <A href="/alternatives">alternatives page</A> or{" "}
        <A href="/waitlist">join the beta</A>.
      </P>
    </article>
  ),
}

export default post
