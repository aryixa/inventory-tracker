export type Role = 'Admin' | 'User' | 'Viewer';
export type TransactionType = 'addition' | 'reduction';
export type ReductionReason = 'usage' | 'breakage';

// ------------------- AUTH -------------------

export interface User {
  _id: string;
  username: string;
  role: Role;
  createdAt: string;
}

export interface AuthCredentials {
  username: string;
  password: string;
}

export interface AdminCreateUserInput extends AuthCredentials {
  role: Extract<Role, 'User' | 'Viewer'>;
}

export interface CheckAdminResponse {
  hasAdmin: boolean;
}

export interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<boolean>;
  register: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
  isAdmin: boolean;
  isViewer: boolean;
  canReduce: boolean;
}

// ------------------- INVENTORY -------------------

export interface NewInventoryItemInput {
  thicknessMm: number;       // mm
  sheetLengthMm: number;     // mm
  sheetWidthMm: number;      // mm
  brand: string;
  type: string;
  initialQuantity: number;   // whole units
  rate: number;              // rate per unit
}

export interface InventoryItem {
  _id: string;
  thicknessMm: number;
  sheetLengthMm: number;
  sheetWidthMm: number;
  brand: string;
  type: string;
  initialQuantity: number;
  currentQuantity: number;
  totalSqm?: number;         // computed & stored on backend
  rate: number;              // rate per unit
  stockValuation?: number;   // computed virtual field: Area × Thickness × Rate × Quantity
  areaSqmPerUnit?: number;   // computed virtual field: area per unit
  createdBy: {
    _id: string;
    username: string;
  };
  createdAt: string;
  updatedAt: string;
  displayName?: string;
}

export interface InventoryTransactionInput {
  quantityChanged: number;
  reductionReason?: ReductionReason;
  transactionType: TransactionType;
  notes?: string;
}

// ------------------- TRANSACTIONS -------------------

export interface Transaction {
  _id: string;
  item_id?: InventoryItem; // keep snake_case for DB schema
  user_id?: User;          // keep snake_case for DB schema
  transactionType: TransactionType;
  reductionReason?: ReductionReason;
  quantityChanged: number;
  previousQuantity: number;
  newQuantity: number;
  notes?: string;
  createdAt: string;
}

export interface TransactionStats {
  totalTransactions: number;
  totalAdditions: number;
  totalReductions: number;
  totalUsage?: number;
  totalBreakage?: number;
  totalQuantityAdded?: number;
  totalQuantityReduced?: number;
}

// ------------------- API -------------------

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  code?: string;
  count?: number;
  total?: number;
  page?: number;
  pages?: number;
  meta?: {
    count: number;
    total: number;
    page: number;
    pages: number;
  };
}
