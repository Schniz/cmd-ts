/// <reference types="next" />
/// <reference types="next/types/global" />

declare module '*.md' {
  let component: React.ComponentType<{}>;
  export default component;
}
