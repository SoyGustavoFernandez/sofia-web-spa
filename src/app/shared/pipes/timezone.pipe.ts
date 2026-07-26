import { Pipe, PipeTransform, inject } from '@angular/core';
import { format, toZonedTime } from 'date-fns-tz';
import { TimezoneService } from '@core/services/shared/timezone.service';
import { LoggerService } from '@core/services/logger.service';

/**
 * Pipe para formatear fechas usando la zona horaria IANA configurada en la aplicación.
 * 
 * Este pipe es reactivo a cambios en la zona horaria del TimezoneService.
 * 
 * Uso:
 * {{ fecha | timezone }} // Formato por defecto: 'yyyy-MM-dd HH:mm:ssXXX'
 * {{ fecha | timezone: 'dd/MM/yyyy HH:mm' }} // Formato personalizado
 * 
 * La fecha debe venir en UTC desde el backend.
 * El pipe la convierte automáticamente a la zona horaria configurada.
 */
@Pipe({
  name: 'timezone',
  standalone: true,
  pure: false, // Hacer el pipe impuro para que sea reactivo a cambios en el signal
})
export class TimezonePipe implements PipeTransform {
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
        
        // Normalizar el formato de fecha del backend
        // Caso 1: Formato con timezone offset: "2025-09-23 05:00:00.0000000 +00:00"
        //         o formato ISO con T: "2025-11-21T05:00:00+00:00"
        const timezoneMatch = normalizedValue.match(/([+-]\d{2}):(\d{2})$/);
        if (timezoneMatch) {
          // Usar el índice del offset para extraer la parte fecha-hora,
          // independientemente de si el separador es un espacio o 'T'
          const offsetIndex = normalizedValue.lastIndexOf(timezoneMatch[0]);
          const dateTimePart = normalizedValue.substring(0, offsetIndex).trim().replace(' ', 'T');
          normalizedValue = dateTimePart.replace(/\.(\d{3})\d+/, '.$1');
          if (timezoneMatch[0] === '+00:00') {
            normalizedValue += 'Z';
          } else {
            normalizedValue += timezoneMatch[0];
          }
        }
        // Caso 2: Formato ISO sin timezone: "2025-09-23T05:00:00"
        // El backend envía fechas en UTC pero sin el 'Z', necesitamos agregarlo
        else if (normalizedValue.includes('T') && !normalizedValue.includes('Z') && !normalizedValue.match(/[+-]\d{2}:/)) {
          // Agregar 'Z' al final para indicar que es UTC
          normalizedValue += 'Z';
        }
        // Caso 3: Formato con espacio pero sin timezone: "2025-09-23 05:00:00"
        else if (normalizedValue.includes(' ') && !timezoneMatch) {
          normalizedValue = normalizedValue.replace(' ', 'T') + 'Z';
        }
        
        // Intentar parsear como ISO string
        date = new Date(normalizedValue);
        
        // Si falla, intentar otros formatos comunes
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
        this.logger.warn('TimezonePipe: Invalid date value:', value);
        return '';
      }

      // Obtener la zona horaria actual del servicio (lee el signal)
      // Al hacer esto, Angular detecta la dependencia y re-ejecuta el pipe cuando cambia
      const timeZone = this.timezoneService.timezone();
      
      // Si no hay zona horaria configurada, usar el valor por defecto
      const effectiveTimezone = timeZone || 'America/Lima';

      // IMPORTANTE: 
      // - Si la fecha viene como string ISO sin timezone (ej: "2025-09-23T05:00:00"),
      //   después de agregar 'Z', JavaScript la interpreta como UTC.
      // - toZonedTime toma una fecha (que internamente es un timestamp UTC)
      //   y la convierte a la zona horaria especificada.
      // - Cuando parseamos una fecha con 'Z', JavaScript la almacena como UTC internamente,
      //   y toZonedTime la convierte correctamente a la zona horaria especificada.
      
      // Convertir de UTC a la zona horaria especificada
      const zonedDate = toZonedTime(date, effectiveTimezone);

      // Formatear la fecha para mostrarla en la zona horaria especificada
      return format(zonedDate, formatStr, { timeZone: effectiveTimezone });
    } catch (error) {
      this.logger.error('Error formatting date with timezone:', error, 'Value:', value);
      return '';
    }
  }
}
