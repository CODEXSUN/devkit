import { randomBytes } from "node:crypto";
import type { Kysely } from "kysely";
import type { DevkitDatabase } from "../../database/schema.js";

export class DocsRepository {
  constructor(private readonly database: Kysely<DevkitDatabase>) {}

  findFormValues(actorId: string, pageSlug: string, formKey: string) {
    return this.database
      .selectFrom("devkit_docs_form_values")
      .select(["values_json", "updated_at"])
      .where("actor_id", "=", actorId)
      .where("page_slug", "=", pageSlug)
      .where("form_key", "=", formKey)
      .executeTakeFirst();
  }

  async saveFormValues(
    actorId: string,
    pageSlug: string,
    formKey: string,
    values: Record<string, string>
  ) {
    const existing = await this.findFormValues(actorId, pageSlug, formKey);
    const valuesJson = JSON.stringify(values);
    if (existing) {
      await this.database
        .updateTable("devkit_docs_form_values")
        .set({ updated_at: new Date(), values_json: valuesJson })
        .where("actor_id", "=", actorId)
        .where("page_slug", "=", pageSlug)
        .where("form_key", "=", formKey)
        .executeTakeFirstOrThrow();
    } else {
      await this.database
        .insertInto("devkit_docs_form_values")
        .values({
          actor_id: actorId,
          form_key: formKey,
          page_slug: pageSlug,
          uuid: randomBytes(16).toString("hex"),
          values_json: valuesJson
        })
        .executeTakeFirstOrThrow();
    }
    return this.findFormValues(actorId, pageSlug, formKey);
  }
}
