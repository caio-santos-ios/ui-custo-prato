import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { Auth, UserSession } from '../../services/auth';
import { ThemeService } from '../../services/theme';

type TMenu = {
  description: string;
  icon: string;
  link: string;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './sidebar.html',
  styleUrls: ['./sidebar.css']
})
export class Sidebar implements OnInit, OnDestroy {
  user: UserSession | null = null;
  private sub?: Subscription;
  menu: TMenu[] = [
    {
      description: "Dashboard",
      icon: "chart-pie",
      link: "dashboard"
    },
    {
      description: "Ingredientes",
      icon: "carrot",
      link: "ingredientes"
    },
    {
      description: "Receitas",
      icon: "utensils",
      link: "receitas"
    },
    {
      description: "Simulador",
      icon: "calculator",
      link: "simulador"
    },
    {
      description: "Meu Cardápio",
      icon: "book-open",
      link: "cardapio"
    },
    {
      description: "Configurações",
      icon: "store",
      link: "configuracoes"
    }
  ];

  constructor(public auth: Auth, private router: Router, public themeService: ThemeService) { }

  async ngOnInit() {
    this.user = this.auth.getUser();
    this.sub = this.auth.user$.subscribe(u => {
      this.user = u;
    });
    await this.auth.loadCurrentUser();
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
  }

  goToProfile() {
    this.router.navigate(['/perfil']);
  }

  logout(event?: Event) {
    if (event) event.stopPropagation();
    this.auth.clearSession();
    this.router.navigate(['/login']);
  }
}
