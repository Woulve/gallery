import { Injectable } from '@angular/core';
import { Image } from '../models/image.model';

export interface LayoutRow {
  images: LayoutImage[];
  height: number;
  isLastRow?: boolean;
  spacing?: number;
}

export interface LayoutImage extends Image {
  displayWidth: number;
  displayHeight: number;
}

@Injectable({ providedIn: 'root' })
export class ImageLayoutService {
  private targetRowHeight = 250;
  private containerWidth = 0;
  private spacing = 10;

  calculateLayout(images: Image[], containerWidth: number): LayoutRow[] {
    if (!images.length || containerWidth <= 0) return [];

    this.containerWidth = containerWidth;
    const preparedImages = images.map((img) => ({
      ...img,
      displayWidth: Math.round(this.targetRowHeight * (img.width / img.height)),
      displayHeight: this.targetRowHeight,
    }));

    return this.createRows(preparedImages);
  }

  private createRows(images: LayoutImage[]): LayoutRow[] {
    const rows: LayoutRow[] = [];
    let currentRow: LayoutImage[] = [];
    let currentRowWidth = 0;

    for (const image of images) {
      if (
        currentRowWidth +
          image.displayWidth +
          this.spacing * currentRow.length >
        this.containerWidth
      ) {
        rows.push(this.adjustRow(currentRow, currentRowWidth));
        currentRow = [];
        currentRowWidth = 0;
      }
      currentRow.push(image);
      currentRowWidth += image.displayWidth;
    }

    if (currentRow.length) {
      rows.push({
        images: currentRow,
        height: this.targetRowHeight,
        isLastRow: true,
      });
    }

    return rows;
  }

  private adjustRow(images: LayoutImage[], rowWidth: number): LayoutRow {
    const scale = this.containerWidth / rowWidth;
    const height = Math.round(this.targetRowHeight * scale);
    images.forEach((img) => {
      img.displayHeight = height;
      img.displayWidth = Math.round(height * (img.width / img.height));
    });
    return { images, height };
  }
}
