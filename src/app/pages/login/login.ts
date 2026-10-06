import { Component, ChangeDetectorRef, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { Auth } from '../../services/auth';
import { api } from '../../services/api';
import { GlobalService } from '../../services/global.service';
import { ThemeService } from '../../services/theme';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login implements OnInit {
  showPassword = false;
  isLoading = false;
  form: FormGroup;

  constructor(
    private fb: FormBuilder,
    private auth: Auth,
    private router: Router,
    private toastr: ToastrService,
    public global: GlobalService,
    public themeService: ThemeService,
    private cdr: ChangeDetectorRef
  ) {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      remember: [true]
    });
  }

  ngOnInit(): void {
    if (this.auth.isAuthenticated()) {
      this.router.navigateByUrl('/dashboard');
    }
  }

  field(name: string): AbstractControl {
    return this.form.get(name)!;
  }

  err(name: string): string | null {
    const c = this.form.get(name);
    if (!c || !c.invalid || !c.touched) return null;
    if (c.errors?.['required']) return 'Campo obrigatório';
    if (c.errors?.['email']) return 'E-mail inválido';
    if (c.errors?.['minlength']) return `Mínimo ${c.errors?.['minlength'].requiredLength} caracteres`;
    return 'Campo inválido';
  }

  toggleShowPassword(): void {
    this.showPassword = !this.showPassword;
  }

  async onSubmit(): Promise<void> {
    try {
      this.form.markAllAsTouched();

      if (this.form.invalid) {
        this.toastr.warning('Preencha seu e-mail e senha corretamente.');
        return;
      }

      this.isLoading = true;
      this.cdr.detectChanges();

      const { email, password } = this.form.value;

      const { data } = await api.post('/api/auth/login', {
        email,
        password,
        device: {
          platform: 'web',
          ip: '',
          userAgent: ''
        }
      });

      if (data?.data) {
        this.auth.setToken(data.data.token);
        if (data.data.refreshToken) {
          this.auth.setRefreshToken(data.data.refreshToken);
        }
        this.auth.setUser({
          id: data.data.id || '',
          name: data.data.name || '',
          email: data.data.email || '',
          photo: data.data.photo || '',
          storeName: data.data.storeName || '',
          storeSlug: data.data.storeSlug || ''
        });

        this.toastr.success(data?.message || 'Login realizado com sucesso!');
        this.router.navigateByUrl('/dashboard');
      }
    } catch (error: any) {
      if (error?.response?.data?.data?.pendingConfirmation) {
        this.toastr.info('Confirme seu e-mail para acessar a conta.');
        this.router.navigate(['/confirmation', '']);
        return;
      }
      this.global.errorNotification(error);
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }
}
