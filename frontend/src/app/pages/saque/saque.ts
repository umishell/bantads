import { Component } from '@angular/core';

@Component({
  selector: 'app-saque',
  templateUrl: './saque.component.html'
})
export class SaqueComponent {

  valor: number = 0;

  sacar() {

    console.log("Saque realizado:", this.valor);

    alert("Saque realizado: R$ " + this.valor);

  }

}

@Component({
  selector: 'app-saque',
  imports: [],
  templateUrl: './saque.html',
  styleUrl: './saque.scss',
})
export class Saque {

}
