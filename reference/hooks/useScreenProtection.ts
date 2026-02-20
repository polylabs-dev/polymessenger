/**
 * useScreenProtection Hook
 * 
 * React hook for screen protection functionality.
 * Provides easy integration with ScreenProtectionService.
 * 
 * @issue #105
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import screenProtectionService, { 
  ScreenProtectionEvent,
  ScreenProtectionCallback,
} from '../services/ScreenProtection';

interface UseScreenProtectionOptions {
  /** Enable protection when component mounts */
  enableOnMount?: boolean;
  /** Enable screenshot detection */
  detectScreenshots?: boolean;
  /** Callback when screenshot is detected */
  onScreenshotDetected?: (event: ScreenProtectionEvent) => void;
  /** Disable protection when app goes to background */
  disableInBackground?: boolean;
}

/**
 * Hook for screen protection
 */
export function useScreenProtection(options: UseScreenProtectionOptions = {}) {
  const {
    enableOnMount = false,
    detectScreenshots = false,
    onScreenshotDetected,
    disableInBackground = false,
  } = options;

  const [isProtected, setIsProtected] = useState(
    screenProtectionService.isProtectionEnabled()
  );
  const [isDetecting, setIsDetecting] = useState(
    screenProtectionService.isDetectionEnabled()
  );
  const wasProtectedRef = useRef(false);

  // Enable protection
  const enableProtection = useCallback(() => {
    screenProtectionService.enableProtection();
    setIsProtected(true);
  }, []);

  // Disable protection
  const disableProtection = useCallback(() => {
    screenProtectionService.disableProtection();
    setIsProtected(false);
  }, []);

  // Start detection
  const startDetection = useCallback(() => {
    screenProtectionService.startScreenshotDetection();
    setIsDetecting(true);
  }, []);

  // Stop detection
  const stopDetection = useCallback(() => {
    screenProtectionService.stopScreenshotDetection();
    setIsDetecting(false);
  }, []);

  // Handle mount/unmount
  useEffect(() => {
    if (enableOnMount) {
      enableProtection();
    }
    if (detectScreenshots) {
      startDetection();
    }

    return () => {
      if (enableOnMount) {
        disableProtection();
      }
      if (detectScreenshots) {
        stopDetection();
      }
    };
  }, [enableOnMount, detectScreenshots]);

  // Handle screenshot detection callback
  useEffect(() => {
    if (!onScreenshotDetected) return;

    const unsubscribe = screenProtectionService.onScreenCaptureAttempt(
      onScreenshotDetected
    );

    return unsubscribe;
  }, [onScreenshotDetected]);

  // Handle app state changes (background/foreground)
  useEffect(() => {
    if (!disableInBackground) return;

    const handleAppStateChange = (state: AppStateStatus) => {
      if (state === 'background' || state === 'inactive') {
        // Remember if we were protected
        wasProtectedRef.current = isProtected;
        if (isProtected) {
          disableProtection();
        }
      } else if (state === 'active') {
        // Restore protection if we were protected before
        if (wasProtectedRef.current) {
          enableProtection();
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, [disableInBackground, isProtected]);

  return {
    isProtected,
    isDetecting,
    enableProtection,
    disableProtection,
    startDetection,
    stopDetection,
  };
}

/**
 * Hook to check screen protection capabilities
 */
export function useScreenProtectionCapabilities() {
  const [canPrevent, setCanPrevent] = useState(false);
  const [canDetect, setCanDetect] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      screenProtectionService.canPreventScreenshots(),
      screenProtectionService.canDetectScreenshots(),
    ]).then(([prevent, detect]) => {
      setCanPrevent(prevent);
      setCanDetect(detect);
      setLoading(false);
    });
  }, []);

  return {
    canPreventScreenshots: canPrevent,
    canDetectScreenshots: canDetect,
    loading,
  };
}

export default {
  useScreenProtection,
  useScreenProtectionCapabilities,
};
