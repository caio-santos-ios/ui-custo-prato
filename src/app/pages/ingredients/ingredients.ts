import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { Loading } from '../../components/loading/loading';
import { GlobalService } from '../../services/global.service';
import { api } from '../../services/api';
import { ResetPagination, TPagination } from '../../types/pagination.type';
import { NgxCurrencyDirective } from 'ngx-currency';
import { GenericTableModal } from '../../components/generic-table/generic-table';

@Component({
  selector: 'app-ingredients',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, Loading, NgxCurrencyDirective, GenericTableModal],
  templateUrl: './ingredients.html',
  styleUrl: './ingredients.css'
})
export class Ingredients implements OnInit {
  isLoading = false;
  isSaving = false;
  isDeleting = false;

  data: TPagination = ResetPagination;
  search: string = '';
  categoryFilter: string = 'all';
  categories: any[] = [];
  visiblePages: number[] = [];

  modal = false;
  genericTableModal = false;
  deleteModal = false;

  // Stock Entry & History
  stockModal = false;
  historyModal = false;
  isSavingStock = false;
  isLoadingHistory = false;
  selectedIngredientForStock: any = null;
  stockHistory: any[] = [];
  stockForm: FormGroup;

  editingIngredient: any | null = null;
  ingredientToDelete: any | null = null;
  form: FormGroup;

  units = ['kg', 'g', 'L', 'ml', 'un'];

  genericTable: string = "";

  constructor(
    private fb: FormBuilder,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef,
    public global: GlobalService
  ) {
    this.form = this.fb.group({
      id: [''],
      name: ['', [Validators.required, Validators.minLength(2)]],
      category: [''],
      purchaseUnit: ['kg', [Validators.required]],
      yieldPercent: [100, [Validators.required, Validators.min(0.01), Validators.max(100)]],
      notes: ['']
    });

    this.stockForm = this.fb.group({
      ingredientId: ['', [Validators.required]],
      quantity: [1, [Validators.required, Validators.min(0.0001)]],
      unit: ['kg', [Validators.required]],
      totalPrice: [0, [Validators.required, Validators.min(0)]],
      supplier: [''],
      purchaseDate: [new Date().toISOString().substring(0, 10)],
      updateIngredientCost: [true],
      notes: ['']
    });
  }

  ngOnInit() {
    this.loadCategories();
    this.loadData(1);
  }

  async loadCategories() {
    try {
      const { data } = await api.get('/api/generic-tables/select?deleted=false&table=category-ingrediente');
      console.log(data.data)
      if (data?.data) {
        this.categories = data.data;
      }
    } catch { }
  }

  async loadData(page: number = 1) {
    try {
      this.isLoading = true;
      this.cdr.detectChanges();

      const params: any = {
        page,
        pageSize: 10,
        deleted: false
      };

      if (this.search?.trim()) {
        params['regex$name'] = this.search.trim();
      }

      if (this.categoryFilter !== 'all') {
        params['category'] = this.categoryFilter;
      }

      const { data } = await api.get('/api/ingredients', { params });

      if (data?.data) {
        this.data = data.data;
        this.updateVisiblePages();
      }
    } catch (error) {
      this.global.errorNotification(error);
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  onSearch() {
    this.loadData(1);
  }

  clearSearch() {
    this.search = '';
    this.categoryFilter = 'all';
    this.loadData(1);
  }

  onPageChange(page: number) {
    if (page < 1 || page > this.data.totalPages || page === this.data.currentPage) return;
    this.loadData(page);
  }

  updateVisiblePages() {
    const total = this.data.totalPages;
    const current = this.data.currentPage;
    const maxVisible = 5;

    let start = Math.max(1, current - Math.floor(maxVisible / 2));
    let end = Math.min(total, start + maxVisible - 1);

    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }

    this.visiblePages = [];
    for (let i = start; i <= end; i++) {
      this.visiblePages.push(i);
    }
  }

  openModal(ingredient: any = null) {
    if (ingredient) {
      this.editingIngredient = ingredient;
      this.form.patchValue({
        id: ingredient.id,
        name: ingredient.name || '',
        category: ingredient.category || '',
        purchaseUnit: ingredient.purchaseUnit || 'kg',
        yieldPercent: ingredient.yieldPercent || 100,
        notes: ingredient.notes || ''
      });
    } else {
      this.editingIngredient = null;
      this.form.reset({
        id: '',
        name: '',
        category: '',
        purchaseUnit: 'kg',
        yieldPercent: 100,
        notes: ''
      });
    }
    this.modal = true;
    this.cdr.detectChanges();
  }

  closeModal() {
    this.modal = false;
    this.editingIngredient = null;
  }

  openDeleteModal(ingredient: any) {
    this.ingredientToDelete = ingredient;
    this.deleteModal = true;
    this.cdr.detectChanges();
  }

  closeDeleteModal() {
    this.deleteModal = false;
    this.ingredientToDelete = null;
  }

  async confirmDelete() {
    if (!this.ingredientToDelete) return;

    try {
      this.isDeleting = true;
      this.cdr.detectChanges();

      const { data } = await api.delete(`/api/ingredients/${this.ingredientToDelete.id}`);
      this.toastr.success(data?.message || 'Ingrediente excluído com sucesso.');
      this.closeDeleteModal();
      this.loadData(this.data.currentPage);
    } catch (error) {
      this.global.errorNotification(error);
    } finally {
      this.isDeleting = false;
      this.cdr.detectChanges();
    }
  }

  get correctionFactor(): number {
    const yieldPct = Number(this.form.value.yieldPercent) || 100;
    return yieldPct > 0 ? 100 / yieldPct : 1;
  }

  err(field: string): string | null {
    const c = this.form.get(field);
    if (!c || !c.touched || !c.errors) return null;
    if (c.errors['required']) return 'Campo obrigatório';
    if (c.errors['minlength']) return `Mínimo de ${c.errors['minlength'].requiredLength} caracteres`;
    if (c.errors['min']) return 'Valor deve ser maior que zero';
    if (c.errors['max']) return 'Máximo 100% (informe a %)';
    return 'Campo inválido';
  }

  async save() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      if (this.form.get('yieldPercent')?.errors?.['max']) {
        this.toastr.warning('O aproveitamento/rendimento deve ser em porcentagem (máximo 100%). Se 700g foram aproveitados de 1kg, informe 70%.');
      } else {
        this.toastr.warning('Preencha os campos obrigatórios corretamente.');
      }
      return;
    }

