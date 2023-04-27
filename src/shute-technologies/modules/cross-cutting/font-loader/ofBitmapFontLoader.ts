import { OFBitmapFontCharset } from './data/ofBitmapFontCharset';
import { OFBitmapFontPage } from './data/ofBitmapFontPage';
import { OFBitmapFontCharDescriptor } from './data/ofBitmapFontCharDescriptor';
import { OFBitmapFontKerning } from './data/ofBitmapFontKerning';
import { OFConsole } from '../../framework/helpers/ofConsole';
import { OFEnumKeyCode } from '../../framework/enums/ofEnumKeyCode';
import { STHelpers } from 'shute-technologies.common-and-utils';

enum OFEnumBitmapFontLineTypes {
  DEFAULT_NONE = 0,
  INFO = 1,
  COMMON = 2,
  PAGE = 3,
  CHARS = 4,
  CHAR = 5,
  KERNING = 6,
  KERNINGS = 7
}

export class OFBitmapFontLoader {
  private static BitmapFontPageTemp: OFBitmapFontPage = null;
  private static BitmapFontPageIndexTemp = -1;
  private static BitmapFontCharIndexTemp = -1;
  private static BitmapFontKerningIndexTemp = -1;
  private static FontCharset: OFBitmapFontCharset = null;

  static readonly COMMA = ',';
  static readonly DOT = '.';
  static readonly WHITE_SPACE = ' ';
  static readonly EQUALS_SIGN = '=';
  static readonly SLASH = '/';
  static readonly QUOTATION_MARK = String.fromCharCode(OFEnumKeyCode.QuotationMark);
  static readonly SPACE = String.fromCharCode(OFEnumKeyCode.Space);
  static readonly NOTHING = String.fromCharCode(OFEnumKeyCode.Nothing);
  static readonly BACKSLASH = String.fromCharCode(OFEnumKeyCode.Backslash);

  static readonly ASCIIFilter = [OFBitmapFontLoader.NOTHING, OFBitmapFontLoader.BACKSLASH, OFBitmapFontLoader.QUOTATION_MARK, OFBitmapFontLoader.WHITE_SPACE];

  private constructor() {}

  static parse(data: string) {
    // clear static variables
    OFBitmapFontLoader.BitmapFontPageTemp = null;
    OFBitmapFontLoader.BitmapFontPageIndexTemp = -1;
    OFBitmapFontLoader.BitmapFontCharIndexTemp = -1;
    OFBitmapFontLoader.BitmapFontKerningIndexTemp = -1;
    OFBitmapFontLoader.FontCharset = null;

    const fontRawTextLines = data.split('\n');

    let finish = false;
    let tmpString = '';
    let readedLine = '';

    OFBitmapFontLoader.FontCharset = new OFBitmapFontCharset();
    OFBitmapFontLoader.BitmapFontPageTemp = new OFBitmapFontPage();

    for (let i = 0, length = fontRawTextLines.length; i < length; i++) {
      readedLine = fontRawTextLines[i];

      let findedQuotation = false;
      let firstRead = true;
      let finishInternal = false;
      const lineLength = readedLine.length;
      let linePosition = 0;
      let lineType = OFEnumBitmapFontLineTypes.DEFAULT_NONE;

      while (!finishInternal) {
        if (linePosition >= lineLength) {
          finishInternal = true;

          if (tmpString.length > 0) {
            OFBitmapFontLoader.readingAndSettingValues(lineType, tmpString);
            tmpString = '';
          }
          break;
        } else {
          const letter = readedLine[linePosition];
          let iss = letter === OFBitmapFontLoader.SPACE; // char.IsSeparator equivalent
          const isQuotation = letter === OFBitmapFontLoader.QUOTATION_MARK;

          if (isQuotation) {
            if (!findedQuotation) {
              findedQuotation = true;
            } else {
              findedQuotation = false;
            }
          }

          iss = findedQuotation ? false : iss;

          if (iss) {
            if (tmpString.length > 0) {
              if (firstRead) {
                firstRead = false;
                lineType = OFBitmapFontLoader.getLineType(tmpString);
              } else {
                OFBitmapFontLoader.readingAndSettingValues(lineType, tmpString);
              }

              tmpString = '';
            }
          } else {
            tmpString += letter;
          }

          linePosition++;
        }
      }
    }

    // FINISH THE READ OF FILE
    finish = true;

    OFBitmapFontLoader.BitmapFontPageIndexTemp = 0;
    OFBitmapFontLoader.BitmapFontCharIndexTemp = 0;
    OFBitmapFontLoader.BitmapFontKerningIndexTemp = 0;

    return OFBitmapFontLoader.FontCharset;
  }

