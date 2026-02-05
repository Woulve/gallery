# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

IllusionsOfJotnarPhotography - An Angular 19 photography portfolio gallery with justified grid layout, lightbox modal, and automated image processing.

## Commands

```bash
npm start                    # Dev server at http://localhost:4200
npm run build                # Production build to dist/gallery/
npm run build:ghpages        # Build for GitHub Pages (adds /gallery/ base href)
npm run process:images       # Process images from ~/Pictures/portfolio/
```

## Architecture

**Angular 19 with standalone components, strict TypeScript, and SCSS.**

### Key Components

- **ImageGalleryComponent** (`src/app/components/image-gallery/`) - Main gallery view with justified grid layout. Uses ImageLayoutService to calculate row-based image arrangement with 250px target row height.

- **ImageModalComponent** (`src/app/components/image-modal/`) - Lightbox for full-size images with EXIF metadata display (camera, lens, exposure settings). Manages URL state via history API for shareable image links.

- **ImageLayoutService** (`src/app/services/image-layout.service.ts`) - Justified grid layout algorithm. Arranges images in rows where all rows fill container width while preserving aspect ratios.

### Data Pipeline

Images flow through `scripts/process-images.mjs`:
1. Reads from `~/Pictures/portfolio/`
2. Extracts EXIF metadata with exifr
3. Generates WebP versions with Sharp:
   - `public/images/minified/` (400px height thumbnails)
   - `public/images/full/` (1920px max for lightbox)
4. Outputs `src/app/models/image-data.ts` with typed image metadata array

### Image Model

```typescript
interface Image {
  url: string;              // Minified image path
  fullUrl?: string;         // Full-size image path
  width: number;            // Dimensions for layout calculation
  height: number;
  timestamp: Date;
  cameraMaker?: string;     // EXIF: Canon
  cameraModel?: string;     // EXIF: Canon EOS R7
  fStop?: number;           // EXIF: aperture
  exposureTime?: string;    // EXIF: shutter speed
  iso?: number;             // EXIF: sensitivity
  focalLength?: number;     // EXIF: lens focal length
}
```

### Styling

CSS custom properties for theming with automatic dark mode via `prefers-color-scheme`. Responsive breakpoints at 1024px (desktop) and 768px (mobile).

## Deployment

GitHub Actions (`.github/workflows/deploy.yml`) auto-deploys to GitHub Pages on push to master. Uses Node 20 and builds with `build:ghpages` script.

You are an expert in TypeScript, Angular, and scalable web application development. You write functional, maintainable, performant, and accessible code following Angular and TypeScript best practices.
## TypeScript Best Practices
- Use strict type checking
- Prefer type inference when the type is obvious
- Avoid the `any` type; use `unknown` when type is uncertain
## Angular Best Practices
- Always use standalone components over NgModules
- Must NOT set `standalone: true` inside Angular decorators. It's the default in Angular v20+.
- Use signals for state management
- Implement lazy loading for feature routes
- Do NOT use the `@HostBinding` and `@HostListener` decorators. Put host bindings inside the `host` object of the `@Component` or `@Directive` decorator instead
- Use `NgOptimizedImage` for all static images.
  - `NgOptimizedImage` does not work for inline base64 images.
## Accessibility Requirements
- It MUST pass all AXE checks.
- It MUST follow all WCAG AA minimums, including focus management, color contrast, and ARIA attributes.
### Components
- Keep components small and focused on a single responsibility
- Use `input()` and `output()` functions instead of decorators
- Use `computed()` for derived state
- Set `changeDetection: ChangeDetectionStrategy.OnPush` in `@Component` decorator
- Prefer inline templates for small components
- Prefer Reactive forms instead of Template-driven ones
- Do NOT use `ngClass`, use `class` bindings instead
- Do NOT use `ngStyle`, use `style` bindings instead
- When using external templates/styles, use paths relative to the component TS file.
## State Management
- Use signals for local component state
- Use `computed()` for derived state
- Keep state transformations pure and predictable
- Do NOT use `mutate` on signals, use `update` or `set` instead
## Templates
- Keep templates simple and avoid complex logic
- Use native control flow (`@if`, `@for`, `@switch`) instead of `*ngIf`, `*ngFor`, `*ngSwitch`
- Use the async pipe to handle observables
- Do not assume globals like (`new Date()`) are available.
- Do not write arrow functions in templates (they are not supported).
## Services
- Design services around a single responsibility
- Use the `providedIn: 'root'` option for singleton services
- Use the `inject()` function instead of constructor injection
