import {
  CalendarRangeIcon,
  CircleDotIcon,
  ClipboardCheckIcon,
  FolderKanbanIcon,
  GitPullRequestArrowIcon,
  LayoutDashboardIcon,
  ListChecksIcon,
  MapIcon
} from "lucide-react";
import { WorkShell } from "./work-navigation";

const destinations = [
  {
    description: "A combined view of engineering work.",
    icon: LayoutDashboardIcon,
    title: "Overview",
    url: "/app/devkit/overview"
  },
  {
    description: "Your assigned and recently updated work.",
    icon: ClipboardCheckIcon,
    title: "My Work",
    url: "/app/devkit/my-work"
  },
  {
    description: "Products and repositories being delivered.",
    icon: FolderKanbanIcon,
    title: "Projects",
    url: "/app/devkit/projects"
  },
  {
    description: "Small, actionable units of delivery.",
    icon: ListChecksIcon,
    title: "Tasks",
    url: "/app/devkit/tasks"
  },
  {
    description: "Problems and blockers requiring resolution.",
    icon: CircleDotIcon,
    title: "Issues",
    url: "/app/devkit/issues"
  },
  {
    description: "Initiatives and planned product direction.",
    icon: MapIcon,
    title: "Roadmap",
    url: "/app/devkit/roadmap"
  },
  {
    description: "Time-boxed execution and team commitments.",
    icon: CalendarRangeIcon,
    title: "Sprints",
    url: "/app/devkit/sprints"
  },
  {
    description: "Release readiness, versions, and delivery history.",
    icon: GitPullRequestArrowIcon,
    title: "Releases",
    url: "/app/devkit/releases"
  }
] as const;

const workSummary = [
  {
    context: "2 due today · 1 awaiting review",
    label: "active",
    stat: "8",
    title: "My Work",
    url: "/app/devkit/my-work"
  },
  {
    context: "3 healthy · 1 needs attention",
    label: "active",
    stat: "4",
    title: "Projects",
    url: "/app/devkit/projects"
  },
  {
    context: "6 in progress · 4 due this week",
    label: "open",
    stat: "23",
    title: "Tasks",
    url: "/app/devkit/tasks"
  },
  {
    context: "3 high priority · 2 blocked",
    label: "open",
    stat: "12",
    title: "Issues",
    url: "/app/devkit/issues"
  },
  {
    context: "6 initiatives · next milestone Sep 15",
    label: "planning horizon",
    stat: "Q3 / Q4",
    title: "Roadmap",
    url: "/app/devkit/roadmap"
  },
  {
    context: "Next: DevKit 1.1 · 5 days",
    label: "upcoming",
    stat: "2",
    title: "Releases",
    url: "/app/devkit/releases"
  }
] as const;

export function WorkOverviewWorkspace() {
  return (
    <WorkShell current="Overview">
      <main className="mx-auto w-full max-w-7xl px-5 py-8 lg:px-8">
        <header className="border-b pb-7">
          <h1 className="text-3xl font-semibold tracking-tight">
            Everything happening across your engineering work.
          </h1>
          <p className="max-w-2xl pt-2 text-base leading-7 text-muted-foreground">
            Everything you need to plan, manage, and complete engineering work.
          </p>
          <nav aria-label="Work sections" className="flex flex-wrap gap-2 pt-6">
            {destinations.map((item) => (
              <a
                className="rounded-lg border bg-background px-3 py-2 text-sm font-medium transition-colors hover:border-primary/40 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                href={item.url}
                key={item.title}
              >
                {item.title}
              </a>
            ))}
          </nav>
        </header>

        <section className="grid gap-4 py-7 sm:grid-cols-2 lg:grid-cols-3">
          {workSummary.map((item) => (
            <a
              className="group flex min-h-44 flex-col justify-between rounded-xl border bg-card p-5 transition-transform hover:-translate-y-0.5 hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              href={item.url}
              key={item.title}
            >
              <span>
                <strong className="block text-lg font-semibold group-hover:text-primary">
                  {item.title}
                </strong>
                <span className="flex items-baseline gap-2 pt-4">
                  <strong className="text-3xl font-semibold tracking-tight">{item.stat}</strong>
                  <span className="text-sm text-muted-foreground">{item.label}</span>
                </span>
                <span className="block pt-3 text-sm text-muted-foreground">{item.context}</span>
              </span>
              <span className="text-sm font-medium text-primary">View →</span>
            </a>
          ))}
        </section>
      </main>
    </WorkShell>
  );
}

export function WorkSectionWorkspace({ section }: { section: "Issues" | "Releases" | "Sprints" }) {
  const destination = destinations.find((item) => item.title === section);
  return (
    <WorkShell current={section}>
      <main className="mx-auto w-full max-w-6xl px-5 py-8 lg:px-8">
        <a className="text-sm font-medium text-primary hover:underline" href="/app/devkit/overview">
          Work overview
        </a>
        <header className="border-b py-6">
          <h1 className="text-3xl font-semibold tracking-tight">{section}</h1>
          <p className="pt-2 text-base text-muted-foreground">{destination?.description}</p>
        </header>
        <section className="py-12">
          <h2 className="text-lg font-semibold">Ready for your workflow</h2>
          <p className="max-w-xl pt-2 text-sm leading-6 text-muted-foreground">
            This workspace is connected to Work navigation and ready for its persisted planning and
            delivery workflow.
          </p>
        </section>
      </main>
    </WorkShell>
  );
}
