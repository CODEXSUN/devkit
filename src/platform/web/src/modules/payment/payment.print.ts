import { format, parseISO } from "date-fns";
import { escapePrintText, formatPrintMoney, openPrintDocument } from "../../shared/print-document";
import type { PaymentRecord } from "./payment.types";

export function printPaymentReport(records: PaymentRecord[]): boolean {
  const rows = records
    .map(
      (record) => `<tr>
        <td>${escapePrintText(format(parseISO(record.date), "dd-MMM-yyyy"))}</td>
        <td>${escapePrintText(record.tgCode)}</td>
        <td>${escapePrintText(record.bank)}</td>
        <td>${escapePrintText(record.name ?? "")}</td>
        <td>${escapePrintText(record.reference ?? "")}</td>
        <td class="number">${formatPrintMoney(record.amount)}</td>
        <td>${escapePrintText(record.status === "active" ? "Active" : "Inactive")}</td>
      </tr>`
    )
    .join("");
  const total = records.reduce((sum, record) => sum + record.amount, 0);

  return openPrintDocument(`<table aria-label="Payment details">
    <thead>
      <tr>
        <th>Date</th>
        <th>TG code</th>
        <th>Bank</th>
        <th>Name</th>
        <th>Reference</th>
        <th class="number">Amount</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>${rows || '<tr><td class="empty" colspan="7">No payment details found.</td></tr>'}</tbody>
    <tfoot>
      <tr>
        <td colspan="5">Total (${records.length})</td>
        <td class="number">${formatPrintMoney(total)}</td>
        <td></td>
      </tr>
    </tfoot>
  </table>`);
}
