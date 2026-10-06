import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { NgxMaskDirective } from 'ngx-mask';
import { Auth, UserSession } from '../../services/auth';
import { api } from '../../services/api';
import { GlobalService } from '../../services/global.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NgxMaskDirective],
  templateUrl: './profile.html',
  styleUrls: ['./profile.css']
})
export class Profile implements OnInit {
  form: FormGroup;
  isSaving = false;
  isUploadingPhoto = false;
  currentUser: any = null;
  photoPreview: string = '';

  constructor(
    private fb: FormBuilder,
    private auth: Auth,
    private router: Router,
    private toastr: ToastrService,
    private global: GlobalService,
    private cdr: ChangeDetectorRef
  ) {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      phone: [''],
      password: ['', [Validators.minLength(6)]],
      confirmPassword: ['']
    });
  }

  async ngOnInit(): Promise<void> {
    await this.loadUserProfile();
  }

  async loadUserProfile(): Promise<void> {
    try {
      const { data } = await api.get('/api/users/me');
      if (data?.data) {
        this.currentUser = data.data;
        this.photoPreview = this.currentUser.photo || '';
        this.form.patchValue({
          name: this.currentUser.name || '',
          email: this.currentUser.email || '',
          phone: this.currentUser.phone || ''
        });
        this.cdr.detectChanges();
      }
    } catch (err: any) {
      this.global.errorNotification(err);
    }
  }

  get accessProfileLabel(): string {
    if (!this.currentUser) return '';
    if (this.currentUser.admin === true || this.currentUser.accessProfile === 'admin') return 'Administrador';
    if (this.currentUser.accessProfile === 'doctor') return 'Médico';
    if (this.currentUser.accessProfile === 'clinic-employee') return 'Funcionário / Recepção';
    if (this.currentUser.accessProfile === 'master') return 'Master';
    return this.currentUser.accessProfile || 'Usuário';
  }

  get isAdmin(): boolean {
    return this.currentUser?.admin === true || this.currentUser?.accessProfile === 'admin';
  }

  err(field: string): string | null {
    const c = this.form.get(field);
    if (!c || !c.invalid || !c.touched) return null;
    if (c.errors?.['required']) return 'Campo obrigatório';
    if (c.errors?.['email']) return 'E-mail inválido';
    if (c.errors?.['minlength']) return `Mínimo de ${c.errors?.['minlength'].requiredLength} caracteres`;
    return 'Campo inválido';
  }

  onFileSelected(event: any): void {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      this.toastr.warning('Por favor selecione um arquivo de imagem válido.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      this.toastr.warning('A imagem deve ter no máximo 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      this.photoPreview = base64;
      this.cdr.detectChanges();

      try {
        this.isUploadingPhoto = true;
        const formData = new FormData();
        formData.append('photo', file);
        const { data } = await api.put('/api/users/profile-photo', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        if (data?.data) {
          this.photoPreview = data.data;
        }
        await this.auth.loadCurrentUser();
        this.toastr.success('Foto de perfil atualizada com sucesso.');
      } catch (err: any) {
        this.photoPreview = base64;
      } finally {
        this.isUploadingPhoto = false;
        this.cdr.detectChanges();
      }
    };
    reader.readAsDataURL(file);
  }

  async removePhoto(): Promise<void> {
    try {
      this.isUploadingPhoto = true;
      const formData = new FormData();
      await api.put('/api/users/remove-profile-photo', formData);
      this.photoPreview = '';
      if (this.currentUser) {
        this.currentUser.photo = '';
      }
      await this.auth.loadCurrentUser();
      this.toastr.success('Foto removida com sucesso.');
    } catch (err: any) {
      this.photoPreview = '';
    } finally {
      this.isUploadingPhoto = false;
      this.cdr.detectChanges();
    }
  }

  async onSubmit(): Promise<void> {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.toastr.warning('Verifique os campos obrigatórios.');
      return;
    }

    const { name, email, phone, password, confirmPassword } = this.form.value;

    if (password && password.length > 0) {
      if (password !== confirmPassword) {
        this.toastr.error('A confirmação da nova senha não confere.');
        return;
      }
    }

    this.isSaving = true;
    try {
      const payload: any = {
        id: this.currentUser?.id || '',
        name,
        email,
        phone: phone || '',
        photo: this.photoPreview || '',
        admin: this.currentUser?.admin === true,
        clinicId: this.currentUser?.clinicId || '',
        blocked: this.currentUser?.blocked === true
      };

      if (password && password.trim().length > 0) {
        payload.password = password.trim();
      }

      await api.put('/api/users', payload);

      const updated = await this.auth.loadCurrentUser();
      if (updated) {
        this.currentUser = { ...this.currentUser, ...updated };
      }

      this.form.patchValue({
        password: '',
        confirmPassword: ''
      });
      this.form.markAsPristine();

      this.toastr.success('Perfil atualizado com sucesso!');
    } catch (err: any) {
      this.global.errorNotification(err);
    } finally {
      this.isSaving = false;
      this.cdr.detectChanges();
    }
  }

  goBack(): void {
    this.router.navigate(['/dashboard']);
  }
}
