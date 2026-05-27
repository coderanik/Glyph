declare module 'latex.js' {
  export function parse(latex: string, options?: unknown): unknown;
  export class HtmlGenerator {
    constructor(options?: unknown);
    htmlDocument(baseURL?: string): Document;
  }
}
