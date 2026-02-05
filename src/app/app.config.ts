import { ApplicationConfig, provideZonelessChangeDetection } from '@angular/core';
import { provideRouter, RouteReuseStrategy } from '@angular/router';

import { routes } from './app.routes';
import { GalleryRouteReuseStrategy } from './services/gallery-route-reuse.strategy';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    provideRouter(routes),
    { provide: RouteReuseStrategy, useClass: GalleryRouteReuseStrategy },
  ],
};
