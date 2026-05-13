const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000/api/v1';

interface LoginResponse {
  access_token: string;
  user: {
    id: string;
    name: string;
    role: string;
    team?: string;
  };
}

class ApiClient {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
  }

  getToken(): string | null {
    return this.token;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // ===== 系统 =====
  async healthCheck() {
    return this.request<{ status: string; database: string; version: string }>('/health');
  }

  // ===== 认证 =====
  async login(personnelId: string, password: string): Promise<LoginResponse> {
    const result = await this.request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ personnelId, password }),
    });
    this.setToken(result.access_token);
    return result;
  }

  // ===== 人员 =====
  async getPersonnel(role?: string) {
    const query = role ? `?role=${role}` : '';
    return this.request<Array<{ personnelId: string; name: string; role: string; team?: string }>>(
      `/personnel${query}`
    );
  }

  // ===== 操作票 =====
  async getTickets(params?: {
    page?: number;
    limit?: number;
    status?: string;
    operator_id?: string;
    keyword?: string;
    start_date?: string;
    end_date?: string;
  }) {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.status) query.set('status', params.status);
    if (params?.operator_id) query.set('operator_id', params.operator_id);
    if (params?.keyword) query.set('keyword', params.keyword);
    if (params?.start_date) query.set('start_date', params.start_date);
    if (params?.end_date) query.set('end_date', params.end_date);
    const qs = query.toString();
    return this.request<{ data: any[]; pagination: { page: number; limit: number; total: number } }>(
      `/tickets${qs ? `?${qs}` : ''}`
    );
  }

  async getTicket(id: string) {
    return this.request<any>(`/tickets/${id}`);
  }

  async getTicketStatus(id: string) {
    return this.request<{
      ticketId: string;
      currentStatus: string;
      currentStatusLabel: string;
      isEditable: boolean;
      isLocked: boolean;
      dispatchTime: string | null;
      allowedActions: Array<{ event: string; label: string }>;
    }>(`/tickets/${id}/status`);
  }

  async createTicket(data: any) {
    return this.request<any>('/tickets', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateTicket(id: string, data: any) {
    return this.request<any>(`/tickets/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async submitTicket(id: string) {
    return this.request<any>(`/tickets/${id}/submit`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
  }

  async reviewTicket(id: string, action: string, comment?: string) {
    return this.request<any>(`/tickets/${id}/review`, {
      method: 'POST',
      body: JSON.stringify({ action, comment }),
    });
  }

  async dispatchTicket(id: string) {
    return this.request<any>(`/tickets/${id}/dispatch`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
  }

  async resubmitTicket(id: string) {
    return this.request<any>(`/tickets/${id}/resubmit`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
  }
}

export const api = new ApiClient();
export default api;
