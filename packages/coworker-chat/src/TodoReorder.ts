export type DropPlacement = "after" | "before";

export function dropPlacement(clientY: number, top: number, height: number): DropPlacement {
  return clientY < top + height / 2 ? "before" : "after";
}

export function reorderById<T extends { id: string }>(
  items: T[],
  sourceId: string,
  targetId: string,
  placement: DropPlacement
) {
  if (sourceId === targetId) return items;
  const sourceIndex = items.findIndex((item) => item.id === sourceId);
  if (sourceIndex < 0 || !items.some((item) => item.id === targetId)) return items;
  const next = [...items];
  const [source] = next.splice(sourceIndex, 1);
  if (!source) return items;
  const targetIndex = next.findIndex((item) => item.id === targetId);
  next.splice(targetIndex + (placement === "after" ? 1 : 0), 0, source);
  return next;
}