    try {
      this.isSaving = true;
      this.cdr.detectChanges();

      const payload: any = {
        name: this.form.value.name?.trim(),
        category: this.form.value.category?.trim() || '',
        purchaseUnit: this.form.value.purchaseUnit || 'kg',
        yieldPercent: Number(this.form.value.yieldPercent) || 100,
        notes: this.form.value.notes?.trim() || '',
        purchaseQuantity: this.editingIngredient ? (this.editingIngredient.purchaseQuantity || 0) : 0,
        purchasePrice: this.editingIngredient ? (this.editingIngredient.purchasePrice || 0) : 0
      };

      const wasEditing = !!this.editingIngredient;

      if (this.editingIngredient) {
        const { data } = await api.put('/api/ingredients', { ...payload, id: this.editingIngredient.id });
        this.toastr.success(data?.message || 'Ingrediente atualizado com sucesso.');
        this.closeModal();
      } else {
        const { data } = await api.post('/api/ingredients', payload);
        this.toastr.success(data?.message || 'Ingrediente cadastrado com sucesso!');
        this.closeModal();
        if (data?.data) {
          this.openStockModal(data.data);
        }
      }

      this.loadCategories();
      this.loadData(wasEditing ? this.data.currentPage : 1);
    } catch (error) {
      this.global.errorNotification(error);
    } finally {
      this.isSaving = false;
      this.cdr.detectChanges();
    }
  }

  // --- MÉTODOS DE ENTRADA DE ESTOQUE / REPOSIÇÃO ---
  openStockModal(ingredient: any = null) {
    this.selectedIngredientForStock = ingredient;
    const today = new Date().toISOString().substring(0, 10);
    const targetId = ingredient ? ingredient.id : (this.data.data?.[0]?.id || '');
    const targetIng = ingredient || (this.data.data?.find((i: any) => i.id === targetId));

    this.stockForm.reset({
      ingredientId: targetId,
      quantity: targetIng ? (targetIng.purchaseQuantity || 1) : 1,
      unit: targetIng ? targetIng.purchaseUnit : 'kg',
      totalPrice: targetIng ? targetIng.purchasePrice : 0,
      supplier: '',
      purchaseDate: today,
      updateIngredientCost: true,
      notes: ''
    });
    this.stockModal = true;
    this.cdr.detectChanges();
  }

  closeStockModal() {
    this.stockModal = false;
    this.selectedIngredientForStock = null;
  }

  onStockIngredientChange() {
    const id = this.stockForm.get('ingredientId')?.value;
    const ing = this.data.data?.find((i: any) => i.id === id);
    if (ing) {
      this.selectedIngredientForStock = ing;
      this.stockForm.patchValue({
        unit: ing.purchaseUnit || 'kg',
        quantity: ing.purchaseQuantity || 1,
        totalPrice: ing.purchasePrice || 0
      });
    }
  }

  get stockComputedUnitCost(): number {
    const qty = Number(this.stockForm.value.quantity) || 0;
    const price = Number(this.stockForm.value.totalPrice) || 0;
    return qty > 0 ? price / qty : 0;
  }

  async saveStockEntry() {
    if (this.stockForm.invalid) {
      this.stockForm.markAllAsTouched();
      this.toastr.warning('Preencha os dados da compra corretamente.');
      return;
    }

    this.isSavingStock = true;
    try {
      const val = this.stockForm.value;
      const payload = {
        ingredientId: val.ingredientId,
        quantity: Number(val.quantity) || 1,
        unit: val.unit,
        totalPrice: Number(val.totalPrice) || 0,
        supplier: val.supplier?.trim() || '',
        purchaseDate: val.purchaseDate ? new Date(val.purchaseDate) : new Date(),
        updateIngredientCost: val.updateIngredientCost !== false,
        notes: val.notes?.trim() || ''
      };

      const { data } = await api.post('/api/stock-entries', payload);
      this.toastr.success(data?.message || 'Entrada de estoque lançada com sucesso!');
      this.closeStockModal();
      this.loadData(this.data.currentPage || 1);
    } catch (err: any) {
      this.global.errorNotification(err);
    } finally {
      this.isSavingStock = false;
      this.cdr.detectChanges();
    }
  }

  async openHistoryModal(ingredient: any) {
    this.selectedIngredientForStock = ingredient;
    this.historyModal = true;
    this.isLoadingHistory = true;
    this.stockHistory = [];
    this.cdr.detectChanges();

    try {
      const { data } = await api.get(`/api/stock-entries/ingredient/${ingredient.id}`);
      this.stockHistory = data?.data || [];
    } catch (err: any) {
      this.global.errorNotification(err);
    } finally {
      this.isLoadingHistory = false;
      this.cdr.detectChanges();
    }
  }

  closeHistoryModal() {
    this.historyModal = false;
    this.selectedIngredientForStock = null;
    this.stockHistory = [];
  }

  openModalGenericTable(table: string) {
    this.genericTableModal = true;
    this.genericTable = table;
  }
}
