import { Component, ChangeDetectorRef, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { api } from '../../services/api';
import { GlobalService } from '../../services/global.service';
import { ThemeService } from '../../services/theme';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './forgot-password.html',
  styleUrl: './forgot-password.css'
})
export class ForgotPassword implements OnInit {
  isLoading = false;
  form: FormGroup;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef,
    public global: GlobalService,
    public themeService: ThemeService
  ) {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  ngOnInit(): void {}

  field(name: string): AbstractControl {
    return this.form.get(name)!;
  }

  err(name: string): string | null {
    const c = this.form.get(name);
    if (!c || !c.invalid || !c.touched) return null;
    if (c.errors?.['required']) return 'Campo obrigatório';
    if (c.errors?.['email']) return 'E-mail inválido';
    return 'Campo inválido';
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid) {
      this.toastr.warning('Informe um e-mail válido.');
      this.form.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    try {
      const email = this.form.value.email.trim();
      await api.post('/api/auth/forgot-password', { email });
      this.toastr.success('Enviamos o código de recuperação para seu e-mail.');
      this.router.navigate(['/reset-password']);
    } catch (err: any) {
      this.global.errorNotification(err);
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }
}