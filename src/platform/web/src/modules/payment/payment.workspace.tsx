import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Printer, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  cn,
  WorkspaceFilters,
  WorkspacePage,
  WorkspacePagination,
  buildShowingLabel
} from "@codexsun/ui";
import { PaymentForm } from "./payment.form";
import { paymentQueryKey, usePayments } from "./payment.hooks";
import { PaymentList } from "./payment.list";
import { printPaymentReport } from "./payment.print";
import {
  activatePayment,
  createPayment,
  deactivatePayment,
  forceDeletePayment,
  settlePayment,
  verifyPayment,
  updatePayment
} from "./payment.services";
import type { PaymentLifecycleFilter, PaymentRecord, PaymentSavePayload } from "./payment.types";

type PaymentAction = {
  record: PaymentRecord;
  type: "force-delete" | "restore" | "settle" | "suspend" | "verify";
};

export function PaymentWorkspace() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [lifecycle, setLifecycle] = useState<PaymentLifecycleFilter>("open");
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [editing, setEditing] = useState<PaymentRecord | null | undefined>(undefined);
  const [pendingAction, setPendingAction] = useState<PaymentAction | null>(null);
  const paymentsQuery = usePayments({ lifecycle });

  const saveMutation = useMutation({
    mutationFn: (payload: PaymentSavePayload) =>
      editing ? updatePayment(editing.id, payload) : createPayment(payload),
    onError: showPaymentError("Unable to save payment"),
    onSuccess: async (record) => {
      await queryClient.invalidateQueries({ queryKey: paymentQueryKey });
      toast.success(`Payment ${editing ? "updated" : "created"}`, {
        description: `${record.reference ?? record.tgCode} is ready in the list.`
      });
      setEditing(undefined);
    }
  });

  const lifecycleMutation = useMutation({
    mutationFn: ({ record, type }: PaymentAction) => {
      switch (type) {
        case "force-delete":
          return forceDeletePayment(record.id);
        case "restore":
          return activatePayment(record.id);
        case "verify":
          return verifyPayment(record.id);
        case "settle":
          return settlePayment(record.id);
        default:
          return deactivatePayment(record.id);
      }
    },
    onError: showPaymentError("Unable to update payment"),
    onSuccess: async (record, action) => {
      await queryClient.invalidateQueries({ queryKey: paymentQueryKey });
      toast.success(paymentActionMessage(action.type, record), {
        description: record.reference ?? record.tgCode
      });
      setPendingAction(null);
    }
  });

  const matchingPayments = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (paymentsQuery.data ?? []).filter((payment) => {
      return (
        !term ||
        [payment.tgCode, payment.bank, payment.name ?? "", payment.reference ?? ""].some((value) =>
          value.toLowerCase().includes(term)
        )
      );
    });
  }, [paymentsQuery.data, search]);
  const totalPages = Math.max(1, Math.ceil(matchingPayments.length / rowsPerPage));
  const currentPage = Math.min(page, totalPages);
  const visiblePayments = matchingPayments.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );
  const pageTotals = useMemo(
    () => ({
      active: visiblePayments.filter((record) => record.status === "active").length,
      amount: visiblePayments.reduce((total, record) => total + record.amount, 0)
    }),
    [visiblePayments]
  );

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  return (
    <WorkspacePage
      actions={
        <div className="flex items-center gap-2">
          <Button
            className="h-9 rounded-md"
            disabled={paymentsQuery.isFetching}
            onClick={() => void paymentsQuery.refetch()}
            type="button"
            variant="outline"
          >
            <RefreshCw className={cn("size-4", paymentsQuery.isFetching && "animate-spin")} />
            Refresh
          </Button>
          <Button
            className="h-9 rounded-md"
            disabled={matchingPayments.length === 0}
            onClick={() => printPaymentReport(matchingPayments)}
            type="button"
            variant="outline"
          >
            <Printer className="size-4" />
            Print PDF
          </Button>
          <Button className="h-9 rounded-md" onClick={() => setEditing(null)} type="button">
            <Plus className="size-4" />
            New payment
          </Button>
        </div>
      }
      description="Post and maintain outgoing payment transactions."
      technicalName="page.trades.payment.list"
      title="Payments"
    >
      <WorkspaceFilters
        filterOptions={[
          { id: "open", label: "Open" },
          { id: "unverified", label: "Not verified" },
          { id: "verified", label: "Verified" },
          { id: "settled", label: "Settled" },
          { id: "all", label: "All payments" }
        ]}
        filterValue={lifecycle}
        onFilterValueChange={(value) => {
          setLifecycle(value as PaymentLifecycleFilter);
          setPage(1);
        }}
        onSearchValueChange={(value) => {
          setSearch(value);
          setPage(1);
        }}
        searchPlaceholder="Search payments"
        searchValue={search}
      />
      <PaymentList
        loading={paymentsQuery.isFetching && !paymentsQuery.data}
        onEdit={setEditing}
        onForceDelete={(record) => setPendingAction({ record, type: "force-delete" })}
        onRestore={(record) => setPendingAction({ record, type: "restore" })}
        onSettle={(record) => lifecycleMutation.mutate({ record, type: "settle" })}
        onSuspend={(record) => setPendingAction({ record, type: "suspend" })}
        onVerify={(record) => lifecycleMutation.mutate({ record, type: "verify" })}
        pendingId={
          lifecycleMutation.isPending ? (lifecycleMutation.variables?.record.id ?? null) : null
        }
        records={visiblePayments}
      />
      <PaymentPageTotals
        active={pageTotals.active}
        amount={pageTotals.amount}
        count={visiblePayments.length}
      />
      <WorkspacePagination
        onNextPage={() => setPage((value) => Math.min(totalPages, value + 1))}
        onPageChange={setPage}
        onPreviousPage={() => setPage((value) => Math.max(1, value - 1))}
        onRowsPerPageChange={(value) => {
          setRowsPerPage(value);
          setPage(1);
        }}
        page={currentPage}
        rowsPerPage={rowsPerPage}
        showingLabel={buildShowingLabel(currentPage, rowsPerPage, matchingPayments.length)}
        singularLabel="payment"
        totalCount={matchingPayments.length}
        totalPages={totalPages}
      />
      <PaymentForm
        {...(saveMutation.error instanceof Error ? { error: saveMutation.error.message } : {})}
        loading={saveMutation.isPending}
        onCancel={() => setEditing(undefined)}
        onSubmit={(payload) => saveMutation.mutate(payload)}
        open={editing !== undefined}
        record={editing ?? null}
      />
      <PaymentActionDialog
        action={pendingAction}
        loading={lifecycleMutation.isPending}
        onCancel={() => setPendingAction(null)}
        onConfirm={() => pendingAction && lifecycleMutation.mutate(pendingAction)}
      />
    </WorkspacePage>
  );
}

