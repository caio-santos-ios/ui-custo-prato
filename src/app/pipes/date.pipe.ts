import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
    name: 'date',
    standalone: true
})
export class DatePipe implements PipeTransform {
    transform(value: number, exponent: number = 1): number {
        return Math.pow(value, exponent);
    }
}
