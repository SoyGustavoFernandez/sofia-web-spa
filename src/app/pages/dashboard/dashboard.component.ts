import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule, MatButtonModule],
  template: `
    <div class="dashboard-container" style="padding: 24px;">
      <mat-card style="border-radius: 12px; padding: 24px; background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); color: white; margin-bottom: 24px;">
        <mat-card-header>
          <mat-card-title style="font-size: 24px; font-weight: 700; color: #38bdf8;">
            Bienvenido a SOFIA
          </mat-card-title>
          <mat-card-subtitle style="color: #94a3b8;">
            Sistema Optimizado Farmacéutico con Inteligencia Artificial
          </mat-card-subtitle>
        </mat-card-header>
        <mat-card-content style="margin-top: 16px;">
          <p style="font-size: 15px; color: #cbd5e1; line-height: 1.6;">
            El cascarón de la SPA con el tema <strong>MatDash PRO</strong> está listo y configurado. 
            Desde aquí podrás navegar por los distintos módulos de la plataforma.
          </p>
        </mat-card-content>
      </mat-card>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px;">
        <mat-card style="border-radius: 12px; padding: 16px;">
          <div style="display: flex; align-items: center; gap: 16px;">
            <div style="width: 48px; height: 48px; border-radius: 10px; background: #e0f2fe; color: #0284c7; display: flex; align-items: center; justify-content: center;">
              <mat-icon>point_of_sale</mat-icon>
            </div>
            <div>
              <h3 style="margin: 0; font-size: 18px; font-weight: 600;">POS / Ventas</h3>
              <p style="margin: 4px 0 0 0; color: #64748b; font-size: 13px;">Punto de venta y caja rápida</p>
            </div>
          </div>
        </mat-card>

        <mat-card style="border-radius: 12px; padding: 16px;">
          <div style="display: flex; align-items: center; gap: 16px;">
            <div style="width: 48px; height: 48px; border-radius: 10px; background: #dcfce7; color: #16a34a; display: flex; align-items: center; justify-content: center;">
              <mat-icon>inventory_2</mat-icon>
            </div>
            <div>
              <h3 style="margin: 0; font-size: 18px; font-weight: 600;">Inventario & Lotes</h3>
              <p style="margin: 4px 0 0 0; color: #64748b; font-size: 13px;">Control de stock y vencimientos</p>
            </div>
          </div>
        </mat-card>

        <mat-card style="border-radius: 12px; padding: 16px;">
          <div style="display: flex; align-items: center; gap: 16px;">
            <div style="width: 48px; height: 48px; border-radius: 10px; background: #f3e8ff; color: #9333ea; display: flex; align-items: center; justify-content: center;">
              <mat-icon>description</mat-icon>
            </div>
            <div>
              <h3 style="margin: 0; font-size: 18px; font-weight: 600;">Recetas Médicas</h3>
              <p style="margin: 4px 0 0 0; color: #64748b; font-size: 13px;">Digitalización y análisis con IA</p>
            </div>
          </div>
        </mat-card>

        <mat-card style="border-radius: 12px; padding: 16px;">
          <div style="display: flex; align-items: center; gap: 16px;">
            <div style="width: 48px; height: 48px; border-radius: 10px; background: #ffedd5; color: #ea580c; display: flex; align-items: center; justify-content: center;">
              <mat-icon>local_shipping</mat-icon>
            </div>
            <div>
              <h3 style="margin: 0; font-size: 18px; font-weight: 600;">Delivery</h3>
              <p style="margin: 4px 0 0 0; color: #64748b; font-size: 13px;">Programación e itinerario</p>
            </div>
          </div>
        </mat-card>
      </div>
    </div>
  `
})
export class DashboardComponent {}
