// Fix for error: Cannot find type definition file for 'vite/client'.
// Manually declare process.env to satisfy TypeScript usage for API_KEY in the app.
declare const process: {
  env: {
    API_KEY: string;
    [key: string]: string | undefined;
  }
};
