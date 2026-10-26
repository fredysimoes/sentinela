import { NativeModules, Platform } from 'react-native';

const { TorchModule } = NativeModules;

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
