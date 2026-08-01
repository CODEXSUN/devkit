import { LandmarkIcon, RefreshCwIcon } from "lucide-react";
import {
  Button,
  WorkspaceTableEmptyState,
  WorkspaceTableHeaderCell,
  WorkspaceTableLoadingState,
  WorkspaceTablePanel
} from "@codexsun/ui";
import { useBankAccounts } from "../bank-account";

export function TradesOverviewBankBalances() {
  const accountsQuery = useBankAccounts();
  const accounts = accountsQuery.data ?? [];
  const combinedClosingBalance = accounts.reduce(
    (total, account) => total + account.currentBalance,
    0
  );

  return (
    <WorkspaceTablePanel>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 px-4 py-3.5">
        <div className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-md bg-muted text-muted-foreground">
            <LandmarkIcon className="size-4" />
          </span>
          <div>
            <h2 className="font-semibold text-foreground">Bank closing balances</h2>
            <p className="text-xs text-muted-foreground">
              Current ledger balance across every connected bank account.
            </p>
          </div>
        </div>
        <Button
          disabled={accountsQuery.isFetching}
          onClick={() => void accountsQuery.refetch()}
          size="sm"
          type="button"
          variant="outline"
        >
          <RefreshCwIcon className={accountsQuery.isFetching ? "size-4 animate-spin" : "size-4"} />
          Refresh
        </Button>
      </div>

      {accountsQuery.isError ? (
        <WorkspaceTableEmptyState className="text-destructive">
          {accountsQuery.error instanceof Error
            ? accountsQuery.error.message
            : "Unable to load bank balances."}
        </WorkspaceTableEmptyState>
      ) : accounts.length === 0 && accountsQuery.isLoading ? (
        <WorkspaceTableLoadingState />
      ) : accounts.length === 0 ? (
        <WorkspaceTableEmptyState>No bank accounts found.</WorkspaceTableEmptyState>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] border-collapse text-sm">
            <thead className="bg-muted/50">
              <tr>
                <WorkspaceTableHeaderCell>Bank name</WorkspaceTableHeaderCell>
                <WorkspaceTableHeaderCell className="text-right">
                  Closing balance
                </WorkspaceTableHeaderCell>
              </tr>
            </thead>
            <tbody>
              {accounts.map((account) => (
                <tr
                  className="border-b border-border/70 transition-colors last:border-b-0 hover:bg-muted/20"
                  key={account.id}
                >
                  <td className="px-4 py-3">
                    <div className="font-medium text-foreground">{account.bankName}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {account.accountName} · {account.code}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums text-foreground">
                    {formatMoney(account.currentBalance)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t border-border bg-muted/30">
              <tr>
                <td className="px-4 py-3 font-semibold text-foreground">Total closing balance</td>
                <td className="px-4 py-3 text-right font-semibold tabular-nums text-foreground">
                  {formatMoney(combinedClosingBalance)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </WorkspaceTablePanel>
  );
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2
  }).format(value);
}
