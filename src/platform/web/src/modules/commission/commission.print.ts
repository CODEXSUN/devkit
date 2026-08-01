import { format, parseISO } from "date-fns";
import { escapePrintText, formatPrintMoney, openPrintDocument } from "../../shared/print-document";
import type { CommissionListResponse } from "./commission.types";

export function printCommissionReport(report: CommissionListResponse): boolean {
  const variants = report.variants.filter((variant) => variant.status === "active");
  const variantHeaders = variants
    .map(
      (variant) =>
        `<th class="number">${escapePrintText(variant.name)}<br />${formatPrintMoney(variant.percentage)}%</th>`
    )
    .join("");
  const rows = report.entries
    .map(
      (entry) => `<tr>
        <td>${escapePrintText(format(parseISO(entry.date), "dd-MMM-yyyy"))}</td>
        <td>${escapePrintText(entry.direction === "deposit" ? "Deposit" : "Withdraw")}</td>
        <td>${escapePrintText(entry.tgCode)}</td>
        <td>${escapePrintText(entry.name ?? "")}</td>
        <td>${escapePrintText(entry.reference ?? "")}</td>
        <td class="number">${formatPrintMoney(entry.amount)}</td>
        ${variants
          .map(
            (variant) =>
              `<td class="number">${formatPrintMoney(entry.lines.find((line) => line.variantId === variant.id)?.amount ?? 0)}</td>`
          )
          .join("")}
        <td class="number">${formatPrintMoney(entry.totalCommission)}</td>
      </tr>`
    )
    .join("");
  const variantTotals = variants
    .map(
      (variant) =>
        `<td class="number">${formatPrintMoney(report.totals.variants.find((total) => total.variantId === variant.id)?.amount ?? 0)}</td>`
    )
    .join("");
  const columnCount = 7 + variants.length;

  return openPrintDocument(`<table aria-label="Commission details">
    <thead>
      <tr>
        <th>Date</th>
        <th>Direction</th>
        <th>TG code</th>
        <th>Name</th>
        <th>Reference</th>
        <th class="number">Amount</th>
        ${variantHeaders}
        <th class="number">Commission total</th>
      </tr>
    </thead>
    <tbody>${rows || `<tr><td class="empty" colspan="${columnCount}">No commission details found.</td></tr>`}</tbody>
    <tfoot>
      <tr>
        <td colspan="5">Total (${report.entries.length})</td>
        <td class="number">${formatPrintMoney(report.totals.amount)}</td>
        ${variantTotals}
        <td class="number">${formatPrintMoney(report.totals.commission)}</td>
      </tr>
    </tfoot>
  </table>`);
}
