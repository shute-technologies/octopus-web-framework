export enum OFEnumBlendMode {
  Alpha = 0,
  Additive = 1,
  Multiply = 2,
  Screen = 3,
  /** For passes: BLEND off, the source replaces the destination (an exact copy). */
  Replace = 4,
  /** For passes: composites premultiplied colour (a render target's content): ONE, ONE_MINUS_SRC_ALPHA. */
  Premultiplied = 5
}
