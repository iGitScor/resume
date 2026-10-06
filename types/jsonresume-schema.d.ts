// @jsonresume/schema ships no type declarations.
declare module '@jsonresume/schema' {
  interface ValidationError {
    toString(): string;
  }

  const resumeSchema: {
    schema: object;
    validate(resume: unknown, callback: (errors: ValidationError[] | null, valid: boolean) => void): void;
  };

  export default resumeSchema;
}
