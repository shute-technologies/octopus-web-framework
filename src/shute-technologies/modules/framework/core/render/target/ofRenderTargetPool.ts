import { OFGraphicDevice } from '../../device/ofGraphicDevice';
import { OFRenderTarget, OFRenderTargetFormat } from './ofRenderTarget';

interface OFIPooledTarget {
  target: OFRenderTarget;
  // The format asked for, so a 'half-float' that fell back to RGBA8 is found again by the same request.
  requestedFormat: OFRenderTargetFormat;
  inUse: boolean;
  lastUsedFrame: number;
}

/**
 * Render targets reused by size and format, so a pass that needs a few targets every frame allocates them once.
 *
 * acquire() hands out a free target of that size and format, or makes one; release() gives it back. Call
 * endFrame() once a frame and trim() now and then: targets free for more than `maxIdleFrames` frames are
 * destroyed, so a resize or a pass that stops running does not keep its textures forever.
 */
export class OFRenderTargetPool {

  private readonly _entries: OFIPooledTarget[] = [];
  private _frame = 0;

  /** Targets the pool owns, in use or free. */
  get count(): number { return this._entries.length; }
  /** Targets acquired and not yet released. */
  get inUseCount(): number { return this._entries.filter((entry) => entry.inUse).length; }
  get frame(): number { return this._frame; }

  constructor(private readonly _graphicDevice: OFGraphicDevice) {}

  acquire(width: number, height: number, format: OFRenderTargetFormat = 'rgba8'): OFRenderTarget {
    const w = Math.max(1, Math.floor(width));
    const h = Math.max(1, Math.floor(height));
    let entry = this._entries.find((candidate) => !candidate.inUse && candidate.requestedFormat === format
      && candidate.target.width === w && candidate.target.height === h);

    if (!entry) {
      entry = { target: new OFRenderTarget(this._graphicDevice, w, h, format), requestedFormat: format, inUse: false, lastUsedFrame: 0 };
      this._entries.push(entry);
    }

    entry.inUse = true;
    entry.lastUsedFrame = this._frame;
    return entry.target;
  }

  /** Gives the target back. A target the pool does not own, or one already released, is ignored. */
  release(target: OFRenderTarget): void {
    const entry = this._entries.find((candidate) => candidate.target === target);

    if (!entry || !entry.inUse) { return; }

    target.unbind();
    entry.inUse = false;
    entry.lastUsedFrame = this._frame;
  }

  /** Counts a frame; trim() measures idleness in these. */
  endFrame(): void {
    this._frame++;
  }

  /** Destroys free targets unused for more than `maxIdleFrames` frames. Targets in use are kept. */
  trim(maxIdleFrames = 60): void {
    for (let i = this._entries.length - 1; i >= 0; i--) {
      const entry = this._entries[i];

      if (!entry.inUse && this._frame - entry.lastUsedFrame > maxIdleFrames) {
        entry.target.destroy();
        this._entries.splice(i, 1);
      }
    }
  }

  /** Destroys every target, in use or not. */
  destroy(): void {
    this._entries.forEach((entry) => entry.target.destroy());
    this._entries.length = 0;
  }
}
