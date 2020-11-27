export class OFColor {

  r: number;
  g: number;
  b: number;
  a: number;

  constructor(r: number, g: number, b: number, a: number) {
    this.r = r;
    this.g = g;
    this.b = b;
    this.a = a;
  }

  static fromString(rawRGBString: string): OFColor {
    const rawColor = rawRGBString.split(',');
    const result = OFColor.white();
    result.r = parseFloat(rawColor[0]);
    result.g = parseFloat(rawColor[1]);
    result.b = parseFloat(rawColor[2]);
    result.a = parseFloat(rawColor[3]);

    return result;
  }

  static fromObject(obj: {r, g, b, a}) {
    return {
      r: parseInt(String(obj.r), 10),
      g: parseInt(String(obj.g), 10),
      b: parseInt(String(obj.b), 10),
      a: parseInt(String(obj.a), 10),
    };
  }

  static fromNormalized(color: OFColor): OFColor {
    return new OFColor(
      Math.round(color.r * 255.0),
      Math.round(color.g * 255.0),
      Math.round(color.b * 255.0),
      Math.round(color.a * 255.0)
    );
  }

  static convertToStringFromNormalized(color: OFColor): string {
    return `${Math.round(color.r * 255.0).toString()},${Math.round(color.g * 255.0).toString()},${Math.round(color.b * 255.0).toString()},${Math.round(color.a * 255.0).toString()}`;
  }

  static black(): OFColor { return new OFColor(0, 0, 0, 1); }
  static white(): OFColor { return new OFColor(1, 1, 1, 1); }
  static red(): OFColor { return new OFColor(1, 0, 0, 1); }
  static green(): OFColor { return new OFColor(0, 1, 0, 1); }
  static blue(): OFColor { return new OFColor(0, 0, 1, 1); }
}
