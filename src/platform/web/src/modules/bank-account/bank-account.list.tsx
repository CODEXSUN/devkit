import { Landmark, Trash2 } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { WorkspaceRowActions, WorkspaceStatusBadge, WorkspaceTable } from "@codexsun/ui";
import type { BankAccountRecord } from "./bank-account.types";

export function BankAccountList({
  loading,
  onEdit,
  onOpen,
  onDelete,
  onRestore,
  onSuspend,
  records
}: {
  loading: boolean;
  onEdit: (r: BankAccountRecord) => void;
  onOpen: (r: BankAccountRecord) => void;
  onDelete: (r: BankAccountRecord) => void;
  onRestore: (r: BankAccountRecord) => void;
  onSuspend: (r: BankAccountRecord) => void;
  records: BankAccountRecord[];
}) {
  const columns: ColumnDef<BankAccountRecord>[] = [
    { accessorKey: "code", header: "Code" },
    {
      accessorKey: "accountName",
      header: "Account name",
      cell: ({ row }) => (
        <button
          className="font-medium hover:underline"
          onClick={() => onOpen(row.original)}
          type="button"
        >
          {row.original.accountName}
        </button>
      )
    },
    { accessorKey: "bankName", header: "Bank" },
    { accessorKey: "ifsc", header: "IFSC" },
    { accessorKey: "branch", header: "Branch" },
    {
      accessorKey: "currentBalance",
      header: () => <div className="text-right">Current balance</div>,
      cell: ({ row }) => (
        <div className="text-right font-semibold tabular-nums">
          {money(row.original.currentBalance)}
        </div>
      )
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <WorkspaceStatusBadge
          label={row.original.status === "active" ? "Active" : "Inactive"}
          tone={row.original.status === "active" ? "success" : "neutral"}
        />
      )
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <WorkspaceRowActions
          actions={[
            {
              id: "statement",
              icon: <Landmark className="size-4" />,
              label: "View statement",
              onSelect: () => onOpen(row.original)
            },
            {
              id: "delete",
              icon: <Trash2 className="size-4" />,
              label: "Force delete",
              onSelect: () => onDelete(row.original),
              tone: "destructive"
            }
          ]}
          deleteLabel="Suspend"
          isSuspended={row.original.status === "inactive"}
          onDelete={() => onSuspend(row.original)}
          onEdit={() => onEdit(row.original)}
          onRestore={() => onRestore(row.original)}
          title={row.original.accountName}
        />
      ),
      enableSorting: false
    }
  ];
  return (
    <WorkspaceTable
      columns={columns}
      data={records}
      emptyState="No bank accounts found."
      isLoading={loading}
      minWidth="1080px"
    />
  );
}
export const money = (v: number) =>
  new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);
