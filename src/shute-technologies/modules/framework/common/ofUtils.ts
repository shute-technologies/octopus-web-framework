import { IOFConstructor } from '../interfaces/iofConstructor';

export class OFUtils {

  private static readonly _regExDate = new RegExp('^(-?(?:[1-9][0-9]*)?[0-9]{4})-(1[0-2]|0[1-9])-(3[01]|0[1-9]|[12][0-9])T(2[0-3]|[01][0-9]):([0-5][0-9]):([0-5][0-9])(.[0-9]+)?(Z)?$');

  static isNullOrEmpty(val: string): boolean {
    val = val ? val.toString() : val;
    return val ? val.trim().length === 0 : true;
  }

  static isString(value): boolean {
    return typeof value === 'string' || value instanceof String;
  }

  static isObjectEmpty(obj: Object) {
    return Object.keys(obj).length === 0;
  }

  static ternaryNotNull<T>(param: {}, trueCondition: T, falseCondition: T): T {
    return !!param ? trueCondition : falseCondition;
  }

  static replaceAllInString(sourceString: string, search: string, replacement: string): string {
    return sourceString.split(search).join(replacement);
  }

  static isStringActuallyDateRepresentation(stringDate: string): boolean {
    return OFUtils._regExDate.test(stringDate);
  }

  static instanceByClassName (className: string, params?) {
    return new Function('arg1', `return new ${className}(arg1)`)(params);
  }

  static instanceByType<T>(type: IOFConstructor<T>): T {
    return new type();
  }

  static isPowerOfTwo (x: number): boolean {
    return (x & (x - 1)) === 0;
  }

  static nextHighestPowerOfTwo (x: number) {
    --x;

    for (let i = 1; i < 32; i <<= 1) {
        x = x | x >> i;
    }
    return x + 1;
  }

  static createGuid (): string {
    const lut = [];

    for (let i = 0; i < 256; i++) {
      lut[i] = (i < 16 ? '0' : '') + (i).toString(16);
    }

    const d0 = Math.random() * 0x100000000 >>> 0;
    const d1 = Math.random() * 0x100000000 >>> 0;
    const d2 = Math.random() * 0x100000000 >>> 0;
    const d3 = Math.random() * 0x100000000 >>> 0;

    return lut[d0&0xff] + lut[d0>>8&0xff] + lut[d0>>16&0xff] + lut[d0>>24&0xff]+ '-' +
      lut[d1&0xff] + lut[d1>>8&0xff] + '-' + lut[d1>>16&0x0f|0x40] + lut[d1>>24&0xff]+ '-' +
      lut[d2&0x3f|0x80] + lut[d2>>8&0xff] + '-' + lut[d2>>16&0xff] + lut[d2>>24&0xff]+
      lut[d3&0xff] + lut[d3>>8&0xff] + lut[d3>>16&0xff] + lut[d3>>24&0xff];
  }

  static countPropertiesInObject (object: Object) {
    let count = 0;

    for (const k of Object.keys(object)) {
      if (object.hasOwnProperty(k)) {
        ++count;
      }
    }

    return count;
  }

  static arrayInsertArray <T>(arrayTarget: Array<T>, index: number, arrayNew: Array<T>): Array<T> {
    for (let i = arrayNew.length - 1; i >= 0; i--) {
      arrayTarget.splice(index, 0, arrayNew[i]);
    }

    return arrayTarget;
  }

  static isNullOrUndefinedOrWhiteSpace (text: string): boolean {
    let result = text === undefined || text === null;
    result = !result ? text.length === 0 : result;
    return result;
  }
}
