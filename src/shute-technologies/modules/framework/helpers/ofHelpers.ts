import { OFUtils } from "../common/ofUtils";
import { SimpleCallback } from "../common/ofInterfaces";
import { OFFramework } from "../ofFramework";

interface IPPDetails {
  isFirstParameter: boolean;
  firstIndex: number;
  lastIndex: number;
  hasNextParameter: boolean;
}

export class OFHelpers {

  static callIn(time: number, functionCallback: SimpleCallback, args?) {
    return setTimeout(
      (inputArgs?) => {
        functionCallback(inputArgs);
      },
      time,
      args
    );
  }

  static getDigitsByValue(value: number, numDigits: number): string {
		let s = value.toString();
		const offset = numDigits - s.length;

		for (let i = 0; i < offset; i++) {
      s = '0' + s;
		}
		return s;
  }

  static clone(from) {
    const wasDate = from instanceof Date;
    const cloned = JSON.parse(JSON.stringify(from));
    
    /* istanbul ignore else */
    if (!wasDate) {
      OFHelpers.cloneIterate(cloned);
    }

    return wasDate ? new Date(cloned) : cloned;
  }

  private static cloneIterate(objIterate) {
    if (objIterate) {
      Object.entries(objIterate).forEach(entry => {
        const key = entry[0];

        if (typeof objIterate[key] === 'object') {
          OFHelpers.cloneIterate(objIterate[key]);
        } else {
          if (OFUtils.isStringActuallyDateRepresentation(objIterate[key])) {
            objIterate[key] = new Date(objIterate[key]);
          }
        }
      });
    }
  }

  static removeTrailingComma(val: string): string {
    val = val.trim();

    const hasComma = val.lastIndexOf(',');

    /* istanbul ignore else */
    if (hasComma !== -1 && hasComma === val.length - 1) {
      return val.substring(0, hasComma);
    }

    return val;
  }

  static pathFormat(path: string, ...args: string[]): string {
    args.forEach((val, index) => {
      if (!OFUtils.isNullOrEmpty(val)) {
        path = path.replace(`{${index}}`, val);
      } else {
        path = OFHelpers.removeEmptyParameter(path, index);
      }
    });

    // verify path if have typos at the end
    if (path.indexOf('?') !== -1 && (path.length - 1) === path.indexOf('?')) {
      path = path.substring(0, path.indexOf('?'));
    }

    return path;
  }

  static removeEmptyParameter(path: string, index: number) {
    /* istanbul ignore else */
    if (OFHelpers.isParameterProperty(path, index)) {
      const paramPropDetails = OFHelpers.getParameterPropertyDetails(path, index);
      path = OFHelpers.removeParameterPropOfPath(path, paramPropDetails);
    }

    return path;
  }

  private static isParameterProperty(path: string, index: number): boolean {
    const parameterValueIndex = path.indexOf(`{${index}}`);
    return path[parameterValueIndex - 1] === '=';
  }

  private static getParameterPropertyDetails(path: string, index: number): IPPDetails {
    const parameterValueIndex = path.indexOf(`{${index}}`);
    let newIndex = 1;
    let canStillIterate = true;
    let isFirstParameter = false;

    while (canStillIterate) {
      /* istanbul ignore else */
      if (path[parameterValueIndex - newIndex] === '?') {
        canStillIterate = false;
        isFirstParameter = true;
      } else if (path[parameterValueIndex - newIndex] === '&'){
        canStillIterate = false;
      }

      newIndex++;
    }

    return {
      isFirstParameter,
      firstIndex: parameterValueIndex - newIndex + 1,
      lastIndex: path.indexOf('}', parameterValueIndex) + 1,
      hasNextParameter: path.indexOf(`{${index}}`, parameterValueIndex) !== -1
    };
  }

  private static removeParameterPropOfPath(path: string, ppDetails: IPPDetails): string {
    return ppDetails.isFirstParameter
      ? `${path.substring(0, ppDetails.firstIndex)}${'?'}${path.substring(ppDetails.hasNextParameter ? ppDetails.lastIndex + 1 : ppDetails.lastIndex)}`
      : path.substring(0, ppDetails.firstIndex) + (ppDetails.hasNextParameter ? '' : '&') + path.substring(ppDetails.lastIndex);
  }

  static getMousePosition (framework: OFFramework, mouseEvent): { x: number, y: number } {
    let result = {} as { x: number, y: number };
    let tempX = 0;
    let tempY = 0; 
    const IE = !!document.all;

    if (IE) { // grab the x-y pos.s if browser is IE
      tempX = mouseEvent.clientX + document.body.scrollLeft;
      tempY = mouseEvent.clientY + document.body.scrollTop;
    }
    else {  // grab the x-y pos.s if browser is NS
      tempX = mouseEvent.pageX;
      tempY = mouseEvent.pageY;
    }
    
    let fTempX = tempX;
    let fTempY = tempY;
    const mousePosition = framework.mousePositionOffset;
    
    // Subtract mouse position offset
    fTempX -= mousePosition.x;            
    fTempY -= mousePosition.y;

    // Compute limits
    fTempX = fTempX < 0 ? 0 : fTempX; 
    fTempX = fTempX > framework.appWidth ? framework.appWidth : fTempX;
    fTempY = fTempY < 0 ? 0 : fTempY;
    fTempY = fTempY > framework.appHeight ? framework.appHeight : fTempY;

    result.x = fTempX;        
    result.y = fTempY;

    return result;
  }

  static eraseCharsInString(baseString: string, asciiChars: Array<string>): string {
    for (let i = 0; i < asciiChars.length; i++) {
      baseString = baseString.replace(asciiChars[i], '');
    }
    
	  return baseString;
  }
}