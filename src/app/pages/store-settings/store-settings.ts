import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { Loading } from '../../components/loading/loading';
import { GlobalService } from '../../services/global.service';
import { api } from '../../services/api';
import { NgxCurrencyDirective } from 'ngx-currency';
import { NgxMaskDirective } from 'ngx-mask';

@Component({
  selector: 'app-store-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, Loading, NgxCurrencyDirective, NgxMaskDirective],
  templateUrl: './store-settings.html',
  styleUrl: './store-settings.css'
})
export class StoreSettings implements OnInit {
  isLoading = false;
  isSaving = false;
  form: FormGroup;
  logoPreview: string | null = null;
  selectedLogoFile: File | null = null;

  availablePaymentMethods = [
    'Pix',
    'Cartão de Crédito',
    'Cartão de Débito',
    'Dinheiro (levar troco)',
    'Vale Refeição / Alimentação'
  ];

  constructor(
    private fb: FormBuilder,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef,
    public global: GlobalService
  ) {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      slug: ['', [Validators.required, Validators.pattern(/^[a-z0-9-]+$/)]],
      description: [''],
      whatsapp: ['', [Validators.required]],
      deliveryFee: [0, [Validators.min(0)]],
      targetMargin: [30, [Validators.required, Validators.min(1), Validators.max(99)]],
      menuEnabled: [true],
      paymentMethods: [[]]
    });
  }

  async ngOnInit() {
    this.isLoading = true;
    try {
      const { data } = await api.get('/api/store');
      if (data?.data) {
        const s = data.data;
        this.logoPreview = s.logo || null;
        this.form.patchValue({
          name: s.name || '',
          slug: s.slug || '',
          description: s.description || '',
          whatsapp: s.whatsapp || '',
          deliveryFee: s.deliveryFee || 0,
          targetMargin: s.targetMargin || 30,
          menuEnabled: s.menuEnabled !== false,
          paymentMethods: s.paymentMethods || ['Pix', 'Cartão de Crédito', 'Dinheiro (levar troco)']
        });
      }
    } catch (err: any) {
      this.global.errorNotification(err);
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  get publicMenuUrl(): string {
    const slug = this.form.get('slug')?.value;
    if (!slug) return '';
    return `${window.location.origin}/c/${slug}`;
  }

  isPaymentMethodSelected(method: string): boolean {
    const current: string[] = this.form.get('paymentMethods')?.value || [];
    return current.includes(method);
  }

  togglePaymentMethod(method: string) {
    const current: string[] = [...(this.form.get('paymentMethods')?.value || [])];
    const index = current.indexOf(method);
    if (index >= 0) {
      current.splice(index, 1);
    } else {
      current.push(method);
    }
    this.form.patchValue({ paymentMethods: current });
  }

  onLogoSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        this.toastr.warning('O logotipo deve ter no máximo 5MB.');
        return;
      }
      this.selectedLogoFile = file;
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.logoPreview = e.target.result;
        this.cdr.detectChanges();
      };
      reader.readAsDataURL(file);
    }
  }

  generateSlugFromName() {
    const name = this.form.get('name')?.value || '';
    if (name) {
      const slug = name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      this.form.patchValue({ slug });
    }
  }

  async save() {
    if (this.form.invalid) {
      this.toastr.warning('Verifique os campos obrigatórios.');
      this.form.markAllAsTouched();
      return;
    }

    this.isSaving = true;
    try {
      const payload = {
        name: this.form.value.name,
        slug: this.form.value.slug,
        description: this.form.value.description,
        whatsapp: this.form.value.whatsapp,
        deliveryFee: Number(this.form.value.deliveryFee) || 0,
        targetMargin: Number(this.form.value.targetMargin) || 30,
        menuEnabled: this.form.value.menuEnabled,
        paymentMethods: this.form.value.paymentMethods
      };

      await api.put('/api/store', payload);

      if (this.selectedLogoFile) {
        const formData = new FormData();
        formData.append('file', this.selectedLogoFile);
        await api.post('/api/store/logo', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }

      this.toastr.success('Configurações do estabelecimento salvas com sucesso!');
    } catch (err: any) {
      this.global.errorNotification(err);
    } finally {
      this.isSaving = false;
      this.cdr.detectChanges();
    }
  }
}
