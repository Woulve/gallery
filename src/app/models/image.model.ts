import { ImageTag } from './tag.model';

export interface Image {
  url: string;
  alt?: string;
  timestamp: Date;
  tags?: ImageTag[];
  width: number;
  height: number;
  fullWidth?: number;
  fullHeight?: number;
  // Camera metadata
  cameraMaker?: string;
  cameraModel?: string;
  fStop?: number;
  exposureTime?: string;
  iso?: number;
  focalLength?: number;
}
