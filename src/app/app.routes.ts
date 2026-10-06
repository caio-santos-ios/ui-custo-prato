import { Routes } from '@angular/router';
import { DashboardLayout } from './layouts/dashboard-layout/dashboard-layout';
import { Dashboard } from './pages/dashboard/dashboard';
import { Login } from './pages/login/login';
import { Register } from './pages/register/register';
import { Confirmation } from './pages/confirmation/confirmation';
import { ForgotPassword } from './pages/forgot-password/forgot-password';
import { ResetPassword } from './pages/reset-password/reset-password';
import { Ingredients } from './pages/ingredients/ingredients';
import { Recipes } from './pages/recipes/recipes';
import { Simulator } from './pages/simulator/simulator';
import { Menu } from './pages/menu/menu';
import { StoreSettings } from './pages/store-settings/store-settings';
import { PublicMenu } from './pages/public-menu/public-menu';
import { Profile } from './pages/profile/profile';
import { AuthGuard } from './guards/auth-guard';

export const routes: Routes = [
  // Public Menu for customers (unauthenticated)
  { path: 'c/:slug', component: PublicMenu },
  { path: 'cardapio/:slug', redirectTo: 'c/:slug' },

  // Auth pages
  { path: 'login', component: Login },
  { path: 'register', component: Register },
  { path: 'cadastro', redirectTo: 'register' },
  { path: 'forgot-password', component: ForgotPassword },
  { path: 'reset-password', component: ResetPassword },
  { path: 'reset-password/:code', component: ResetPassword },
  { path: 'confirmation', component: Confirmation },
  { path: 'confirmation/:code', component: Confirmation },

  // App Dashboard (authenticated)
  {
    path: '',
    component: DashboardLayout,
    canActivate: [AuthGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: Dashboard },
      { path: 'ingredientes', component: Ingredients },
      { path: 'ingredients', redirectTo: 'ingredientes' },
      { path: 'receitas', component: Recipes },
      { path: 'recipes', redirectTo: 'receitas' },
      { path: 'simulador', component: Simulator },
      { path: 'simulator', redirectTo: 'simulador' },
      { path: 'cardapio', component: Menu },
      { path: 'menu', redirectTo: 'cardapio' },
      { path: 'configuracoes', component: StoreSettings },
      { path: 'settings', redirectTo: 'configuracoes' },
      { path: 'perfil', component: Profile },
      { path: 'profile', redirectTo: 'perfil' },
    ]
  },

  // Fallback
  { path: '**', redirectTo: 'dashboard' }
];
