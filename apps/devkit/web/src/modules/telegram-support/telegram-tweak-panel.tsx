import { Button } from "@codexsun/ui/components/button";
export function TelegramTweakPanel({ compact, onCompactChange }: { compact: boolean; onCompactChange: (value: boolean) => void }) {
  return <div className="fixed bottom-5 right-5 z-30 flex items-center gap-2 rounded-full border bg-background/95 p-1.5 shadow-lg backdrop-blur" aria-label="Display settings">
    <span className="px-2 text-xs font-medium text-muted-foreground">Density</span>
    <Button size="sm" variant={compact ? "default" : "ghost"} onClick={() => onCompactChange(true)}>Compact</Button>
    <Button size="sm" variant={!compact ? "default" : "ghost"} onClick={() => onCompactChange(false)}>Relaxed</Button>
  </div>;
}
