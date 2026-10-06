import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject } from 'rxjs';
import { jwtDecode } from "jwt-decode";
import { api } from './api';

export interface UserSession {
  id?: string;
  name?: string;
  email?: string;
  photo?: string;
  phone?: string;
  storeName?: string;
  storeSlug?: string;
}

@Injectable({
  providedIn: 'root'
})
export class Auth {
  private isBrowser: boolean;
  private userSubject: BehaviorSubject<UserSession | null>;
  user$;

  constructor(@Inject(PLATFORM_ID) platformId: Object) {
    this.isBrowser = isPlatformBrowser(platformId);
    const initialUser = this.getUser();
    this.userSubject = new BehaviorSubject<UserSession | null>(initialUser);
    this.user$ = this.userSubject.asObservable();
  }

  setToken(token: string) {
    if (this.isBrowser) {
      localStorage.setItem('token', token);
      const user = this.getUser();
      if (user) {
        this.setUser(user);
      }
    }
  }

  getToken(): string | null {
    return this.isBrowser ? localStorage.getItem('token') : null;
  }

  setRefreshToken(token: string) {
    if (this.isBrowser) {
      localStorage.setItem('refreshToken', token);
    }
  }

  getRefreshToken(): string | null {
    return this.isBrowser ? localStorage.getItem('refreshToken') : null;
  }

  setUser(user: UserSession) {
    if (this.isBrowser) {
      localStorage.setItem('user', JSON.stringify(user));
      this.userSubject.next(user);
    }
  }

  getUser(): UserSession | null {
    if (this.isBrowser) {
      let session: UserSession | null = null;
      const stored = localStorage.getItem('user');
      if (stored) {
        try {
          session = JSON.parse(stored);
        } catch { }
      }

      const token = localStorage.getItem('token');
      if (!token) return session;

      try {
        const decoded: any = jwtDecode(token);
        const name = session?.name || decoded.name || decoded['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'] || '';
        const email = session?.email || decoded.email || decoded['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'] || '';
        const photo = session?.photo || decoded.photo || '';
        const id = session?.id || decoded.sub || decoded['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'] || '';

        return {
          id,
          name,
          email,
          photo,
          phone: session?.phone || '',
          storeName: session?.storeName || '',
          storeSlug: session?.storeSlug || ''
        };
      } catch {
        return session;
      }
    }
    return null;
  }

  async loadCurrentUser(): Promise<UserSession | null> {
    if (!this.isBrowser) return null;
    const token = this.getToken();
    if (!token) return null;

    try {
      const { data } = await api.get('/api/users/me');
      if (data?.data) {
        const u = data.data;
        const current: UserSession = {
          id: u.id,
          name: u.name,
          email: u.email,
          photo: u.photo || '',
          phone: u.phone || '',
          storeName: u.storeName || '',
          storeSlug: u.storeSlug || ''
        };
        this.setUser(current);
        return current;
      }
    } catch {
      return this.getUser();
    }
    return this.getUser();
  }

  clearSession() {
    if (this.isBrowser) {
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      this.userSubject.next(null);
    }
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }
}
