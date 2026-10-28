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
import { DashboardTablePagination } from "./DashboardTablePagination";
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
  fetchBusinessTransactions,
} from "@/src/modules/technical/services/technical.services";
import { recordRealActivity } from "@/src/shared/lib/real-activity-logger";
import SelectDropdown from "@/src/shared/components/SelectDropdown";
import { checkDepositPermission } from "@/src/shared/lib/verification-access";
import {
  KycVerificationGateModal,
  getLiveKycStatus,
  type KycGateStatus,
} from "./KycVerificationGateModal";

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
    "fullName" in user && user.fullName && String(user.fullName).trim()
      ? String(user.fullName).trim()
      : "name" in user && user.name && String(user.name).trim()
      ? String(user.name).trim()
      : "firstName" in user && user.firstName
      ? `${user.firstName} ${"lastName" in user && user.lastName ? user.lastName : ""}`.trim()
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

const getLedgerStatusBadge = (status: string) => {
  const s = String(status || "").toLowerCase();
  if (s === "complete" || s === "completed" || s === "approved" || s === "paid") {
    return (
      <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap inline-flex items-center gap-1">
        Complete
      </span>
    );
  }
  if (s === "rejected" || s === "reject" || s === "failed") {
    return (
      <span className="rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap inline-flex items-center gap-1">
        Reject
      </span>
    );
  }
  return (
    <span className="rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap inline-flex items-center gap-1">
      Pending
    </span>
  );
};

const PAGE_SIZE = 10;

