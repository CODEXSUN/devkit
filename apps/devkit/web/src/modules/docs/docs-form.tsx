import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Input, Textarea } from "@codexsun/ui";
import { apiGet, apiPut } from "../../shared/api/devkit-api";

export type DocumentationFormField = {
  label: string;
  name: string;
  placeholder?: string;
  required?: boolean;
  type?: "textarea" | "text";
};

type DatabaseFormProps = {
  description?: string;
  fields: DocumentationFormField[];
  formKey: string;
  pageSlug: string;
  submitLabel?: string;
  title: string;
};

type FormResult = { updatedAt: string | null; values: Record<string, string> };

export function DatabaseForm({
  description,
  fields,
  formKey,
  pageSlug,
  submitLabel = "Save notes",
  title
}: DatabaseFormProps) {
  const queryClient = useQueryClient();
  const queryKey = ["docs", "form", pageSlug, formKey] as const;
  const query = useQuery({
    queryKey,
    queryFn: () => apiGet<FormResult>(`/docs/forms/${pageSlug}/${formKey}`)
  });
  const [values, setValues] = useState<Record<string, string>>({});
  const mutation = useMutation({
    mutationFn: (nextValues: Record<string, string>) =>
      apiPut<FormResult>(`/docs/forms/${pageSlug}/${formKey}`, { values: nextValues }),
    onSuccess: (result) => {
      setValues(result.values);
      queryClient.setQueryData(queryKey, result);
    }
  });

  useEffect(() => {
    if (query.data) setValues(query.data.values);
  }, [query.data]);

  return (
    <section
      className="mt-8 rounded-xl border bg-muted/20 p-5"
      aria-labelledby={`${formKey}-title`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="border-0 pt-0 text-xl" id={`${formKey}-title`}>
            {title}
          </h2>
          {description ? <p className="pt-2 text-sm leading-6">{description}</p> : null}
        </div>
        {query.data?.updatedAt ? (
          <span className="text-xs text-muted-foreground">Saved</span>
        ) : null}
      </div>
      <form
        className="mt-5 grid gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          mutation.mutate(values);
        }}
      >
        {fields.map((field) => (
          <label className="grid gap-1.5 text-sm font-medium" key={field.name}>
            {field.label}
            {field.type === "textarea" ? (
              <Textarea
                onChange={(event) =>
                  setValues((current) => ({ ...current, [field.name]: event.target.value }))
                }
                placeholder={field.placeholder}
                required={field.required}
                rows={5}
                value={values[field.name] ?? ""}
              />
            ) : (
              <Input
                onChange={(event) =>
                  setValues((current) => ({ ...current, [field.name]: event.target.value }))
                }
                placeholder={field.placeholder}
                required={field.required}
                value={values[field.name] ?? ""}
              />
            )}
          </label>
        ))}
        {query.isError ? (
          <p className="text-sm text-destructive">The saved form values could not be loaded.</p>
        ) : null}
        {mutation.isError ? (
          <p className="text-sm text-destructive">The form could not be saved. Please try again.</p>
        ) : null}
        <div className="flex items-center gap-3">
          <Button disabled={query.isLoading || mutation.isPending} type="submit">
            {mutation.isPending ? "Saving…" : submitLabel}
          </Button>
          {mutation.isSuccess ? (
            <span className="text-sm text-muted-foreground">Saved.</span>
          ) : null}
        </div>
      </form>
    </section>
  );
}
