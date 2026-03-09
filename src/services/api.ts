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
  CategoryUsage,
  UsageDashboardFilters,
} from "../types";

const API_BASE_URL = (() => {
  // Strip trailing slashes to avoid double-slash URLs
  const envUrl = import.meta.env.VITE_API_URL?.replace(/\/+$/, "");
  if (envUrl) return envUrl;
  const { protocol, hostname } = window.location;
  return `${protocol}//${hostname}:5000/api`;
})();

export class ApiError extends Error {
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

const buildQuery = (params: Record<string, any> = {}) => {
  const entries = Object.entries(params).filter(
    ([, v]) => v !== undefined && v !== null && v !== ""
  );
  return new URLSearchParams(entries as [string, string][]).toString();
};

class ApiService {
  private baseURL: string;
  private _unauthorizedHandler: ((code?: string) => void) | null = null;

  constructor() {
    this.baseURL = API_BASE_URL;
  }

  public setUnauthorizedHandler(handler: (code?: string) => void) {
    this._unauthorizedHandler = handler;
  }

  private handleUnauthorized(parsed: any, status: number) {
    if (status !== 401) return;
    this._unauthorizedHandler?.(parsed?.code);
  }

  private makeUrl(endpoint: string) {
    return `${this.baseURL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;
  }

  async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = this.makeUrl(endpoint);

    const { headers: optHeaders, body, ...rest } = options;
    const hasBody = body !== undefined && body !== null;

    const defaultHeaders: Record<string, string> = {
      Accept: "application/json",
      ...(hasBody ? { "Content-Type": "application/json" } : {}),
    };

    const config: RequestInit = {
      credentials: "include",
      mode: "cors",
      ...rest,
      body,
      headers: {
        ...defaultHeaders,
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
        this.handleUnauthorized(parsed, response.status);
        const message =
          parsed?.message || response.statusText;
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
    } catch (error: any) {
      if (error instanceof ApiError) {
        throw error;
      }
      if (error?.name === "AbortError") {
        throw error;
      }
      const message = error?.message || "Network error";
      throw new ApiError(message, error?.status ?? 0, error?.data ?? null, url);
    }
  }

  async downloadRequest(endpoint: string): Promise<Blob> {
    const url = this.makeUrl(endpoint);
    const response = await fetch(url, {
      credentials: "include",
      mode: "cors",
    });

    if (!response.ok) {
      let parsed: any = null;
      try {
        const ct = response.headers.get("content-type") || "";
        if (ct.includes("application/json")) {
          parsed = await response.json();
        }
      } catch {
        parsed = null;
      }
      this.handleUnauthorized(parsed, response.status);
      throw new Error(parsed?.message || `Failed to download file from ${endpoint}`);
    }

    return await response.blob();
  }

  // --- Auth methods ---
  async login(credentials: AuthCredentials): Promise<ApiResponse<User>> {
    return this.request<User>("/auth/login", {
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

  async createUser(
    userData: AdminCreateUserInput
  ): Promise<ApiResponse<User>> {
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
  async updateInventoryItem(
    item_id: string,
    updateData: Partial<InventoryItem>
  ): Promise<ApiResponse<InventoryItem>> {
    const allowedFields = [
      'brand',
      'type',
      'category',
      'thicknessMm',
      'sheetLengthMm',
      'sheetWidthMm',
      'rate'
    ] as const;

    const filteredPayload = Object.fromEntries(
      Object.entries(updateData).filter(([key]) =>
        allowedFields.includes(key as any)
      )
    );

    // Optional: format thicknessMm to 2 decimals if present
    if (filteredPayload.thicknessMm !== undefined) {
      filteredPayload.thicknessMm = parseFloat(
        Number(filteredPayload.thicknessMm).toFixed(2)
      );
    }

    // Optional: format rate to 2 decimals if present
    if (filteredPayload.rate !== undefined) {
      filteredPayload.rate = parseFloat(
        Number(filteredPayload.rate).toFixed(2)
      );
    }

    return this.request<InventoryItem>(`/inventory/${item_id}`, {
      method: 'PUT',
      body: JSON.stringify(filteredPayload),
    });
  }

  async getInventoryItems(
    params: Record<string, any> = {}
  ): Promise<ApiResponse<InventoryItem[]>> {
    const queryString = buildQuery(params);
    return this.request<InventoryItem[]>(
      `/inventory${queryString ? `?${queryString}` : ""}`
    );
  }

  async getInventoryCategories(): Promise<ApiResponse<string[]>> {
    return this.request<string[]>('/inventory/categories');
  }

  async getInventoryItemsByCategory(
    category: string
  ): Promise<ApiResponse<InventoryItem[]>> {
    const queryString = buildQuery({ category });
    return this.request<InventoryItem[]>(
      `/inventory/by-category${queryString ? `?${queryString}` : ""}`
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
    return this.downloadRequest("/export/inventory");
  }

  async exportTransactions(): Promise<Blob> {
    return this.downloadRequest("/export/transactions");
  }

  async exportCategoryUsage(
    filters: UsageDashboardFilters = {}
  ): Promise<Blob> {
    // Only include filters that have actual values
    const cleanFilters: Record<string, string> = {};
    
    if (filters.startDate && filters.startDate.trim() !== '') {
      cleanFilters.startDate = filters.startDate;
    }
    
    if (filters.endDate && filters.endDate.trim() !== '') {
      cleanFilters.endDate = filters.endDate;
    }
    
    const queryString = buildQuery(cleanFilters);
    return this.downloadRequest(
      `/export/category-usage${queryString ? `?${queryString}` : ""}`
    );
  }

  // --- Transaction methods ---
  async getTransactions(
    params: Record<string, any> = {}
  ): Promise<ApiResponse<Transaction[]>> {
    const queryString = buildQuery(params);
    return this.request<Transaction[]>(
      `/transactions${queryString ? `?${queryString}` : ""}`
    );
  }

  async getTransactionStats(): Promise<ApiResponse<TransactionStats>> {
    return this.request<TransactionStats>("/transactions/stats");
  }

  // --- Usage Dashboard methods ---
  async getCategoryUsage(
    filters: UsageDashboardFilters = {}
  ): Promise<ApiResponse<CategoryUsage[]>> {
    // Only include filters that have actual values
    const cleanFilters: Record<string, string> = {};
    
    if (filters.startDate && filters.startDate.trim() !== '') {
      cleanFilters.startDate = filters.startDate;
    }
    
    if (filters.endDate && filters.endDate.trim() !== '') {
      cleanFilters.endDate = filters.endDate;
    }
    
    const queryString = buildQuery(cleanFilters);
    return this.request<CategoryUsage[]>(
      `/dashboard/category-usage${queryString ? `?${queryString}` : ""}`
    );
  }
}

export default new ApiService();