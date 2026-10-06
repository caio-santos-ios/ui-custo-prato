import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { Loading } from '../../components/loading/loading';
import { api } from '../../services/api';
import { NgxMaskDirective } from 'ngx-mask';

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  photo?: string;
}

@Component({
  selector: 'app-public-menu',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, Loading, NgxMaskDirective],
  templateUrl: './public-menu.html',
  styleUrl: './public-menu.css'
})
export class PublicMenu implements OnInit {
  isLoading = true;
  slug: string = '';
  store: any = null;
  categories: { name: string; items: any[] }[] = [];
  selectedCategory: string = 'all';

  cart: CartItem[] = [];
  cartModal = false;
  checkoutForm: FormGroup;

  error: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private fb: FormBuilder,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef
  ) {
    this.checkoutForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      phone: ['', [Validators.required]],
      address: ['', [Validators.required, Validators.minLength(5)]],
      complement: [''],
      paymentMethod: ['Pix', [Validators.required]],
      changeFor: [''],
      notes: ['']
    });
  }

  async ngOnInit() {
    this.route.params.subscribe(async (params) => {
      this.slug = params['slug'];
      if (this.slug) {
        await this.loadMenu();
      } else {
        this.error = 'Cardápio não informado.';
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  async loadMenu() {
    this.isLoading = true;
    this.error = null;
    try {
      const { data } = await api.get(`/api/public/menu/${this.slug}`);
      if (data?.data) {
        this.store = data.data.store;
        this.categories = data.data.categories || [];
        if (this.store?.paymentMethods && this.store.paymentMethods.length > 0) {
          this.checkoutForm.patchValue({ paymentMethod: this.store.paymentMethods[0] });
        }
      } else {
        this.error = 'Cardápio não encontrado ou inativo.';
      }
    } catch (err: any) {
      this.error = err.response?.data?.message || 'Cardápio não encontrado ou indisponível.';
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  get displayedCategories(): { name: string; items: any[] }[] {
    if (this.selectedCategory === 'all') return this.categories;
    return this.categories.filter(c => c.name === this.selectedCategory);
  }

  get totalItemsCount(): number {
    return this.cart.reduce((sum, item) => sum + item.quantity, 0);
  }

  get subtotal(): number {
    return this.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  }

  get deliveryFee(): number {
    return Number(this.store?.deliveryFee) || 0;
  }

  get total(): number {
    return this.subtotal + this.deliveryFee;
  }

  getItemQuantity(itemId: string): number {
    const found = this.cart.find(i => i.id === itemId);
    return found ? found.quantity : 0;
  }

  addToCart(item: any) {
    const existing = this.cart.find(i => i.id === item.id);
    if (existing) {
      existing.quantity += 1;
    } else {
      this.cart.push({
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: 1,
        photo: item.photo
      });
    }
    this.toastr.success(`"${item.name}" adicionado ao pedido!`, '', { timeOut: 1500 });
  }

  incrementQuantity(itemId: string) {
    const item = this.cart.find(i => i.id === itemId);
    if (item) {
      item.quantity += 1;
    }
  }

  decrementQuantity(itemId: string) {
    const index = this.cart.findIndex(i => i.id === itemId);
    if (index >= 0) {
      if (this.cart[index].quantity > 1) {
        this.cart[index].quantity -= 1;
      } else {
        this.cart.splice(index, 1);
      }
    }
  }

  openCart() {
    if (this.cart.length === 0) {
      this.toastr.info('Seu carrinho está vazio. Escolha um prato do cardápio!');
      return;
    }
    this.cartModal = true;
  }

  closeCart() {
    this.cartModal = false;
  }

  finishOrder() {
    if (this.checkoutForm.invalid) {
      this.toastr.warning('Por favor preencha seu nome, telefone e endereço para entrega.');
      this.checkoutForm.markAllAsTouched();
      return;
    }

    if (this.cart.length === 0) {
      this.toastr.warning('Seu carrinho está vazio.');
      return;
    }

    const val = this.checkoutForm.value;
    const storeWhatsapp = (this.store?.whatsapp || '').replace(/\D/g, '');

    if (!storeWhatsapp) {
      this.toastr.error('O estabelecimento não configurou um número de WhatsApp válido.');
      return;
    }

    // Format WhatsApp message
    let message = `*NOVO PEDIDO - ${this.store?.name || 'CustoPrato'}*\n`;
    message += `------------------------------------\n`;
    message += `*Cliente:* ${val.name}\n`;
    message += `*Telefone:* ${val.phone}\n`;
    message += `*Endereço:* ${val.address}`;
    if (val.complement) {
      message += ` (${val.complement})`;
    }
    message += `\n*Forma de Pagamento:* ${val.paymentMethod}`;
    if (val.paymentMethod.toLowerCase().includes('dinheiro') && val.changeFor) {
      message += ` (Troco para R$ ${val.changeFor})`;
    }
    message += `\n\n*ITENS DO PEDIDO:*\n`;

    this.cart.forEach(item => {
      const itemTotal = (item.price * item.quantity).toFixed(2).replace('.', ',');
      message += `• ${item.quantity}x ${item.name} - R$ ${itemTotal}\n`;
    });

    message += `------------------------------------\n`;
    message += `*Subtotal:* R$ ${this.subtotal.toFixed(2).replace('.', ',')}\n`;
    if (this.deliveryFee > 0) {
      message += `*Taxa de Entrega:* R$ ${this.deliveryFee.toFixed(2).replace('.', ',')}\n`;
    }
    message += `*TOTAL:* R$ ${this.total.toFixed(2).replace('.', ',')}\n`;

    if (val.notes?.trim()) {
      message += `\n*Observações:* ${val.notes.trim()}\n`;
    }

    message += `\n_Pedido enviado através do Cardápio Digital CustoPrato_`;

    const encoded = encodeURIComponent(message);
    const whatsappUrl = `https://api.whatsapp.com/send?phone=55${storeWhatsapp}&text=${encoded}`;

    window.open(whatsappUrl, '_blank');
    this.toastr.success('Redirecionando para o WhatsApp com os dados do seu pedido...');
    this.closeCart();
  }
}
