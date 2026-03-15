import { Component } from '@angular/core';

@Component({
  selector: 'app-deposito',
  templateUrl: './deposito.component.html'
})
export class DepositoComponent {

  valor: number = 0;

  depositar() {

    console.log("Depósito realizado:", this.valor);

    alert("Depósito realizado: R$ " + this.valor);

  }

}

@Component({
  selector: 'app-deposito',
  imports: [],
  templateUrl: './deposito.html',
  styleUrl: './deposito.scss',
})
export class Deposito {

}
