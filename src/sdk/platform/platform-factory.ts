import { NetworkAdapter, StorageAdapter, LoggerAdapter } from './types';
import { WebNetworkAdapter, WebStorageAdapter, WebLoggerAdapter } from './web/web-adapter';
import { UnrealNetworkAdapter, UnrealStorageAdapter, UnrealLoggerAdapter } from './unreal/unreal-adapter';

export type Platform = 'web' | 'unreal';

export function createNetworkAdapter(platform: Platform): NetworkAdapter {
  switch (platform) {
    case 'web':
      return new WebNetworkAdapter();
    case 'unreal':
      return new UnrealNetworkAdapter();
    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }
}

export function createStorageAdapter(platform: Platform): StorageAdapter {
  switch (platform) {
    case 'web':
      return new WebStorageAdapter();
    case 'unreal':
      return new UnrealStorageAdapter();
    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }
}

export function createLoggerAdapter(platform: Platform): LoggerAdapter {
  switch (platform) {
    case 'web':
      return new WebLoggerAdapter();
    case 'unreal':
      return new UnrealLoggerAdapter();
    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }
}
