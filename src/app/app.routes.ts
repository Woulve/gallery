import { Routes } from '@angular/router';
import { ImageGalleryComponent } from './components/image-gallery/image-gallery.component';

export const routes: Routes = [
  { path: 'gallery', component: ImageGalleryComponent },
  { path: 'gallery/:imageName', component: ImageGalleryComponent },
  { path: '**', redirectTo: 'gallery' },
];
