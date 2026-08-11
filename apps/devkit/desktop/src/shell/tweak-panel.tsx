import { SlidersHorizontal, X } from "lucide-react";
import { useState } from "react";

export function TweakPanel({
  density,
  onDensityChange
}: {
  density: "compact" | "relaxed";
  onDensityChange: (density: "compact" | "relaxed") => void;
}) {
  const [open, setOpen] = useState(false);
  if (!open)
    return (
      <button
        className="tweak-trigger"
        onClick={() => setOpen(true)}
        title="View options"
        type="button"
      >
        <SlidersHorizontal size={16} />
      </button>
    );
  return (
    <aside className="tweak-panel">
      <header>
        <strong>View options</strong>
        <button onClick={() => setOpen(false)} type="button">
          <X size={15} />
        </button>
      </header>
      <span>Spacing</span>
      <div>
        <button
          className={density === "compact" ? "active" : ""}
          onClick={() => onDensityChange("compact")}
          type="button"
        >
          Compact
        </button>
        <button
          className={density === "relaxed" ? "active" : ""}
          onClick={() => onDensityChange("relaxed")}
          type="button"
        >
          Relaxed
        </button>
      </div>
    </aside>
  );
}
