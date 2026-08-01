import { HandshakeIcon, UserRoundIcon } from "lucide-react";
import { TradesOverviewBankBalances } from "./trades-overview.bank-balances";

export type TradesOverviewUser = {
  email: string;
  name: string;
};

export function TradesOverviewWorkspace({ user }: { user?: TradesOverviewUser }) {
  return (
    <section aria-labelledby="trades-overview-title" className="space-y-5">
      <div className="overflow-hidden rounded-md border bg-card shadow-sm">
        <div className="relative min-h-36 p-5 md:p-6">
          <div className="absolute inset-y-0 right-0 hidden w-1/2 bg-gradient-to-l from-emerald-100 via-teal-50 to-transparent md:block" />
          <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-4">
              <span className="grid size-14 shrink-0 place-items-center rounded-md bg-emerald-700 text-white shadow-sm">
                <HandshakeIcon className="size-7" />
              </span>
              <div>
                <p className="text-sm font-semibold uppercase text-muted-foreground">Trades</p>
                <h1
                  className="mt-1 text-3xl font-semibold tracking-normal"
                  id="trades-overview-title"
                >
                  Trades Desk
                </h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                  Your focused workspace for daily trade operations, activity, and business
                  progress.
                </p>
              </div>
            </div>
            {user ? (
              <div className="inline-flex w-fit items-center gap-2 rounded-full border bg-background/90 px-4 py-2 text-sm font-medium shadow-sm">
                <UserRoundIcon className="size-4" />
                <span>
                  Signed in as {user.name} · {user.email}
                </span>
              </div>
            ) : null}
          </div>
        </div>
      </div>
      <TradesOverviewBankBalances />
    </section>
  );
}
