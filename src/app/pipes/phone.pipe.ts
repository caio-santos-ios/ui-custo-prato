import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'phone',
  standalone: true
})
export class PhonePipe implements PipeTransform {
  transform(value?: string | number | null): string {
    if (!value) return '-';

    const clean = value.toString().replace(/\D/g, '');

    if (clean.length === 11) {
      return clean.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    }

    if (clean.length === 10) {
      return clean.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    }

    if (clean.length === 9) {
      return clean.replace(/(\d{5})(\d{4})/, '$1-$2');
    }

    if (clean.length === 8) {
      return clean.replace(/(\d{4})(\d{4})/, '$1-$2');
    }

    return value.toString();
  }
}
