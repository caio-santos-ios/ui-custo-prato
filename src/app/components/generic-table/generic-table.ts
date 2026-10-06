import { ChangeDetectorRef, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GlobalService } from '../../services/global.service';
import { api } from '../../services/api';

@Component({
  selector: 'app-generic-table',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './generic-table.html',
  styleUrls: ['./generic-table.css']
})
export class GenericTableModal {
  constructor(private global: GlobalService, private cdr: ChangeDetectorRef) { }

  @Input() modal = false;
  @Input() table = "";
  @Input() title = "";
  isLoading: boolean = false;
  deleteModal: boolean = false;
  genericTableId: string = "";

  async create() {
    try {
      this.cdr.detectChanges();
      await api.post("/api/generic-tables", { table: this.table });
    } catch (error) {
      this.global.errorNotification(error);
    } finally {
      this.cdr.detectChanges();
    }
  }

  closeDeleteModal() {
    this.deleteModal = false;
    this.genericTableId = "";
  }
}
