import { OFBitmapFontPage } from './ofBitmapFontPage';
import { OFVector2 } from '../../../framework/math/ofVector2';
import { OFEnumKeyCode } from '../../../framework/enums/ofEnumKeyCode';
import { OFBitmapFontCharDescriptor } from './ofBitmapFontCharDescriptor';
import { OFBitmapFontKerning } from './ofBitmapFontKerning';

export class OFBitmapFontCharset {
  static readonly CHAR_DESCRIPTOR_SIZE = 256;

  // info
  fontName = '';
  size = 0;
  bold = false;
  italic = false;
  charset = '';
  unicode = false;
  stretchH = 0;
  smooth = false;
  aa = false;
  padding = null;
  spacing = null;
  outline = false;

  // common
  lineHeight = 0;
  base = 0;
  scaleWidth = 0;
  scaleHeight = 0;
  pages = 0;
  packed = false;
  alphaChnl = 0;
  redChnl = 0;
  greenChnl = 0;
  blueChnl = 0;

  // pages
  fontPages: OFBitmapFontPage[] = [];

  // kerning
  kernings: OFBitmapFontKerning[] = [];

  getCharDescriptor(charUnicode: number): OFBitmapFontCharDescriptor {
    return this.fontPages[0].chars[charUnicode];
  }

  existsChar(charUnicode: number): boolean {
    return charUnicode - 1 < this.fontPages[0].charArraySize;
  }

  getKerning(unicodeFirst: number, unicodeSecond: number): number {
    let amount = 0;

    if (!this.kernings) {
      return amount;
    }

    const kerningCount = this.kernings.length;

    for (let i = 0; i < kerningCount; i++) {
      const _kerning = this.kernings[i];

      if (_kerning && _kerning.first === unicodeFirst && _kerning.second === unicodeSecond) {
        amount = _kerning.amount;
        break;
      }
    }

    return amount;
  }

  measureString(text: string): OFVector2 {
    const textSize = OFVector2.zero();
    textSize.y += this.base; // this is done for the first line

    const phraseLength = text.length;
    let oldIndexAfterJumpLine = 0;
    let oldWidthAfterJumpLine = 0;

    for (let i = 0; i < phraseLength; i++) {
      const unicodeCharFirst = text.charCodeAt(i);

      if (unicodeCharFirst === OFEnumKeyCode.JumpLine) {
        const newText = text.substring(oldIndexAfterJumpLine, i - oldIndexAfterJumpLine);
        oldIndexAfterJumpLine = i + 1;
        const newTextLength = this.measureStringLineal(newText);

        if (newTextLength > oldWidthAfterJumpLine) {
          oldWidthAfterJumpLine = newTextLength;
          textSize.x = oldWidthAfterJumpLine;
        }

        textSize.y += this.base;
      }
    }

    // if there's no JUMPLINE
    if (textSize.x === 0 && phraseLength > 0) {
      textSize.x = this.measureStringLineal(text);
    }

    return textSize;
  }

  measureStringLineal(text: string): number {
    const phraseLength = text.length;
    let textSize = 0;
    let oldUnicodeChar = -1;
    let charDescriptor: OFBitmapFontCharDescriptor;

    for (let i = 0; i < phraseLength; i++) {
      let kerningAmount = 0;
      const unicodeCharFirst = text.charCodeAt(i);

      if (this.existsChar(unicodeCharFirst)) {
        // RETRIEVE KERNING
        if (oldUnicodeChar !== -1) {
          kerningAmount = this.getKerning(oldUnicodeChar, unicodeCharFirst);
        }

        // RETRIEVE CHAR DESCRIPTOR
        charDescriptor = this.getCharDescriptor(unicodeCharFirst);
        //textSize += (charDescriptor.xOffset + charDescriptor.xAdvance + kerningAmount);
        textSize += charDescriptor.xAdvance + kerningAmount;
        // STORING OLD VARIABLES
        oldUnicodeChar = unicodeCharFirst;
      }
    }

    return textSize;
  }
}
