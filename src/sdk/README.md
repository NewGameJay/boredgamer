# BoredGamer SDK

A lightweight, cross-platform SDK for integrating BoredGamer features into your game.

## Supported Platforms

- Web (Next.js, React, Vue, vanilla JavaScript)
- Unity
- Unreal Engine
- Godot

## Quick Start

```typescript
import { initializeSDK, BoredGamerSDK } from '@boredgamer/sdk';

// Initialize the SDK with your platform
const sdk = initializeSDK({
  apiKey: 'your-api-key',
  gameId: 'your-game-id',
  environment: 'development',
  platform: 'web' // or 'unity', 'unreal', 'godot'
});

// Initialize connections
await sdk.init();

// Start a game session
const session = await sdk.startSession('player123');

// Listen for real-time events
const unsubscribe = sdk.onEvent('scoreUpdate', (data) => {
  console.log('New score:', data);
});

// Clean up when done
sdk.dispose();
```

## Platform Integration Guides

### Web Integration
Perfect for web-based games or companion apps. Uses modern web APIs and works seamlessly with Next.js and other frameworks.

```typescript
// Web-specific example
import { initializeSDK } from '@boredgamer/sdk';

const sdk = initializeSDK({
  platform: 'web',
  apiKey: 'your-api-key',
  gameId: 'your-game-id'
});

// Web storage is automatically handled through localStorage
await sdk.storage.set('playerPrefs', JSON.stringify({ sound: true }));
```

### Unity Integration
Integrates with Unity's networking stack and PlayerPrefs system.

```csharp
// Unity C# example
using BoredGamer.SDK;

public class GameManager : MonoBehaviour
{
    private BoredGamerSDK sdk;

    void Start()
    {
        sdk = BoredGamerSDK.Initialize(new SDKConfig
        {
            Platform = "unity",
            ApiKey = "your-api-key",
            GameId = "your-game-id"
        });
        
        // Unity-specific storage using PlayerPrefs
        await sdk.Storage.Set("highScore", "1000");
    }
}
```

### Unreal Engine Integration
Uses Unreal's HTTP module and Blueprint-compatible WebSocket implementation.

```cpp
// Unreal C++ example
#include "BoredGamerSDK.h"

void AGameMode::BeginPlay()
{
    Super::BeginPlay();
    
    FSDKConfig Config;
    Config.Platform = "unreal";
    Config.ApiKey = "your-api-key";
    Config.GameId = "your-game-id";
    
    SDK = UBoredGamerSDK::Initialize(Config);
    
    // Unreal-specific storage using SaveGame system
    SDK->Storage->Set("playerProgress", "Level5");
}
```

### Godot Integration
Integrates with Godot's HTTPRequest node and ConfigFile storage system.

```gdscript
# Godot GDScript example
extends Node

var sdk

func _ready():
    sdk = BoredGamerSDK.initialize({
        "platform": "godot",
        "apiKey": "your-api-key",
        "gameId": "your-game-id"
    })
    
    # Godot-specific storage using ConfigFile
    await sdk.storage.set("settings", "difficulty:hard")
```

## Core Features

- **HTTP Client**: Type-safe API requests with automatic error handling
- **WebSocket Client**: Real-time updates with automatic reconnection
- **Session Management**: Track player game sessions
- **Storage**: Platform-specific persistent storage
- **Logging**: Native logging integration for each platform
- **Type Definitions**: Full TypeScript support

## Best Practices

1. **Platform Selection**: Choose the correct platform when initializing
2. **Initialization**: Always call `init()` before using other SDK features
3. **Error Handling**: All API calls return `ApiResponse<T>` with success/error info
4. **Cleanup**: Call `dispose()` when your game/level ends
5. **Event Handling**: Store unsubscribe functions to clean up listeners
6. **Storage**: Use platform-specific storage for best performance
7. **Logging**: Utilize platform-native logging for better debugging

## Development

To run tests or contribute:
1. Clone the repository
2. Install dependencies: `npm install`
3. Run test suite: `npm test`
4. Run platform-specific tests: `npm run test:web`, `npm run test:unity`, etc.

## Next Steps

The SDK is ready for feature-specific extensions:
- Leaderboards
- Quests/Challenges
- Referral Systems
- Player Analytics

## Support

For platform-specific issues or questions:
- Web: Check browser console and network tab
- Unity: Check Unity console and debug logs
- Unreal: Check output log and verbose logging
- Godot: Check output panel and debug strings
