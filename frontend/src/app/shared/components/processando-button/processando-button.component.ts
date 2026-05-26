import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-processando-button',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './processando-button.component.html',
  styleUrl: './processando-button.component.scss',
})
export class ProcessandoButtonComponent {
  @Input() public loading = false;
  @Input() public disabled = false;
  @Input() public type: 'button' | 'submit' | 'reset' = 'button';
  @Input() public buttonClass = 'button button--primary';
  @Output() public clicked = new EventEmitter<MouseEvent>();

  public readonly chars = 'Processando'.split('');

  public handleClick(event: MouseEvent): void {
    if (this.loading || this.disabled) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }
    this.clicked.emit(event);
  }
}
