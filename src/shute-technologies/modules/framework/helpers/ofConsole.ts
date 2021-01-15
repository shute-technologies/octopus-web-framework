import { OFHelpers } from './ofHelpers';

export class OFConsole {

  static info(message: string, ...args: string[]): void {
    // tslint:disable-next-line: no-console
    console.info(OFHelpers.formatString(message, ...args));
  }

  static log(message: string, ...args: string[]): void {
    // tslint:disable-next-line: no-console
    console.log(OFHelpers.formatString(message, ...args));
  }

  static warn(message: string, ...args: string[]): void {
    // tslint:disable-next-line: no-console
    console.warn(OFHelpers.formatString(message, ...args));
  }

  static error(message: string, ...args: string[]): void {
    // tslint:disable-next-line: no-console
    console.error(OFHelpers.formatString(message, ...args));
  }
}
