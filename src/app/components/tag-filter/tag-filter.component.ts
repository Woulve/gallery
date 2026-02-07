import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  computed,
} from '@angular/core';
import { ImageTag, IMAGE_TAGS, TAG_LABELS } from '../../models/tag.model';

@Component({
  selector: 'app-tag-filter',
  templateUrl: './tag-filter.component.html',
  styleUrl: './tag-filter.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TagFilterComponent {
  selectedTags = input<ImageTag[]>([]);
  tagsChange = output<ImageTag[]>();

  readonly allTags = IMAGE_TAGS;
  readonly tagLabels = TAG_LABELS;

  isSelected = computed(() => {
    const selected = this.selectedTags();
    return (tag: ImageTag) => selected.includes(tag);
  });

  toggleTag(tag: ImageTag): void {
    const current = this.selectedTags();
    const newTags = current.includes(tag)
      ? current.filter((t) => t !== tag)
      : [...current, tag];
    this.tagsChange.emit(newTags);
  }

  clearAll(): void {
    this.tagsChange.emit([]);
  }
}
