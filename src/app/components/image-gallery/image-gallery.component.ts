import {
  Component,
  OnInit,
  ElementRef,
  ViewChild,
  HostListener,
  AfterViewInit,
} from '@angular/core';
import { Image } from '../../models/image.model';
import { ImageData } from '../../models/image-data';
import { CommonModule, NgOptimizedImage } from '@angular/common';
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
  imports: [CommonModule, NgOptimizedImage, ImageModalComponent],
  standalone: true,
})
export class ImageGalleryComponent implements OnInit, AfterViewInit {
  @ViewChild('galleryContainer') galleryContainer!: ElementRef;

  images: Image[] = ImageData;
  selectedImage: Image | null = null;
  layoutRows: LayoutRow[] = [];

  constructor(
    private route: ActivatedRoute,
    private imageLayoutService: ImageLayoutService,
  ) {}

  ngOnInit() {
    this.route.params.subscribe((params) => {
      const imageName = params['imageName'];
      this.selectedImage = imageName ? this.findImage(atob(imageName)) : null;
    });

    window.addEventListener('popstate', this.handlePopState);
  }

  ngAfterViewInit() {
    setTimeout(() => this.calculateLayout());
  }

  @HostListener('window:resize')
  onResize() {
    this.calculateLayout();
  }

  private calculateLayout() {
    if (this.galleryContainer) {
      this.layoutRows = this.imageLayoutService.calculateLayout(
        this.images,
        this.galleryContainer.nativeElement.offsetWidth,
      );
    }
  }

  openModal(image: Image) {
    this.selectedImage = image;
    window.history.pushState({}, '', `/gallery/${btoa(image.url)}`);
  }

  closeModal() {
    this.selectedImage = null;
    window.history.pushState({}, '', '/gallery');
  }

  private findImage(url: string): Image | null {
    return this.images.find((image) => image.url === url) || null;
  }

  private handlePopState = () => {
    const pathSegments = window.location.pathname.split('/');
    const imageName = pathSegments.pop();
    this.selectedImage =
      imageName && imageName !== 'gallery'
        ? this.findImage(atob(imageName))
        : null;
  };
}
