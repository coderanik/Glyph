declare module 'latex.js' {
  export function parse(latex: string, options?: any): any;
  export class HtmlGenerator {
    constructor(options?: any);
    htmlDocument(baseURL?: string): Document;
  }
}
