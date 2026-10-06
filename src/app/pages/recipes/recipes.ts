import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { Loading } from '../../components/loading/loading';
import { GlobalService } from '../../services/global.service';
import { api } from '../../services/api';
import { ResetPagination, TPagination } from '../../types/pagination.type';
import { NgxCurrencyDirective } from 'ngx-currency';
import { GenericTableModal } from '../../components/generic-table/generic-table';

export interface IngredientOption {
  id: string;
  name: string;
  category: string;
  purchaseQuantity: number;
  purchaseUnit: string;
  purchasePrice: number;
  yieldPercent: number;
  costPerUnit: number;
  realUnitCost: number;
}

@Component({
  selector: 'app-recipes',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, Loading, NgxCurrencyDirective, GenericTableModal],
  templateUrl: './recipes.html',
  styleUrl: './recipes.css'
})
export class Recipes implements OnInit {
  isLoading = false;
  isSaving = false;
  isDeleting = false;
  isUploading = false;

  data: TPagination = ResetPagination;
  search: string = '';
  categoryFilter: string = 'all';
  statusFilter: string = 'all';
  categories: any[] = [];
  visiblePages: number[] = [];

  modal = false;
  genericTableModal = false;
  genericTable: string = 'category-receita';
  deleteModal = false;
  activeTab: 'basic' | 'ingredients' | 'costs' | 'pricing' | 'radiox' = 'basic';

  editingRecipe: any | null = null;
  recipeToDelete: any | null = null;

  availableIngredients: IngredientOption[] = [];
  ingredientsMap: Map<string, IngredientOption> = new Map();
  storeTargetMargin: number = 30;

  form: FormGroup;
  units = ['g', 'kg', 'ml', 'L', 'un'];
  yieldUnits = ['kg', 'g', 'L', 'ml', 'un'];

  photoPreview: string | null = null;
  selectedPhotoFile: File | null = null;

  constructor(
    private fb: FormBuilder,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef,
    private router: Router,
    public global: GlobalService
  ) {
    this.form = this.fb.group({
      id: [''],
      name: ['', [Validators.required, Validators.minLength(2)]],
      category: [''],
      description: [''],
      portions: [1, [Validators.required, Validators.min(0.01)]],
      yieldQuantity: [0, [Validators.min(0)]],
      yieldUnit: ['kg'],
      packagingCost: [0, [Validators.min(0)]],
      salePrice: [0, [Validators.min(0)]],
      showInMenu: [true],
      items: this.fb.array([]),
      otherCosts: this.fb.array([]),
      fees: this.fb.array([])
    });
  }

  get items(): FormArray {
    return this.form.get('items') as FormArray;
  }

  get otherCosts(): FormArray {
    return this.form.get('otherCosts') as FormArray;
  }

  get fees(): FormArray {
    return this.form.get('fees') as FormArray;
  }

  async ngOnInit() {
    await Promise.all([
      this.loadIngredientsList(),
      this.loadStoreSettings(),
      this.loadCategories()
    ]);
    this.loadData(1);
  }

  async loadStoreSettings() {
    try {
      const { data } = await api.get('/api/store');
      if (data?.data?.targetMargin) {
        this.storeTargetMargin = Number(data.data.targetMargin) || 30;
      }
    } catch {
      // Default fallback
    }
  }

  async loadIngredientsList() {
    try {
      const { data } = await api.get('/api/ingredients/select');
      if (data?.data) {
        this.availableIngredients = data.data;
        this.ingredientsMap.clear();
        this.availableIngredients.forEach(i => {
          this.ingredientsMap.set(i.id, i);
        });
      }
    } catch (err: any) {
      this.global.errorNotification(err);
    }
  }

  async loadCategories() {
    try {
      const { data } = await api.get('/api/generic-tables/select?deleted=false&table=category-receita');
      if (data?.data) {
        this.categories = data.data;
      }
    } catch {
      // ignore
    }
  }

  openModalGenericTable(table: string = 'category-receita') {
    this.genericTable = table;
    this.genericTableModal = true;
  }

  closeGenericTableModal() {
    this.genericTableModal = false;
  }

  onCategoryCreated(newCategory: any) {
    if (newCategory?.name) {
      this.form.patchValue({ category: newCategory.name });
    }
    this.loadCategories();
  }

