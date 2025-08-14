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

// Consolidated into a single interface for consistency
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
  thickness: string;
  sheetSize: string; // Renamed for consistency
  brand: string;
  type: string;
  initialQuantity: number; // Renamed for consistency
}

export interface InventoryItem {
  _id: string;
  thickness: string;
  sheetSize: string; 
  brand: string;
  type: string;
  initialQuantity: number; 
  currentQuantity: number; 
  createdBy: { 
    _id: string;
    username: string;
  };
  createdAt: string;
  updatedAt: string;
  displayName?: string;
}

export interface InventoryTransactionInput {
  quantityChanged: number; // Renamed for consistency
  reductionReason?: ReductionReason; // Renamed for consistency
  transactionType: TransactionType; // Renamed for consistency
}

// ------------------- TRANSACTIONS -------------------

export interface Transaction {
  _id: string;
  item_id?: InventoryItem; // Corrected to match the component's access pattern
  user_id?: User; // Corrected to match the component's access pattern
  transactionType: TransactionType;
  reductionReason?: ReductionReason;
  quantityChanged: number;
  previousQuantity: number;
  newQuantity: number;
  notes?: string;
  createdAt: string;
}

// NEW: Interface for transaction statistics
export interface TransactionStats {
  totalTransactions: number;
  totalAdditions: number;
  totalReductions: number;
}

// ------------------- API -------------------

// This is the new, generic, and consistent API response structure
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  code?: string;
  count?: number;
  total?: number;
  page?: number;
  pages?: number;
}