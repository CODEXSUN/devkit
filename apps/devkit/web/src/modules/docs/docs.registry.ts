import { lazy, type ComponentType, type LazyExoticComponent } from "react";

export type DocPage = {
  component: LazyExoticComponent<ComponentType>;
  description: string;
  group: string;
  slug: string;
  title: string;
};

const page = (
  slug: string,
  title: string,
  description: string,
  group: string,
  load: () => Promise<{ default: ComponentType }>
): DocPage => ({ component: lazy(load), description, group, slug, title });

export const docsPages = [
  page(
    "introduction",
    "Introduction",
    "Learn the CodeLogicX workspace structure.",
    "Get started",
    () => import("./content/introduction.mdx")
  ),
  page(
    "projects",
    "Projects",
    "Create projects and connect cloud sync.",
    "Work",
    () => import("./content/projects.mdx")
  ),
  page(
    "agent-workflow",
    "Agent workflow",
    "Plan, approve, implement, and review Agent work.",
    "Agents",
    () => import("./content/agent-workflow.mdx")
  ),
  page(
    "deployment",
    "Docker deployment",
    "Install and update the container runtime.",
    "Operations",
    () => import("./content/deployment.mdx")
  )
] as const;

export function findDocPage(slug: string | null) {
  return docsPages.find((entry) => entry.slug === slug) ?? docsPages[0];
}
