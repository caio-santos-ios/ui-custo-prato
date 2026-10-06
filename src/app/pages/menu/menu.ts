import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { Loading } from '../../components/loading/loading';
import { GlobalService } from '../../services/global.service';
import { api } from '../../services/api';

@Component({
  selector: 'app-menu',
  standalone: true,
  imports: [CommonModule, FormsModule, Loading],
  templateUrl: './menu.html',
  styleUrl: './menu.css'
})
export class Menu implements OnInit {
  isLoading = false;
  items: any[] = [];
  store: any = null;
  search: string = '';
  categoryFilter: string = 'all';
  categories: string[] = [];

  constructor(
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef,
    private router: Router,
    public global: GlobalService
  ) {}

  async ngOnInit() {
    this.isLoading = true;
    try {
      await Promise.all([
        this.loadStore(),
        this.loadMenuItems()
      ]);
    } catch (err: any) {
      this.global.errorNotification(err);
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  async loadStore() {
    try {
      const { data } = await api.get('/api/store');
      if (data?.data) {
        this.store = data.data;
      }
    } catch {
      // fallback
    }
  }

  async loadMenuItems() {
    try {
      const { data } = await api.get('/api/recipes/menu');
      if (data?.data) {
        this.items = data.data;
        const cats = new Set<string>();
        this.items.forEach(i => {
          if (i.category) cats.add(i.category);
        });
        this.categories = Array.from(cats).sort();
      }
    } catch (err: any) {
      this.global.errorNotification(err);
    }
  }

  get filteredItems(): any[] {
    return this.items.filter(item => {
      const matchesSearch = !this.search || item.name.toLowerCase().includes(this.search.toLowerCase());
      const matchesCat = this.categoryFilter === 'all' || item.category === this.categoryFilter;
      return matchesSearch && matchesCat;
    });
  }

  get publicMenuUrl(): string {
    const slug = this.store?.slug || '';
    if (!slug) return '';
    return `${window.location.origin}/c/${slug}`;
  }

  copyLink() {
    if (!this.publicMenuUrl) {
      this.toastr.warning('Defina o link do cardápio nas Configurações da Loja.');
      return;
    }
    navigator.clipboard.writeText(this.publicMenuUrl).then(() => {
      this.toastr.success('Link do cardápio copiado para a área de transferência!');
    }).catch(() => {
      this.toastr.info(this.publicMenuUrl);
    });
  }

  openPublicMenu() {
    if (!this.publicMenuUrl) return;
    window.open(this.publicMenuUrl, '_blank');
  }

  shareOnWhatsapp() {
    if (!this.publicMenuUrl) return;
    const storeName = this.store?.name || 'Nosso Restaurante';
    const text = encodeURIComponent(`Olá! Confira nosso cardápio digital e faça seu pedido online: ${this.publicMenuUrl}`);
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  }

  async toggleVisibility(item: any) {
    const previous = item.showInMenu;
    item.showInMenu = !previous;
    try {
      await api.patch(`/api/recipes/${item.id}/menu-visibility`, {});
      this.toastr.success(item.showInMenu ? `"${item.name}" visível no cardápio.` : `"${item.name}" ocultado do cardápio.`);
    } catch (err: any) {
      item.showInMenu = previous;
      this.global.errorNotification(err);
    }
  }

  goToRecipes() {
    this.router.navigate(['/receitas']);
  }
}
