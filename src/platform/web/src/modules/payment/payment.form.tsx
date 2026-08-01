import { useState } from "react";
import { Save } from "lucide-react";
import {
  Input,
  WorkspaceSwitchCard,
  WorkspaceFormField,
  WorkspaceFormFooter,
  WorkspaceFormGrid,
  WorkspaceUpsertDialog
} from "@codexsun/ui";
import { TradesFormBanner } from "../../shared/form-banner";
import { paymentSchema } from "./payment.schema";
import type { PaymentRecord, PaymentSavePayload } from "./payment.types";
import { BankAccountLookup } from "../bank-account";

export function PaymentForm({
  error,
  loading,
  onCancel,
  onSubmit,
  open,
  record
}: {
  error?: string;
  loading: boolean;
  onCancel: () => void;
  onSubmit: (payload: PaymentSavePayload) => void;
  open: boolean;
  record: PaymentRecord | null;
}) {
  return (
    <WorkspaceUpsertDialog
      className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-3xl"
      description="Post the outgoing payment transaction."
      onClose={onCancel}
      open={open}
      title={`${record ? "Edit" : "New"} payment`}
    >
      <PaymentFormBody
        key={`${record?.id ?? "new"}:${open}`}
        {...(error ? { error } : {})}
        initialValue={record ? toPayload(record) : emptyPayment()}
        loading={loading}
        onCancel={onCancel}
        onSubmit={onSubmit}
      />
    </WorkspaceUpsertDialog>
  );
}

function PaymentFormBody({
  error,
  initialValue,
  loading,
  onCancel,
  onSubmit
}: {
  error?: string;
  initialValue: PaymentSavePayload;
  loading: boolean;
  onCancel: () => void;
  onSubmit: (payload: PaymentSavePayload) => void;
}) {
  const [value, setValue] = useState(initialValue);
  const [validationError, setValidationError] = useState("");
  const shownError = validationError || error;

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        const parsed = paymentSchema.safeParse(value);
        if (!parsed.success) {
          setValidationError(parsed.error.issues[0]?.message ?? "Check the payment details.");
          return;
        }
        setValidationError("");
        onSubmit(parsed.data);
      }}
    >
      {shownError ? <TradesFormBanner title="Unable to save">{shownError}</TradesFormBanner> : null}
      <WorkspaceFormGrid columns={2}>
        <WorkspaceFormField label="Date" required>
          <Input
            autoFocus
            type="date"
            value={value.date}
            onChange={(event) => setValue((current) => ({ ...current, date: event.target.value }))}
          />
        </WorkspaceFormField>
        <WorkspaceFormField label="TG code" required>
          <Input
            className="font-mono uppercase"
            maxLength={80}
            value={value.tgCode}
            onChange={(event) =>
              setValue((current) => ({ ...current, tgCode: event.target.value.toUpperCase() }))
            }
          />
        </WorkspaceFormField>
        <WorkspaceFormField label="Bank" required>
          <BankAccountLookup
            value={value.bankAccountId}
            onValueChange={(bankAccountId) =>
              setValue((current) => ({ ...current, bankAccountId }))
            }
          />
        </WorkspaceFormField>
        <WorkspaceFormField label="Name">
          <Input
            maxLength={200}
            value={value.name ?? ""}
            onChange={(event) => setValue((current) => ({ ...current, name: event.target.value }))}
          />
        </WorkspaceFormField>
        <WorkspaceFormField label="Amount" required>
          <Input
            min={0.01}
            step="0.01"
            type="number"
            value={value.amount || ""}
            onChange={(event) =>
              setValue((current) => ({ ...current, amount: Number(event.target.value) }))
            }
          />
        </WorkspaceFormField>
        <WorkspaceFormField label="Reference">
          <Input
            maxLength={180}
            value={value.reference ?? ""}
            onChange={(event) =>
              setValue((current) => ({ ...current, reference: event.target.value }))
            }
          />
        </WorkspaceFormField>
        <WorkspaceSwitchCard
          ariaLabel="Payment active status"
          checked={value.status === "active"}
          fieldLabel="Status"
          onCheckedChange={(active) =>
            setValue((current) => ({ ...current, status: active ? "active" : "inactive" }))
          }
        />
      </WorkspaceFormGrid>
      <WorkspaceFormFooter
        className="mt-6 border-t pt-4"
        onCancel={onCancel}
        primaryLabel={initialValue.tgCode ? "Update payment" : "Save payment"}
        primaryLoading={loading}
        primaryProps={{
          children: (
            <>
              <Save className="size-4" />
              Save
            </>
          )
        }}
      />
    </form>
  );
}

function emptyPayment(): PaymentSavePayload {
  return {
    amount: 0,
    bankAccountId: 0,
    date: new Date().toISOString().slice(0, 10),
    name: null,
    reference: null,
    status: "active",
    tgCode: ""
  };
}

function toPayload(record: PaymentRecord): PaymentSavePayload {
  return {
    amount: record.amount,
    bankAccountId: record.bankAccountId ?? 0,
    date: record.date,
    name: record.name,
    reference: record.reference,
    status: record.status,
    tgCode: record.tgCode
  };
}
