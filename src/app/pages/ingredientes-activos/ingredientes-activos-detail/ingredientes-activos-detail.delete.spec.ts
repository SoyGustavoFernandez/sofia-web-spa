import { describeDeleteInUse } from '@shared/testing/delete-in-use-testing';
import { IngredientesActivosDetailComponent } from './ingredientes-activos-detail.component';

describeDeleteInUse({
  component: IngredientesActivosDetailComponent,
  apiPath: 'ingredientesactivos',
  route: '/ingredientes-activos',
  scope: 'ingredientesActivos',
  record: { id: 'rec-1', denominacionDci: 'Paracetamol', codigoAtc: 'N02BE01' },
});
