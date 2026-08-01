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
import { bankAccountSchema } from "./bank-account.schema";
import type { BankAccountRecord, BankAccountSavePayload } from "./bank-account.types";

export function BankAccountForm({
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
  onSubmit: (v: BankAccountSavePayload) => void;
  open: boolean;
  record: BankAccountRecord | null;
}) {
  return (
    <WorkspaceUpsertDialog
      className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-3xl"
      description="Maintain the bank identity and opening ledger balance."
      onClose={onCancel}
      open={open}
      title={`${record ? "Edit" : "New"} bank account`}
    >
      <BankAccountFormContent
        key={`${record?.id ?? "new"}:${open}`}
        {...(error ? { error } : {})}
        initial={record ? toPayload(record) : emptyBankAccount()}
        loading={loading}
        onCancel={onCancel}
        onSubmit={onSubmit}
      />
    </WorkspaceUpsertDialog>
  );
}

export function BankAccountFormContent({
  error,
  initial,
  loading,
  onCancel,
  onSubmit
}: {
  error?: string;
  initial: BankAccountSavePayload;
  loading: boolean;
  onCancel: () => void;
  onSubmit: (v: BankAccountSavePayload) => void;
}) {
  const [value, setValue] = useState(initial);
  const [validation, setValidation] = useState("");
  const text =
    (key: keyof BankAccountSavePayload) => (event: React.ChangeEvent<HTMLInputElement>) =>
      setValue((current) => ({ ...current, [key]: event.target.value }));
  return (
    <form
      className="p-6"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        const parsed = bankAccountSchema.safeParse(value);
        if (!parsed.success) {
          setValidation(parsed.error.issues[0]?.message ?? "Check bank account details.");
          return;
        }
        setValidation("");
        onSubmit(parsed.data);
      }}
    >
      {validation || error ? (
        <TradesFormBanner title="Unable to save">{validation || error}</TradesFormBanner>
      ) : null}
      <WorkspaceFormGrid columns={2}>
        <WorkspaceFormField label="Bank code" required>
          <Input
            autoFocus
            className="font-mono uppercase"
            maxLength={40}
            value={value.code}
            onChange={(event) =>
              setValue((current) => ({ ...current, code: event.target.value.toUpperCase() }))
            }
          />
        </WorkspaceFormField>
        <WorkspaceFormField label="Account name" required>
          <Input maxLength={180} value={value.accountName} onChange={text("accountName")} />
        </WorkspaceFormField>
        <WorkspaceFormField label="Bank name" required>
          <Input maxLength={180} value={value.bankName} onChange={text("bankName")} />
        </WorkspaceFormField>
        <WorkspaceFormField label="IFSC" required>
          <Input
            className="font-mono uppercase"
            maxLength={20}
            value={value.ifsc}
            onChange={(event) =>
              setValue((current) => ({ ...current, ifsc: event.target.value.toUpperCase() }))
            }
          />
        </WorkspaceFormField>
        <WorkspaceFormField label="Branch" required>
          <Input maxLength={180} value={value.branch} onChange={text("branch")} />
        </WorkspaceFormField>
        <WorkspaceFormField label="Opening balance" required>
          <Input
            step="0.01"
            type="number"
            value={value.openingBalance || ""}
            onChange={(event) =>
              setValue((current) => ({ ...current, openingBalance: Number(event.target.value) }))
            }
          />
        </WorkspaceFormField>
        <WorkspaceSwitchCard
          ariaLabel="Bank account active status"
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
        primaryLabel="Save bank account"
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

export const emptyBankAccount = (accountName = ""): BankAccountSavePayload => ({
  accountName,
  bankName: "",
  branch: "",
  code: "",
  ifsc: "",
  openingBalance: 0,
  status: "active"
});
const toPayload = (r: BankAccountRecord): BankAccountSavePayload => ({
  accountName: r.accountName,
  bankName: r.bankName,
  branch: r.branch,
  code: r.code,
  ifsc: r.ifsc,
  openingBalance: r.openingBalance,
  status: r.status
});
