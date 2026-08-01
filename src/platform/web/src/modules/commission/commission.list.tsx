import type { ColumnDef } from "@tanstack/react-table";
import { format, parseISO } from "date-fns";
import { BadgeCheck, CircleCheck } from "lucide-react";
import { Button, WorkspaceStatusBadge, WorkspaceTable } from "@codexsun/ui";
import type { CommissionEntryRecord, CommissionVariantRecord } from "./commission.types";

export function CommissionList({
  loading,
  onSettle,
  onVerify,
  pendingId,
  records,
  variants
}: {
  loading: boolean;
  onSettle: (record: CommissionEntryRecord) => void;
  onVerify: (record: CommissionEntryRecord) => void;
  pendingId: number | null;
  records: CommissionEntryRecord[];
  variants: CommissionVariantRecord[];
}) {
  const columns: ColumnDef<CommissionEntryRecord>[] = [
    {
      accessorKey: "date",
      cell: ({ row }) => format(parseISO(row.original.date), "dd-MMM-yyyy"),
      header: "Date"
    },
    {
      accessorKey: "direction",
      cell: ({ row }) => (
        <WorkspaceStatusBadge
          label={row.original.direction === "deposit" ? "Deposit" : "Withdraw"}
          tone={row.original.direction === "deposit" ? "success" : "warning"}
        />
      ),
      header: "Direction"
    },
    {
      accessorKey: "amount",
      cell: ({ row }) => <Money value={row.original.amount} />,
      header: () => <div className="text-right">Amount</div>
    },
    ...variants.map((variant): ColumnDef<CommissionEntryRecord> => ({
      id: `variant-${variant.id}`,
      header: () => (
        <div className="text-right">
          {variant.name}
          <div className="font-normal normal-case text-muted-foreground">{variant.percentage}%</div>
        </div>
      ),
      cell: ({ row }) => (
        <Money
          value={row.original.lines.find((line) => line.variantId === variant.id)?.amount ?? 0}
        />
      )
    })),
    {
      id: "verified",
      header: "Verification",
      cell: ({ row }) => (
        <Button
          aria-label={row.original.verifiedAt ? "Clear verification" : "Mark verified"}
          disabled={pendingId === row.original.id || Boolean(row.original.settledAt)}
          onClick={() => onVerify(row.original)}
          size="icon"
          title={row.original.verifiedAt ? "Clear verification" : "Mark verified"}
          type="button"
          variant={row.original.verifiedAt ? "default" : "outline"}
        >
          <CircleCheck className="size-4" />
        </Button>
      )
    },
    {
      id: "settled",
      header: "Settlement",
      cell: ({ row }) => (
        <Button
          aria-label={row.original.settledAt ? "Clear settlement" : "Mark settled"}
          disabled={
            pendingId === row.original.id ||
            (!row.original.verifiedAt && !row.original.settledAt)
          }
          onClick={(event) => {
            event.stopPropagation();
            onSettle(row.original);
          }}
          size="icon"
          title={row.original.settledAt ? "Clear settlement" : "Mark settled"}
          type="button"
          variant={row.original.settledAt ? "default" : "outline"}
        >
          <BadgeCheck className="size-4" />
        </Button>
      )
    }
  ];
  return (
    <div className="[&_td]:border-r [&_td]:border-border/70 [&_td:last-child]:border-r-0 [&_th]:border-r [&_th]:border-border/70 [&_th:last-child]:border-r-0">
      <WorkspaceTable
        columns={columns}
        data={records}
        emptyState="No commission entries found for this filter."
        isLoading={loading}
        minWidth={`${Math.max(1080, 720 + variants.length * 170)}px`}
      />
    </div>
  );
}
function Money({ value }: { value: number }) {
  return (
    <div className="text-right font-medium tabular-nums">
      {new Intl.NumberFormat("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(value)}
    </div>
  );
}
