"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownToLine,
  Shield,
  PauseCircle,
  RotateCcw,
  Wallet,
  Loader2,
  CheckCircle2,
  Receipt,
  Building2,
  CreditCard,
  Check,
  Plus,
} from "lucide-react";
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
import {
  depositToWallet,
  fetchWalletTransactions,
  fetchWalletCards,
  saveWalletCard,
} from "@/src/modules/technical/services/technical.services";
import { recordRealActivity } from "@/src/shared/lib/real-activity-logger";
import SelectDropdown from "@/src/shared/components/SelectDropdown";

type TabId = "overview" | "deposit" | "security" | "holds" | "refunds";

interface DepositReceiptData {
  slipNumber: string;
  transactionId: string;
  accountName: string;
  accountId: string;
  amount: number;
  walletBalance?: number;
  currency: string;
  method: string;
  date: string;
}

interface SavedCard {
  id: number;
  cardHolderName: string;
  last4: string;
  cardBrand: string;
  cardType: string;
  expiryMonth: string;
  expiryYear: string;
  isDefault: boolean;
}

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

const DEPOSIT_METHODS = [
  { label: "Credit / Debit Card (Visa / Mastercard)", value: "Credit / Debit Card" },
  { label: "Bank Wire Transfer (Direct ACH / Swift)", value: "Bank Wire Transfer" },
  { label: "PayPal Instant Deposit", value: "PayPal Instant" },
  { label: "Crypto / USDT (TRC-20 & ERC-20)", value: "Crypto / USDT" },
  { label: "Stripe Online Payment Gateway", value: "Stripe Gateway" },
];

