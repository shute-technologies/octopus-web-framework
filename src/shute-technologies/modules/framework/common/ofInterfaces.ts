export type SimpleCallback = (args?) => void;
export type SimpleGCallback<T> = (args?: T) => void;
export type SimpleGRequiredCallback<T> = (args: T) => void;
export interface Dictionary<T> { [Key: string]: T; }
