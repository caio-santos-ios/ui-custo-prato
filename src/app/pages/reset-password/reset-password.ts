import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, AbstractControl } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { GlobalService } from '../../services/global.service';
import { ThemeService } from '../../services/theme';
import { api } from '../../services/api';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './reset-password.html',
  styleUrl: './reset-password.css'
})
export class ResetPassword implements OnInit {
  form: FormGroup;
  showPassword = false;
  showConfirmPassword = false;
  isLoading = false;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef,
    public global: GlobalService,
    public themeService: ThemeService
  ) {
    this.form = this.fb.group({
      code: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(6)]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    });
  }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      const code = params['code'] || this.route.snapshot.queryParams['code'] || '';
      if (code) {
        this.form.patchValue({ code });
      }
    });
  }

  err(name: string): string | null {
    const c = this.form.get(name);
    if (!c || !c.invalid || !c.touched) return null;
    if (c.errors?.['required']) return 'Campo obrigatório';
    if (c.errors?.['minlength']) return `Mínimo ${c.errors?.['minlength'].requiredLength} caracteres`;
    if (c.errors?.['maxlength']) return `Máximo ${c.errors?.['maxlength'].requiredLength} caracteres`;
    return 'Campo inválido';
  }

  toggleShowPassword(): void {
    this.showPassword = !this.showPassword;
  }

  toggleShowConfirmPassword(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid) {
      this.toastr.warning('Preencha todos os campos corretamente.');
      this.form.markAllAsTouched();
      return;
    }

    const { code, password, confirmPassword } = this.form.value;

    if (password !== confirmPassword) {
      this.toastr.warning('As senhas não coincidem.');
      return;
    }

    this.isLoading = true;
    try {
      await api.post('/api/auth/reset-password', { code, password });
      this.toastr.success('Senha redefinida com sucesso! Faça seu login.');
      this.router.navigate(['/login']);
    } catch (err: any) {
      this.global.errorNotification(err);
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }
}