export default function WalletFinancePanel() {
  const { user } = useUser();
  const { userId, isDemo, isReady } = useIsDemoAccount();
  const [tab, setTab] = useState<TabId>("overview");
  const [rows, setRows] = useState<WalletLedgerRecord[]>([]);
  const [depositOpen, setDepositOpen] = useState(false);
  const [securityOpen, setSecurityOpen] = useState(false);
  const [slipOpen, setSlipOpen] = useState(false);
  const [receiptData, setReceiptData] = useState<DepositReceiptData | null>(null);

  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("Credit / Debit Card");
  const [project, setProject] = useState("Technical Project");
  const [loadingDeposit, setLoadingDeposit] = useState(false);

  // Cards State
  const [cards, setCards] = useState<SavedCard[]>([]);
  const [selectedCardId, setSelectedCardId] = useState<string>("new");
  const [cardHolderName, setCardHolderName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvc, setCardCvc] = useState("");
  const [saveCardToDb, setSaveCardToDb] = useState(true);

  // Load cards from backend DB
  const loadCards = async () => {
    try {
      const res = await fetchWalletCards();
      if (Array.isArray(res) && res.length > 0) {
        setCards(res);
        const defaultCard = res.find((c: any) => c.isDefault) || res[0];
        if (defaultCard) {
          setSelectedCardId(String(defaultCard.id));
        }
      } else {
        setSelectedCardId("new");
      }
    } catch {
      setSelectedCardId("new");
    }
  };

  useEffect(() => {
    if (depositOpen) {
      loadCards();
      if (user) {
        const { name } = identity(user);
        if (!cardHolderName) setCardHolderName(name);
      }
    }
  }, [depositOpen, user]);

  const refresh = async () => {
    if (!userId) return;
    try {
      const res = await fetchWalletTransactions();
      const rawList = Array.isArray(res)
        ? res
        : Array.isArray((res as any)?.data)
        ? (res as any).data
        : [];

      if (rawList && rawList.length > 0) {
        const dbRows: WalletLedgerRecord[] = rawList.map((tx: any) => ({
          id: tx.id ? `TX-${String(tx.id).slice(0, 8)}` : `TX-${Date.now().toString().slice(-6)}`,
          userId: tx.userId || userId,
          userName: (user && "name" in user ? String(user.name) : (user as any)?.firstName || "Account"),
          amount: `$${Number(tx.amount || 0).toFixed(2)}`,
          kind:
            tx.type?.toLowerCase() === "deposit"
              ? "deposit"
              : tx.type?.toLowerCase() === "refund"
              ? "refund"
              : tx.type?.toLowerCase() === "withdrawal" || tx.type?.toLowerCase() === "withdraw_hold"
              ? "withdraw_hold"
              : "deposit",
          method: tx.description || (tx.paymentMethod ? `Deposit via ${tx.paymentMethod}` : "Wallet Transaction"),
          date: new Date(tx.createdAt || Date.now()).toLocaleDateString(),
          status: tx.status === "completed" || tx.status === "COMPLETED" ? "Complete" : "Pending",
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
    if (!value || value <= 0) return toast.error("Enter a valid deposit amount");

    // If credit card selected, validate card details
    let cardDataPayload: any = undefined;
    let paymentCardIdPayload: number | undefined = undefined;

    if (method === "Credit / Debit Card") {
      if (selectedCardId === "new") {
        const cleanCard = cardNumber.replace(/\s+/g, "");
        if (cleanCard.length < 13) {
          return toast.error("Please enter a valid card number (13-19 digits)");
        }
        if (!cardHolderName.trim()) {
          return toast.error("Please enter cardholder name");
        }
        const [expM, expY] = (cardExpiry || "").split("/");
        if (!expM || !expY) {
          return toast.error("Please enter valid card expiration date (MM/YY)");
        }
        const fullYear = expY.length === 2 ? `20${expY}` : expY;

        cardDataPayload = {
          cardHolderName: cardHolderName.trim(),
          cardNumber: cleanCard,
          expiryMonth: expM.trim(),
          expiryYear: fullYear.trim(),
          cardBrand: cleanCard.startsWith("4")
            ? "Visa"
            : cleanCard.startsWith("5")
            ? "Mastercard"
            : cleanCard.startsWith("3")
            ? "American Express"
            : "Card",
          isDefault: saveCardToDb,
        };
      } else {
        paymentCardIdPayload = parseInt(selectedCardId, 10);
      }
    }

    setLoadingDeposit(true);
    try {
      const depositDesc =
        method === "Credit / Debit Card"
          ? selectedCardId === "new"
            ? `Deposit via Card ending in ${(cardNumber.replace(/\s+/g, "")).slice(-4)}`
            : `Deposit via Card #${selectedCardId}`
          : `Deposit via ${method}`;

      await depositToWallet(value, depositDesc, {
        cardData: cardDataPayload,
        paymentCardId: paymentCardIdPayload,
        method: method,
      });

      const { id, name } = identity(user);
      const record = submitDeposit({ userId: id, userName: name, amount: value, method });

      // Real activity logging
      try {
        recordRealActivity(
          "DEPOSIT_RECORDED",
          `Deposited $${value.toFixed(2)} USD via ${method} into wallet account.`,
          { userId: id, name, email: user.email }
        );
      } catch {}

      // Prepare Bank Slip data
      const currentBal = (stats.deposits + stats.refunds - stats.holds);
      const newCalculatedBalance = Number((currentBal + value).toFixed(2));
      const slip: DepositReceiptData = {
        slipNumber: `SLIP-${Math.floor(100000 + Math.random() * 900000)}`,
        transactionId: record.id || `TX-${Date.now().toString().slice(-6)}`,
        accountName: name,
        accountId: id ? `ACC-${id.slice(0, 8).toUpperCase()}` : "ACC-VERO2",
        amount: value,
        walletBalance: newCalculatedBalance,
        currency: "USD",
        method: method,
        date: new Date().toLocaleString("en-US", {
          month: "short",
          day: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
      };

      setReceiptData(slip);
      setDepositOpen(false);
      setAmount("");
      setCardNumber("");
      setCardExpiry("");
      setCardCvc("");

      await refresh();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("wallet_updated"));
        window.dispatchEvent(new Event("activity_log_updated"));
      }

      toast.success("Deposit successful! Amount credited and card stored in database.");
      setSlipOpen(true);
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
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("wallet_updated"));
    }
    toast.success("Security deposit placed on hold.");
  };

  return (
    <div className="space-y-4 rounded-xl border border-border bg-card p-4 shadow-sm md:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-bold text-foreground">Wallet Finance</h2>
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
            className="rounded-lg bg-primary px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-primary/90 transition-all cursor-pointer flex items-center gap-1.5"
          >
            <ArrowDownToLine className="h-3.5 w-3.5" />
            New Deposit (Add Money)
          </button>
          <button
            type="button"
            onClick={() => {
              setTab("security");
              setSecurityOpen(true);
            }}
            className="rounded-lg border border-border px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted transition-colors cursor-pointer"
          >
            Security Deposit
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Total Deposits", value: `$${stats.deposits.toFixed(2)}` },
          { label: "Security Deposits", value: `$${stats.security.toFixed(2)}` },
          { label: "Withdraw Holds", value: `$${stats.holds.toFixed(2)}` },
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
                "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer",
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
              <th className="px-2 py-2 font-semibold">Method / Project</th>
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
                  <td className="px-2 py-2 font-medium text-foreground font-mono text-xs">{row.id}</td>
                  <td className="px-2 py-2 capitalize text-muted-foreground">
                    {row.kind.replace(/_/g, " ")}
                  </td>
                  <td className="px-2 py-2 text-muted-foreground">{row.method}</td>
                  <td className="px-2 py-2 font-semibold text-foreground">{row.amount}</td>
                  <td className="px-2 py-2">
                    <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 text-xs font-semibold">
                      {row.status}
                    </span>
                  </td>
                  <td className="px-2 py-2 text-muted-foreground text-xs">{row.date}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* New Deposit Modal */}
      <AppModal
        open={depositOpen}
        onClose={() => !loadingDeposit && setDepositOpen(false)}
        title="Deposit Funds (Add Money)"
        description="Instant Online Deposit & Escrow Gateway"
        size="md"
      >
        <form onSubmit={handleDeposit} className="space-y-4">
          {/* Amount Section with Quick Presets */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-foreground">
                Amount (USD) <span className="text-red-500 font-bold">*</span>
              </label>
              <div className="flex items-center gap-1">
                {[100, 250, 500, 1000].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setAmount(String(preset))}
                    className="rounded-lg border border-border bg-muted/60 px-2 py-0.5 text-[11px] font-semibold text-foreground hover:bg-primary/10 hover:border-primary/30 transition-all cursor-pointer"
                  >
                    +${preset}
                  </button>
                ))}
              </div>
            </div>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">
                $
              </span>
              <input
                type="text"
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
                className="w-full rounded-xl border border-input bg-background pl-8 pr-3.5 py-2.5 text-sm font-semibold text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-all"
                placeholder="500.00"
                required
              />
            </div>
          </div>

          {/* Payment Method Selector */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-foreground">
              Payment Method <span className="text-red-500 font-bold">*</span>
            </label>
            <SelectDropdown
              value={method}
              onChange={(val) => setMethod(val)}
              options={DEPOSIT_METHODS}
              placeholder="Select Payment Method..."
            />
          </div>

          {/* Card Selection & Input Details when Credit/Debit Card is selected */}
          {method === "Credit / Debit Card" && (
            <div className="space-y-3 rounded-2xl border border-border/80 bg-muted/20 p-4 transition-all">
              <div className="flex items-center justify-between border-b border-border/60 pb-2">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <CreditCard className="h-3.5 w-3.5 text-primary" />
                  Select or Enter Payment Card
                </span>
                <span className="text-[10px] text-muted-foreground">Encrypted & Stored in DB</span>
              </div>

              {/* Saved Cards Radio List */}
              {cards.length > 0 && (
                <div className="space-y-2">
                  <label className="text-[11px] font-semibold text-muted-foreground block">
                    Saved Cards in Account:
                  </label>
                  <div className="grid grid-cols-1 gap-2">
                    {cards.map((card) => {
                      const isSelected = selectedCardId === String(card.id);
                      return (
                        <div
                          key={card.id}
                          onClick={() => setSelectedCardId(String(card.id))}
                          className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                            isSelected
                              ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                              : "border-border bg-card hover:bg-muted/40"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                              <CreditCard className="h-4 w-4" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-foreground">
                                  {card.cardBrand || "Card"} •••• {card.last4}
                                </span>
                                {card.isDefault && (
                                  <span className="rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.2 text-[9px] font-bold border border-emerald-500/20">
                                    Default
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-muted-foreground">
                                {card.cardHolderName} · Exp {card.expiryMonth}/{card.expiryYear}
                              </p>
                            </div>
                          </div>
                          <div
                            className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                              isSelected ? "border-primary bg-primary text-white" : "border-border"
                            }`}
                          >
                            {isSelected && <Check className="h-2.5 w-2.5" />}
                          </div>
                        </div>
                      );
                    })}

                    {/* New Card Option */}
                    <div
                      onClick={() => setSelectedCardId("new")}
                      className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                        selectedCardId === "new"
                          ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                          : "border-dashed border-border bg-card hover:bg-muted/40"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-foreground">
                          <Plus className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-foreground">Add New Card</p>
                          <p className="text-[10px] text-muted-foreground">Enter details to store in DB</p>
                        </div>
                      </div>
                      <div
                        className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                          selectedCardId === "new" ? "border-primary bg-primary text-white" : "border-border"
                        }`}
                      >
                        {selectedCardId === "new" && <Check className="h-2.5 w-2.5" />}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Card Entry Fields when New Card is active */}
              {(selectedCardId === "new" || cards.length === 0) && (
                <div className="space-y-3 pt-1">
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold text-foreground">
                      Card Number <span className="text-red-500 font-bold">*</span>
                    </label>
                    <div className="relative">
                      <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <input
                        type="text"
                        value={cardNumber}
                        maxLength={19}
                        onChange={(e) => {
                          const val = e.target.value
                            .replace(/\s+/g, "")
                            .replace(/[^0-9]/gi, "")
                            .match(/.{1,4}/g)
                            ?.join(" ") || "";
                          setCardNumber(val);
                        }}
                        className="w-full rounded-xl border border-input bg-background pl-9 pr-3.5 py-2 text-xs font-semibold text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-all font-mono"
                        placeholder="4242 4242 4242 4242"
                        required={method === "Credit / Debit Card" && selectedCardId === "new"}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-[11px] font-semibold text-foreground">
                      Cardholder Name <span className="text-red-500 font-bold">*</span>
                    </label>
                    <input
                      type="text"
                      value={cardHolderName}
                      onChange={(e) => setCardHolderName(e.target.value)}
                      className="w-full rounded-xl border border-input bg-background px-3.5 py-2 text-xs font-semibold text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-all"
                      placeholder="e.g. Abdul Rafiu"
                      required={method === "Credit / Debit Card" && selectedCardId === "new"}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="mb-1 block text-[11px] font-semibold text-foreground">
                        Expiry Date <span className="text-red-500 font-bold">*</span>
                      </label>
                      <input
                        type="text"
                        value={cardExpiry}
                        maxLength={5}
                        onChange={(e) => {
                          let val = e.target.value.replace(/[^0-9]/g, "");
                          if (val.length >= 3) {
                            val = `${val.slice(0, 2)}/${val.slice(2, 4)}`;
                          }
                          setCardExpiry(val);
                        }}
                        className="w-full rounded-xl border border-input bg-background px-3.5 py-2 text-xs font-semibold text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-all font-mono text-center"
                        placeholder="MM/YY"
                        required={method === "Credit / Debit Card" && selectedCardId === "new"}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] font-semibold text-foreground">
                        CVV / CVC <span className="text-red-500 font-bold">*</span>
                      </label>
                      <input
                        type="password"
                        value={cardCvc}
                        maxLength={4}
                        onChange={(e) => setCardCvc(e.target.value.replace(/[^0-9]/g, ""))}
                        className="w-full rounded-xl border border-input bg-background px-3.5 py-2 text-xs font-semibold text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-all font-mono text-center"
                        placeholder="•••"
                        required={method === "Credit / Debit Card" && selectedCardId === "new"}
                      />
                    </div>
                  </div>

                  <label className="flex items-center gap-2 pt-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={saveCardToDb}
                      onChange={(e) => setSaveCardToDb(e.target.checked)}
                      className="rounded border-border text-primary focus:ring-primary"
                    />
                    <span className="text-[11px] text-muted-foreground font-medium">
                      Save this card securely in account for future deposits
                    </span>
                  </label>
                </div>
              )}
            </div>
          )}

          <div className="rounded-xl border border-border bg-muted/40 p-3 text-xs text-muted-foreground leading-relaxed flex items-center justify-between">
            <span>
              Funds deposited will instantly be credited to your <strong>Available Balance</strong> and safely recorded in the database ledger.
            </span>
          </div>

          <button
            type="submit"
            disabled={loadingDeposit}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-white shadow-sm hover:bg-primary/90 disabled:opacity-50 transition-all cursor-pointer"
          >
            {loadingDeposit ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Processing Deposit & Saving to DB...
              </>
            ) : (
              <>
                <ArrowDownToLine className="h-4 w-4" />
                Confirm Deposit {amount ? `$${parseFloat(amount || "0").toFixed(2)}` : ""}
              </>
            )}
          </button>
        </form>
      </AppModal>

      {/* Official Deposit Bank Slip / Receipt Modal */}
      <AppModal
        open={slipOpen}
        onClose={() => setSlipOpen(false)}
        title="Official Deposit Transaction Slip"
        description="Vero Financial Clearing & Escrow Network"
        size="md"
      >
        {receiptData && (
          <div className="space-y-4 pt-1">
            {/* Paper Bank Slip Container */}
            <div className="relative overflow-hidden rounded-2xl border-2 border-border bg-card p-5 sm:p-6 shadow-sm space-y-4">
              {/* Bank Header */}
              <div className="flex items-center justify-between border-b border-border/80 pb-3.5">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-black tracking-wider uppercase text-foreground">
                      VERO2 FINANCIAL SERVICES
                    </p>
                    <p className="text-[10px] text-muted-foreground font-mono">
                      DEPOSIT SLIP #{receiptData.slipNumber}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                    <Check className="h-3 w-3" /> Cleared
                  </span>
                </div>
              </div>

              {/* Amount Box */}
              <div className="rounded-xl border border-border bg-muted/30 p-3.5 text-center">
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Total Amount Deposited
                </p>
                <p className="mt-1 text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">
                  ${receiptData.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })} {receiptData.currency}
                </p>
              </div>

              {/* Transaction Details Grid */}
              <dl className="grid grid-cols-2 gap-x-3 gap-y-2.5 text-xs">
                <div className="rounded-lg border border-border/60 bg-muted/20 p-2.5">
                  <dt className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                    Account Holder
                  </dt>
                  <dd className="mt-0.5 font-bold text-foreground truncate">
                    {receiptData.accountName}
                  </dd>
                </div>
                <div className="rounded-lg border border-border/60 bg-muted/20 p-2.5">
                  <dt className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                    Account / Ref ID
                  </dt>
                  <dd className="mt-0.5 font-mono font-bold text-foreground truncate">
                    {receiptData.accountId}
                  </dd>
                </div>
                <div className="rounded-lg border border-border/60 bg-muted/20 p-2.5">
                  <dt className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                    Deposit Method
                  </dt>
                  <dd className="mt-0.5 font-bold text-foreground truncate">
                    {receiptData.method}
                  </dd>
                </div>
                <div className="rounded-lg border border-border/60 bg-muted/20 p-2.5">
                  <dt className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                    Transaction Ref
                  </dt>
                  <dd className="mt-0.5 font-mono font-bold text-foreground truncate">
                    {receiptData.transactionId}
                  </dd>
                </div>
                <div className="col-span-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-2.5 flex items-center justify-between">
                  <div>
                    <dt className="text-[10px] font-bold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                      Updated Wallet Balance
                    </dt>
                    <dd className="mt-0.5 font-bold text-sm text-foreground">
                      ${Number(receiptData.walletBalance ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                    </dd>
                  </div>
                  <div className="text-right">
                    <dt className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                      Status
                    </dt>
                    <dd className="mt-0.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 justify-end">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block"></span>
                      Completed
                    </dd>
                  </div>
                </div>
                <div className="col-span-2 rounded-lg border border-border/60 bg-muted/20 p-2.5">
                  <dt className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                    Cleared Date &amp; Time
                  </dt>
                  <dd className="mt-0.5 font-medium text-foreground">
                    {receiptData.date}
                  </dd>
                </div>
              </dl>

              {/* Slanted Green Bank Verification Stamp */}
              <div className="flex justify-end pt-1">
                <div className="inline-flex flex-col items-center rotate-[-8deg] rounded-xl border-2 border-emerald-500/80 bg-emerald-500/10 px-4 py-1.5 text-center shadow-md">
                  <span className="text-[10px] font-black tracking-widest text-emerald-600 dark:text-emerald-400 uppercase">
                    ★ DEPOSIT VERIFIED ★
                  </span>
                  <span className="text-[8px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                    FUNDS CREDITED TO WALLET
                  </span>
                </div>
              </div>
            </div>

            {/* OK Button */}
            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={() => setSlipOpen(false)}
                className="w-full sm:w-auto min-w-[120px] rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-primary/90 transition-all cursor-pointer"
              >
                OK
              </button>
            </div>
          </div>
        )}
      </AppModal>

      {/* Security Deposit Modal */}
      <AppModal
        open={securityOpen}
        onClose={() => setSecurityOpen(false)}
        title="Security Deposit"
        description="Place escrow security deposit"
        size="md"
      >
        <form onSubmit={handleSecurity} className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Held against technical projects until milestones complete or an admin releases funds.
          </p>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-foreground">Amount (USD)</label>
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
              className="w-full rounded-xl border border-input bg-background px-3.5 py-2 text-sm text-foreground"
              placeholder="100.00"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-foreground">Project / Service</label>
            <input
              value={project}
              onChange={(e) => setProject(e.target.value)}
              className="w-full rounded-xl border border-input bg-background px-3.5 py-2 text-sm text-foreground"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white cursor-pointer hover:bg-primary/90"
          >
            Place Security Deposit
          </button>
        </form>
      </AppModal>
    </div>
  );
}