function PaymentActionDialog({
  action,
  loading,
  onCancel,
  onConfirm
}: {
  action: PaymentAction | null;
  loading: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const forceDelete = action?.type === "force-delete";
  const verb = paymentActionVerb(action?.type);
  return (
    <AlertDialog open={action !== null} onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{verb} payment?</AlertDialogTitle>
          <AlertDialogDescription>
            {action?.type === "verify"
              ? "This payment will be marked verified and can then be settled."
              : action?.type === "settle"
                ? "This verified payment will be settled and hidden from the default Open list."
                : forceDelete
              ? `${action?.record.reference ?? action?.record.tgCode ?? "This payment"} will be permanently removed.`
              : `${action?.record.reference ?? action?.record.tgCode ?? "This payment"} will be marked ${action?.type === "restore" ? "active" : "inactive"}.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className={
              forceDelete
                ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                : undefined
            }
            disabled={loading}
            onClick={onConfirm}
          >
            {verb}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function PaymentPageTotals({
  active,
  amount,
  count
}: {
  active: number;
  amount: number;
  count: number;
}) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-md border border-border/70 bg-card px-4 py-2.5 shadow-sm md:grid-cols-3">
      <PageTotal label="Page payments" value={String(count)} />
      <PageTotal label="Active" value={String(active)} />
      <PageTotal label="Grand total" strong value={formatMoney(amount)} />
    </div>
  );
}

function PageTotal({ label, strong, value }: { label: string; strong?: boolean; value: string }) {
  return (
    <div className="flex h-full items-center justify-start gap-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("font-medium text-foreground", strong && "font-semibold")}>{value}</span>
    </div>
  );
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2
  }).format(value);
}

function showPaymentError(title: string) {
  return (error: unknown) =>
    toast.error(title, {
      description: error instanceof Error ? error.message : "Please try again."
    });
}

function paymentActionMessage(type: PaymentAction["type"], record: PaymentRecord) {
  if (type === "force-delete") return "Payment force deleted";
  if (type === "verify")
    return record.verifiedAt ? "Payment verified" : "Payment verification cleared";
  if (type === "settle")
    return record.settledAt ? "Payment settled" : "Payment settlement cleared";
  return type === "restore" ? "Payment restored" : "Payment suspended";
}

function paymentActionVerb(type: PaymentAction["type"] | undefined) {
  if (type === "restore") return "Restore";
  if (type === "force-delete") return "Force delete";
  if (type === "verify") return "Verify";
  if (type === "settle") return "Settle";
  return "Suspend";
}
