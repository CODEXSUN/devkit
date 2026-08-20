import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AgentMarkdown } from "./AgentMarkdown";

describe("AgentMarkdown", () => {
  it("renders GitHub-flavored agent content without raw HTML", () => {
    const html = renderToStaticMarkup(
      <AgentMarkdown text={[
        "## Result",
        "",
        "- [x] Checked `src/App.tsx`",
        "",
        "~~~ts",
        "const ready = true;",
        "~~~",
        "",
        "| File | State |",
        "| --- | --- |",
        "| App.tsx | Ready |",
        "",
        "<script>alert('unsafe')</script>",
      ].join("\n")} />
    );

    expect(html).toContain("<h2>Result</h2>");
    expect(html).toContain("const ready = true;");
    expect(html).toContain("<table>");
    expect(html).toContain('type="checkbox"');
    expect(html).not.toContain("<script>");
  });
});
