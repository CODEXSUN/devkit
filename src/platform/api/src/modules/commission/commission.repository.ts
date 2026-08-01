import { randomBytes } from "node:crypto";
import { sql, type Kysely } from "kysely";
import type { TradesDatabase } from "../../database/schema.js";
import type {
  CommissionDirection,
  CommissionEntry,
  CommissionList,
  CommissionListFilters,
  CommissionSourcePayload,
  CommissionVariant,
  CommissionVariantSavePayload,
  CommissionVariantStatus
} from "./commission.types.js";

type VariantRow = {
  code: string;
  display_order: number;
  id: number;
  name: string;
  percentage: number | string;
  status: CommissionVariantStatus;
  uuid: string;
};
type EntryRow = {
  amount: number | string;
  direction: CommissionDirection;
  id: number;
  name: string | null;
  reference: string | null;
  settled_at: Date | string | null;
  settled_by: string | null;
  tg_code: string;
  transaction_date: Date | string;
  uuid: string;
  verified_at: Date | string | null;
  verified_by: string | null;
};
type LineRow = {
  amount: number | string;
  commission_entry_id: number;
  commission_variant_id: number;
  percentage: number | string;
  variant_name: string;
};

export class CommissionRepository {
  constructor(private readonly database: Kysely<TradesDatabase>) {}

  async list(
    direction: CommissionDirection,
    filters: CommissionListFilters = {}
  ): Promise<CommissionList> {
    const variants = await this.variants();
    const lifecycle = filters.lifecycle ?? "open";
    const entriesResult = await sql<EntryRow>`
      SELECT id,uuid,direction,transaction_date,tg_code,name,reference,amount,
        verified_at,verified_by,settled_at,settled_by
      FROM trades_commission_entries
      WHERE direction=${direction}
        AND (${lifecycle}='all' OR (${lifecycle}='open' AND settled_at IS NULL)
          OR (${lifecycle}='unverified' AND verified_at IS NULL AND settled_at IS NULL)
          OR (${lifecycle}='verified' AND verified_at IS NOT NULL AND settled_at IS NULL)
          OR (${lifecycle}='settled' AND settled_at IS NOT NULL))
        AND (${filters.dateFrom ?? ""}='' OR transaction_date>=${filters.dateFrom ?? ""})
        AND (${filters.dateTo ?? ""}='' OR transaction_date<=${filters.dateTo ?? ""})
      ORDER BY transaction_date DESC,id DESC
    `.execute(this.database);
    const ids = entriesResult.rows.map((row) => Number(row.id));
    const lineRows = ids.length
      ? (
          await sql<LineRow>`
          SELECT l.commission_entry_id,l.commission_variant_id,l.percentage,l.amount,v.name variant_name
          FROM trades_commission_entry_lines l INNER JOIN trades_commission_variants v ON v.id=l.commission_variant_id
          WHERE l.commission_entry_id IN (${sql.join(ids)}) AND v.status='active' ORDER BY v.display_order,v.id
        `.execute(this.database)
        ).rows
      : [];
    const entries = entriesResult.rows.map((row) => mapEntry(row, lineRows));
    return {
      entries,
      totals: {
        amount: money(entries.reduce((sum, entry) => sum + entry.amount, 0)),
        commission: money(entries.reduce((sum, entry) => sum + entry.totalCommission, 0)),
        variants: variants.map((variant) => ({
          amount: money(
            entries.reduce(
              (sum, entry) =>
                sum + (entry.lines.find((line) => line.variantId === variant.id)?.amount ?? 0),
              0
            )
          ),
          variantId: variant.id
        }))
      },
      variants
    };
  }

  async variants() {
    const result = await sql<VariantRow>`
      SELECT id,uuid,code,name,percentage,display_order,status FROM trades_commission_variants
      ORDER BY display_order,id
    `.execute(this.database);
    return result.rows.map(mapVariant);
  }

  async findVariant(id: number) {
    const result =
      await sql<VariantRow>`SELECT id,uuid,code,name,percentage,display_order,status FROM trades_commission_variants WHERE id=${id} LIMIT 1`.execute(
        this.database
      );
    return result.rows[0] ? mapVariant(result.rows[0]) : null;
  }

  async updateVariant(id: number, input: CommissionVariantSavePayload) {
    await this.database.transaction().execute(async (transaction) => {
      await sql`UPDATE trades_commission_variants SET name=${input.name},percentage=${input.percentage},status=${input.status} WHERE id=${id}`.execute(
        transaction
      );
      if (input.status === "inactive") {
        await sql`
          DELETE line FROM trades_commission_entry_lines line
          INNER JOIN trades_commission_entries entry ON entry.id=line.commission_entry_id
          WHERE line.commission_variant_id=${id} AND entry.settled_at IS NULL
        `.execute(transaction);
      } else {
        await sql`
          INSERT INTO trades_commission_entry_lines (uuid,commission_entry_id,commission_variant_id,percentage,amount)
          SELECT LEFT(SHA2(CONCAT('commission-line:',entry.uuid,':',${id}),256),8),entry.id,${id},${input.percentage},ROUND(entry.amount*${input.percentage}/100,2)
          FROM trades_commission_entries entry WHERE entry.settled_at IS NULL
          ON DUPLICATE KEY UPDATE percentage=VALUES(percentage),amount=VALUES(amount)
        `.execute(transaction);
      }
    });
    return this.findVariant(id);
  }

