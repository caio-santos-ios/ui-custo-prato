import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Loading } from '../../components/loading/loading';
import { GlobalService } from '../../services/global.service';
import { api } from '../../services/api';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, Loading],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class Dashboard implements OnInit {
  isLoading = true;
  data: any = null;

  constructor(
    public global: GlobalService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.fetchData();
  }

  async fetchData() {
    try {
      this.isLoading = true;
      this.cdr.detectChanges();

      const response = await api.get('/api/dashboard');
      if (response.data?.data) {
        this.data = response.data.data;
      }
    } catch (err: any) {
      this.global.errorNotification(err);
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  getMarginBadgeClass(margin: number, target: number = 30): string {
    if (margin < 0) return 'bg-rose-500/10 text-rose-500 border-rose-500/20';
    if (margin < target) return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
    return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
  }
}
