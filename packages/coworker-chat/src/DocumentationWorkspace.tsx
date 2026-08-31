import { ArrowLeft, ArrowRight, Network, Save } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button, Input, Textarea } from "@codexsun/ui";

type DocumentationPage = "architecture" | "product-structure";
type FormResult = { updatedAt: string | null; values: Record<string, string> };

const documentationPages: Array<{ id: DocumentationPage; title: string }> = [
  { id: "architecture", title: "Architecture" },
  { id: "product-structure", title: "Product structure" }
];

export function DocumentationWorkspace({ apiUrl, token }: { apiUrl: string; token: string }) {
  const [page, setPage] = useState<DocumentationPage>("architecture");
  const pageIndex = documentationPages.findIndex((item) => item.id === page);
  const previousPage = documentationPages[pageIndex - 1];
  const nextPage = documentationPages[pageIndex + 1];
  return (
    <section className="documentation-space">
      <aside className="documentation-nav">
        <p>Foundation</p>
        <button
          aria-current={page === "architecture" ? "page" : undefined}
          onClick={() => setPage("architecture")}
          type="button"
        >
          Architecture
        </button>
        <button
          aria-current={page === "product-structure" ? "page" : undefined}
          onClick={() => setPage("product-structure")}
          type="button"
        >
          Product structure
        </button>
      </aside>
      <article className="documentation-article">
        {page === "architecture" ? (
          <ArchitecturePage />
        ) : (
          <ProductStructurePage apiUrl={apiUrl} token={token} />
        )}
        <nav aria-label="Documentation page navigation" className="documentation-pagination">
          {previousPage ? (
            <button onClick={() => setPage(previousPage.id)} type="button">
              <ArrowLeft size={17} />
              <span>
                <small>Previous</small>
                {previousPage.title}
              </span>
            </button>
          ) : (
            <span />
          )}
          {nextPage ? (
            <button
              className="documentation-pagination-next"
              onClick={() => setPage(nextPage.id)}
              type="button"
            >
              <span>
                <small>Next</small>
                {nextPage.title}
              </span>
              <ArrowRight size={17} />
            </button>
          ) : (
            <span />
          )}
        </nav>
        <div aria-hidden="true" className="documentation-bottom-space" />
      </article>
    </section>
  );
}

function ArchitecturePage() {
  return (
    <>
      <p className="documentation-crumb">Docs / Foundation / Architecture</p>
      <h1>Architecture</h1>
      <p className="documentation-lead">
        One organization → one engineering platform → one source-of-truth repository → independent
        products → shared platform capabilities.
      </p>
      <div className="documentation-diagram">
        <span>Organization</span>
        <i />
        <span>Engineering platform</span>
        <i />
        <strong>Engineering repository</strong>
        <i />
        <span>Independent products</span>
      </div>
      <h2>Operating model</h2>
      <p>
        CodeLogicX coordinates product work through one engineering platform. Each product retains
        its own source code, data, scope, release lifecycle, and owner-approved decisions.
      </p>
      <h2>Shared platform capabilities</h2>
      <ul>
        <li>Identity and access controls</li>
        <li>Source control and code review</li>
        <li>Testing, release, and deployment checks</li>
        <li>Infrastructure health and observability</li>
      </ul>
    </>
  );
}

function ProductStructurePage({ apiUrl, token }: { apiUrl: string; token: string }) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [state, setState] = useState<"idle" | "loading" | "saved" | "error">("loading");
  const request = useCallback(
    async (method: "GET" | "PUT", nextValues?: Record<string, string>) => {
      const response = await fetch(
        `${apiUrl.replace(/\/+$/u, "")}/api/devkit/docs/forms/product-structure/project-n-definition`,
        {
          ...(nextValues ? { body: JSON.stringify({ values: nextValues }) } : {}),
          headers: {
            ...(nextValues ? { "Content-Type": "application/json" } : {}),
            Authorization: `Bearer ${token}`
          },
          method
        }
      );
      const result = (await response.json()) as {
        data?: FormResult;
        error?: { message?: string };
        success: boolean;
      };
      if (!response.ok || !result.success)
        throw new Error(result.error?.message || "Documentation form request failed.");
      return result.data!;
    },
    [apiUrl, token]
  );
  useEffect(() => {
    void request("GET")
      .then((result) => {
        setValues(result.values);
        setState("idle");
      })
      .catch(() => setState("error"));
  }, [request]);
  async function save() {
    setState("loading");
    try {
      setValues((await request("PUT", values)).values);
      setState("saved");
    } catch {
      setState("error");
    }
  }
  return (
    <>
      <p className="documentation-crumb">Docs / Foundation / Product structure</p>
      <h1>Product structure</h1>
      <p className="documentation-lead">
        Independent products share engineering controls without merging their business rules, data,
        or release decisions.
      </p>
      <h2>Product boundary rule</h2>
      <p>
        Keep a capability inside a product when only that product needs it. Share a capability only
        when several products need the same general behavior.
      </p>
      <section className="documentation-form">
        <div>
          <Network size={18} />
          <h2>Project N approval notes</h2>
          <p>
            Record owner-approved details. These notes are saved to your signed-in DevKit account.
          </p>
        </div>
        <label>
          Approving owner
          <Input
            onChange={(event) => setValues({ ...values, owner: event.target.value })}
            placeholder="Name or role"
            value={values.owner ?? ""}
          />
        </label>
        <label>
          Approved definition
          <Textarea
            onChange={(event) => setValues({ ...values, decision: event.target.value })}
            placeholder="Purpose, users, scope, and first workflow"
            value={values.decision ?? ""}
          />
        </label>
        {state === "error" ? (
          <p className="documentation-error">Saved notes could not be loaded or saved.</p>
        ) : null}
        <Button
          disabled={state === "loading" || !values.owner?.trim() || !values.decision?.trim()}
          onClick={() => void save()}
          type="button"
        >
          <Save size={16} />
          {state === "loading" ? "Saving…" : "Save approval notes"}
        </Button>
        {state === "saved" ? <small>Saved.</small> : null}
      </section>
    </>
  );
}
