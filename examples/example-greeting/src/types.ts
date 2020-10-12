/**
 * Typically an extension point defines an interface as the contract for
 * extensions to implement
 */
export interface Greeter {
  language: string;
  greet(name: string): string;
}

export interface Greeting {
  greet(language: string, name: string): Promise<string>;
}
