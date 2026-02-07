export const TAG_LABELS = {
  landscape: 'Landscape',
  wildlife: 'Wildlife',
  cars: 'Cars',
  aircraft: 'Aircraft',
  portrait: 'Portrait',
  nature: 'Nature',
  food: 'Food',
  animals: 'Animals',
} as const;

export type ImageTag = keyof typeof TAG_LABELS;

export const IMAGE_TAGS = Object.keys(TAG_LABELS) as ImageTag[];
