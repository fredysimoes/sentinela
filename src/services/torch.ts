import { NativeModules, Platform } from 'react-native';

const { TorchModule } = NativeModules;

export async function setKeepScreenOn(enabled: boolean): Promise<boolean> {
  if (Platform.OS === 'android' && TorchModule?.setKeepScreenOn) {
    try {
      return await TorchModule.setKeepScreenOn(enabled);
    } catch {
      return false;
    }
  }
  return false;
}

export async function setTorch(enabled: boolean): Promise<boolean> {
  if (Platform.OS === 'android' && TorchModule?.setTorch) {
    try {
      return await TorchModule.setTorch(enabled);
    } catch (err) {
      console.warn('Error setting torch:', err);
      return false;
    }
  }
  return false;
}

export async function toggleTorch(): Promise<boolean> {
  if (Platform.OS === 'android' && TorchModule?.toggleTorch) {
    try {
      return await TorchModule.toggleTorch();
    } catch (err) {
      console.warn('Error toggling torch:', err);
      return false;
    }
  }
  return false;
}

export async function getTorchStatus(): Promise<boolean> {
  if (Platform.OS === 'android' && TorchModule?.getTorchStatus) {
    try {
      return await TorchModule.getTorchStatus();
    } catch (err) {
      return false;
    }
  }
  return false;
}

let heartbeatTimeout: ReturnType<typeof setTimeout> | null = null;
let isHeartbeatRunning = false;

/**
 * Starts a hardware flashlight heartbeat pulse:
 * Alternating double pulse ("lub-dub"):
 * Pulse 1 ON (75ms) -> OFF (85ms) -> Pulse 2 ON (75ms) -> Rest (520ms) -> Repeat
 * Runs for durationMs (defaults to 7000ms ~ 7s) or until stopped.
 */
export function startHeartbeatStrobe(
  durationMs: number = 7000,
  onPulseChange?: (isOn: boolean, pulseNumber: 1 | 2) => void,
  onFinished?: () => void
): () => void {
  stopHeartbeatStrobe();
  isHeartbeatRunning = true;
  const startTime = Date.now();

  const cycle = async () => {
    if (!isHeartbeatRunning) return;

    if (Date.now() - startTime >= durationMs) {
      stopHeartbeatStrobe();
      onFinished?.();
      return;
    }

    try {
      // Pulse 1 (lub)
      await setTorch(true);
      onPulseChange?.(true, 1);

      heartbeatTimeout = setTimeout(async () => {
        if (!isHeartbeatRunning) return;
        await setTorch(false);
        onPulseChange?.(false, 1);

        // Gap between lub and dub
        heartbeatTimeout = setTimeout(async () => {
          if (!isHeartbeatRunning) return;

          // Pulse 2 (dub)
          await setTorch(true);
          onPulseChange?.(true, 2);

          heartbeatTimeout = setTimeout(async () => {
            if (!isHeartbeatRunning) return;
            await setTorch(false);
            onPulseChange?.(false, 2);

            // Rest before next heartbeat
            heartbeatTimeout = setTimeout(() => {
              if (isHeartbeatRunning) {
                cycle();
              }
            }, 520);
          }, 75);
        }, 85);
      }, 75);
    } catch (e) {
      console.warn('Error running heartbeat strobe cycle:', e);
      stopHeartbeatStrobe();
      onFinished?.();
    }
  };

  cycle();

  return () => {
    stopHeartbeatStrobe();
    onFinished?.();
  };
}

export function stopHeartbeatStrobe(): void {
  isHeartbeatRunning = false;
  if (heartbeatTimeout) {
    clearTimeout(heartbeatTimeout);
    heartbeatTimeout = null;
  }
  setTorch(false).catch(() => {});
}

export function isHeartbeatStrobeActive(): boolean {
  return isHeartbeatRunning;
}
