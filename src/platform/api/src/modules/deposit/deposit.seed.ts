import { sql, type Kysely } from "kysely";
import type { TradesDatabase } from "../../database/schema.js";

export const depositSeed = {
  description: "Normalize persisted deposit transaction codes.",
  key: "trades.deposit.seed"
};

export function seedDepositModule(database: Kysely<TradesDatabase>) {
  return sql`
    UPDATE trades_deposits SET tg_code=UPPER(TRIM(tg_code)),
      name=NULLIF(TRIM(name),''),reference=NULLIF(TRIM(reference),'')
  `.execute(database);
}
