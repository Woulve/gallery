import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';
import { Image } from '../../models/image.model';

@Component({
  selector: 'app-image-modal',
  imports: [],
  templateUrl: './image-modal.component.html',
  styleUrls: ['./image-modal.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImageModalComponent {
  image = input.required<Image>();
  close = output<void>();

  onClose() {
    this.close.emit();
  }
}