  async setSettled(
    direction: CommissionDirection,
    id: number,
    actorEmail: string,
    settled: boolean
  ) {
    await sql`UPDATE trades_commission_entries SET settled_at=${settled ? new Date() : null},
      settled_by=${settled ? actorEmail : null} WHERE id=${id} AND direction=${direction}`.execute(
      this.database
    );
    return this.findEntry(id, direction);
  }

  async setVerified(
    direction: CommissionDirection,
    id: number,
    actorEmail: string,
    verified: boolean
  ) {
    await sql`UPDATE trades_commission_entries SET verified_at=${verified ? new Date() : null},
      verified_by=${verified ? actorEmail : null} WHERE id=${id} AND direction=${direction}`.execute(
      this.database
    );
    return this.findEntry(id, direction);
  }

  async findEntry(id: number, direction: CommissionDirection) {
    const result =
      await sql<EntryRow>`SELECT id,uuid,direction,transaction_date,tg_code,name,reference,amount,verified_at,verified_by,settled_at,settled_by FROM trades_commission_entries WHERE id=${id} AND direction=${direction} LIMIT 1`.execute(
        this.database
      );
    if (!result.rows[0]) return null;
    const lines = (
      await sql<LineRow>`SELECT l.commission_entry_id,l.commission_variant_id,l.percentage,l.amount,v.name variant_name FROM trades_commission_entry_lines l INNER JOIN trades_commission_variants v ON v.id=l.commission_variant_id WHERE l.commission_entry_id=${id} AND v.status='active' ORDER BY v.display_order,v.id`.execute(
        this.database
      )
    ).rows;
    return mapEntry(result.rows[0], lines);
  }
}

export async function syncCommissionSourceEntry(
  database: Kysely<TradesDatabase>,
  input: CommissionSourcePayload
) {
  await sql`
    INSERT INTO trades_commission_entries (uuid,direction,source_record_id,transaction_date,tg_code,name,reference,amount)
    VALUES (${randomBytes(4).toString("hex")},${input.direction},${input.sourceRecordId},${input.date},${input.tgCode},${input.name},${input.reference},${input.amount})
    ON DUPLICATE KEY UPDATE transaction_date=VALUES(transaction_date),tg_code=VALUES(tg_code),name=VALUES(name),reference=VALUES(reference),amount=VALUES(amount),verified_at=NULL,verified_by=NULL,settled_at=NULL,settled_by=NULL
  `.execute(database);
  const entry = await sql<{
    id: number;
  }>`SELECT id FROM trades_commission_entries WHERE direction=${input.direction} AND source_record_id=${input.sourceRecordId} LIMIT 1`.execute(
    database
  );
  const entryId = Number(entry.rows[0]?.id);
  const variants = await sql<{
    id: number;
    percentage: number | string;
  }>`SELECT id,percentage FROM trades_commission_variants WHERE status='active'`.execute(database);
  for (const variant of variants.rows) {
    const percentage = Number(variant.percentage);
    await sql`
      INSERT INTO trades_commission_entry_lines (uuid,commission_entry_id,commission_variant_id,percentage,amount)
      VALUES (${randomBytes(4).toString("hex")},${entryId},${variant.id},${percentage},${money((input.amount * percentage) / 100)})
      ON DUPLICATE KEY UPDATE percentage=VALUES(percentage),amount=VALUES(amount)
    `.execute(database);
  }
}

export async function deleteCommissionSourceEntry(
  database: Kysely<TradesDatabase>,
  direction: CommissionDirection,
  sourceRecordId: number
) {
  await sql`DELETE FROM trades_commission_entries WHERE direction=${direction} AND source_record_id=${sourceRecordId}`.execute(
    database
  );
}

function mapVariant(row: VariantRow): CommissionVariant {
  return {
    code: row.code,
    displayOrder: Number(row.display_order),
    id: Number(row.id),
    name: row.name,
    percentage: Number(row.percentage),
    status: row.status,
    uuid: row.uuid
  };
}
function mapEntry(row: EntryRow, lines: LineRow[]): CommissionEntry {
  const amount = Number(row.amount);
  const mappedLines = lines
    .filter((line) => Number(line.commission_entry_id) === Number(row.id))
    .map((line) => ({
      amount: Number(line.amount),
      percentage: Number(line.percentage),
      variantId: Number(line.commission_variant_id),
      variantName: line.variant_name
    }));
  return {
    amount,
    date: toDate(row.transaction_date),
    direction: row.direction,
    id: Number(row.id),
    lines: mappedLines,
    name: row.name,
    reference: row.reference,
    settledAt: row.settled_at ? new Date(row.settled_at).toISOString() : null,
    settledBy: row.settled_by,
    tgCode: row.tg_code,
    totalCommission: money(mappedLines.reduce((sum, line) => sum + line.amount, 0)),
    uuid: row.uuid,
    verifiedAt: row.verified_at ? new Date(row.verified_at).toISOString() : null,
    verifiedBy: row.verified_by
  };
}
function toDate(value: Date | string) {
  return value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10);
}
function money(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
