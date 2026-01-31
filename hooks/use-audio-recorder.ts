/**
 * Audio Recorder Hook
 * 
 * Handles browser audio recording with MediaRecorder API.
 * Collects audio chunks in memory for reliable upload.
 */

import { useState, useRef, useCallback, useEffect } from 'react';

export type RecorderState = 'idle' | 'requesting' | 'recording' | 'paused' | 'stopped' | 'error';

export type RecorderError = 
  | 'permission_denied'
  | 'not_supported'
  | 'no_audio_device'
  | 'recorder_error'
  | 'unknown';

type UseAudioRecorderOptions = {
  onError?: (error: RecorderError, message: string) => void;
  onDataAvailable?: (chunks: Blob[]) => void;
};

type UseAudioRecorderReturn = {
  state: RecorderState;
  error: RecorderError | null;
  errorMessage: string | null;
  audioBlob: Blob | null;
  startRecording: () => Promise<boolean>;
  pauseRecording: () => void;
  resumeRecording: () => void;
  stopRecording: () => Promise<Blob | null>;
  resetRecorder: () => void;
  isSupported: boolean;
};

export function useAudioRecorder({
  onError,
  onDataAvailable
}: UseAudioRecorderOptions = {}): UseAudioRecorderReturn {
  const [state, setState] = useState<RecorderState>('idle');
  const [error, setError] = useState<RecorderError | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const onDataAvailableRef = useRef(onDataAvailable);
  onDataAvailableRef.current = onDataAvailable;

  // Check browser support
  const isSupported = typeof window !== 'undefined' && 
    'mediaDevices' in navigator && 
    'getUserMedia' in navigator.mediaDevices &&
    'MediaRecorder' in window;

  // Get preferred MIME type
  const getMimeType = useCallback((): string => {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/ogg',
      'audio/mp4'
    ];

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }

    return 'audio/webm';
  }, []);

  // Handle errors
  const handleError = useCallback((errorType: RecorderError, message: string) => {
    setError(errorType);
    setErrorMessage(message);
    setState('error');
    onError?.(errorType, message);
  }, [onError]);

  // Cleanup resources
  const cleanup = useCallback(() => {
    if (mediaRecorderRef.current) {
      if (mediaRecorderRef.current.state !== 'inactive') {
        try {
          mediaRecorderRef.current.stop();
        } catch {
          // Ignore errors during cleanup
        }
      }
      mediaRecorderRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);

  // Start recording
  const startRecording = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      handleError('not_supported', 'Audio recording is not supported in this browser.');
      return false;
    }

    setState('requesting');
    chunksRef.current = [];
    setAudioBlob(null);
    setError(null);
    setErrorMessage(null);

    try {
      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });

      streamRef.current = stream;

      // Create MediaRecorder
      const mimeType = getMimeType();
      const mediaRecorder = new MediaRecorder(stream, { 
        mimeType,
        audioBitsPerSecond: 128000
      });

      mediaRecorderRef.current = mediaRecorder;

      // Handle data available
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
          onDataAvailableRef.current?.(chunksRef.current);
        }
      };

      // Handle recorder errors
      mediaRecorder.onerror = () => {
        handleError('recorder_error', 'Recording error occurred. Please try again.');
      };

      // Handle recorder stop
      mediaRecorder.onstop = () => {
        // Finalize blob when stopped
        if (chunksRef.current.length > 0) {
          const blob = new Blob(chunksRef.current, { type: mimeType });
          setAudioBlob(blob);
        }
      };

      // Start recording with 1 second timeslices for chunk collection
      mediaRecorder.start(1000);
      setState('recording');

      return true;
    } catch (err) {
      console.error('Error starting recording:', err);
      cleanup();

      if (err instanceof DOMException) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          handleError('permission_denied', 'Microphone permission was denied. Please allow access and try again.');
        } else if (err.name === 'NotFoundError') {
          handleError('no_audio_device', 'No microphone found. Please connect a microphone and try again.');
        } else {
          handleError('unknown', `Recording error: ${err.message}`);
        }
      } else {
        handleError('unknown', 'Failed to start recording. Please try again.');
      }

      return false;
    }
  }, [isSupported, getMimeType, handleError, cleanup]);

  // Pause recording
  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
      setState('paused');
    }
  }, []);

  // Resume recording
  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
      setState('recording');
    }
  }, []);

  // Stop recording
  const stopRecording = useCallback(async (): Promise<Blob | null> => {
    return new Promise((resolve) => {
      if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') {
        setState('stopped');
        resolve(audioBlob);
        return;
      }

      const mimeType = mediaRecorderRef.current.mimeType;

      mediaRecorderRef.current.onstop = () => {
        setState('stopped');
        
        if (chunksRef.current.length > 0) {
          const blob = new Blob(chunksRef.current, { type: mimeType });
          setAudioBlob(blob);
          cleanup();
          resolve(blob);
        } else {
          cleanup();
          resolve(null);
        }
      };

      mediaRecorderRef.current.stop();
    });
  }, [audioBlob, cleanup]);

  // Reset recorder
  const resetRecorder = useCallback(() => {
    cleanup();
    chunksRef.current = [];
    setAudioBlob(null);
    setError(null);
    setErrorMessage(null);
    setState('idle');
  }, [cleanup]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  // Handle visibility change (browser sleep)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && state === 'recording') {
        // Browser is going to sleep/hidden while recording
        console.warn('[AudioRecorder] Browser going to background while recording');
        // Note: We continue recording - browser may pause the tab
        // The MediaRecorder will continue collecting data when visible again
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [state]);

  // Handle page unload
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (state === 'recording' || state === 'paused') {
        e.preventDefault();
        e.returnValue = 'Recording in progress. Are you sure you want to leave?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [state]);

  return {
    state,
    error,
    errorMessage,
    audioBlob,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    resetRecorder,
    isSupported
  };
}
