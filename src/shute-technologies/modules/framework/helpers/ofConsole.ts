import { STHelpers } from 'shute-technologies.common-and-utils';

/**
 * Engine logger: `OFConsole.log(this, 'template {0}', arg0)` prints `ClassName-> template arg0`.
 *
 * The first argument is the caller: `this`, or the class itself in static code. `TInstance` is
 * constrained to `object` rather than `Object`, because a string satisfies `Object`. That is how
 * ~30 call sites in this library came to pass the message first and the framework id second,
 * which printed `String-> 0` and discarded every engine diagnostic. With `object` that misuse is
 * a compile error.
 */
export class OFConsole {

  static info<TInstance extends object>(fromClass: TInstance, message?: string, ...args: string[]): void {
    console.info(OFConsole.format(fromClass, message, args));
  }

  static log<TInstance extends object>(fromClass: TInstance, message?: string, ...args: string[]): void {
    console.log(OFConsole.format(fromClass, message, args));
  }

  static warn<TInstance extends object>(fromClass: TInstance, message?: string, ...args: string[]): void {
    console.warn(OFConsole.format(fromClass, message, args));
  }

  static error<TInstance extends object>(fromClass: TInstance, message?: string, ...args: string[]): void {
    console.error(OFConsole.format(fromClass, message, args));
  }

  static throwError<TInstance extends object>(fromClass: TInstance, message?: string, ...args: string[]): Error {
    throw Error(OFConsole.format(fromClass, message, args));
  }

  private static format(fromClass: object, message: string, args: string[]): string {
    return `${OFConsole.sourceName(fromClass)}-> ${STHelpers.formatString(message == null ? '' : message, ...args)}`;
  }

  private static sourceName(fromClass: object): string {
    // Static code passes the class, whose constructor is `Function`: use the class's own name.
    if (typeof fromClass === 'function' && fromClass.name) { return fromClass.name; }

    return fromClass && fromClass.constructor ? fromClass.constructor.name : String(fromClass);
  }
}
