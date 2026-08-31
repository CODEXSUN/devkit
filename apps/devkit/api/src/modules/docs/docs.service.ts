import { getDevkitDatabase } from "../../database/devkit-database.js";
import { requireDevkitActor } from "../../request-context.js";
import { DocsRepository } from "./docs.repository.js";

export class DocsService {
  private readonly repository = new DocsRepository(getDevkitDatabase());

  async getFormValues(pageSlug: string, formKey: string) {
    const row = await this.repository.findFormValues(requireDevkitActor().id, pageSlug, formKey);
    return toFormValues(row);
  }

  async saveFormValues(pageSlug: string, formKey: string, values: Record<string, string>) {
    const row = await this.repository.saveFormValues(
      requireDevkitActor().id,
      pageSlug,
      formKey,
      values
    );
    return toFormValues(row);
  }
}

function toFormValues(row: { updated_at: Date; values_json: string } | undefined) {
  if (!row) return { updatedAt: null, values: {} };
  return {
    updatedAt: new Date(row.updated_at).toISOString(),
    values: JSON.parse(row.values_json) as Record<string, string>
  };
}
