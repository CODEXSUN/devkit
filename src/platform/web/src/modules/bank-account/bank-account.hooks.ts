import { useQuery } from "@tanstack/react-query";
import {
  getBankStatement,
  listBankAccountLookups,
  listBankAccounts
} from "./bank-account.services";
export const bankAccountQueryKey = ["trades", "bank-account"] as const;
export const useBankAccounts = () =>
  useQuery({ queryKey: bankAccountQueryKey, queryFn: listBankAccounts });
export const useBankAccountLookups = () =>
  useQuery({ queryKey: [...bankAccountQueryKey, "lookups"], queryFn: listBankAccountLookups });
export const useBankStatement = (id: number | null) =>
  useQuery({
    enabled: Boolean(id),
    queryKey: [...bankAccountQueryKey, id, "statement"],
    queryFn: () => getBankStatement(id!)
  });
