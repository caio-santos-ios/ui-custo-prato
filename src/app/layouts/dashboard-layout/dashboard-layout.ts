import { Component, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, Router } from '@angular/router';
import { Sidebar } from '../sidebar/sidebar';
import { ThemeService } from '../../services/theme';
import { Auth } from '../../services/auth';

@Component({
  selector: 'app-dashboard-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, Sidebar],
  templateUrl: './dashboard-layout.html',
  styleUrls: ['./dashboard-layout.css']
})
export class DashboardLayout implements OnInit {
  isSidebarOpen = typeof window !== 'undefined' ? window.innerWidth >= 1024 : true;

  constructor(public themeService: ThemeService, public router: Router, public auth: Auth) { }

  ngOnInit(): void {}

  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    if (typeof window !== 'undefined') {
      if (event.target.innerWidth >= 1024) {
        this.isSidebarOpen = true;
      } else {
        this.isSidebarOpen = false;
      }
    }
  }

  toggleSidebar() {
    this.isSidebarOpen = !this.isSidebarOpen;
  }

  closeOnMobile() {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      this.isSidebarOpen = false;
    }
  }
}