  async loadData(page: number = 1) {
    this.isLoading = true;
    try {
      const params: any = {
        pageNumber: page,
        pageSize: 10
      };

      if (this.search?.trim()) params.search = this.search.trim();
      if (this.categoryFilter && this.categoryFilter !== 'all') params.category = this.categoryFilter;
      if (this.statusFilter && this.statusFilter !== 'all') params.status = this.statusFilter;

      const { data } = await api.get('/api/recipes', { params });
      if (data?.data) {
        const raw = data.data;
        this.data = {
          totalPages: raw.totalPages || 1,
          totalCount: raw.totalCount || 0,
          currentPage: raw.currentPage || 1,
          pageSize: raw.pageSize || 10,
          data: raw.data || [],
          items: raw.data || [],
          pageNumber: raw.currentPage || 1,
          totalItems: raw.totalCount || 0
        };
        this.calculatePages();
      }
    } catch (err: any) {
      this.global.errorNotification(err);
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  calculatePages() {
    const total = this.data.totalPages || 1;
    const current = this.data.pageNumber || 1;
    const pages: number[] = [];
    for (let i = Math.max(1, current - 2); i <= Math.min(total, current + 2); i++) {
      pages.push(i);
    }
    this.visiblePages = pages;
  }

  onSearch() {
    this.loadData(1);
  }

  // --- Form Arrays Management ---
  createItem(ingredientId = '', quantity = 100, unit = ''): FormGroup {
    const ing = this.ingredientsMap.get(ingredientId);
    // Se a unidade veio preenchida (ex: abrindo receita para editar), respeita a unidade salva!
    // Se estiver vazia (novo item adicionado), sugere a unidade apropriada
    const chosenUnit = unit || (ing ? (ing.purchaseUnit === 'kg' ? 'g' : ing.purchaseUnit === 'L' ? 'ml' : ing.purchaseUnit) : 'g');
    return this.fb.group({
      ingredientId: [ingredientId, [Validators.required]],
      quantity: [quantity, [Validators.required, Validators.min(0.0001)]],
      unit: [chosenUnit, [Validators.required]]
    });
  }

  addItem() {
    if (this.availableIngredients.length === 0) {
      this.toastr.warning('Cadastre ingredientes antes de adicioná-los a uma receita.');
      return;
    }
    const firstIng = this.availableIngredients[0];
    this.items.push(this.createItem(firstIng.id, 100, firstIng.purchaseUnit === 'kg' ? 'g' : (firstIng.purchaseUnit === 'L' ? 'ml' : firstIng.purchaseUnit)));
    this.cdr.detectChanges();
  }

  removeItem(index: number) {
    this.items.removeAt(index);
    this.cdr.detectChanges();
  }

  onIngredientSelected(index: number) {
    const group = this.items.at(index) as FormGroup;
    const ingId = group.get('ingredientId')?.value;
    const ing = this.ingredientsMap.get(ingId);
    if (ing) {
      const suggestedUnit = ing.purchaseUnit === 'kg' ? 'g' : (ing.purchaseUnit === 'L' ? 'ml' : ing.purchaseUnit);
      group.patchValue({ unit: suggestedUnit });
    }
  }

  getCompatibleUnits(ingredientId: string): string[] {
    const ing = this.ingredientsMap.get(ingredientId);
    if (!ing) return this.units;
    if (ing.purchaseUnit === 'kg' || ing.purchaseUnit === 'g') return ['g', 'kg'];
    if (ing.purchaseUnit === 'L' || ing.purchaseUnit === 'ml') return ['ml', 'L'];
    if (ing.purchaseUnit === 'un') return ['un'];
    return this.units;
  }

  createOtherCost(name = '', value = 0, appliesTo = 'recipe'): FormGroup {
    return this.fb.group({
      name: [name, [Validators.required]],
      value: [value, [Validators.required, Validators.min(0)]],
      appliesTo: [appliesTo, [Validators.required]]
    });
  }

  addOtherCost() {
    this.otherCosts.push(this.createOtherCost('Gás / Energia', 0, 'recipe'));
  }

  removeOtherCost(index: number) {
    this.otherCosts.removeAt(index);
  }

  createFee(name = '', type = 'percent', value = 0): FormGroup {
    return this.fb.group({
      name: [name, [Validators.required]],
      type: [type, [Validators.required]],
      value: [value, [Validators.required, Validators.min(0)]]
    });
  }

  addFee(defaultName = 'Taxa de Cartão') {
    this.fees.push(this.createFee(defaultName, 'percent', 2.5));
  }

  removeFee(index: number) {
    this.fees.removeAt(index);
  }

  // --- Real-time Calculations for the Form ---
  calculateItemCost(itemGroup: any): number {
    const ingId = itemGroup.get('ingredientId')?.value;
    const quantity = Number(itemGroup.get('quantity')?.value) || 0;
    const unit = itemGroup.get('unit')?.value || 'g';

    const ing = this.ingredientsMap.get(ingId);
    if (!ing || ing.purchaseQuantity <= 0) return 0;

    // Real cost per base purchase unit (incorporating yield/perda)
    const yieldFactor = (ing.yieldPercent || 100) / 100;
    const realCostPerPurchaseUnit = (ing.purchasePrice / ing.purchaseQuantity) / (yieldFactor > 0 ? yieldFactor : 1);

    // Convert recipe unit to purchase unit
    let convertedQty = quantity;
    if (ing.purchaseUnit === 'kg') {
      if (unit === 'g') convertedQty = quantity / 1000;
      else if (unit === 'kg') convertedQty = quantity;
      else return 0;
    } else if (ing.purchaseUnit === 'L') {
      if (unit === 'ml') convertedQty = quantity / 1000;
      else if (unit === 'L') convertedQty = quantity;
      else return 0;
    } else if (ing.purchaseUnit === 'g') {
      if (unit === 'kg') convertedQty = quantity * 1000;
      else if (unit === 'g') convertedQty = quantity;
      else return 0;
    } else if (ing.purchaseUnit === 'ml') {
      if (unit === 'L') convertedQty = quantity * 1000;
      else if (unit === 'ml') convertedQty = quantity;
      else return 0;
    }

    return realCostPerPurchaseUnit * convertedQty;
  }

  get totalIngredientsCost(): number {
    let sum = 0;
    for (let i = 0; i < this.items.length; i++) {
      sum += this.calculateItemCost(this.items.at(i));
    }
    return sum;
  }

  get portions(): number {
    const val = Number(this.form.get('portions')?.value);
    return val > 0 ? val : 1;
  }

  get packagingCost(): number {
    return Number(this.form.get('packagingCost')?.value) || 0;
  }

  get otherCostsTotal(): number {
    let sum = 0;
    for (let i = 0; i < this.otherCosts.length; i++) {
      const group = this.otherCosts.at(i);
      const val = Number(group.get('value')?.value) || 0;
      const appliesTo = group.get('appliesTo')?.value;
      if (appliesTo === 'portion') {
        sum += val * this.portions;
      } else {
        sum += val;
      }
    }
    return sum;
  }

  get otherCostsPerPortion(): number {
    return this.portions > 0 ? this.otherCostsTotal / this.portions : 0;
  }

  get totalRecipeCost(): number {
    return this.totalIngredientsCost + (this.packagingCost * this.portions) + this.otherCostsTotal;
  }

  get costPerPortion(): number {
    return this.portions > 0 ? this.totalRecipeCost / this.portions : 0;
  }

  get salePrice(): number {
    return Number(this.form.get('salePrice')?.value) || 0;
  }

  get feesValuePerPortion(): number {
    let total = 0;
    for (let i = 0; i < this.fees.length; i++) {
      const group = this.fees.at(i);
      const val = Number(group.get('value')?.value) || 0;
      const type = group.get('type')?.value;
      if (type === 'percent') {
        total += this.salePrice * (val / 100);
      } else {
        total += val;
      }
    }
    return total;
  }

  get netRevenuePerPortion(): number {
    return this.salePrice - this.feesValuePerPortion;
  }

  get grossProfitPerPortion(): number {
    return this.netRevenuePerPortion - this.costPerPortion;
  }

  get marginPercent(): number {
    if (this.salePrice <= 0) return 0;
    return (this.grossProfitPerPortion / this.salePrice) * 100;
  }

  get costPercent(): number {
    if (this.salePrice <= 0) return 0;
    return (this.costPerPortion / this.salePrice) * 100;
  }

  get suggestedPrice(): number {
    const target = this.storeTargetMargin || 30;
    const factor = 1 - (target / 100);
    if (factor <= 0) return 0;
    return this.costPerPortion / factor;
  }

  get radioXData(): { name: string; cost: number; percent: number; color: string }[] {
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#64748b'];
    const total = this.totalIngredientsCost;
    if (total <= 0) return [];

    const items: { name: string; cost: number; percent: number }[] = [];
    for (let i = 0; i < this.items.length; i++) {
      const group = this.items.at(i);
      const ingId = group.get('ingredientId')?.value;
      const ing = this.ingredientsMap.get(ingId);
      const cost = this.calculateItemCost(group);
      if (cost > 0) {
        items.push({
          name: ing?.name || 'Ingrediente',
          cost,
          percent: (cost / total) * 100
        });
      }
    }

    items.sort((a, b) => b.cost - a.cost);

    const top5 = items.slice(0, 5);
    const others = items.slice(5);

    const result = top5.map((item, idx) => ({
      ...item,
      color: colors[idx % colors.length]
    }));

    if (others.length > 0) {
      const othersCost = others.reduce((acc, curr) => acc + curr.cost, 0);
      result.push({
        name: 'Outros ingredientes',
        cost: othersCost,
        percent: (othersCost / total) * 100,
        color: colors[5]
      });
    }

    return result;
  }

  // --- Modal Open/Close ---
  openCreateModal() {
    this.editingRecipe = null;
    this.photoPreview = null;
    this.selectedPhotoFile = null;
    this.activeTab = 'basic';
    this.form.reset({
      id: '',
      name: '',
      category: '',
      description: '',
      portions: 1,
      yieldQuantity: 0,
      yieldUnit: 'kg',
      packagingCost: 0,
      salePrice: 0,
      showInMenu: true
    });
    this.items.clear();
    this.otherCosts.clear();
    this.fees.clear();

    // Default: add 1 ingredient row
    if (this.availableIngredients.length > 0) {
      this.addItem();
    }

    this.modal = true;
    this.cdr.detectChanges();
  }

  async openEditModal(recipe: any) {
    this.isLoading = true;
    try {
      const { data } = await api.get(`/api/recipes/${recipe.id}`);
      if (!data?.data) return;

      const r = data.data;
      this.editingRecipe = r;
      this.photoPreview = r.photo || null;
      this.selectedPhotoFile = null;
      this.activeTab = 'basic';

      this.form.patchValue({
        id: r.id,
        name: r.name,
        category: r.category || '',
        description: r.description || '',
        portions: r.portions || 1,
        yieldQuantity: r.yieldQuantity || 0,
        yieldUnit: r.yieldUnit || 'kg',
        packagingCost: r.packagingCost || 0,
        salePrice: r.salePrice || 0,
        showInMenu: r.showInMenu !== false
      });

      this.items.clear();
      if (r.items && r.items.length > 0) {
        for (const item of r.items) {
          this.items.push(this.createItem(item.ingredientId, item.quantity, item.unit));
        }
      }

      this.otherCosts.clear();
      if (r.otherCosts && r.otherCosts.length > 0) {
        for (const oc of r.otherCosts) {
          this.otherCosts.push(this.createOtherCost(oc.name, oc.value, oc.appliesTo));
        }
      }

      this.fees.clear();
      if (r.fees && r.fees.length > 0) {
        for (const f of r.fees) {
          this.fees.push(this.createFee(f.name, f.type, f.value));
        }
      }

      this.modal = true;
    } catch (err: any) {
      this.global.errorNotification(err);
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  closeModal() {
    this.modal = false;
    this.editingRecipe = null;
    this.photoPreview = null;
    this.selectedPhotoFile = null;
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        this.toastr.warning('A imagem deve ter no máximo 5MB.');
        return;
      }
      this.selectedPhotoFile = file;
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.photoPreview = e.target.result;
        this.cdr.detectChanges();
      };
      reader.readAsDataURL(file);
    }
  }

  async save() {
    if (this.form.invalid) {
      this.toastr.warning('Preencha os campos obrigatórios.');
      this.form.markAllAsTouched();
      return;
    }

    if (this.items.length === 0) {
      this.toastr.warning('Adicione ao menos um ingrediente à receita.');
      this.activeTab = 'ingredients';
      return;
    }

    this.isSaving = true;
    try {
      const formValue = this.form.value;
      const payload: any = {
        name: formValue.name,
        category: formValue.category,
        description: formValue.description,
        portions: Number(formValue.portions) || 1,
        yieldQuantity: Number(formValue.yieldQuantity) || 0,
        yieldUnit: formValue.yieldUnit,
        packagingCost: Number(formValue.packagingCost) || 0,
        salePrice: Number(formValue.salePrice) || 0,
        showInMenu: formValue.showInMenu,
        items: formValue.items.map((i: any) => ({
          ingredientId: i.ingredientId,
          quantity: Number(i.quantity) || 0,
          unit: i.unit
        })),
        otherCosts: formValue.otherCosts.map((c: any) => ({
          name: c.name,
          value: Number(c.value) || 0,
          appliesTo: c.appliesTo
        })),
        fees: formValue.fees.map((f: any) => ({
          name: f.name,
          type: f.type,
          value: Number(f.value) || 0
        }))
      };

      let recipeId = formValue.id;
      if (recipeId) {
        payload.id = recipeId;
        await api.put('/api/recipes', payload);
        this.toastr.success('Receita atualizada com sucesso!');
      } else {
        const { data } = await api.post('/api/recipes', payload);
        recipeId = data?.data?.id;
        this.toastr.success('Receita cadastrada com sucesso!');
      }

      // If photo was selected, upload it
      if (this.selectedPhotoFile && recipeId) {
        await this.uploadPhoto(recipeId, this.selectedPhotoFile);
      }

      this.closeModal();
      await this.loadCategories();
      this.loadData(this.data.pageNumber || 1);
    } catch (err: any) {
      this.global.errorNotification(err);
    } finally {
      this.isSaving = false;
      this.cdr.detectChanges();
    }
  }

  async uploadPhoto(recipeId: string, file: File) {
    try {
      const formData = new FormData();
      formData.append('file', file);
      await api.post(`/api/recipes/${recipeId}/photo`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
    } catch {
      this.toastr.warning('Receita salva, mas ocorreu um erro ao enviar a imagem.');
    }
  }

  // --- Duplicate Recipe ---
  async duplicateRecipe(recipe: any) {
    try {
      this.isLoading = true;
      await api.post(`/api/recipes/${recipe.id}/duplicate`, {});
      this.toastr.success(`Receita duplicada: "${recipe.name} (Cópia)"`);
      this.loadData(1);
    } catch (err: any) {
      this.global.errorNotification(err);
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  // --- Toggle Menu Visibility ---
  async toggleMenuVisibility(recipe: any) {
    try {
      recipe.showInMenu = !recipe.showInMenu;
      await api.patch(`/api/recipes/${recipe.id}/menu-visibility`, {});
      this.toastr.success(recipe.showInMenu ? 'Prato visível no cardápio.' : 'Prato oculto do cardápio.');
    } catch (err: any) {
      recipe.showInMenu = !recipe.showInMenu; // rollback
      this.global.errorNotification(err);
    }
  }

  // --- Open in Simulator ---
  simulateRecipe(recipe: any) {
    this.router.navigate(['/simulador'], { queryParams: { recipeId: recipe.id } });
  }

  // --- Delete Modal ---
  openDeleteModal(recipe: any) {
    this.recipeToDelete = recipe;
    this.deleteModal = true;
  }

  closeDeleteModal() {
    this.recipeToDelete = null;
    this.deleteModal = false;
  }

  async confirmDelete() {
    if (!this.recipeToDelete) return;
    this.isDeleting = true;
    try {
      await api.delete(`/api/recipes/${this.recipeToDelete.id}`);
      this.toastr.success('Receita excluída com sucesso.');
      this.closeDeleteModal();
      this.loadData(this.data.pageNumber || 1);
    } catch (err: any) {
      this.global.errorNotification(err);
    } finally {
      this.isDeleting = false;
      this.cdr.detectChanges();
    }
  }

  applySuggestedPrice() {
    if (this.suggestedPrice > 0) {
      this.form.patchValue({ salePrice: Math.ceil(this.suggestedPrice * 10) / 10 });
      this.toastr.info(`Preço atualizado para R$ ${(Math.ceil(this.suggestedPrice * 10) / 10).toFixed(2)}`);
    }
  }
}
