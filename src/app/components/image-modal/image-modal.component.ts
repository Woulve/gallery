import { Component, input, output, computed, signal, effect, ChangeDetectionStrategy } from '@angular/core';
import { Image } from '../../models/image.model';

@Component({
  selector: 'app-image-modal',
  imports: [],
  templateUrl: './image-modal.component.html',
  styleUrls: ['./image-modal.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:keydown.arrowleft)': 'onPrevious()',
    '(document:keydown.arrowright)': 'onNext()',
    '(document:keydown.escape)': 'onClose()',
  },
})
export class ImageModalComponent {
  image = input.required<Image>();
  images = input.required<Image[]>();
  close = output<void>();
  navigate = output<Image>();

  fullImageLoaded = signal(false);

  fullUrl = computed(() => this.image().url.replace('minified', 'full'));

  constructor() {
    effect(() => {
      this.image();
      this.fullImageLoaded.set(false);
    });
  }

  onFullImageLoad() {
    this.fullImageLoaded.set(true);
  }

  currentIndex = computed(() => {
    const currentImage = this.image();
    return this.images().findIndex((img) => img.url === currentImage.url);
  });

  hasPrevious = computed(() => this.currentIndex() > 0);
  hasNext = computed(() => this.currentIndex() < this.images().length - 1);

  hasExifData = computed(() => {
    const img = this.image();
    return !!(img.cameraModel || img.fStop || img.exposureTime || img.iso || img.focalLength);
  });

  onClose() {
    this.close.emit();
  }

  onPrevious() {
    if (this.hasPrevious()) {
      this.navigate.emit(this.images()[this.currentIndex() - 1]);
    }
  }

  onNext() {
    if (this.hasNext()) {
      this.navigate.emit(this.images()[this.currentIndex() + 1]);
    }
  }
}
