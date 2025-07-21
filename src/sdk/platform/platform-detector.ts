
import { Platform } from './platform-factory';

export function detectPlatform(): Platform {
  // Check for browser environment
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    return 'web';
  }

  // Check for Unity environment
  if (typeof Unity !== 'undefined') {
    return 'unity';
  }

  // Check for Unreal Engine environment
  if (typeof UE !== 'undefined') {
    return 'unreal';
  }

  // Check for Godot environment
  if (typeof Godot !== 'undefined') {
    return 'godot';
  }

  // Default to web if nothing else is detected
  return 'web';
}

export function validatePlatform(platform: Platform): boolean {
  switch (platform) {
    case 'web':
      return typeof window !== 'undefined' && typeof document !== 'undefined';
    case 'unity':
      return typeof Unity !== 'undefined';
    case 'unreal':
      return typeof UE !== 'undefined';
    case 'godot':
      return typeof Godot !== 'undefined';
    default:
      return false;
  }
}

export function getPlatformCapabilities(platform: Platform) {
  const capabilities = {
    http: true,
    websocket: true,
    storage: true,
    logging: true,
    realtime: true,
  };

  switch (platform) {
    case 'web':
      return {
        ...capabilities,
        localStorage: true,
        sessionStorage: true,
        indexedDB: true,
      };
    case 'unity':
      return {
        ...capabilities,
        playerPrefs: true,
        nativeWebSocket: true,
        unityWebRequest: true,
      };
    case 'unreal':
      return {
        ...capabilities,
        saveGame: true,
        httpModule: true,
        webSocketsModule: true,
      };
    case 'godot':
      return {
        ...capabilities,
        configFile: true,
        httpRequest: true,
        webSocketClient: true,
      };
    default:
      return capabilities;
  }
}
