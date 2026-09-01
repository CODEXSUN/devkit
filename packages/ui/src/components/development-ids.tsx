import { useEffect, useState } from "react";

type DevelopmentIdsOverlayProps = {
  enabled: boolean;
  surface: "desktop" | "web";
};

type TechnicalLabel = {
  id: string;
  key: string;
  left: number;
  number: number;
  top: number;
};

const TARGET_SELECTOR = [
  "[data-tech-id]",
  "main",
  "section",
  "article",
  "aside",
  "nav[aria-label]",
  '[class*="card"]',
  '[class*="panel"]',
  '[class*="service"]',
  '[class*="workspace"]'
].join(",");

export function DevelopmentIdsOverlay({ enabled, surface }: DevelopmentIdsOverlayProps) {
  const [labels, setLabels] = useState<TechnicalLabel[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;

    let frame = 0;
    const scheduleUpdate = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setLabels(collectTechnicalLabels(surface)));
    };
    const observer = new MutationObserver(scheduleUpdate);
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["aria-label", "class", "data-tech-id", "id"],
      childList: true,
      subtree: true
    });
    window.addEventListener("resize", scheduleUpdate);
    window.addEventListener("scroll", scheduleUpdate, true);
    window.addEventListener("popstate", scheduleUpdate);
    scheduleUpdate();

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", scheduleUpdate);
      window.removeEventListener("scroll", scheduleUpdate, true);
      window.removeEventListener("popstate", scheduleUpdate);
    };
  }, [enabled, surface]);

  if (!enabled) return null;

  const pageId = getPageId(surface);
  const copy = async (id: string) => {
    await copyText(id);
    setCopiedId(id);
    window.setTimeout(() => setCopiedId((current) => (current === id ? null : current)), 1200);
  };

  return (
    <div className="development-ids-overlay" data-development-ids-overlay>
      {labels.map((label) => (
        <button
          aria-label={`Copy technical ID ${label.id}`}
          className="development-id-badge development-id-badge--target"
          key={label.key}
          onClick={() => void copy(label.id)}
          style={{ left: label.left, top: label.top }}
          title={`Copy technical ID: ${label.id}`}
          type="button"
        >
          {copiedId === label.id ? "✓" : label.number}
        </button>
      ))}
      <button
        aria-label={`Copy page ID ${pageId}`}
        className="development-id-badge development-id-badge--page"
        onClick={() => void copy(pageId)}
        title={`Copy page ID: ${pageId}`}
        type="button"
      >
        {copiedId === pageId ? "✓" : 0}
      </button>
    </div>
  );
}

function collectTechnicalLabels(surface: DevelopmentIdsOverlayProps["surface"]) {
  const pageId = getPageId(surface);
  const duplicateCounts = new Map<string, number>();
  const labels: TechnicalLabel[] = [];
  const targets = document.querySelectorAll<HTMLElement>(TARGET_SELECTOR);

  targets.forEach((target, index) => {
    if (labels.length >= 120) return;
    if (target.closest("[data-development-ids-overlay]")) return;
    const rect = target.getBoundingClientRect();
    if (!isVisible(rect, target)) return;
    const baseId = getTargetId(target, pageId);
    if (!baseId) return;
    const duplicate = duplicateCounts.get(baseId) ?? 0;
    duplicateCounts.set(baseId, duplicate + 1);
    const id = duplicate ? `${baseId}.${duplicate + 1}` : baseId;
    const number = labels.length + 1;
    const position = findMarkerPosition(rect.left + 4, rect.top + 4, number, labels);
    labels.push({ id, key: `${id}:${index}`, number, ...position });
  });

  return labels;
}

function findMarkerPosition(left: number, top: number, number: number, labels: TechnicalLabel[]) {
  const width = markerWidth(number);
  const baseLeft = clamp(left, 4, innerWidth - width - 4);
  let nextLeft = baseLeft;
  let nextTop = clamp(top, 4, innerHeight - 26);

  for (let attempt = 0; attempt < 40; attempt += 1) {
    if (!labels.some((label) => markersOverlap(nextLeft, nextTop, width, label))) {
      return { left: nextLeft, top: nextTop };
    }
    nextLeft += width + 4;
    if (nextLeft + width > innerWidth - 4) {
      nextLeft = baseLeft;
      nextTop = clamp(nextTop + 26, 4, innerHeight - 26);
    }
  }

  return { left: nextLeft, top: nextTop };
}

function markersOverlap(left: number, top: number, width: number, label: TechnicalLabel) {
  const gap = 2;
  return left < label.left + markerWidth(label.number) + gap
    && left + width + gap > label.left
    && top < label.top + 22 + gap
    && top + 22 + gap > label.top;
}

function markerWidth(number: number) {
  return Math.max(22, String(number).length * 7 + 10);
}

function getPageId(surface: DevelopmentIdsOverlayProps["surface"]) {
  const url = new URL(window.location.href);
  const path = slug(url.pathname) || surface;
  const view = url.searchParams.get("view");
  const tab = url.searchParams.get("tab");
  return ["page", path, view && slug(view), tab && slug(tab)].filter(Boolean).join(".");
}

function getTargetId(target: HTMLElement, pageId: string) {
  const explicitId = target.dataset.techId;
  if (explicitId) return explicitId;
  if (target.id && target.id !== "root") return `${pageId}.${slug(target.id)}`;
  const label = target.getAttribute("aria-label");
  if (label) return `${pageId}.${slug(label)}`;
  const classId = getMeaningfulClass(target.classList);
  if (classId) return `${pageId}.${slug(classId)}`;
  if (["MAIN", "SECTION", "ARTICLE", "ASIDE"].includes(target.tagName)) {
    return `${pageId}.${target.tagName.toLowerCase()}`;
  }
  return null;
}

function getMeaningfulClass(classList: DOMTokenList) {
  return [...classList].find((name) =>
    /(?:^|[-_])(card|panel|service|workspace)(?:$|[-_])/.test(name.toLowerCase())
  );
}

function isVisible(rect: DOMRect, target: HTMLElement) {
  const style = window.getComputedStyle(target);
  return rect.width > 24 && rect.height > 16 && rect.bottom > 0 && rect.right > 0 && rect.top < innerHeight && rect.left < innerWidth && style.visibility !== "hidden" && style.display !== "none";
}

function slug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.|\.$/g, "");
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum);
}

async function copyText(value: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }
  const input = document.createElement("textarea");
  input.value = value;
  input.style.position = "fixed";
  input.style.opacity = "0";
  document.body.append(input);
  input.select();
  document.execCommand("copy");
  input.remove();
}
