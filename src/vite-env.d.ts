/// <reference types="vite/client" />

declare module "*.css" {
  const content: Record<string, string>;
  export default content;
}

declare module "react-date-object/calendars/persian" {
  const persian: any;
  export default persian;
}

declare module "react-date-object/locales/persian_fa" {
  const persian_fa: any;
  export default persian_fa;
}
