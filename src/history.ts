import type { GeneratedRegion } from './generation';

/** Session-only history. Snapshots own all map data, including future overlays. */
export class RegionHistory {
  private present: GeneratedRegion;
  private past: GeneratedRegion[] = [];
  private future: GeneratedRegion[] = [];

  constructor(region: GeneratedRegion) {
    this.present = structuredClone(region);
  }

  get current(): GeneratedRegion { return structuredClone(this.present); }
  get canUndo(): boolean { return this.past.length > 0; }
  get canRedo(): boolean { return this.future.length > 0; }

  apply(region: GeneratedRegion): void {
    if (JSON.stringify(region) === JSON.stringify(this.present)) return;
    this.past.push(this.present);
    this.present = structuredClone(region);
    this.future = [];
  }

  undo(): boolean {
    const previous = this.past.pop();
    if (!previous) return false;
    this.future.push(this.present);
    this.present = previous;
    return true;
  }

  redo(): boolean {
    const next = this.future.pop();
    if (!next) return false;
    this.past.push(this.present);
    this.present = next;
    return true;
  }
}
