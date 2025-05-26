import { Component, Input } from '@angular/core';

@Component({
  selector: 'gms-notify-dialog',
  templateUrl: './notify-dialog.component.html',
  standalone: false
})
export class NotifyDialogComponent {
  @Input() public heading = '';
  @Input() public message = '';
}
