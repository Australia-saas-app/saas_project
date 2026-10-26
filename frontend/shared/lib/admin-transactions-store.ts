export interface AdminTransaction {
  id: string;
  type: string;
  user: string;
  amount: string;
  method: string;
  status: string;
  date: string;
}

const MOCK_TRANSACTIONS: AdminTransaction[] = [
  {
    id: "TX001",
    type: "Withdrawal",
    user: "Mr Jack",
    amount: "$50 USD",
    method: "PayPal",
    status: "Complete",
    date: "2025/07/29",
  },
  {
    id: "TX002",
    type: "Commission",
    user: "Sarah Chen",
    amount: "$12 USD",
    method: "—",
    status: "Complete",
    date: "2025/07/28",
  },
  {
    id: "TX003",
    type: "Withdrawal",
    user: "Global Tech Ltd",
    amount: "$500 USD",
    method: "Bank Transfer",
    status: "Pending",
    date: "2025/07/28",
  },
  {
    id: "TX004",
    type: "Deposit",
    user: "Alex Rivera",
    amount: "$100 USD",
    method: "Stripe",
    status: "Complete",
    date: "2025/07/27",
  },
  {
    id: "TX005",
    type: "Commission",
    user: "Priya Sharma",
    amount: "$8 INR",
    method: "—",
    status: "Complete",
    date: "2025/07/26",
  },
  {
    id: "TX006",
    type: "Withdrawal",
    user: "Sarah Chen",
    amount: "$30 USD",
    method: "Wise",
    status: "Processing",
    date: "2025/07/25",
  },
];

const STORAGE_KEY = "admin_transactions";

function readAll(): AdminTransaction[] {
  if (typeof window === "undefined") return [...MOCK_TRANSACTIONS];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [...MOCK_TRANSACTIONS];
    const parsed = JSON.parse(raw) as AdminTransaction[];
    return Array.isArray(parsed) ? parsed : [...MOCK_TRANSACTIONS];
  } catch {
    return [...MOCK_TRANSACTIONS];
  }
}

function writeAll(rows: AdminTransaction[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
}

export function getAdminTransactions(): AdminTransaction[] {
  return readAll();
}

export function addAdminTransaction(tx: AdminTransaction) {
  writeAll([tx, ...readAll().filter((r) => r.id !== tx.id)]);
}

export function updateAdminTransactionStatus(id: string, status: string) {
  writeAll(readAll().map((row) => (row.id === id ? { ...row, status } : row)));
  return readAll().find((r) => r.id === id);
}

export function countPendingTransactions(): number {
  return readAll().filter((t) => t.status === "Pending" || t.status === "Processing").length;
}

export function removeAdminTransaction(id: string) {
  writeAll(readAll().filter((r) => r.id !== id));
}