  private static readingAndSettingValues (lineType: OFEnumBitmapFontLineTypes, tmpString: string): void {
    let propertyType = '';
    let propertyValue = '';

    let charPos = tmpString.indexOf(OFBitmapFontLoader.EQUALS_SIGN);
    propertyType = tmpString.substring(0, charPos);
    propertyValue = tmpString.substring(charPos + 1);
    propertyValue = propertyValue.replace(OFBitmapFontLoader.QUOTATION_MARK, OFBitmapFontLoader.NOTHING);
    propertyValue = propertyValue.replace(OFBitmapFontLoader.BACKSLASH, OFBitmapFontLoader.NOTHING);

    // TEMP VARIABLES
    let charDescTemp: OFBitmapFontCharDescriptor = null;

    switch (lineType) {
      case OFEnumBitmapFontLineTypes.INFO:
        switch (propertyType) {
          case 'face':
            OFBitmapFontLoader.FontCharset.fontName = STHelpers.eraseCharsInString(propertyValue, 
              OFBitmapFontLoader.ASCIIFilter);
            break;
          case 'size':
            OFBitmapFontLoader.FontCharset.size = parseInt(propertyValue);
            break;
          case 'bold':
            OFBitmapFontLoader.FontCharset.bold = propertyValue === '0' ? false : true;
            break;
          case 'italic':
            OFBitmapFontLoader.FontCharset.italic = propertyValue === '0' ? false : true;
            break;
          case 'charset':
            OFBitmapFontLoader.FontCharset.charset = STHelpers.eraseCharsInString(propertyValue, 
              OFBitmapFontLoader.ASCIIFilter);
            break;
          case 'unicode':
            OFBitmapFontLoader.FontCharset.unicode = propertyValue === '0' ? false : true;
            break;
          case 'stretchH':
            OFBitmapFontLoader.FontCharset.stretchH = parseInt(propertyValue);
            break;
          case 'smooth':
            OFBitmapFontLoader.FontCharset.smooth = propertyValue === '0' ? false : true;
            break;
          case 'aa':
            OFBitmapFontLoader.FontCharset.aa = propertyValue === '0' ? false : true;
            break;
          case 'padding':
            const propPaddings = propertyValue.split(OFBitmapFontLoader.COMMA);

            OFBitmapFontLoader.FontCharset.padding = [
              parseInt(propPaddings[0]),
              parseInt(propPaddings[1]),
              parseInt(propPaddings[2]),
              parseInt(propPaddings[3]),
            ];
            break;
          case 'spacing':
            OFBitmapFontLoader.FontCharset.spacing = [
              parseInt(String.fromCharCode(parseInt(propertyValue[0]))), 
              parseInt(String.fromCharCode(parseInt(propertyValue[2])))
            ];
            break;
          case 'outline':
            OFBitmapFontLoader.FontCharset.outline = propertyValue === '0' ? false : true;
            break;
        }
        break;
      case OFEnumBitmapFontLineTypes.COMMON:
        switch (propertyType) {
          case 'lineHeight':
            OFBitmapFontLoader.FontCharset.lineHeight = parseInt(propertyValue);
            break;
          case 'base':
            OFBitmapFontLoader.FontCharset.base = parseInt(propertyValue);
            break;
          case 'scaleW':
            OFBitmapFontLoader.FontCharset.scaleWidth = parseInt(propertyValue);
            break;
          case 'scaleH':
            OFBitmapFontLoader.FontCharset.scaleHeight = parseInt(propertyValue);
            break;
          case 'pages':
            OFBitmapFontLoader.FontCharset.pages = parseInt(propertyValue);
            OFBitmapFontLoader.FontCharset.fontPages = new Array<OFBitmapFontPage>();

            // initialize array
            for (let i = 0, length = OFBitmapFontLoader.FontCharset.pages; i < length; i++) {
              OFBitmapFontLoader.FontCharset.fontPages.push(new OFBitmapFontPage());
            }
            break;
          case 'packed':
            OFBitmapFontLoader.FontCharset.packed = propertyValue === '0' ? false : true;
            break;
          case 'alphaChnl':
            OFBitmapFontLoader.FontCharset.alphaChnl = parseInt(propertyValue);
            break;
          case 'redChnl':
            OFBitmapFontLoader.FontCharset.redChnl = parseInt(propertyValue);
            break;
          case 'greenChnl':
            OFBitmapFontLoader.FontCharset.greenChnl = parseInt(propertyValue);
            break;
          case 'blueChnl':
            OFBitmapFontLoader.FontCharset.blueChnl = parseInt(propertyValue);
            break;
        }
        break;
      case OFEnumBitmapFontLineTypes.PAGE:
        let NBFPage: OFBitmapFontPage = null;

        for (let i = 0; i < OFBitmapFontLoader.FontCharset.fontPages.length; i++) {
          NBFPage = OFBitmapFontLoader.FontCharset.fontPages[i];

          if (!NBFPage.isInitialized) {
            switch (propertyType) {
              case 'id':
                NBFPage.id = parseInt(propertyValue);
                break;
              case 'file':
                NBFPage.path = STHelpers.eraseCharsInString(propertyValue, OFBitmapFontLoader.ASCIIFilter);
                NBFPage.isInitialized = true;

                // THIS ARE TEMPORAL VARIABLES FOR THE PAGES
                OFBitmapFontLoader.BitmapFontCharIndexTemp = 0;
                OFBitmapFontLoader.BitmapFontPageIndexTemp = i;
                OFBitmapFontLoader.BitmapFontPageTemp = NBFPage;
                break;
            }

            OFBitmapFontLoader.FontCharset.fontPages[i] = NBFPage;
            break;
          }
        }
        break;
      case OFEnumBitmapFontLineTypes.CHARS:
        switch (propertyType) {
          case 'count':
            OFBitmapFontLoader.BitmapFontCharIndexTemp = -1;
            OFBitmapFontLoader.BitmapFontPageTemp.charCount = parseInt(propertyValue);
            OFBitmapFontLoader.BitmapFontPageTemp.chars = []; /*NBitmapFontCharDescriptor*/
            // initialize array
            for (let i = 0; i < OFBitmapFontCharset.CHAR_DESCRIPTOR_SIZE; i++) {
              OFBitmapFontLoader.BitmapFontPageTemp.chars.push(new OFBitmapFontCharDescriptor());
            }

            OFBitmapFontLoader.BitmapFontPageTemp.charArraySize = OFBitmapFontCharset.CHAR_DESCRIPTOR_SIZE;
            OFBitmapFontLoader.FontCharset.fontPages[OFBitmapFontLoader.BitmapFontPageIndexTemp] = OFBitmapFontLoader.BitmapFontPageTemp;
            break;
        }
        break;
      case OFEnumBitmapFontLineTypes.CHAR:
        if (OFBitmapFontLoader.BitmapFontCharIndexTemp !== -1) {
          if (OFBitmapFontLoader.BitmapFontCharIndexTemp < OFBitmapFontCharset.CHAR_DESCRIPTOR_SIZE) {
            if (propertyType === 'id') {
              OFBitmapFontLoader.BitmapFontCharIndexTemp = parseInt(propertyValue);
            } // Added logic because JS doesn't have structs
            charDescTemp = OFBitmapFontLoader.BitmapFontPageTemp.chars[OFBitmapFontLoader.BitmapFontCharIndexTemp];
          } else {
            break;
          }
        } else {
          charDescTemp = new OFBitmapFontCharDescriptor();
        }

        // This happen only when the char is off the limits of:  CHAR_DESCRIPTOR_SIZE
        if (!charDescTemp) break;

        switch (propertyType) {
          case 'id':
            charDescTemp.id = parseInt(propertyValue);
            OFBitmapFontLoader.BitmapFontCharIndexTemp = charDescTemp.id;
            break;
          case 'x':
            charDescTemp.x = parseInt(propertyValue);
            break;
          case 'y':
            charDescTemp.y = parseInt(propertyValue);
            break;
          case 'width':
            charDescTemp.width = parseInt(propertyValue);
            charDescTemp.textureU = charDescTemp.width;
            break;
          case 'height':
            charDescTemp.height = parseInt(propertyValue);
            charDescTemp.textureV = charDescTemp.height;
            break;
          case 'xoffset':
            charDescTemp.xOffset = parseInt(propertyValue);
            break;
          case 'yoffset':
            charDescTemp.yOffset = parseInt(propertyValue);
            break;
          case 'xadvance':
            charDescTemp.xAdvance = parseInt(propertyValue);
            break;
          case 'page':
            charDescTemp.page = parseInt(propertyValue);
            break;
          case 'chnl':
            charDescTemp.chnl = parseInt(propertyValue);
            break;
        }

        if (OFBitmapFontLoader.BitmapFontCharIndexTemp < OFBitmapFontCharset.CHAR_DESCRIPTOR_SIZE) {
          OFBitmapFontLoader.BitmapFontPageTemp.chars[OFBitmapFontLoader.BitmapFontCharIndexTemp] = charDescTemp;

          OFBitmapFontLoader.FontCharset.fontPages[OFBitmapFontLoader.BitmapFontPageIndexTemp] = OFBitmapFontLoader.BitmapFontPageTemp;
        } else {
          // TODO: Translate this, maybe in its own module?
          OFConsole.warn(
            "OFBitmapFontLoader> readingAndSettingValues> In the Font: '" +
              OFBitmapFontLoader.FontCharset.fontName +
              "' the char index: " +
              OFBitmapFontLoader.BitmapFontCharIndexTemp +
              ' is out of the range of the default size of the char description: ' +
              OFBitmapFontCharset.CHAR_DESCRIPTOR_SIZE
          );
        }

        break;
      case OFEnumBitmapFontLineTypes.KERNINGS:
        OFBitmapFontLoader.BitmapFontKerningIndexTemp = 0;
        OFBitmapFontLoader.FontCharset.kernings = new Array<OFBitmapFontKerning>();

        // initialize array
        for (let i = 0, length = parseInt(propertyValue); i < length; i++) {
          OFBitmapFontLoader.FontCharset.kernings.push(new OFBitmapFontKerning());
        }
        break;
      case OFEnumBitmapFontLineTypes.KERNING:
        let incrementKerningReader = false;
        const kerningTemp = OFBitmapFontLoader.FontCharset.kernings[OFBitmapFontLoader.BitmapFontKerningIndexTemp];

        switch (propertyType) {
          case 'first':
            kerningTemp.first = parseInt(propertyValue);
            break;
          case 'second':
            kerningTemp.second = parseInt(propertyValue);
            break;
          case 'amount':
            incrementKerningReader = true;
            kerningTemp.amount = parseInt(propertyValue);
            break;
        }

        OFBitmapFontLoader.FontCharset.kernings[OFBitmapFontLoader.BitmapFontKerningIndexTemp] = kerningTemp;

        if (incrementKerningReader) {
          // GO TO NEXT KERNING NODE
          OFBitmapFontLoader.BitmapFontKerningIndexTemp++;
        }
        break;
    }
  }

  private static getLineType(valueType) {
    let lineType = OFEnumBitmapFontLineTypes.DEFAULT_NONE;

    switch (valueType) {
      case 'info':
        lineType = OFEnumBitmapFontLineTypes.INFO;
        break;
      case 'common':
        lineType = OFEnumBitmapFontLineTypes.COMMON;
        break;
      case 'page':
        lineType = OFEnumBitmapFontLineTypes.PAGE;
        break;
      case 'chars':
        lineType = OFEnumBitmapFontLineTypes.CHARS;
        break;
      case 'char':
        lineType = OFEnumBitmapFontLineTypes.CHAR;
        break;
      case 'kerning':
        lineType = OFEnumBitmapFontLineTypes.KERNING;
        break;
      case 'kernings':
        lineType = OFEnumBitmapFontLineTypes.KERNINGS;
        break;
    }

    return lineType;
  }
}
