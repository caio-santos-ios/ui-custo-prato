import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';

@Injectable({
  providedIn: 'root'
})
export class GlobalService {
  protected toastr = inject(ToastrService);
  protected router = inject(Router);

  errorNotification(err: any) {
    if (!err) return;

    const status = err.response?.status ?? err.status;
    const message =
      err.response?.data?.message ??
      err.response?.data?.Message ??
      err.message ??
      'Ocorreu um erro inesperado. Por favor, tente novamente.';

    if (status === 401) {
      this.toastr.warning('Sessão finalizada', 'Atenção');
      const theme = localStorage.getItem('theme');
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      localStorage.removeItem('role');
      if (theme) localStorage.setItem('theme', theme);
      this.router.navigate(['/login']);
      return;
    }

    if (status >= 400 && status < 500) {
      this.toastr.warning(message, 'Atenção');
    } else {
      this.toastr.error(message, 'Erro');
    }
  }
  formatCurrency(value: number | string): string {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return 'R$ 0,00';
    return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  formatDate(dateStr?: string | Date | null): string {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  formatDateTime(dateStr?: string | Date | null): string {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  normalizeStatus(status: string): string {
    if (!status) return 'Pendente';
    const s = status.toString().toLowerCase().replace(/[-_ ]/g, '').trim();

    switch (s) {
      case 'pendingacceptance':
        return 'Aguardando Aceite';
      case 'pendingpayment':
        return 'Aguardando Pagamento';
      case 'pending':
      case 'pendingpix':
        return 'Pendente Pix';
      case 'accepted':
        return 'Aceito';
      case 'confirmed':
        return 'Confirmado';
      case 'inprogress':
      case 'ongoing':
      case 'executing':
        return 'Em Andamento';
      case 'completed':
      case 'finished':
      case 'done':
        return 'Concluído';
      case 'cancelled':
      case 'canceled':
        return 'Cancelado';
      case 'declined':
        return 'Recusado';
      case 'rejected':
        return 'Reprovado';
      case 'disputed':
        return 'Em Disputa';
      case 'underreview':
      case 'analysis':
        return 'Em Análise';
      case 'approved':
      case 'verified':
        return 'Aprovado';
      case 'correction':
        return 'Correção Solicitada';
      case 'active':
        return 'Ativo';
      case 'blocked':
        return 'Bloqueado';
      case 'paid':
        return 'Pago';
      case 'requested':
        return 'Solicitado';
      default:
        return status;
    }
  }
}
