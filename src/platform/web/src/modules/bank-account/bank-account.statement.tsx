import { useState } from "react";
import { ArrowLeft, ArrowRightLeft, BadgeCheck, Plus, Printer, RefreshCw } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Button,
  Input,
  WorkspaceFormField,
  WorkspaceFormFooter,
  WorkspaceFormGrid,
  WorkspaceUpsertDialog
} from "@codexsun/ui";
import { BankAccountLookup } from "./bank-account.lookup";
import { bankAccountQueryKey, useBankStatement } from "./bank-account.hooks";
import { printBankStatementReport } from "./bank-account.print";
import { bankEntrySchema, bankTransferSchema } from "./bank-account.schema";
import {
  createBankEntry,
  setBankEntryReconciled,
  transferBankFunds
} from "./bank-account.services";
import { money } from "./bank-account.list";
import type {
  BankAccountRecord,
  BankManualEntryPayload,
  BankTransferPayload
} from "./bank-account.types";

export function BankAccountStatement({
  account,
  onBack
}: {
  account: BankAccountRecord;
  onBack: () => void;
}) {
  const query = useBankStatement(account.id);
  const client = useQueryClient();
  const [entry, setEntry] = useState<"cash_deposit" | "cash_withdrawal" | null>(null);
  const [transfer, setTransfer] = useState(false);
  const refresh = () => client.invalidateQueries({ queryKey: bankAccountQueryKey });
  const reconcile = useMutation({
    mutationFn: ({ id, value }: { id: number; value: boolean }) =>
      setBankEntryReconciled(id, value),
    onSuccess: refresh,
    onError: notify
  });
  const data = query.data;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button onClick={onBack} size="icon" variant="outline">
            <ArrowLeft className="size-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold">{account.accountName}</h1>
            <p className="text-sm text-muted-foreground">
              {account.code} · {account.bankName} · {account.branch} · {account.ifsc}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setEntry("cash_deposit")}>
            <Plus className="size-4" />
            Cash deposit
          </Button>
          <Button onClick={() => setEntry("cash_withdrawal")} variant="outline">
            Cash withdrawal
          </Button>
          <Button onClick={() => setTransfer(true)} variant="outline">
            <ArrowRightLeft className="size-4" />
            Transfer
          </Button>
          <Button
            disabled={!data}
            onClick={() => data && printBankStatementReport(data)}
            variant="outline"
          >
            <Printer className="size-4" />
            Print PDF
          </Button>
          <Button onClick={() => void query.refetch()} size="icon" variant="outline">
            <RefreshCw className="size-4" />
          </Button>
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-4">
        <Total label="Closing balance" value={money(data?.summary.closingBalance ?? 0)} />
        <Total label="Total debits" value={money(data?.summary.totalDebits ?? 0)} />
        <Total label="Total credits" value={money(data?.summary.totalCredits ?? 0)} />
        <Total label="Unreconciled" value={String(data?.summary.unreconciledCount ?? 0)} />
      </div>
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full min-w-[1100px] text-sm">
          <thead className="bg-muted/60 text-left">
            <tr>
              {[
                "Date",
                "Type",
                "Reference",
                "Narration",
                "Debit",
                "Credit",
                "Balance",
                "Reconciliation"
              ].map((x) => (
                <th className="px-3 py-2.5" key={x}>
                  {x}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data?.entries.map((row) => (
              <tr className="border-t" key={row.id}>
                <td className="px-3 py-2">{format(parseISO(row.date), "dd-MMM-yyyy")}</td>
                <td className="px-3 py-2 capitalize">{row.entryType.replaceAll("_", " ")}</td>
                <td className="px-3 py-2 font-mono">{row.reference}</td>
                <td className="px-3 py-2">
                  {row.narration}
                  {row.counterpartyBankAccountName ? ` · ${row.counterpartyBankAccountName}` : ""}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {row.debit ? money(row.debit) : "—"}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {row.credit ? money(row.credit) : "—"}
                </td>
                <td className="px-3 py-2 text-right font-medium tabular-nums">
                  {money(row.balance)}
                </td>
                <td className="px-3 py-2">
                  <Button
                    disabled={row.entryType === "opening" || reconcile.isPending}
                    onClick={() => reconcile.mutate({ id: row.id, value: !row.reconciledAt })}
                    size="sm"
                    variant={row.reconciledAt ? "outline" : "ghost"}
                  >
                    <BadgeCheck className="size-4" />
                    {row.reconciledAt ? "Reconciled" : "Mark reconciled"}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <EntryDialog
        accountId={account.id}
        mode={entry}
        onClose={() => setEntry(null)}
        onSaved={refresh}
      />
      <TransferDialog
        accountId={account.id}
        onClose={() => setTransfer(false)}
        onSaved={refresh}
        open={transfer}
      />
    </div>
  );
}
const Total = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-md border bg-card p-4">
    <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
    <div className="mt-1 text-xl font-semibold tabular-nums">{value}</div>
  </div>
);
function EntryDialog({
  accountId,
  mode,
  onClose,
  onSaved
}: {
  accountId: number;
  mode: "cash_deposit" | "cash_withdrawal" | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [v, setV] = useState<BankManualEntryPayload>({
    amount: 0,
    date: new Date().toISOString().slice(0, 10),
    entryType: mode ?? "cash_deposit",
    narration: "",
    reference: ""
  });
  const mutation = useMutation({
    mutationFn: (x: BankManualEntryPayload) => createBankEntry(accountId, x),
    onSuccess: () => {
      onSaved();
      onClose();
      toast.success("Bank entry posted");
    },
    onError: notify
  });
  return (
    <WorkspaceUpsertDialog
      description="Post a direct cash movement to this bank ledger."
      onClose={onClose}
      open={Boolean(mode)}
      title={mode === "cash_deposit" ? "Cash deposit" : "Cash withdrawal"}
    >
      <form
        className="p-6"
        onSubmit={(e) => {
          e.preventDefault();
          const x = { ...v, entryType: mode ?? "cash_deposit" };
          const p = bankEntrySchema.safeParse(x);
          if (p.success) mutation.mutate(p.data);
        }}
      >
        <WorkspaceFormGrid columns={2}>
          <Field
            label="Date"
            type="date"
            value={v.date}
            onChange={(x) => setV((c) => ({ ...c, date: x }))}
          />
          <Field
            label="Amount"
            type="number"
            value={v.amount || ""}
            onChange={(x) => setV((c) => ({ ...c, amount: Number(x) }))}
          />
          <Field
            label="Reference"
            value={v.reference}
            onChange={(x) => setV((c) => ({ ...c, reference: x }))}
          />
          <Field
            label="Narration"
            value={v.narration}
            onChange={(x) => setV((c) => ({ ...c, narration: x }))}
          />
        </WorkspaceFormGrid>
        <WorkspaceFormFooter
          className="mt-6"
          onCancel={onClose}
          primaryLabel="Post entry"
          primaryLoading={mutation.isPending}
        />
      </form>
    </WorkspaceUpsertDialog>
  );
}
function TransferDialog({
  accountId,
  onClose,
  onSaved,
  open
}: {
  accountId: number;
  onClose: () => void;
  onSaved: () => void;
  open: boolean;
}) {
  const [v, setV] = useState<BankTransferPayload>({
    amount: 0,
    date: new Date().toISOString().slice(0, 10),
    fromBankAccountId: accountId,
    narration: "",
    reference: "",
    toBankAccountId: 0
  });
  const mutation = useMutation({
    mutationFn: transferBankFunds,
    onSuccess: () => {
      onSaved();
      onClose();
      toast.success("Bank transfer posted");
    },
    onError: notify
  });
  return (
    <WorkspaceUpsertDialog
      description="Create linked credit and debit entries across two bank accounts."
      onClose={onClose}
      open={open}
      title="Transfer between banks"
    >
      <form
        className="p-6"
        onSubmit={(e) => {
          e.preventDefault();
          const p = bankTransferSchema.safeParse(v);
          if (p.success) mutation.mutate(p.data);
        }}
      >
        <WorkspaceFormGrid columns={2}>
          <WorkspaceFormField label="Destination bank" required>
            <BankAccountLookup
              onValueChange={(id) => setV((c) => ({ ...c, toBankAccountId: id }))}
              value={v.toBankAccountId}
            />
          </WorkspaceFormField>
          <Field
            label="Date"
            type="date"
            value={v.date}
            onChange={(x) => setV((c) => ({ ...c, date: x }))}
          />
          <Field
            label="Amount"
            type="number"
            value={v.amount || ""}
            onChange={(x) => setV((c) => ({ ...c, amount: Number(x) }))}
          />
          <Field
            label="Reference"
            value={v.reference}
            onChange={(x) => setV((c) => ({ ...c, reference: x }))}
          />
          <Field
            label="Narration"
            value={v.narration}
            onChange={(x) => setV((c) => ({ ...c, narration: x }))}
          />
        </WorkspaceFormGrid>
        <WorkspaceFormFooter
          className="mt-6"
          onCancel={onClose}
          primaryLabel="Transfer funds"
          primaryLoading={mutation.isPending}
        />
      </form>
    </WorkspaceUpsertDialog>
  );
}
function Field({
  label,
  onChange,
  type = "text",
  value
}: {
  label: string;
  onChange: (v: string) => void;
  type?: string;
  value: number | string;
}) {
  return (
    <WorkspaceFormField label={label} required={label !== "Narration"}>
      <Input
        min={type === "number" ? 0.01 : undefined}
        step={type === "number" ? "0.01" : undefined}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </WorkspaceFormField>
  );
}
function notify(error: unknown) {
  toast.error("Unable to update bank statement", {
    description: error instanceof Error ? error.message : "Please try again."
  });
}
