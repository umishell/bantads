import { Component } from '@angular/core';

/** Rota auxiliar: só existe para o `canActivate` redirecionar antes de pintar. */
@Component({
  selector: 'app-blank-route',
  standalone: true,
  template: '',
})
export class BlankRouteComponent {}
