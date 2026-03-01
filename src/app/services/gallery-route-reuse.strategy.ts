import {
  ActivatedRouteSnapshot,
  BaseRouteReuseStrategy,
} from '@angular/router';

export class GalleryRouteReuseStrategy extends BaseRouteReuseStrategy {
  override shouldReuseRoute(
    future: ActivatedRouteSnapshot,
    curr: ActivatedRouteSnapshot
  ): boolean {
    // Reuse the route when navigating between gallery routes (with or without imageName)
    const futureRoute = future.routeConfig?.path;
    const currRoute = curr.routeConfig?.path;

    if (this.isGalleryRoute(futureRoute) && this.isGalleryRoute(currRoute)) {
      return true;
    }

    return super.shouldReuseRoute(future, curr);
  }

  private isGalleryRoute(path: string | undefined): boolean {
    return path === 'gallery' || path === 'gallery/:imageName';
  }
}
