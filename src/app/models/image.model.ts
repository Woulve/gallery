export interface Image {
  url: string;
  fullUrl?: string;
  alt?: string;
  timestamp: Date;
  tags?: string[];
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
