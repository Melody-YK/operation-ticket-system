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

  setToken(token: string) {
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

  async healthCheck() {
    return this.request<{ status: string; database: string; version: string }>('/health');
  }

  async login(personnelId: string, password: string): Promise<LoginResponse> {
    const result = await this.request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ personnelId, password }),
    });
    this.setToken(result.access_token);
    return result;
  }

  async getPersonnel(role?: string) {
    return this.request<Array<{ personnelId: string; name: string; role: string; team?: string }>>(
      `/personnel${role ? `?role=${role}` : ''}`
    );
  }

  async getTickets(params?: { page?: number; status?: string }) {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.status) query.set('status', params.status);
    return this.request<{ data: any[]; pagination: { page: number; limit: number; total: number } }>(
      `/tickets?${query.toString()}`
    );
  }

  async createTicket(data: any) {
    return this.request('/tickets', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
}

export const api = new ApiClient();
