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
import { commissionVariantsSchema } from "./commission.schema";
import type { CommissionVariantRecord, CommissionVariantSavePayload } from "./commission.types";

export function CommissionForm({
  error,
  loading,
  onCancel,
  onSubmit,
  open,
  variants
}: {
  error?: string;
  loading: boolean;
  onCancel: () => void;
  onSubmit: (values: Array<{ id: number; payload: CommissionVariantSavePayload }>) => void;
  open: boolean;
  variants: CommissionVariantRecord[];
}) {
  return (
    <WorkspaceUpsertDialog
      className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-3xl"
      description="Set the common percentage variants used for every new or unsettled confirmation."
      onClose={onCancel}
      open={open}
      title="Commission rates"
    >
      <CommissionFormBody
        key={`${open}:${variants.map((v) => `${v.id}-${v.percentage}`).join("|")}`}
        {...(error ? { error } : {})}
        loading={loading}
        onCancel={onCancel}
        onSubmit={onSubmit}
        variants={variants}
      />
    </WorkspaceUpsertDialog>
  );
}
function CommissionFormBody({
  error,
  loading,
  onCancel,
  onSubmit,
  variants
}: {
  error?: string;
  loading: boolean;
  onCancel: () => void;
  onSubmit: (values: Array<{ id: number; payload: CommissionVariantSavePayload }>) => void;
  variants: CommissionVariantRecord[];
}) {
  const [values, setValues] = useState(
    variants.map(({ id, name, percentage, status }) => ({
      id,
      payload: { name, percentage, status }
    }))
  );
  const [validation, setValidation] = useState("");
  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        const parsed = commissionVariantsSchema.safeParse(values.map((v) => v.payload));
        if (!parsed.success) {
          setValidation(parsed.error.issues[0]?.message ?? "Check commission rates.");
          return;
        }
        setValidation("");
        onSubmit(values);
      }}
    >
      {validation || error ? (
        <TradesFormBanner title="Unable to save rates">{validation || error}</TradesFormBanner>
      ) : null}
      <div className="space-y-4">
        {values.map((value, index) => (
          <div className="rounded-md border border-border/70 p-4" key={value.id}>
            <WorkspaceFormGrid columns={3}>
              <WorkspaceFormField label={`Variant ${index + 1}`} required>
                <Input
                  value={value.payload.name}
                  onChange={(e) =>
                    setValues((current) =>
                      current.map((item) =>
                        item.id === value.id
                          ? { ...item, payload: { ...item.payload, name: e.target.value } }
                          : item
                      )
                    )
                  }
                />
              </WorkspaceFormField>
              <WorkspaceFormField label="Percentage" required>
                <Input
                  min="0"
                  max="100"
                  step="0.0001"
                  type="number"
                  value={value.payload.percentage}
                  onChange={(e) =>
                    setValues((current) =>
                      current.map((item) =>
                        item.id === value.id
                          ? {
                              ...item,
                              payload: { ...item.payload, percentage: Number(e.target.value) }
                            }
                          : item
                      )
                    )
                  }
                />
              </WorkspaceFormField>
              <WorkspaceSwitchCard
                checked={value.payload.status === "active"}
                fieldLabel="Status"
                onCheckedChange={(active) =>
                  setValues((current) =>
                    current.map((item) =>
                      item.id === value.id
                        ? {
                            ...item,
                            payload: { ...item.payload, status: active ? "active" : "inactive" }
                          }
                        : item
                    )
                  )
                }
              />
            </WorkspaceFormGrid>
          </div>
        ))}
      </div>
      <WorkspaceFormFooter
        className="mt-6 border-t pt-4"
        onCancel={onCancel}
        primaryLabel="Save rates"
        primaryLoading={loading}
        primaryProps={{
          children: (
            <>
              <Save className="size-4" />
              Save rates
            </>
          )
        }}
      />
    </form>
  );
}
