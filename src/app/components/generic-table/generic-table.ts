import { ChangeDetectorRef, Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { GlobalService } from '../../services/global.service';
import { api } from '../../services/api';
import { Loading } from '../loading/loading';

@Component({
  selector: 'app-generic-table',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './generic-table.html',
  styleUrls: ['./generic-table.css']
})
export class GenericTableModal implements OnChanges {
  @Input() modal = false;
  @Input() table = '';
  @Input() title = 'Gerenciar Categorias';

  @Output() closeModal = new EventEmitter<void>();
  @Output() itemCreated = new EventEmitter<any>();
  @Output() itemsChanged = new EventEmitter<void>();

  name: string = '';
  items: any[] = [];
  isLoading: boolean = false;
  isSaving: boolean = false;
  deletingId: string = '';

  constructor(
    private global: GlobalService,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnChanges(changes: SimpleChanges): void {
    if (this.modal && (changes['modal']?.currentValue === true || changes['table'])) {
      this.loadItems();
    }
  }

  async loadItems() {
    if (!this.table) return;
    try {
      this.isLoading = true;
      this.cdr.detectChanges();

      const { data } = await api.get(`/api/generic-tables/select?deleted=false&table=${this.table}`);
      this.items = data?.data || [];
    } catch (error) {
      this.global.errorNotification(error);
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  async create() {
    if (!this.name?.trim()) {
      this.toastr.warning('Informe o nome para adicionar.');
      return;
    }

    try {
      this.isSaving = true;
      this.cdr.detectChanges();

      const payload = {
        name: this.name.trim(),
        table: this.table
      };

      const { data } = await api.post('/api/generic-tables', payload);
      this.toastr.success('Categoria adicionada com sucesso!');

      const created = data?.data || { name: payload.name };
      this.name = '';

      await this.loadItems();
      this.itemCreated.emit(created);
      this.itemsChanged.emit();
    } catch (error) {
      this.global.errorNotification(error);
    } finally {
      this.isSaving = false;
      this.cdr.detectChanges();
    }
  }

  async delete(item: any) {
    if (!item?.id) return;

    try {
      this.deletingId = item.id;
      this.cdr.detectChanges();

      await api.delete(`/api/generic-tables/${item.id}`);
      this.toastr.success(`"${item.name}" excluído.`);

      await this.loadItems();
      this.itemsChanged.emit();
    } catch (error) {
      this.global.errorNotification(error);
    } finally {
      this.deletingId = '';
      this.cdr.detectChanges();
    }
  }

  close() {
    this.name = '';
    this.closeModal.emit();
  }
}
