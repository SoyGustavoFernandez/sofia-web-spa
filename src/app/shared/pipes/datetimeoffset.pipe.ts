import { Pipe, PipeTransform, inject } from '@angular/core';
import { format, toZonedTime } from 'date-fns-tz';
import { TimezoneService } from '@core/services/shared/timezone.service';
import { LoggerService } from '@core/services/logger.service';

/**
 * Pipe para formatear fechas con formato datetimeoffset (ISO 8601 con offset).
 * 
 * Este pipe maneja fechas que vienen del backend en formato datetimeoffset como:
 * - "2025-11-21T05:00:00+00:00"
 * - "2025-11-21T05:00:00.000+00:00"
 * - "2025-11-21T05:00:00-05:00"
 * 
 * Este pipe es reactivo a cambios en la zona horaria del TimezoneService.
 * 
 * Uso:
 * {{ fecha | datetimeoffset }} // Formato por defecto: 'yyyy-MM-dd HH:mm:ssXXX'
 * {{ fecha | datetimeoffset: 'dd/MM/yyyy HH:mm' }} // Formato personalizado
 * 
 * El pipe convierte automáticamente la fecha a la zona horaria configurada.
 */
@Pipe({
  name: 'datetimeoffset',
  standalone: true,
  pure: false, // Hacer el pipe impuro para que sea reactivo a cambios en el signal
})
export class DatetimeoffsetPipe implements PipeTransform {
  private readonly timezoneService = inject(TimezoneService);
  private readonly logger = inject(LoggerService);

  transform(
    value: string | Date | null | undefined,
    formatStr = 'yyyy-MM-dd HH:mm:ssXXX'
  ): string {
    if (!value) return '';

    try {
      let date: Date;
      
      // Convertir a Date si viene como string
      if (typeof value === 'string') {
        let normalizedValue = value.trim();
        
        // Normalizar el formato datetimeoffset del backend
        // El formato datetimeoffset ya incluye el offset, solo necesitamos normalizar
        // Caso 1: Formato con offset: "2025-11-21T05:00:00+00:00" o "2025-11-21T05:00:00.000+00:00"
        if (normalizedValue.match(/[+-]\d{2}:\d{2}$/)) {
          // Ya está en formato ISO con offset, JavaScript lo parseará correctamente
          // Solo necesitamos asegurarnos de que tenga formato ISO válido
          date = new Date(normalizedValue);
        }
        // Caso 2: Formato con espacio y offset: "2025-11-21 05:00:00.0000000 +00:00"
        else if (normalizedValue.match(/\s+([+-]\d{2}):(\d{2})$/)) {
          const timezoneMatch = normalizedValue.match(/([+-]\d{2}):(\d{2})$/);
          if (timezoneMatch) {
            let dateTimePart = normalizedValue.substring(0, normalizedValue.lastIndexOf(' '));
            // Reemplazar espacio por T para formato ISO
            dateTimePart = dateTimePart.replace(' ', 'T');
            // Normalizar milisegundos (quitar dígitos extra)
            dateTimePart = dateTimePart.replace(/\.(\d{3})\d+/, '.$1');
            // Agregar el offset
            normalizedValue = dateTimePart + timezoneMatch[0];
          }
          date = new Date(normalizedValue);
        }
        // Caso 3: Formato ISO sin offset, tratar como UTC
        else if (normalizedValue.includes('T') && !normalizedValue.includes('Z') && !normalizedValue.match(/[+-]\d{2}:/)) {
          // Agregar 'Z' al final para indicar que es UTC
          normalizedValue += 'Z';
          date = new Date(normalizedValue);
        }
        // Caso 4: Formato con espacio sin offset: "2025-11-21 05:00:00"
        else if (normalizedValue.includes(' ') && !normalizedValue.match(/[+-]\d{2}:/)) {
          normalizedValue = normalizedValue.replace(' ', 'T') + 'Z';
          date = new Date(normalizedValue);
        }
        // Si no coincide con ningún formato esperado, intentar parsear directamente
        else {
          date = new Date(normalizedValue);
        }
        
        // Si falla el parseo, intentar otros formatos comunes
        if (isNaN(date.getTime())) {
          const dateParts = value.split(/[-/]/);
          if (dateParts.length === 3) {
            date = new Date(
              parseInt(dateParts[2], 10),
              parseInt(dateParts[1], 10) - 1,
              parseInt(dateParts[0], 10)
            );
          }
        }
      } else {
        date = value;
      }
      
      // Validar que sea una fecha válida
      if (isNaN(date.getTime())) {
        this.logger.warn('DatetimeoffsetPipe: Invalid date value:', value);
        return '';
      }

      // Obtener la zona horaria actual del servicio (lee el signal)
      // Al hacer esto, Angular detecta la dependencia y re-ejecuta el pipe cuando cambia
      const timeZone = this.timezoneService.timezone();
      
      // Si no hay zona horaria configurada, usar el valor por defecto
      const effectiveTimezone = timeZone || 'America/Lima';

      // IMPORTANTE: 
      // - Cuando parseamos una fecha con formato datetimeoffset (ej: "2025-11-21T05:00:00+00:00"),
      //   JavaScript interpreta correctamente el offset y almacena el timestamp UTC correspondiente.
      // - toZonedTime toma una fecha (que internamente es un timestamp UTC)
      //   y la convierte a la zona horaria especificada para mostrarla.
      
      // Convertir de UTC a la zona horaria especificada
      const zonedDate = toZonedTime(date, effectiveTimezone);

      // Formatear la fecha para mostrarla en la zona horaria especificada
      return format(zonedDate, formatStr, { timeZone: effectiveTimezone });
    } catch (error) {
      this.logger.error('Error formatting datetimeoffset date:', error, 'Value:', value);
      return '';
    }
  }
}
