"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDownToLine, Shield, PauseCircle, RotateCcw, Wallet, Loader2 } from "lucide-react";
import { toast } from "sonner";
import AppModal from "./AppModal";
import { EmptyState } from "@/src/components/ui/EmptyState";
import { useUser } from "@/src/context/user.provider";
import { useIsDemoAccount } from "@/src/shared/hooks/use-is-demo-account";
import {
  DEMO_LEDGER_SEED,
  getLedgerForUser,
  submitDeposit,
  submitSecurityDeposit,
  type WalletLedgerRecord,
} from "@/src/shared/lib/wallet-ledger-store";
import { depositToWallet, fetchWalletTransactions } from "@/src/modules/technical/services/technical.services";

type TabId = "overview" | "deposit" | "security" | "holds" | "refunds";

function identity(user: NonNullable<ReturnType<typeof useUser>["user"]>) {
  const id = "id" in user && user.id ? String(user.id) : (user.email ?? "guest");
  const name =
    "firstName" in user && user.firstName
      ? `${user.firstName} ${"lastName" in user && user.lastName ? user.lastName : ""}`.trim()
      : "name" in user && user.name
        ? String(user.name)
        : (user.email ?? "Account");
  return { id, name };
}

const TABS: { id: TabId; label: string; icon: typeof ArrowDownToLine }[] = [
  { id: "overview", label: "Overview", icon: RotateCcw },
  { id: "deposit", label: "Deposit", icon: ArrowDownToLine },
  { id: "security", label: "Security deposit", icon: Shield },
  { id: "holds", label: "Withdraw hold", icon: PauseCircle },
  { id: "refunds", label: "Refunds", icon: RotateCcw },
];

