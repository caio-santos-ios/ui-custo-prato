import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { api } from '../../services/api';
import { GlobalService } from '../../services/global.service';
import { ThemeService } from '../../services/theme';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.css'
})
export class Register {
  showPassword = false;
  isLoading = false;
  form: FormGroup;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private toastr: ToastrService,
    public global: GlobalService,
    public themeService: ThemeService,
    private cdr: ChangeDetectorRef
  ) {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      storeName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      phone: [''],
      password: ['', [Validators.required, Validators.minLength(8)]]
    });
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
        this.toastr.warning('Preencha os campos obrigatórios corretamente.');
        return;
      }

      this.isLoading = true;
      this.cdr.detectChanges();

      const { data } = await api.post('/api/auth/register', this.form.value);

      this.toastr.success(data?.message || 'Conta criada! Verifique seu e-mail para confirmar.');
      this.router.navigate(['/confirmation', '']);
    } catch (error: any) {
      this.global.errorNotification(error);
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }
}
