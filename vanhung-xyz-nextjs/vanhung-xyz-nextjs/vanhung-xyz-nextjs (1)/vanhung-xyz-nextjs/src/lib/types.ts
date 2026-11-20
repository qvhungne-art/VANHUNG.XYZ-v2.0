export type CategoryKey = 'ALL' | 'AI' | 'FB' | 'MAIL' | 'PROXY';
export type ProductCategory = 'AI' | 'FB' | 'MAIL' | 'PROXY';
export type UserRole = 'admin' | 'customer';

export interface Product {
  id: number;
  cat: ProductCategory;
  name: string;
  price: number;
  stock: number;
  badge: string;
  country: string;
  warranty: string;
  format: string;
}

export interface WarrantyTicket {
  id: string;
  reason: string;
  status: string;
}

export interface OrderRecord {
  code: string;
  product: string;
  qty: number;
  total: number;
  time: string;
  data: string;
  warrantyTicket: WarrantyTicket | null;
}

export interface LedgerEntry {
  time: string;
  type: 'DEPOSIT' | 'PURCHASE';
  amount: number;
  balanceAfter: number;
  note: string;
}

export interface UserAccount {
  id: number;
  name: string;
  email: string;
  pass: string;
  role: UserRole;
  wallet: number;
  totalDeposited: number;
  orders: OrderRecord[];
  ledger: LedgerEntry[];
}

export interface CouponInfo {
  code: string;
  type: 'percent' | 'fixed';
  value: number;
  minOrder: number;
  label: string;
}

export interface BankInfo {
  bin: string;
  code: string;
  name: string;
  acc: string;
  owner: string;
}
