/**
 * Supabase Frontend Client Helper
 * Durgas Jewellers
 */

const SUPABASE_CONFIG = {
  url: window.NEXT_PUBLIC_SUPABASE_URL || 'https://xuoedlqfzlukddpspuls.supabase.co',
  publishableKey: window.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_plDpsHl5s_Or2WNCmFKgjw_hljeSC4a',
};

// Global config access
window.NEXT_PUBLIC_SUPABASE_URL = SUPABASE_CONFIG.url;
window.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = SUPABASE_CONFIG.publishableKey;

class SupabaseHelper {
  constructor(url, anonKey) {
    this.url = url.replace(/\/$/, '');
    this.anonKey = anonKey;
    this.client = null;
    this.initNativeClient();
  }

  // Initialize native @supabase/supabase-js if loaded via CDN
  initNativeClient() {
    if (window.supabase && typeof window.supabase.createClient === 'function') {
      try {
        this.client = window.supabase.createClient(this.url, this.anonKey);
      } catch (e) {
        console.warn('[SupabaseHelper] Native client initialization warning:', e.message);
      }
    }
  }

  getHeaders(token = null) {
    const headers = {
      'apikey': this.anonKey,
      'Content-Type': 'application/json',
    };
    const authToken = token || this.getAccessToken();
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }
    return headers;
  }

  getAccessToken() {
    return localStorage.getItem('sb_access_token') || null;
  }

  getRefreshToken() {
    return localStorage.getItem('sb_refresh_token') || null;
  }

  setSession(session) {
    if (!session) {
      localStorage.removeItem('sb_access_token');
      localStorage.removeItem('sb_refresh_token');
      document.cookie = 'sb-access-token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
      document.cookie = 'sb-refresh-token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
      return;
    }

    if (session.access_token) {
      localStorage.setItem('sb_access_token', session.access_token);
      document.cookie = `sb-access-token=${session.access_token}; Path=/; SameSite=Lax; Max-Age=${session.expires_in || 3600}`;
    }
    if (session.refresh_token) {
      localStorage.setItem('sb_refresh_token', session.refresh_token);
      document.cookie = `sb-refresh-token=${session.refresh_token}; Path=/; SameSite=Lax; Max-Age=2592000`;
    }
  }

  /**
   * Sign In with Email & Password via Supabase Auth API
   */
  async signIn(email, password) {
    if (this.client) {
      const { data, error } = await this.client.auth.signInWithPassword({ email, password });
      if (error) throw error;
      this.setSession(data.session);
      return data;
    }

    const res = await fetch(`${this.url}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error_description || data.msg || data.message || 'Login failed');
    this.setSession(data);
    return { session: data, user: data.user };
  }

  /**
   * Sign Up with Email & Password via Supabase Auth API
   */
  async signUp(email, password, metadata = {}) {
    if (this.client) {
      const { data, error } = await this.client.auth.signUp({
        email,
        password,
        options: { data: metadata },
      });
      if (error) throw error;
      if (data.session) this.setSession(data.session);
      return data;
    }

    const res = await fetch(`${this.url}/auth/v1/signup`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ email, password, data: metadata }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error_description || data.msg || data.message || 'Signup failed');
    if (data.session || data.access_token) this.setSession(data.session || data);
    return { session: data.session || data, user: data.user || data };
  }

  /**
   * Sign Out
   */
  async signOut() {
    if (this.client) {
      await this.client.auth.signOut().catch(() => {});
    } else {
      const token = this.getAccessToken();
      if (token) {
        await fetch(`${this.url}/auth/v1/logout`, {
          method: 'POST',
          headers: this.getHeaders(token),
        }).catch(() => {});
      }
    }
    this.setSession(null);
  }

  /**
   * Refresh the active session
   */
  async refreshSession() {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) return null;

    if (this.client) {
      const { data, error } = await this.client.auth.refreshSession({ refresh_token: refreshToken });
      if (!error && data?.session) {
        this.setSession(data.session);
        return data.session;
      }
      return null;
    }

    try {
      const res = await fetch(`${this.url}/auth/v1/token?grant_type=refresh_token`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
      if (!res.ok) throw new Error('Session refresh failed');
      const data = await res.json();
      this.setSession(data);
      return data;
    } catch (e) {
      this.setSession(null);
      return null;
    }
  }

  /**
   * Query database table via Supabase PostgREST API
   */
  async from(table) {
    if (this.client) {
      return this.client.from(table);
    }
    const self = this;
    return {
      select: async (columns = '*') => {
        const res = await fetch(`${self.url}/rest/v1/${table}?select=${encodeURIComponent(columns)}`, {
          headers: self.getHeaders(),
        });
        const data = await res.json();
        return { data: res.ok ? data : null, error: res.ok ? null : data };
      },
    };
  }
}

// Instantiate and expose globally
window.supabaseHelper = new SupabaseHelper(SUPABASE_CONFIG.url, SUPABASE_CONFIG.publishableKey);
