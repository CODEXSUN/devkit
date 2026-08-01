import { sql, type Kysely } from "kysely";
import type { TradesDatabase } from "../../database/schema.js";

export const paymentSeed = {
  description: "Normalize persisted payment transaction codes.",
  key: "trades.payment.seed"
};

export function seedPaymentModule(database: Kysely<TradesDatabase>) {
  return sql`
    UPDATE trades_payments SET tg_code=UPPER(TRIM(tg_code)),
      name=NULLIF(TRIM(name),''),reference=NULLIF(TRIM(reference),'')
  `.execute(database);
}
