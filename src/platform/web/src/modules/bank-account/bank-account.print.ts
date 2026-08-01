import { format, parseISO } from "date-fns";
import { escapePrintText, formatPrintMoney, openPrintDocument } from "../../shared/print-document";
import type { BankAccountRecord, BankStatement } from "./bank-account.types";

export function printBankAccountReport(records: BankAccountRecord[]): boolean {
  const rows = records
    .map(
      (record) => `<tr>
        <td>${escapePrintText(record.code)}</td>
        <td>${escapePrintText(record.accountName)}</td>
        <td>${escapePrintText(record.bankName)}</td>
        <td>${escapePrintText(record.ifsc)}</td>
        <td>${escapePrintText(record.branch)}</td>
        <td class="number">${formatPrintMoney(record.openingBalance)}</td>
        <td class="number">${formatPrintMoney(record.currentBalance)}</td>
        <td>${escapePrintText(record.status === "active" ? "Active" : "Inactive")}</td>
      </tr>`
    )
    .join("");
  const openingTotal = records.reduce((sum, record) => sum + record.openingBalance, 0);
  const closingTotal = records.reduce((sum, record) => sum + record.currentBalance, 0);

  return openPrintDocument(`<table aria-label="Bank account details">
    <thead>
      <tr>
        <th>Code</th>
        <th>Account name</th>
        <th>Bank</th>
        <th>IFSC</th>
        <th>Branch</th>
        <th class="number">Opening balance</th>
        <th class="number">Closing balance</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>${rows || '<tr><td class="empty" colspan="8">No bank account details found.</td></tr>'}</tbody>
    <tfoot>
      <tr>
        <td colspan="5">Total (${records.length})</td>
        <td class="number">${formatPrintMoney(openingTotal)}</td>
        <td class="number">${formatPrintMoney(closingTotal)}</td>
        <td></td>
      </tr>
    </tfoot>
  </table>`);
}

export function printBankStatementReport(statement: BankStatement): boolean {
  const account = statement.account;
  const rows = statement.entries
    .map(
      (entry) => `<tr>
        <td>${escapePrintText(format(parseISO(entry.date), "dd-MMM-yyyy"))}</td>
        <td>${escapePrintText(entry.entryType.replaceAll("_", " "))}</td>
        <td>${escapePrintText(entry.reference)}</td>
        <td>${escapePrintText(entry.narration)}</td>
        <td>${escapePrintText(entry.counterpartyBankAccountName ?? "")}</td>
        <td class="number">${entry.debit ? formatPrintMoney(entry.debit) : ""}</td>
        <td class="number">${entry.credit ? formatPrintMoney(entry.credit) : ""}</td>
        <td class="number">${formatPrintMoney(entry.balance)}</td>
        <td>${escapePrintText(entry.reconciledAt ? "Reconciled" : "Unreconciled")}</td>
      </tr>`
    )
    .join("");

  return openPrintDocument(`<table class="details" aria-label="Bank details">
    <tbody>
      <tr>
        <th>Code</th><td>${escapePrintText(account.code)}</td>
        <th>Account</th><td>${escapePrintText(account.accountName)}</td>
        <th>Bank</th><td>${escapePrintText(account.bankName)}</td>
      </tr>
      <tr>
        <th>IFSC</th><td>${escapePrintText(account.ifsc)}</td>
        <th>Branch</th><td>${escapePrintText(account.branch)}</td>
        <th>Opening balance</th><td class="number">${formatPrintMoney(account.openingBalance)}</td>
      </tr>
    </tbody>
  </table>
  <table aria-label="Bank statement details">
    <thead>
      <tr>
        <th>Date</th>
        <th>Type</th>
        <th>Reference</th>
        <th>Narration</th>
        <th>Counterparty</th>
        <th class="number">Debit</th>
        <th class="number">Credit</th>
        <th class="number">Balance</th>
        <th>Reconciliation</th>
      </tr>
    </thead>
    <tbody>${rows || '<tr><td class="empty" colspan="9">No statement details found.</td></tr>'}</tbody>
  </table>
  <table class="summary" aria-label="Bank statement totals">
    <tbody>
      <tr><th>Total debits</th><td class="number">${formatPrintMoney(statement.summary.totalDebits)}</td></tr>
      <tr><th>Total credits</th><td class="number">${formatPrintMoney(statement.summary.totalCredits)}</td></tr>
      <tr><th>Closing balance</th><td class="number">${formatPrintMoney(statement.summary.closingBalance)}</td></tr>
      <tr><th>Unreconciled entries</th><td class="number">${statement.summary.unreconciledCount}</td></tr>
    </tbody>
  </table>`);
}
