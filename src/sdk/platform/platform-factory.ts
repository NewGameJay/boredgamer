import { NetworkAdapter, StorageAdapter, LoggerAdapter } from './types';
import { WebNetworkAdapter, WebStorageAdapter, WebLoggerAdapter } from './web/web-adapter';
import { UnrealNetworkAdapter, UnrealStorageAdapter, UnrealLoggerAdapter } from './unreal/unreal-adapter';
import { UnityNetworkAdapter, UnityStorageAdapter, UnityLoggerAdapter } from './unity/unity-adapter';
import { GodotNetworkAdapter, GodotStorageAdapter, GodotLoggerAdapter } from './godot/godot-adapter';

export type Platform = 'web' | 'unreal' | 'unity' | 'godot';

export function createNetworkAdapter(platform: Platform): NetworkAdapter {
  switch (platform) {
    case 'web':
      return new WebNetworkAdapter();
    case 'unreal':
      return new UnrealNetworkAdapter();
    case 'unity':
      return new UnityNetworkAdapter();
    case 'godot':
      return new GodotNetworkAdapter();
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
    case 'unity':
      return new UnityStorageAdapter();
    case 'godot':
      return new GodotStorageAdapter();
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
    case 'unity':
      return new UnityLoggerAdapter();
    case 'godot':
      return new GodotLoggerAdapter();
    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }
}
