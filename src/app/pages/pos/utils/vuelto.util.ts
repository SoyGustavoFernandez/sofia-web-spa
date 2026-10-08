export const roundMoney = (value: number): number => Math.round(value * 100) / 100;

// Change handed back = payments - amount to pay, never negative (mirrors Venta.RegistrarPagos and ArqueoCajaCalculator)
export function calcularVuelto(montoAPagar: number, montosPagados: readonly number[]): number {
  const pagado = montosPagados.reduce((suma, monto) => suma + (monto || 0), 0);
  return Math.max(0, roundMoney(pagado - montoAPagar));
}
