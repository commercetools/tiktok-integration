declare module '*.ctp.graphql' {
  import type { DocumentNode } from 'graphql';
  const document: DocumentNode;
  export default document;
}
