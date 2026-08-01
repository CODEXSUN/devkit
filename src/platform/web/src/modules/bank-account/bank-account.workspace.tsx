import { useMemo, useState } from "react";
import { Landmark, Plus, Printer, RefreshCw } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button, WorkspaceFilters, WorkspacePage } from "@codexsun/ui";
import { BankAccountForm } from "./bank-account.form";
import { bankAccountQueryKey, useBankAccounts } from "./bank-account.hooks";
import { BankAccountList, money } from "./bank-account.list";
import { printBankAccountReport } from "./bank-account.print";
import { BankAccountStatement } from "./bank-account.statement";
import {
  activateBankAccount,
  createBankAccount,
  deactivateBankAccount,
  forceDeleteBankAccount,
  updateBankAccount
} from "./bank-account.services";
import type { BankAccountRecord, BankAccountSavePayload } from "./bank-account.types";

export function BankAccountWorkspace() {
  const client = useQueryClient();
  const query = useBankAccounts();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [editing, setEditing] = useState<BankAccountRecord | null | undefined>(undefined);
  const [statement, setStatement] = useState<BankAccountRecord | null>(null);
  const refresh = () => client.invalidateQueries({ queryKey: bankAccountQueryKey });
  const save = useMutation({
    mutationFn: (v: BankAccountSavePayload) =>
      editing ? updateBankAccount(editing.id, v) : createBankAccount(v),
    onSuccess: async () => {
      await refresh();
      setEditing(undefined);
      toast.success("Bank account saved");
    },
    onError: notify
  });
  const action = useMutation({
    mutationFn: ({
      record,
      type
    }: {
      record: BankAccountRecord;
      type: "activate" | "deactivate" | "delete";
    }) =>
      type === "activate"
        ? activateBankAccount(record.id)
        : type === "deactivate"
          ? deactivateBankAccount(record.id)
          : forceDeleteBankAccount(record.id),
    onSuccess: async () => {
      await refresh();
      toast.success("Bank account updated");
    },
    onError: notify
  });
  const records = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (query.data ?? []).filter(
      (r) =>
        (status === "all" || r.status === status) &&
        (!term ||
          [r.code, r.accountName, r.bankName, r.ifsc, r.branch].some((x) =>
            x.toLowerCase().includes(term)
          ))
    );
  }, [query.data, search, status]);
  if (statement)
    return <BankAccountStatement account={statement} onBack={() => setStatement(null)} />;
  const total = records.reduce((sum, r) => sum + r.currentBalance, 0);
  return (
    <WorkspacePage
      actions={
        <div className="flex gap-2">
          <Button onClick={() => void query.refetch()} variant="outline">
            <RefreshCw className="size-4" />
            Refresh
          </Button>
          <Button
            disabled={records.length === 0}
            onClick={() => printBankAccountReport(records)}
            variant="outline"
          >
            <Printer className="size-4" />
            Print PDF
          </Button>
          <Button onClick={() => setEditing(null)}>
            <Plus className="size-4" />
            New bank account
          </Button>
        </div>
      }
      description="Multiple bank accounts, individual statements, transfers, cash movements, and reconciliation."
      technicalName="page.trades.bank-account.list"
      title="Bank Accounts"
    >
      <div className="grid gap-3 md:grid-cols-3">
        <Total
          icon={<Landmark className="size-4" />}
          label="Bank accounts"
          value={String(records.length)}
        />
        <Total
          label="Active accounts"
          value={String(records.filter((r) => r.status === "active").length)}
        />
        <Total label="Combined balance" value={money(total)} />
      </div>
      <WorkspaceFilters
        filterOptions={[
          { id: "all", label: "All accounts" },
          { id: "active", label: "Active" },
          { id: "inactive", label: "Inactive" }
        ]}
        filterValue={status}
        onFilterValueChange={setStatus}
        onSearchValueChange={setSearch}
        searchPlaceholder="Search code, account, bank, IFSC, or branch"
        searchValue={search}
      />
      <BankAccountList
        loading={query.isFetching && !query.data}
        onDelete={(record) => action.mutate({ record, type: "delete" })}
        onEdit={setEditing}
        onOpen={setStatement}
        onRestore={(record) => action.mutate({ record, type: "activate" })}
        onSuspend={(record) => action.mutate({ record, type: "deactivate" })}
        records={records}
      />
      <BankAccountForm
        {...(save.error instanceof Error ? { error: save.error.message } : {})}
        loading={save.isPending}
        onCancel={() => setEditing(undefined)}
        onSubmit={(v) => save.mutate(v)}
        open={editing !== undefined}
        record={editing ?? null}
      />
    </WorkspacePage>
  );
}
const Total = ({
  icon,
  label,
  value
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
}) => (
  <div className="rounded-md border bg-card p-4">
    <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
      {icon}
      {label}
    </div>
    <div className="mt-1 text-xl font-semibold tabular-nums">{value}</div>
  </div>
);
function notify(error: unknown) {
  toast.error("Unable to update bank account", {
    description: error instanceof Error ? error.message : "Please try again."
  });
}
