export class OFViewport {
  constructor (
    public x: number, 
    public y: number, 
    public width: number, 
    public height: number) { }

  static empty(): OFViewport {
    return new OFViewport(0, 0, 0, 0);
  }
}
