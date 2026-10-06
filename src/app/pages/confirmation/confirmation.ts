import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { api } from '../../services/api';
import { ThemeService } from '../../services/theme';

@Component({
  selector: 'app-confirmation',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './confirmation.html',
  styleUrl: './confirmation.css'
})
export class Confirmation implements OnInit {
  code = '';
  manualCode = '';
  email = '';
  isLoading = false;
  isSuccess = false;
  errorMessage = '';
  resendSuccess = false;
  isResending = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef,
    public themeService: ThemeService
  ) {}

  async ngOnInit(): Promise<void> {
    this.route.params.subscribe(async params => {
      this.code = params['code'] || this.route.snapshot.queryParams['code'] || '';
      this.email = this.route.snapshot.queryParams['email'] || '';

      if (this.code) {
        this.executeConfirmation(this.code);
      }
    });
  }

  async executeConfirmation(codeToUse: string) {
    this.isLoading = true;
    this.errorMessage = '';
    this.cdr.detectChanges();

    try {
      const response = await api.put(`/api/users/confirm-account`, {
        code: codeToUse.trim(),
        email: this.email.trim()
      });

      if (response.status === 200) {
        this.isSuccess = true;
      } else {
        this.errorMessage = response.data?.message || 'Falha ao confirmar conta.';
      }
    } catch (err: any) {
      this.errorMessage = err.response?.data?.message || err.response?.data?.Message || 'Código inválido ou expirado.';
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  submitManual() {
    if (!this.manualCode.trim()) return;
    this.executeConfirmation(this.manualCode);
  }

  async resendCode() {
    if (!this.email.trim()) {
      this.errorMessage = 'Informe seu e-mail para reenviar o código.';
      return;
    }

    try {
      this.isResending = true;
      this.resendSuccess = false;
      this.cdr.detectChanges();

      await api.post('/api/auth/new-code', { email: this.email.trim() });
      this.resendSuccess = true;
      this.errorMessage = '';
    } catch (err: any) {
      this.errorMessage = err.response?.data?.message || 'Falha ao reenviar código.';
    } finally {
      this.isResending = false;
      this.cdr.detectChanges();
    }
  }
}