export default function WalletFinancePanel() {
  const { user } = useUser();
  const { userId, isDemo, isReady } = useIsDemoAccount();
  const [tab, setTab] = useState<TabId>("overview");
  const [rows, setRows] = useState<WalletLedgerRecord[]>([]);
  const [depositOpen, setDepositOpen] = useState(false);
  const [securityOpen, setSecurityOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("Card · Visa ****4242");
  const [project, setProject] = useState("Technical Project");
  const [loadingDeposit, setLoadingDeposit] = useState(false);

  const refresh = async () => {
    if (!userId) return;
    try {
      const res = await fetchWalletTransactions();
      if (res?.data && Array.isArray(res.data) && res.data.length > 0) {
        const dbRows: WalletLedgerRecord[] = res.data.map((tx: any) => ({
          id: tx.id ? `TX-${tx.id.toString().slice(0, 8)}` : `TX-${Date.now().toString().slice(-6)}`,
          userId: tx.userId || userId,
          userName: "Account",
          amount: `$${Number(tx.amount || 0).toFixed(2)}`,
          kind: tx.type?.toLowerCase() === "deposit" ? "deposit" : tx.type?.toLowerCase() === "refund" ? "refund" : "deposit",
          method: tx.description || "Wallet Transaction",
          date: new Date(tx.createdAt || Date.now()).toLocaleDateString(),
          status: tx.status === "completed" ? "Completed" : "Pending",
        }));
        setRows(dbRows);
        return;
      }
    } catch {
      // fallback to stored/demo
    }

    const stored = getLedgerForUser(userId);
    const demo = isDemo
      ? DEMO_LEDGER_SEED.map((r) => ({
          ...r,
          userId: userId,
          userName: "Demo",
        }))
      : [];
    const ids = new Set(stored.map((r) => r.id));
    setRows([...stored, ...demo.filter((r) => !ids.has(r.id))]);
  };

  useEffect(() => {
    if (!isReady) return;
    refresh();
  }, [isReady, userId, isDemo]);

  const filtered = useMemo(() => {
    if (tab === "overview") return rows;
    if (tab === "deposit") return rows.filter((r) => r.kind === "deposit");
    if (tab === "security") return rows.filter((r) => r.kind === "security_deposit");
    if (tab === "holds") return rows.filter((r) => r.kind === "withdraw_hold");
    return rows.filter((r) => r.kind === "refund");
  }, [rows, tab]);

  const stats = useMemo(() => {
    const sum = (kind: WalletLedgerRecord["kind"]) =>
      rows
        .filter((r) => r.kind === kind)
        .reduce((acc, r) => acc + (parseFloat(r.amount.replace(/[^0-9.]/g, "")) || 0), 0);
    return {
      deposits: sum("deposit"),
      security: sum("security_deposit"),
      holds: sum("withdraw_hold"),
      refunds: sum("refund"),
    };
  }, [rows]);

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return toast.error("Sign in required");
    const value = parseFloat(amount);
    if (!value || value <= 0) return toast.error("Enter a valid amount");
    
    setLoadingDeposit(true);
    try {
      await depositToWallet(value, `Deposit via ${method}`);
      const { id, name } = identity(user);
      submitDeposit({ userId: id, userName: name, amount: value, method });
      setDepositOpen(false);
      setAmount("");
      await refresh();
      toast.success(`Successfully deposited $${value.toFixed(2)} into your wallet!`);
    } catch (err: any) {
      toast.error(err.message || "Failed to process deposit");
    } finally {
      setLoadingDeposit(false);
    }
  };

  const handleSecurity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return toast.error("Sign in required");
    const value = parseFloat(amount);
    if (!value || value <= 0) return toast.error("Enter a valid amount");
    const { id, name } = identity(user);
    submitSecurityDeposit({
      userId: id,
      userName: name,
      amount: value,
      projectLabel: project || "Project",
    });
    setSecurityOpen(false);
    setAmount("");
    refresh();
    toast.success("Security deposit placed on hold.");
  };

  return (
    <div className="space-y-4 rounded-xl border border-border bg-card p-4 shadow-sm md:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-bold text-foreground">Wallet finance</h2>
          <p className="text-sm text-muted-foreground">
            Deposits, security deposits, holds, and refunds — matching platform payment flows.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setTab("deposit");
              setDepositOpen(true);
            }}
            className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white hover:bg-primary/90"
          >
            New deposit (Add Money)
          </button>
          <button
            type="button"
            onClick={() => {
              setTab("security");
              setSecurityOpen(true);
            }}
            className="rounded-lg border border-border px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted"
          >
            Security deposit
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Total deposits", value: `$${stats.deposits.toFixed(2)}` },
          { label: "Security deposits", value: `$${stats.security.toFixed(2)}` },
          { label: "Withdraw holds", value: `$${stats.holds.toFixed(2)}` },
          { label: "Refunds", value: `$${stats.refunds.toFixed(2)}` },
        ].map((s) => (
          <div key={s.label} className="rounded-lg border border-border bg-muted/40 px-3 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {s.label}
            </p>
            <p className="mt-1 text-lg font-bold text-foreground">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 border-b border-border pb-2">
        {TABS.map((item) => {
          const Icon = item.icon;
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={[
                "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
                active ? "bg-primary text-white" : "text-muted-foreground hover:bg-muted",
              ].join(" ")}
            >
              <Icon className="h-3.5 w-3.5" />
              {item.label}
            </button>
          );
        })}
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs uppercase text-muted-foreground">
              <th className="px-2 py-2 font-semibold">ID</th>
              <th className="px-2 py-2 font-semibold">Type</th>
              <th className="px-2 py-2 font-semibold">Method / project</th>
              <th className="px-2 py-2 font-semibold">Amount</th>
              <th className="px-2 py-2 font-semibold">Status</th>
              <th className="px-2 py-2 font-semibold">Date</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-4">
                  <EmptyState
                    icon={<Wallet className="h-8 w-8" />}
                    title={`No ${tab === "overview" ? "finance" : tab.replace("_", " ")} records yet`}
                    description="Transactions will appear here as they happen."
                  />
                </td>
              </tr>
            ) : (
              filtered.map((row) => (
                <tr key={row.id} className="border-b border-border/60">
                  <td className="px-2 py-2 font-medium text-foreground">{row.id}</td>
                  <td className="px-2 py-2 capitalize text-muted-foreground">
                    {row.kind.replace(/_/g, " ")}
                  </td>
                  <td className="px-2 py-2 text-muted-foreground">{row.method}</td>
                  <td className="px-2 py-2 font-semibold text-foreground">{row.amount}</td>
                  <td className="px-2 py-2">
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                      {row.status}
                    </span>
                  </td>
                  <td className="px-2 py-2 text-muted-foreground">{row.date}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <AppModal
        open={depositOpen}
        onClose={() => !loadingDeposit && setDepositOpen(false)}
        title="Deposit funds (Add Money)"
        size="md"
      >
        <form onSubmit={handleDeposit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Amount (USD)</label>
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm"
              placeholder="100.00"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Payment method (Demo Gateway)</label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm"
            >
              <option>Card · Visa ****4242</option>
              <option>Mastercard · ****8899</option>
              <option>Bank transfer</option>
              <option>PayPal</option>
            </select>
          </div>
          <p className="text-xs text-muted-foreground">
            Funds will be deposited to your wallet immediately and stored in the database.
          </p>
          <button
            type="submit"
            disabled={loadingDeposit}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50"
          >
            {loadingDeposit ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowDownToLine className="h-4 w-4" />}
            Confirm Deposit
          </button>
        </form>
      </AppModal>

      <AppModal
        open={securityOpen}
        onClose={() => setSecurityOpen(false)}
        title="Security deposit"
        size="md"
      >
        <form onSubmit={handleSecurity} className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Held against technical projects until milestones complete or an admin releases funds.
          </p>
          <div>
            <label className="mb-1 block text-sm font-medium">Amount (USD)</label>
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm"
              placeholder="100.00"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Project / service</label>
            <input
              value={project}
              onChange={(e) => setProject(e.target.value)}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white"
          >
            Place security deposit
          </button>
        </form>
      </AppModal>
    </div>
  );
}