export default function WalletFinancePanel() {
  const { user } = useUser();
  const { userId, isDemo, isReady } = useIsDemoAccount();
  const [tab, setTab] = useState<TabId>("overview");
  const [currentPage, setCurrentPage] = useState(1);
  const [rows, setRows] = useState<WalletLedgerRecord[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(true);
  const [depositOpen, setDepositOpen] = useState(false);
  const [securityOpen, setSecurityOpen] = useState(false);
  const [slipOpen, setSlipOpen] = useState(false);
  const [receiptData, setReceiptData] = useState<DepositReceiptData | null>(null);

  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("Credit / Debit Card");
  const [project, setProject] = useState("Technical Project");
  const [loadingDeposit, setLoadingDeposit] = useState(false);
  const [kycGateOpen, setKycGateOpen] = useState(false);
  const [kycGateStatus, setKycGateStatus] = useState<"not_applied" | "pending" | "rejected">("not_applied");

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

  const refresh = async (showSpinner = false) => {
    if (showSpinner) {
      setLoadingRecords(true);
    }
    let dbRows: WalletLedgerRecord[] = [];
    try {
      const res = await fetchWalletTransactions();
      const rawList = Array.isArray(res)
        ? res
        : Array.isArray((res as any)?.transactions)
        ? (res as any).transactions
        : Array.isArray((res as any)?.data)
        ? (res as any).data
        : [];

        if (rawList && rawList.length > 0) {
          dbRows = rawList.map((tx: any) => {
            const rawStatus = String(tx.status || "").toLowerCase();
            const desc = String(tx.description || "").toLowerCase();
            const typeStr = String(tx.type || "").toLowerCase();

            const isWithdraw =
              typeStr === "withdrawal" ||
              typeStr === "withdraw_hold" ||
              desc.includes("withdraw");
            const isReverted =
              rawStatus === "reverted" ||
              rawStatus === "cancelled" ||
              desc.includes("revert");
            const isRej =
              rawStatus === "failed" ||
              rawStatus === "rejected" ||
              rawStatus === "reject" ||
              desc.includes("rejected");
            const isComp =
              rawStatus === "completed" ||
              rawStatus === "complete" ||
              rawStatus === "approved" ||
              rawStatus === "paid";

            const status: "Complete" | "Reject" | "Pending" =
              isComp ? "Complete" : (isRej || isReverted) ? "Reject" : "Pending";

            return {
              id: tx.transactionId || (tx.id ? `TX-${String(tx.id).slice(0, 8)}` : `TX-${Date.now().toString().slice(-6)}`),
              userId: tx.userId || userId || "user",
              userName: (user && "name" in user ? String(user.name) : (user as any)?.firstName || "Account"),
              amount: `$${Number(tx.amount || 0).toFixed(2)}`,
              kind:
                typeStr === "deposit"
                  ? "deposit"
                  : typeStr === "security_deposit"
                  ? "security_deposit"
                  : typeStr === "refund"
                  ? "refund"
                  : isWithdraw
                  ? "withdraw_hold"
                  : "deposit",
              method: tx.description || (tx.paymentMethod ? `Deposit via ${tx.paymentMethod}` : "Wallet Transaction"),
              date: new Date(tx.createdAt || Date.now()).toLocaleDateString(),
              status,
            };
          });
        }
    } catch {
      // fallback to stored/demo
    }

    // Cross-check localStorage withdrawals for real-time overrides without overriding DB terminal states
    if (typeof window !== "undefined") {
      try {
        const rawW = localStorage.getItem("platform_wallet_withdrawals");
        if (rawW) {
          const wList = JSON.parse(rawW);
          if (Array.isArray(wList)) {
            const wMap = new Map<string, "Complete" | "Reject" | "Pending">();
            let changed = false;

            wList.forEach((w: any) => {
              const st = String(w.status || "").toLowerCase();
              const desc = String(w.description || "").toLowerCase();
              const isRej =
                st === "rejected" ||
                st === "reject" ||
                st === "failed" ||
                desc.includes("rejected");
              const isComp =
                st === "approved" ||
                st === "complete" ||
                st === "completed" ||
                st === "paid";
              const resolved: "Complete" | "Reject" | "Pending" = isComp
                ? "Complete"
                : isRej
                ? "Reject"
                : "Pending";
              if (w.id) wMap.set(w.id, resolved);
              if (w.requestId) wMap.set(w.requestId, resolved);
            });

            dbRows = dbRows.map((r) => {
              if (r.kind === "withdraw_hold") {
                // If DB or description already indicates rejected or completed, keep that definitive status
                if (
                  r.status === "Reject" ||
                  r.status === "Complete" ||
                  String(r.method || "").toLowerCase().includes("rejected")
                ) {
                  return {
                    ...r,
                    status: r.status === "Complete" ? "Complete" : "Reject",
                  };
                }
                // Only let local storage override if local storage has a terminal status (Reject or Complete)
                if (wMap.has(r.id)) {
                  const ov = wMap.get(r.id)!;
                  if (ov === "Reject" || ov === "Complete") {
                    return { ...r, status: ov };
                  }
                }
              }
              return r;
            });

            // Synchronize any DB rejections/approvals back to localStorage platform_wallet_withdrawals
            const updatedWList = wList.map((w: any) => {
              const matchingDb = dbRows.find(
                (d) => d.id === w.id || d.id === w.requestId
              );
              if (matchingDb) {
                if (
                  matchingDb.status === "Reject" &&
                  String(w.status).toLowerCase() === "pending"
                ) {
                  changed = true;
                  return { ...w, status: "Rejected" };
                }
                if (
                  matchingDb.status === "Complete" &&
                  String(w.status).toLowerCase() === "pending"
                ) {
                  changed = true;
                  return { ...w, status: "Approved" };
                }
              }
              return w;
            });
            if (changed) {
              localStorage.setItem(
                "platform_wallet_withdrawals",
                JSON.stringify(updatedWList)
              );
            }
          }
        }
      } catch {}
    }

    const resolvedUserId = String(userId || (user as any)?.id || (user as any)?.userId || "user");

    // Clean up stale mock deposits from platform_wallet_ledger if real DB transactions exist
    if (typeof window !== "undefined" && dbRows.length > 0) {
      try {
        const rawLedger = localStorage.getItem("platform_wallet_ledger");
        if (rawLedger) {
          const parsed = JSON.parse(rawLedger);
          if (Array.isArray(parsed)) {
            const cleaned = parsed.filter(
              (r: any) => !String(r.id || "").startsWith("DP-") && r.kind !== "deposit"
            );
            if (cleaned.length !== parsed.length) {
              localStorage.setItem("platform_wallet_ledger", JSON.stringify(cleaned));
            }
          }
        }
      } catch {}
    }

    // Include only actual released project & milestone transactions for business account
    const bizTxs = fetchBusinessTransactions(user);
    const bizLedgerRows: WalletLedgerRecord[] = bizTxs
      .filter((tx) => tx.type === "project_release" || tx.type === "milestone_release")
      .map((tx) => ({
        id: tx.id,
        userId: resolvedUserId,
        userName: (user && "name" in user ? String(user.name) : (user as any)?.firstName || "Business Account"),
        amount: tx.amount,
        kind: "deposit",
        method: `${tx.title} (${tx.milestoneInfo || "Project Release"})`,
        date: tx.date || new Date().toLocaleDateString(),
        status: "Complete",
      }));

    // If real backend transactions exist, do not merge mock deposit records
    const rawStored = userId ? getLedgerForUser(userId) : [];
    const stored = dbRows.length > 0
      ? rawStored.filter((r) => r.kind !== "deposit" && !r.id.startsWith("DP-"))
      : rawStored;

    const demo: WalletLedgerRecord[] = isDemo
      ? DEMO_LEDGER_SEED.map((r) => ({
          ...r,
          userId: resolvedUserId,
          userName: "Demo",
        }))
      : [];

    const combined = [...dbRows, ...bizLedgerRows, ...stored];
    const seenIds = new Set<string>();
    const uniqueRows: WalletLedgerRecord[] = [];
    combined.forEach((r) => {
      if (r && r.id && !seenIds.has(r.id)) {
        seenIds.add(r.id);
        uniqueRows.push({
          ...r,
          userId: r.userId || resolvedUserId,
        });
      }
    });

    if (uniqueRows.length === 0 && demo.length > 0) {
      setRows(demo);
    } else {
      setRows(uniqueRows);
    }
    setLoadingRecords(false);
  };

  useEffect(() => {
    // Initial load shows spinner until completed
    refresh(true);

    // Event listener for wallet updates (silent refresh, does not flicker spinner)
    const handleUpdate = () => {
      refresh(false);
    };

    window.addEventListener("wallet_updated", handleUpdate);
    window.addEventListener("vero:withdrawal_updated", handleUpdate);
    window.addEventListener("platform_projects_updated", handleUpdate);
    window.addEventListener("storage", handleUpdate);
    window.addEventListener("focus", handleUpdate);

    let bc1: BroadcastChannel | null = null;
    let bc2: BroadcastChannel | null = null;
    try {
      if (typeof window !== "undefined" && "BroadcastChannel" in window) {
        bc1 = new BroadcastChannel("wallet_channel");
        bc1.onmessage = () => {
          handleUpdate();
        };
        bc2 = new BroadcastChannel("vero_channel");
        bc2.onmessage = () => {
          handleUpdate();
        };
      }
    } catch {}

    // Active real-time poll so admin status changes on port 8001 reflect immediately without page refresh
    const interval = setInterval(() => {
      refresh(false);
    }, 3000);

    return () => {
      clearInterval(interval);
      window.removeEventListener("wallet_updated", handleUpdate);
      window.removeEventListener("vero:withdrawal_updated", handleUpdate);
      window.removeEventListener("platform_projects_updated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
      window.removeEventListener("focus", handleUpdate);
      if (bc1) try { bc1.close(); } catch {}
      if (bc2) try { bc2.close(); } catch {}
    };
  }, [userId, isDemo]);

  const filtered = useMemo(() => {
    if (tab === "overview") return rows;
    if (tab === "deposit") return rows.filter((r) => r.kind === "deposit");
    if (tab === "security") return rows.filter((r) => r.kind === "security_deposit");
    if (tab === "holds") return rows.filter((r) => r.kind === "withdraw_hold");
    return rows.filter((r) => r.kind === "refund");
  }, [rows, tab]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, currentPage]);

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  const stats = useMemo(() => {
    const sum = (kind: WalletLedgerRecord["kind"]) =>
      rows
        .filter((r) => r.kind === kind && (r.status === "Complete" || r.status === "Completed" || kind === "security_deposit"))
        .reduce((acc, r) => acc + (parseFloat(r.amount.replace(/[^0-9.]/g, "")) || 0), 0);
    return {
      deposits: sum("deposit"),
      security: sum("security_deposit"),
      holds: rows
        .filter((r) => {
          if (r.kind !== "withdraw_hold") return false;
          const s = String(r.status || "").toLowerCase();
          const isPending = s === "pending" || s === "held" || s === "processing";
          const isRejectedOrFailed =
            s === "reject" ||
            s === "rejected" ||
            s === "failed" ||
            String(r.method || "").toLowerCase().includes("rejected") ||
            String((r as any).note || "").toLowerCase().includes("rejected");
          const isReverted =
            s === "reverted" ||
            s === "cancelled" ||
            String(r.method || "").toLowerCase().includes("revert");
          return isPending && !isRejectedOrFailed && !isReverted;
        })
        .reduce((acc, r) => acc + (parseFloat(r.amount.replace(/[^0-9.]/g, "")) || 0), 0),
      refunds: sum("refund"),
    };
  }, [rows]);

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return toast.error("Sign in required");

    const depositPerm = checkDepositPermission(user);
    if (!depositPerm.allowed) {
      return toast.error(depositPerm.message || "Deposit not allowed for your account status.");
    }

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

    // 0. Check live KYC verification status with spinning button feedback
    const kycState = await getLiveKycStatus(user);
    if (kycState !== "approved") {
      await new Promise((r) => setTimeout(r, 550));
      setLoadingDeposit(false);
      setKycGateStatus(kycState as "not_applied" | "pending" | "rejected");
      setKycGateOpen(true);
      return;
    }

    try {
      const depositDesc =
        method === "Credit / Debit Card"
          ? selectedCardId === "new"
            ? `Deposit via Card ending in ${(cardNumber.replace(/\s+/g, "")).slice(-4)}`
            : `Deposit via Card #${selectedCardId}`
          : `Deposit via ${method}`;

      const depositRes = await depositToWallet(value, depositDesc, {
        cardData: cardDataPayload,
        paymentCardId: paymentCardIdPayload,
        method: method,
      });

      const { id, name } = identity(user);
      const fullName =
        (user as any)?.fullName ||
        (user as any)?.name ||
        ("firstName" in user && user.firstName ? `${user.firstName} ${(user as any).lastName || ""}`.trim() : "") ||
        name;

      const realTxId =
        depositRes?.transactionId ||
        depositRes?.data?.transactionId ||
        (depositRes?.id ? `TX-${depositRes.id}` : undefined);

      let recordId = realTxId;

      // Only fallback to local mock store if backend returned nothing
      if (!depositRes || (!depositRes.transactionId && !depositRes.id && !depositRes.success)) {
        const record = submitDeposit({ userId: id, userName: fullName, amount: value, method });
        recordId = record.id;
      }

      // Real activity logging with Full Name
      try {
        recordRealActivity(
          "DEPOSIT_RECORDED",
          `Deposited $${value.toFixed(2)} USD via ${method} into wallet account.`,
          { userId: id, name: fullName, fullName, email: user.email }
        );
      } catch {}

      // Prepare Bank Slip data
      const slipTxId = recordId || `TX-${Date.now().toString().slice(-6)}`;
      const newCalculatedBalance = Number(
        depositRes?.wallet?.balance ??
        (Number(depositRes?.balance) || (stats.deposits + value))
      );
      const slip: DepositReceiptData = {
        slipNumber: `SLIP-${Math.floor(100000 + Math.random() * 900000)}`,
        transactionId: slipTxId,
        accountName: fullName,
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

      toast.success(`Deposit of $${value.toFixed(2)} USD completed successfully!`);
      setSlipOpen(true);
    } catch (err: any) {
      toast.error(err.message || "Failed to process deposit");
    } finally {
      setLoadingDeposit(false);
    }
  };

  const handleSecurity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return toast.error("Sign in required");
    const value = parseFloat(amount);
    if (!value || value <= 0) return toast.error("Enter a valid amount");

    // Check KYC status before allowing security deposit hold
    const kycState = await getLiveKycStatus(user);
    if (kycState !== "approved") {
      setKycGateStatus(kycState as "not_applied" | "pending" | "rejected");
      setKycGateOpen(true);
      return;
    }

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
              setCurrentPage(1);
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
              setCurrentPage(1);
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
              onClick={() => {
                setTab(item.id);
                setCurrentPage(1);
              }}
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

      <div className="max-h-[216px] overflow-y-auto overflow-x-auto rounded border border-border/60 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-muted-foreground/30 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/50">
        <table className="min-w-full text-left text-sm">
          <thead className="sticky top-0 z-10 bg-card border-b border-border shadow-sm">
            <tr className="border-b border-border text-xs uppercase text-muted-foreground bg-card">
              <th className="px-3 py-2.5 font-semibold bg-card">ID</th>
              <th className="px-3 py-2.5 font-semibold bg-card">Type</th>
              <th className="px-3 py-2.5 font-semibold bg-card">Method / Project</th>
              <th className="px-3 py-2.5 font-semibold bg-card">Amount</th>
              <th className="px-3 py-2.5 font-semibold bg-card">Status</th>
              <th className="px-3 py-2.5 font-semibold bg-card">Date</th>
            </tr>
          </thead>
          <tbody>
            {loadingRecords ? (
              <tr>
                <td colSpan={6} className="p-10 text-center">
                  <div className="flex items-center justify-center">
                    <div className="relative flex items-center justify-center">
                      <div className="h-9 w-9 rounded-full border-[2.5px] border-primary/20" />
                      <div className="absolute h-9 w-9 rounded-full border-[2.5px] border-transparent border-t-primary border-r-primary animate-spin" />
                    </div>
                  </div>
                </td>
              </tr>
            ) : filtered.length === 0 ? (
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
              paginatedRows.map((row) => (
                <tr key={row.id} className="border-b border-border/60 hover:bg-muted/30 transition-colors">
                  <td className="px-3 py-2.5 font-medium text-foreground font-mono text-xs">{row.id}</td>
                  <td className="px-3 py-2.5 capitalize text-muted-foreground text-xs">
                    {row.kind.replace(/_/g, " ")}
                  </td>
                  <td className="px-3 py-2.5 text-muted-foreground text-xs">{row.method}</td>
                  <td className="px-3 py-2.5 font-semibold text-foreground text-xs">{row.amount}</td>
                  <td className="px-3 py-2.5">
                    {getLedgerStatusBadge(row.status)}
                  </td>
                  <td className="px-3 py-2.5 text-muted-foreground text-xs whitespace-nowrap">{row.date}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {filtered.length > 0 && (
        <DashboardTablePagination
          current={currentPage}
          total={totalPages}
          pageSize={PAGE_SIZE}
          totalItems={filtered.length}
          onChange={setCurrentPage}
          compact
        />
      )}

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

      {/* KYC Status Enforcement Gate Modal */}
      <KycVerificationGateModal
        open={kycGateOpen}
        onClose={() => {
          setKycGateOpen(false);
          setDepositOpen(false);
          setSecurityOpen(false);
        }}
        status={kycGateStatus}
        role={(user as any)?.role || (user as any)?.accountType}
      />
    </div>
  );
}
