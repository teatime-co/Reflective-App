import 'node-seal';
import type { SEALLibrary } from 'node-seal/implementation/seal';

declare module 'node-seal' {
  interface EmscriptenModuleOptions {
    locateFile?: (file: string, prefix?: string) => string;
    [key: string]: any;
  }

  const SEAL: (options?: EmscriptenModuleOptions) => Promise<SEALLibrary>;
  export default SEAL;
}
