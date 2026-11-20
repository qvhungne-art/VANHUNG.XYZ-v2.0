export type CategoryKey = 'ALL' | 'AI' | 'FB' | 'MAIL' | 'PROXY';
export type ProductCategory = 'AI' | 'FB' | 'MAIL' | 'PROXY';
export type UserRole = 'ADMIN' | 'CUSTOMER';

export interface Product {
  id: number;
  category: ProductCategory;
  name: string;
  price: number;
  stock: number;
  badge: string;
  country: string;
  warranty: string;
  format_hint: string;
}

export interface WarrantyTicket {
  id: number;
  order_code: string;
  username?: string;
  reason: string;
  status: string;
  created_at: string;
}

export interface OrderRecord {
  id: number;
  order_code: string;
  product_name: string;
  quantity: number;
  total_amount: number;
  created_at: string;
  items: string[];
  warranty_status: string | null;
  warranty_reason: string | null;
}

export interface LedgerEntry {
  id: number;
  type: string;
  amount: number;
  balance_after: number;
  reference_code: string | null;
  description: string | null;
  created_at: string;
}

export interface UserProfile {
  id: number;
  username: string;
  email: string;
  role: UserRole;
  balance: number;
  total_deposited: number;
}

export interface BankInfo {
  bin: string;
  code: string;
  name: string;
  acc: string;
  owner: string;
}
