import { WorkShell } from "./work-navigation";

const today = [
  {
    code: "PAY-482",
    priority: "High",
    project: "Payments API",
    status: "In Progress",
    title: "Implement payment webhook"
  },
  {
    code: "AUTH-491",
    priority: "Medium",
    project: "Auth Service",
    status: "Code Review",
    title: "Refactor authentication"
  }
];
const recent = [
  { code: "DEV-470", title: "Docker configuration" },
  { code: "PAY-451", title: "Payment retry handling" }
];
const filters = ["All", "Today", "Upcoming", "Overdue", "Assigned", "Watching"];

export function MyWorkWorkspace() {
  return (
    <WorkShell current="My Work">
      <main className="mx-auto w-full max-w-6xl px-5 py-8 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b pb-6">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.12em] text-primary">
              My Work
            </p>
            <h1 className="pt-2 text-3xl font-semibold tracking-tight">
              Your personal command center
            </h1>
          </div>
          <nav aria-label="My Work filters" className="flex flex-wrap gap-1">
            {filters.map((filter) => (
              <button
                className={`rounded-md px-3 py-1.5 text-sm font-medium ${filter === "All" ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted"}`}
                key={filter}
                type="button"
              >
                {filter}
              </button>
            ))}
          </nav>
        </div>
        <WorkList items={today} title="Today" />
        <section className="border-t py-7">
          <h2 className="text-sm font-semibold uppercase tracking-[0.1em] text-muted-foreground">
            Recently worked on
          </h2>
          <div className="divide-y pt-3">
            {recent.map((item) => (
              <a
                className="flex items-center gap-3 py-4 hover:text-primary"
                href={`/app/devkit/tasks?task=${item.code}`}
                key={item.code}
              >
                <span className="font-mono text-sm text-muted-foreground">{item.code}</span>
                <strong>{item.title}</strong>
              </a>
            ))}
          </div>
        </section>
      </main>
    </WorkShell>
  );
}

function WorkList({ items, title }: { items: typeof today; title: string }) {
  return (
    <section className="py-7">
      <h2 className="text-sm font-semibold uppercase tracking-[0.1em] text-muted-foreground">
        {title}
      </h2>
      <div className="divide-y pt-3">
        {items.map((item) => (
          <article className="py-5" key={item.code}>
            <div className="flex flex-wrap items-baseline gap-3">
              <a
                className="font-mono text-sm font-semibold text-primary"
                href={`/app/devkit/tasks?task=${item.code}`}
              >
                {item.code}
              </a>
              <h3 className="text-base font-semibold">{item.title}</h3>
            </div>
            <p className="pt-2 text-sm text-muted-foreground">
              {item.priority} · {item.status} · {item.project}
            </p>
            <ShortcutRow code={item.code} />
          </article>
        ))}
      </div>
    </section>
  );
}

function ShortcutRow({ code }: { code: string }) {
  const links = ["Task", "Project", "Repository", "Branch", "Pull Request", "CI", "Deployment"];
  return (
    <nav aria-label={`${code} resources`} className="flex flex-wrap gap-x-4 gap-y-2 pt-4">
      {links.map((link) => (
        <a
          className="text-xs font-medium text-muted-foreground hover:text-primary hover:underline"
          href={`/app/devkit/tasks?task=${code}&view=${encodeURIComponent(link.toLowerCase())}`}
          key={link}
        >
          {link} →
        </a>
      ))}
    </nav>
  );
}
