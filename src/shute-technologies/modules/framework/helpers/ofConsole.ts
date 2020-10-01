import { OFHelpers } from "./ofHelpers";

export class OFConsole {

  static info(message: string, ...args: string[]): void {
    console.info(OFHelpers.pathFormat(message, ...args));
  }

  static log(message: string, ...args: string[]): void {
    console.log(OFHelpers.pathFormat(message, ...args));
  }

  static warn(message: string, ...args: string[]): void {
    console.warn(OFHelpers.pathFormat(message, ...args));
  }

  static error(message: string, ...args: string[]): void {
    console.error(OFHelpers.pathFormat(message, ...args));
  }
}
