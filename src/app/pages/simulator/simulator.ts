import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { Loading } from '../../components/loading/loading';
import { GlobalService } from '../../services/global.service';
import { api } from '../../services/api';
import { NgxCurrencyDirective } from 'ngx-currency';

@Component({
  selector: 'app-simulator',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, Loading, NgxCurrencyDirective],
  templateUrl: './simulator.html',
  styleUrl: './simulator.css'
})
export class Simulator implements OnInit {
  isLoading = false;
  isCalculating = false;

  recipesList: any[] = [];
  selectedRecipeId: string = '';
  recipeName: string = 'Simulação';

  units = ['g', 'kg', 'ml', 'L', 'un'];

  // Form for sandbox
  form: FormGroup;

  // Calculation Results from Backend
  originalResult: any = null;
  simulatedResult: any = null;
  goalsResult: any = null;

  activeTab: 'recipe' | 'goals' = 'recipe';

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef,
    public global: GlobalService
  ) {
    this.form = this.fb.group({
      recipeId: [''],
      portions: [1, [Validators.required, Validators.min(0.01)]],
      packagingCost: [0, [Validators.min(0)]],
      salePrice: [0, [Validators.min(0)]],
      targetMargin: [30, [Validators.min(0), Validators.max(99)]],
      items: this.fb.array([]),
      otherCosts: this.fb.array([]),
      fees: this.fb.array([]),
      goal: this.fb.group({
        dailySales: [10, [Validators.min(0)]],
        daysPerMonth: [26, [Validators.min(1), Validators.max(31)]],
        targetMonthlyProfit: [5000, [Validators.min(0)]],
        salePriceVariation: [0], // %
        volumeVariation: [0], // %
        ingredientCostVariation: [0] // %
      })
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

  get goalGroup(): FormGroup {
    return this.form.get('goal') as FormGroup;
  }

  async ngOnInit() {
    this.isLoading = true;
    try {
      await this.loadRecipesList();

      this.route.queryParams.subscribe(async (params) => {
        const id = params['recipeId'];
        if (id) {
          this.selectedRecipeId = id;
          await this.loadRecipeIntoSandbox(id);
        } else if (this.recipesList.length > 0) {
          this.selectedRecipeId = this.recipesList[0].id;
          await this.loadRecipeIntoSandbox(this.selectedRecipeId);
        }
      });
    } catch (err: any) {
      this.global.errorNotification(err);
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  async loadRecipesList() {
    try {
      const { data } = await api.get('/api/recipes', { params: { pageSize: 100 } });
      if (data?.data?.items) {
        this.recipesList = data.data.items;
      }
    } catch (err: any) {
      this.global.errorNotification(err);
    }
  }

  async onSelectRecipe(recipeId: string) {
    if (!recipeId) return;
    this.selectedRecipeId = recipeId;
    await this.loadRecipeIntoSandbox(recipeId);
  }

  async loadRecipeIntoSandbox(recipeId: string) {
    this.isLoading = true;
    try {
      const { data } = await api.get(`/api/recipes/${recipeId}`);
      if (!data?.data) return;

      const r = data.data;
      this.recipeName = r.name;

      this.form.patchValue({
        recipeId: r.id,
        portions: r.portions || 1,
        packagingCost: r.packagingCost || 0,
        salePrice: r.salePrice || 0,
        targetMargin: r.calculation?.targetMargin || 30
      });

      this.items.clear();
      if (r.calculation?.breakdown && r.calculation.breakdown.length > 0) {
        for (const item of r.calculation.breakdown) {
          // Find original ingredient details from breakdown
          this.items.push(this.fb.group({
            ingredientId: [item.ingredientId],
            name: [item.name],
            quantity: [item.quantity, [Validators.required, Validators.min(0.0001)]],
            unit: [item.unit, [Validators.required]],
            purchasePrice: [item.purchasePrice || (item.rawUnitCost * (item.purchaseQuantity || 1)), [Validators.min(0)]],
            purchaseQuantity: [item.purchaseQuantity || 1, [Validators.min(0.0001)]],
            purchaseUnit: [item.purchaseUnit || 'kg'],
            yieldPercent: [item.yieldPercent || 100, [Validators.min(0.01), Validators.max(100)]]
          }));
        }
      }

      this.otherCosts.clear();
      if (r.otherCosts && r.otherCosts.length > 0) {
        for (const oc of r.otherCosts) {
          this.otherCosts.push(this.fb.group({
            name: [oc.name],
            value: [oc.value, [Validators.min(0)]],
            appliesTo: [oc.appliesTo]
          }));
        }
      }

      this.fees.clear();
      if (r.fees && r.fees.length > 0) {
        for (const f of r.fees) {
          this.fees.push(this.fb.group({
            name: [f.name],
            type: [f.type],
            value: [f.value, [Validators.min(0)]]
          }));
        }
      }

      await this.calculate();
    } catch (err: any) {
      this.global.errorNotification(err);
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  addItem() {
    this.items.push(this.fb.group({
      ingredientId: ['custom-' + Date.now()],
      name: ['Novo Ingrediente'],
      quantity: [100, [Validators.required, Validators.min(0.0001)]],
      unit: ['g', [Validators.required]],
      purchasePrice: [20, [Validators.min(0)]],
      purchaseQuantity: [1, [Validators.min(0.0001)]],
      purchaseUnit: ['kg'],
      yieldPercent: [100, [Validators.min(0.01), Validators.max(100)]]
    }));
    this.calculate();
  }

  removeItem(index: number) {
    this.items.removeAt(index);
    this.calculate();
  }

  addOtherCost() {
    this.otherCosts.push(this.fb.group({
      name: ['Custo Extra'],
      value: [5, [Validators.min(0)]],
      appliesTo: ['recipe']
    }));
    this.calculate();
  }

  removeOtherCost(index: number) {
    this.otherCosts.removeAt(index);
    this.calculate();
  }

  addFee() {
    this.fees.push(this.fb.group({
      name: ['Taxa Cartão'],
      type: ['percent'],
      value: [2.5, [Validators.min(0)]]
    }));
    this.calculate();
  }

  removeFee(index: number) {
    this.fees.removeAt(index);
    this.calculate();
  }

  async calculate() {
    this.isCalculating = true;
    try {
      const val = this.form.value;
      const payload: any = {
        recipeId: this.selectedRecipeId || '',
        recipe: {
          portions: Number(val.portions) || 1,
          packagingCost: Number(val.packagingCost) || 0,
          salePrice: Number(val.salePrice) || 0,
          targetMargin: Number(val.targetMargin) || 30,
          items: val.items.map((i: any) => ({
            ingredientId: i.ingredientId,
            name: i.name,
            quantity: Number(i.quantity) || 0,
            unit: i.unit,
            purchasePrice: Number(i.purchasePrice) || 0,
            purchaseQuantity: Number(i.purchaseQuantity) || 1,
            purchaseUnit: i.purchaseUnit,
            yieldPercent: Number(i.yieldPercent) || 100
          })),
          otherCosts: val.otherCosts.map((c: any) => ({
            name: c.name,
            value: Number(c.value) || 0,
            appliesTo: c.appliesTo
          })),
          fees: val.fees.map((f: any) => ({
            name: f.name,
            type: f.type,
            value: Number(f.value) || 0
          }))
        },
        goal: {
          dailySales: Number(val.goal.dailySales) || 0,
          daysPerMonth: Number(val.goal.daysPerMonth) || 26,
          targetMonthlyProfit: Number(val.goal.targetMonthlyProfit) || 0,
          salePriceVariation: Number(val.goal.salePriceVariation) || 0,
          volumeVariation: Number(val.goal.volumeVariation) || 0,
          ingredientCostVariation: Number(val.goal.ingredientCostVariation) || 0
        }
      };

      const { data } = await api.post('/api/simulator/calculate', payload);
      if (data?.data) {
        this.originalResult = data.data.original;
        this.simulatedResult = data.data.simulated;
        this.goalsResult = data.data.goals;
      }
    } catch (err: any) {
      this.global.errorNotification(err);
    } finally {
      this.isCalculating = false;
      this.cdr.detectChanges();
    }
  }

  // Differences helper
  getDiff(field: string): { diff: number; text: string; isPositive: boolean } {
    if (!this.originalResult || !this.simulatedResult) {
      return { diff: 0, text: '-', isPositive: true };
    }
    const orig = Number(this.originalResult[field]) || 0;
    const sim = Number(this.simulatedResult[field]) || 0;
    const diff = sim - orig;
    const sign = diff > 0 ? '+' : '';
    return {
      diff,
      text: `${sign}${diff.toFixed(2)}`,
      isPositive: field === 'costPerPortion' ? diff <= 0 : diff >= 0
    };
  }

  resetGoalSliders() {
    this.goalGroup.patchValue({
      salePriceVariation: 0,
      volumeVariation: 0,
      ingredientCostVariation: 0
    });
    this.calculate();
  }
}
