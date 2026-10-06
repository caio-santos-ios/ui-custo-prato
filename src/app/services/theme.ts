import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private isBrowser: boolean;
  private currentTheme: 'light' | 'dark' = 'dark';

  constructor(@Inject(PLATFORM_ID) platformId: Object) {
    this.isBrowser = isPlatformBrowser(platformId);
    if (this.isBrowser) {
      const savedTheme = localStorage.getItem('theme') as 'light' | 'dark';
      this.currentTheme = savedTheme || 'dark';
      this.applyTheme(this.currentTheme);
    }
  }

  getTheme(): 'light' | 'dark' {
    return this.currentTheme;
  }

  isDark(): boolean {
    return this.currentTheme === 'dark';
  }

  toggleTheme(): 'light' | 'dark' {
    this.currentTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
    if (this.isBrowser) {
      localStorage.setItem('theme', this.currentTheme);
      this.applyTheme(this.currentTheme);
    }
    return this.currentTheme;
  }

  private applyTheme(theme: 'light' | 'dark') {
    if (this.isBrowser) {
      document.documentElement.setAttribute('data-theme', theme);
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
        document.body.classList.add('dark-theme');
      } else {
        document.documentElement.classList.remove('dark');
        document.body.classList.remove('dark-theme');
      }
    }
  }
}
