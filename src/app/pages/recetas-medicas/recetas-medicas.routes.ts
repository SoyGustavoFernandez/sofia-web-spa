import { Route } from '@angular/router';
import { RecetasScannerComponent } from './recetas-scanner/recetas-scanner.component';
import { RecetasSearchComponent } from './recetas-search/recetas-search.component';
import { RecetasDetailComponent } from './recetas-detail/recetas-detail.component';

export const RECETAS_MEDICAS_ROUTES: Route[] = [
  { path: '', component: RecetasSearchComponent },
  { path: 'escanear', component: RecetasScannerComponent },
  { path: 'nueva', component: RecetasDetailComponent, data: { isNew: true } },
  { path: ':id', component: RecetasDetailComponent },
];
