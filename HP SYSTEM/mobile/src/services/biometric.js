// services/biometric.js — Expo LocalAuthentication for Face ID / Fingerprint.
// Used to unlock a persisted Firebase session; no server round-trip needed.
import * as LocalAuthentication from 'expo-local-authentication';

export const isBiometricAvailable = async () => {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  const isEnrolled  = await LocalAuthentication.isEnrolledAsync();
  const types       = await LocalAuthentication.supportedAuthenticationTypesAsync();
  return { available: hasHardware && isEnrolled, types };
};

export const authenticateWithBiometric = async () => {
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: 'Xác thực để mở HP System',
    cancelLabel: 'Huỷ',
    disableDeviceFallback: false,
    requireConfirmation: false,
  });
  return result.success;
};

export default { isBiometricAvailable, authenticateWithBiometric };
