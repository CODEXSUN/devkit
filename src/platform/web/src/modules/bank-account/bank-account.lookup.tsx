import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { WorkspaceLookup } from "@codexsun/ui";
import { BankAccountFormContent, emptyBankAccount } from "./bank-account.form";
import { bankAccountQueryKey, useBankAccountLookups } from "./bank-account.hooks";
import { createBankAccount } from "./bank-account.services";

export function BankAccountLookup({
  disabled = false,
  onValueChange,
  value
}: {
  disabled?: boolean;
  onValueChange: (id: number) => void;
  value: number;
}) {
  const query = useBankAccountLookups();
  const client = useQueryClient();
  return (
    <WorkspaceLookup
      allowTextValue={false}
      createDialogClassName="sm:max-w-3xl"
      createLabel="Create bank account"
      createMode="popup"
      createTitle="New bank account"
      disabled={disabled}
      loading={query.isLoading}
      onValueChange={(id) => onValueChange(Number(id) || 0)}
      options={(query.data ?? []).map((item) => ({
        description: `${item.bankName} · ${item.branch}`,
        label: `${item.code} · ${item.accountName}`,
        meta: item.ifsc,
        value: String(item.id)
      }))}
      placeholder="Search or create bank account"
      showAllOptionsOnFocus
      value={value ? String(value) : ""}
      renderCreateForm={({ initialName, onCancel, onCreated }) => (
        <LookupCreate
          initialName={initialName}
          onCancel={onCancel}
          onCreated={async (record) => {
            await client.invalidateQueries({ queryKey: bankAccountQueryKey });
            onCreated({
              description: `${record.bankName} · ${record.branch}`,
              label: `${record.code} · ${record.accountName}`,
              meta: record.ifsc,
              value: String(record.id)
            });
          }}
        />
      )}
    />
  );
}

function LookupCreate({
  initialName,
  onCancel,
  onCreated
}: {
  initialName: string;
  onCancel: () => void;
  onCreated: (r: Awaited<ReturnType<typeof createBankAccount>>) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  return (
    <BankAccountFormContent
      {...(error ? { error } : {})}
      initial={emptyBankAccount(initialName)}
      loading={loading}
      onCancel={onCancel}
      onSubmit={async (value) => {
        setLoading(true);
        setError("");
        try {
          onCreated(await createBankAccount(value));
        } catch (e) {
          setError(e instanceof Error ? e.message : "Unable to create bank account.");
        } finally {
          setLoading(false);
        }
      }}
    />
  );
}
