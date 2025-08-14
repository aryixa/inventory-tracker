// src/services/api.ts
import {
  User,
  AuthCredentials,
  ApiResponse,
  InventoryTransactionInput,
  InventoryItem,
  Transaction,
  CheckAdminResponse,
  NewInventoryItemInput,
  TransactionStats,
  AdminCreateUserInput,
} from "../types";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

class ApiError extends Error {
  status: number;
  data: any;
  url: string;
  constructor(message: string, status: number, data: any, url: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
    this.url = url;
  }
}

class ApiService {
  private baseURL: string;
 
  private _unauthorizedHandler: (() => void) | null = null;

  constructor() {
    this.baseURL = API_BASE_URL;
  }

  
  public setUnauthorizedHandler(handler: () => void) {
    this._unauthorizedHandler = handler;
  }


  async request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;

    const { headers: optHeaders, ...rest } = options;
    const config: RequestInit = {
      credentials: "include", 
      mode: "cors", 
      ...rest,
      headers: {
        "Content-Type": "application/json",
        ...(optHeaders as Record<string, string>),
      },
    };

    try {
      const response = await fetch(url, config);

      let parsed: any = null;
      try {
        
        parsed = await response.json();
      } catch {
        
        parsed = null;
      }

      if (!response.ok) {
      
        if (response.status === 401 && parsed?.code === 'TOKEN_EXPIRED') {
          if (this._unauthorizedHandler) {
            this._unauthorizedHandler();
          }
          // The error is still thrown so the component calling this function can handle it.
          throw new ApiError(parsed?.message || response.statusText, response.status, parsed, url);
        }

        const message = parsed?.message || response.statusText || "API request failed";
        throw new ApiError(message, response.status, parsed, url);
      }

      
      if (
        parsed &&
        typeof parsed === "object" &&
        ("success" in parsed || "data" in parsed || "message" in parsed)
      ) {
        return parsed as ApiResponse<T>;
      }
      return { success: true, data: parsed as T } as ApiResponse<T>;
    } catch (error) {
      console.debug("API request error:", error);
      throw error;
    }
  }

  async downloadRequest(endpoint: string, filename: string): Promise<Blob> {
    const url = `${this.baseURL}${endpoint}`;
    const response = await fetch(url, {
      credentials: "include",
      mode: "cors",
    });

    if (!response.ok) {
      if (response.status === 401) {
        if (this._unauthorizedHandler) {
          this._unauthorizedHandler();
        }
      }
      throw new Error(`Failed to download file from ${endpoint}`);
    }

    const blob = await response.blob();
    return blob;
  }

  // --- Auth methods ---
  async login(credentials: AuthCredentials): Promise<ApiResponse<null>> {
    return this.request<null>("/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    });
  }

  async register(userData: AuthCredentials): Promise<ApiResponse<User>> {
    return this.request<User>("/auth/register", {
      method: "POST",
      body: JSON.stringify(userData),
    });
  }

  async logout(): Promise<ApiResponse<null>> {
    return this.request<null>("/auth/logout", { method: "POST" });
  }

  async getMe(): Promise<ApiResponse<User>> {
    return this.request<User>("/auth/me");
  }

  async checkAdmin(): Promise<ApiResponse<CheckAdminResponse>> {
    return this.request<CheckAdminResponse>("/auth/check-admin");
  }

  // --- User methods ---
  async getUsers(): Promise<ApiResponse<User[]>> {
    return this.request<User[]>("/users");
  }

  async createUser(userData: AdminCreateUserInput): Promise<ApiResponse<User>> {
    return this.request<User>("/users", {
      method: "POST",
      body: JSON.stringify(userData),
    });
  }

  async changeUserPassword(
    userId: string,
    newPassword: string
  ): Promise<ApiResponse<null>> {
    return this.request<null>(`/users/${userId}/password`, {
      method: "PUT",
      body: JSON.stringify({ newPassword }),
    });
  }

  // --- Inventory methods ---
  async getInventoryItems(
    params: Record<string, any> = {}
  ): Promise<ApiResponse<InventoryItem[]>> {
    const queryString = new URLSearchParams(params).toString();
    return this.request<InventoryItem[]>(
      `/inventory${queryString ? `?${queryString}` : ""}`
    );
  }

  async createInventoryItem(
    itemData: NewInventoryItemInput
  ): Promise<ApiResponse<InventoryItem>> {
    return this.request<InventoryItem>("/inventory", {
      method: "POST",
      body: JSON.stringify(itemData),
    });
  }

  async updateInventoryQuantity(
    item_id: string,
    transactionData: InventoryTransactionInput
  ): Promise<ApiResponse<Transaction>> {
    return this.request<Transaction>(`/inventory/${item_id}/quantity`, {
      method: "PUT",
      body: JSON.stringify(transactionData),
    });
  }

  // --- Export methods ---
  async exportInventory(): Promise<Blob> {
    return this.downloadRequest("/export/inventory", "inventory-export.csv");
  }

  async exportTransactions(): Promise<Blob> {
    return this.downloadRequest("/export/transactions", "transactions-export.csv");
  }

  // --- Transaction methods ---
  async getTransactions(
    params: Record<string, any> = {}
  ): Promise<ApiResponse<Transaction[]>> {
    const queryString = new URLSearchParams(params).toString();
    return this.request<Transaction[]>(
      `/transactions${queryString ? `?${queryString}` : ""}`
    );
  }

  async getTransactionStats(): Promise<ApiResponse<TransactionStats>> {
    return this.request<TransactionStats>("/transactions/stats");
  }
}

export default new ApiService();