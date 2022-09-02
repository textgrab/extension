export class Rect {
  constructor(
    public x: number,
    public y: number,
    public width: number,
    public height: number
  ) { }
}

export class Line {
  /**
   * A line represents a rectangle with text in it.
   */
  constructor(public rect: Rect, public text = "") { }
}

export class Block {
  /**
   * A block is a block of related text. This sort of like a paragraph
   * in the sense it has multiple lines in close proximity.
   */
  constructor(public rect: Rect, public lines: Line[] = []) { }
}

export type Selection = {
  x: number;
  y: number;
  width: number;
  height: number;
  parentWidth: number;
  parentHeight: number;
};
