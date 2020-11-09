import { OFVector2 } from "../math/ofVector2"
import { SimpleCallback } from "../common/ofInterfaces";

export class OFHTMLHelpers {

  static createCanvas (warningText: string, parentDiv: HTMLBaseElement, id: string) {
    var elementText = document.createTextNode(warningText);
    var element = document.createElement("canvas");
    element.id = id;

    element.appendChild(elementText);
    parentDiv.appendChild(element);

    return element;
  }

  static getPositionOffset(element: HTMLBaseElement): OFVector2 {
    let resultX = 0;
    let resultY = 0;
    
    while(element && !isNaN(element.offsetLeft) && !isNaN(element.offsetTop)) {
      resultX += element.offsetLeft - element.scrollLeft;
      resultY += element.offsetTop - element.scrollTop;
      element = element.offsetParent as HTMLBaseElement;
    }
    
    return { x: resultX, y: resultY } as OFVector2;
  }

  static on(element: HTMLBaseElement | any, eventName: string, callback: SimpleCallback): void {
    if (typeof element === 'string') {
      const elements = document.getElementsByClassName(element) as HTMLCollectionOf<HTMLBaseElement | any>;
      
      for (let i = 0; i < elements.length; i++) {
        const item = elements.item(i);

        if (item.attachEvent) {
          item.attachEvent('on' + eventName, callback);
        }
        else if (item.addEventListener) {
          item.addEventListener(eventName, callback, true);
        }
      }
    }
    else {
      if (element.attachEvent) {
        element.attachEvent('on' + eventName, callback);
      }
      else if(element.addEventListener) {
        element.addEventListener(eventName, callback, true);
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
}
