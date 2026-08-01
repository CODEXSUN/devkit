import { sql, type Kysely } from "kysely";
import type { TradesDatabase } from "../../database/schema.js";

export const commissionSeed = {
  description: "Reconcile active common percentage variants for unsettled commission entries.",
  key: "trades.commission.seed"
};

export async function seedCommissionModule(database: Kysely<TradesDatabase>) {
  await sql`
    UPDATE trades_commission_entry_lines line
    INNER JOIN trades_commission_entries entry ON entry.id=line.commission_entry_id
    INNER JOIN trades_commission_variants variant ON variant.id=line.commission_variant_id
    SET line.percentage=variant.percentage,line.amount=ROUND(entry.amount*variant.percentage/100,2)
    WHERE entry.settled_at IS NULL
  `.execute(database);
}
