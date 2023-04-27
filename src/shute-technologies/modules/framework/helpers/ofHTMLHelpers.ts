import { OFVector2 } from '../math/ofVector2';
import { OFFramework } from '../ofFramework';
import { ICallback1 } from 'shute-technologies.common-and-utils';

type JQueryMultipleMouseEvent = 
  JQuery.MouseMoveEvent<Document | HTMLElement, undefined, Element, Element> | 
  JQuery.MouseDownEvent<Document | HTMLElement, undefined, Element, Element> |
  JQuery.MouseUpEvent<Document | HTMLElement, undefined, Element, Element>;

export class OFHTMLHelpers {

  static createCanvas (warningText: string, parentDiv: HTMLBaseElement, id: string) {
    const elementText = document.createTextNode(warningText);
    const element = document.createElement('canvas');
    element.id = id;

    element.appendChild(elementText);
    parentDiv.appendChild(element);

    return element;
  }

  static getPositionOffset(element: HTMLBaseElement): OFVector2 {
    let resultX = 0;
    let resultY = 0;

    while (element && !isNaN(element.offsetLeft) && !isNaN(element.offsetTop)) {
      resultX += element.offsetLeft - element.scrollLeft;
      resultY += element.offsetTop - element.scrollTop;
      element = element.offsetParent as HTMLBaseElement;
    }

    return { x: resultX, y: resultY } as OFVector2;
  }

  static on(element: Window | HTMLBaseElement | string, eventName: string, callback: ICallback1<Event>): void {
    if (typeof element === 'string') {
      const elements = document.getElementsByClassName(element) as HTMLCollectionOf<HTMLBaseElement | any>;

      for (let i = 0; i < elements.length; i++) {
        const item = elements.item(i);

        if (item.attachEvent) {
          item.attachEvent('on' + eventName, callback);
        } else if (item.addEventListener) {
          item.addEventListener(eventName, callback, true);
        }
      }
    } else {
      if (element['attachEvent']) { // If ['attachEvent'] exists then use it
        element['attachEvent']('on' + eventName, callback);
      } else if (element.addEventListener) {
        element.addEventListener(eventName, callback, true);
      }
    }
  }

  static off(element: Window | HTMLBaseElement | string, eventName: string, callback: ICallback1<Event>): void {
    if (typeof element === 'string') {
      const elements = document.getElementsByClassName(element) as HTMLCollectionOf<HTMLBaseElement>;

      for (let i = 0; i < elements.length; i++) {
        const item = elements.item(i);

        if (item['detachEvent ']) {
          item['detachEvent ']('on' + eventName);
        } else if (item.removeEventListener) {
          item.removeEventListener(eventName, callback, true);
        }
      }
    } else {
      if (element['detachEvent']) { // If ['attachEvent'] exists then use it
        element['detachEvent']('on' + eventName, callback);
      } else if (element.removeEventListener) {
        element.removeEventListener(eventName, callback, true);
      }
    }
  }

  static addClass(elementClassName: string, className: string): void {
    const elements = document.getElementsByClassName(elementClassName);

    for (let i = 0; i < elements.length; i++) {
      const element = elements.item(i);

      if (element) {
        element.className += element.className ? ' ' + className : className;
      }
    }
  }

  static searchWebElementWithId(webElement: Element, id: string): Element {
    let currentWE = webElement;

    while (currentWE) {
      if (!currentWE.id || (currentWE.id && currentWE.id.indexOf(id) === -1)) {
        currentWE = currentWE.parentElement;
      } else {
        break;
      }
    }

    return currentWE;
  }

  static searchWebElementWithClass(webElement: Element, andWithClass: string): Element {
    let currentWE = webElement;

    while (currentWE) {
      if (andWithClass ? !OFHTMLHelpers.webElementHasClass(currentWE, andWithClass) : true) {
        currentWE = currentWE.parentElement;
      } else {
        break;
      }
    }

    return currentWE;
  }

  static webElementHasClass(webElement: Element, className: string): boolean {
    const attrClass = webElement.getAttribute('class');
    const classes: string[] = attrClass ? attrClass.split(' ') : null;
    return classes ? classes.indexOf(className) !== -1 : false;
  }

  static percentWidth (element: HTMLElement): number {
    const parent = (element.offsetParent || element) as HTMLElement;
    return Number(((element.offsetWidth / parent.offsetWidth) * 100).toFixed(2));
  }

  static getMousePosition(framework: OFFramework, mouseEvent: JQueryMultipleMouseEvent) : { x: number, y: number } {
    const result = {} as { x: number, y: number };
    let tempX = 0;
    let tempY = 0;
    const IE = !!document.all;

    if (IE) { // grab the x-y pos.s if browser is IE
      tempX = mouseEvent.clientX + document.body.scrollLeft;
      tempY = mouseEvent.clientY + document.body.scrollTop;
    } else {  // grab the x-y pos.s if browser is NS
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
}
