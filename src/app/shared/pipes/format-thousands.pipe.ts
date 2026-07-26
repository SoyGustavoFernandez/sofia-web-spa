import { Pipe, PipeTransform } from '@angular/core';

/**
 * Pipe para formatear números con separadores de miles y punto decimal.
 *
 * Uso:
 * {{ 1234567.89 | formatThousands }}           // '1,234,567.89'
 * {{ 1234567.89 | formatThousands: 2 }}         // '1,234,567.89'
 * {{ 1234567    | formatThousands: 0 }}         // '1,234,567'
 * {{ 1234567.1  | formatThousands: 2 }}         // '1,234,567.10'
 */
@Pipe({
    name: 'formatThousands',
    standalone: true,
})
export class FormatThousandsPipe implements PipeTransform {
    transform(
        value: number | string | null | undefined,
        decimals = 2
    ): string {
        if (value === null || value === undefined || value === '') return '';

        const num = typeof value === 'string' ? Number.parseFloat(value) : value;

        if (Number.isNaN(num)) return '';

        return num.toLocaleString('en-US', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals,
        });
    }
}