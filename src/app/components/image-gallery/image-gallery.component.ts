import {
  Component,
  OnInit,
  ElementRef,
  ViewChild,
  AfterViewInit,
  OnDestroy,
  signal,
  inject,
  ChangeDetectionStrategy,
} from '@angular/core';
import { Image } from '../../models/image.model';
import { ImageData } from '../../models/image-data';
import { DatePipe, NgOptimizedImage } from '@angular/common';
import { ImageModalComponent } from '../image-modal/image-modal.component';
import { ActivatedRoute } from '@angular/router';
import {
  ImageLayoutService,
  LayoutRow,
} from '../../services/image-layout.service';

@Component({
  selector: 'app-image-gallery',
  templateUrl: './image-gallery.component.html',
  styleUrls: ['./image-gallery.component.scss'],
  imports: [DatePipe, NgOptimizedImage, ImageModalComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(window:resize)': 'onResize()',
  },
})
export class ImageGalleryComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('galleryContainer') galleryContainer!: ElementRef;

  private route = inject(ActivatedRoute);
  private imageLayoutService = inject(ImageLayoutService);

  images: Image[] = ImageData;
  selectedImage = signal<Image | null>(null);
  layoutRows = signal<LayoutRow[]>([]);

  ngOnInit() {
    this.route.params.subscribe((params) => {
      const imageName = params['imageName'];
      this.selectedImage.set(imageName ? this.findImage(atob(imageName)) : null);
    });

    window.addEventListener('popstate', this.handlePopState);
  }

  ngAfterViewInit() {
    requestAnimationFrame(() => this.calculateLayout());
  }

  ngOnDestroy() {
    window.removeEventListener('popstate', this.handlePopState);
  }

  onResize() {
    this.calculateLayout();
  }

  private calculateLayout() {
    if (this.galleryContainer) {
      this.layoutRows.set(
        this.imageLayoutService.calculateLayout(
          this.images,
          this.galleryContainer.nativeElement.offsetWidth,
        ),
      );
    }
  }

  openModal(image: Image) {
    this.selectedImage.set(image);
    window.history.pushState({}, '', `/gallery/${btoa(image.url)}`);
  }

  closeModal() {
    this.selectedImage.set(null);
    window.history.pushState({}, '', '/gallery');
  }

  navigateToImage(image: Image) {
    this.selectedImage.set(image);
    window.history.pushState({}, '', `/gallery/${btoa(image.url)}`);
  }

  private findImage(url: string): Image | null {
    return this.images.find((image) => image.url === url) || null;
  }

  private handlePopState = () => {
    const pathSegments = window.location.pathname.split('/');
    const imageName = pathSegments.pop();
    this.selectedImage.set(
      imageName && imageName !== 'gallery'
        ? this.findImage(atob(imageName))
        : null,
    );
  };
}
