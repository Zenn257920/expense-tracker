"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { Capacitor } from "@capacitor/core";
import { SpeechRecognition } from "@capacitor-community/speech-recognition";

interface SpeechRecognitionAlternativeLike {
  transcript: string;
}

interface SpeechRecognitionResultLike {
  isFinal: boolean;
  0: SpeechRecognitionAlternativeLike;
}

interface SpeechRecognitionResultsLike {
  length: number;
  [index: number]: SpeechRecognitionResultLike;
}

interface SpeechRecognitionResultEventLike extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultsLike;
}

interface SpeechRecognitionErrorEventLike extends Event {
  error: string;
}

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionResultEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onnomatch: (() => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

interface SpeechRecognitionWindow extends Window {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
}

function subscribeToSpeechSupport() {
  return () => {};
}

function getSpeechSupportSnapshot() {
  return (
    typeof window !== "undefined" &&
    Boolean(getSpeechRecognitionConstructor())
  );
}

function getServerSpeechSupportSnapshot() {
  return null;
}

function getSpeechRecognitionConstructor() {
  const speechWindow = window as SpeechRecognitionWindow;
  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
}

// The native plugin rejects start() with the recognizer's own reason
// ("Insufficient permissions", "Network error", "No speech input",
// ...). Show that reason instead of a generic message, so a failure
// on the phone says what actually went wrong.
function getNativeErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  switch (message) {
    case "Missing permission":
    case "Insufficient permissions":
      return "Microphone access was blocked. Allow microphone access and try again.";
    case "Network error":
    case "Network timeout":
    case "error from server":
      return "Speech recognition couldn't reach its service. Check your connection and try again, or type the transaction below instead.";
    case "No speech input":
    case "No match":
    case "Didn't understand, please try again.":
      return "No speech was recognized. Please try again.";
    case "Audio recording error":
      return "No microphone was found. Connect a microphone and try again.";
    default:
      return message
        ? `Could not start the microphone. (${message})`
        : "Could not start the microphone. Please try again.";
  }
}

function getRecognitionErrorMessage(code: string) {
  switch (code) {
    case "not-allowed":
    case "service-not-allowed":
      return "Microphone access was blocked. Allow microphone access and try again.";
    case "audio-capture":
      return "No microphone was found. Connect a microphone and try again.";
    case "no-speech":
      return "No speech was recognized. Please try again.";
    case "network":
      // This is the error Chrome reports when its speech service can't be
      // reached — most often in an in-app browser / WebView, or on a slow
      // connection — even though the page itself loaded fine. It is not
      // the user's Wi-Fi failing, so say what to do instead.
      return "Speech recognition couldn't reach its service in this browser. Open this site in the Chrome app and try again, or type the transaction below instead.";
    default:
      return "Unable to recognize your speech. Please try again.";
  }
}

export function useSpeechRecognition(
  language = "en-US",
  onTranscript?: (transcript: string) => void,
) {
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const finalTranscriptRef = useRef("");
  // In the Android APK the page runs in a WebView, where the browser
  // Web Speech API does not exist. There, voice goes through the
  // native speech plugin instead (same transcript → same parser).
  const isNative =
    typeof window !== "undefined" && Capacitor.isNativePlatform();
  const [nativeAvailable, setNativeAvailable] = useState<boolean | null>(null);
  const nativeListeningRef = useRef(false);
  const nativeFinalizedRef = useRef(false);
  // True while the system voice popup is the active attempt, so a stale
  // "stopped" event from the failed inline attempt can't finalize early.
  const popupFallbackRef = useRef(false);
  const support = useSyncExternalStore(
    subscribeToSpeechSupport,
    getSpeechSupportSnapshot,
    getServerSpeechSupportSnapshot,
  );
  const isSupported = isNative
    ? nativeAvailable === true
    : support === true;
  const isCheckingSupport = isNative
    ? nativeAvailable === null
    : support === null;
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isNative) return;
    let isActive = true;
    SpeechRecognition.available()
      .then(({ available }) => {
        if (isActive) setNativeAvailable(available);
      })
      .catch(() => {
        if (isActive) setNativeAvailable(false);
      });
    return () => {
      isActive = false;
    };
  }, [isNative]);

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
      recognitionRef.current = null;
      if (isNative) {
        void SpeechRecognition.stop().catch(() => {});
        void SpeechRecognition.removeAllListeners().catch(() => {});
      }
    };
  }, [isNative]);

  const finalizeNative = useCallback(
    (finalText: string) => {
      if (nativeFinalizedRef.current) return;
      nativeFinalizedRef.current = true;
      nativeListeningRef.current = false;
      setTranscript(finalText);
      if (finalText) onTranscript?.(finalText);
      setIsListening(false);
      void SpeechRecognition.removeAllListeners().catch(() => {});
    },
    [onTranscript],
  );

  const startNativeListening = useCallback(async () => {
    setError(null);
    setTranscript("");
    finalTranscriptRef.current = "";
    nativeFinalizedRef.current = false;
    popupFallbackRef.current = false;
    try {
      const permission = await SpeechRecognition.requestPermissions();
      if (permission.speechRecognition !== "granted") {
        setError(
          "Microphone access was blocked. Allow microphone access and try again.",
        );
        return;
      }
      const { available } = await SpeechRecognition.available();
      if (!available) {
        setError(
          "Speech recognition is not available on this device. Type the transaction below instead.",
        );
        return;
      }
      await SpeechRecognition.addListener("partialResults", ({ matches }) => {
        const text = matches?.[0] ?? "";
        finalTranscriptRef.current = text;
        setTranscript(text);
      });
      await SpeechRecognition.addListener("listeningState", ({ status }) => {
        if (status === "stopped" && !popupFallbackRef.current) {
          finalizeNative(finalTranscriptRef.current);
        }
      });
      nativeListeningRef.current = true;
      setIsListening(true);
      try {
        // Inline recognition: live transcript while speaking.
        const { matches } = await SpeechRecognition.start({
          language,
          maxResults: 1,
          partialResults: true,
          popup: false,
        });
        // With partialResults the promise resolves without a result; the
        // final text arrives via the listeners. If the platform does
        // return matches, use them.
        if (matches?.[0]) {
          finalizeNative(matches[0]);
        }
      } catch (inlineError) {
        // Inline recognition failed on this device — fall back once to
        // the system's own voice popup, the most compatible path. Its
        // result comes back as matches on the promise; partial-result
        // listeners don't fire in popup mode, so drop them first.
        popupFallbackRef.current = true;
        await SpeechRecognition.removeAllListeners().catch(() => {});
        const { matches } = await SpeechRecognition.start({
          language,
          maxResults: 1,
          popup: true,
        });
        if (matches?.[0]) {
          finalizeNative(matches[0]);
        } else {
          throw inlineError;
        }
      }
    } catch (error) {
      nativeListeningRef.current = false;
      setIsListening(false);
      void SpeechRecognition.removeAllListeners().catch(() => {});
      setError(getNativeErrorMessage(error));
    }
  }, [language, finalizeNative]);

  const stopNativeListening = useCallback(() => {
    if (!nativeListeningRef.current) return;
    SpeechRecognition.stop().catch(() => {
      // The recognizer may already have stopped; finalize with what we
      // have instead of leaving the mic button stuck on.
      finalizeNative(finalTranscriptRef.current);
    });
  }, [finalizeNative]);

  const startListening = useCallback(() => {
    if (isNative) {
      void startNativeListening();
      return;
    }
    if (recognitionRef.current) return;

    const Recognition = getSpeechRecognitionConstructor();
    if (!Recognition) return;

    setError(null);
    setTranscript("");
    finalTranscriptRef.current = "";

    const recognition = new Recognition();
    recognition.lang = language;
    recognition.continuous = false;
    recognition.interimResults = true;
    recognitionRef.current = recognition;

    recognition.onresult = (event) => {
      const finalParts: string[] = [];
      const interimParts: string[] = [];

      for (let index = 0; index < event.results.length; index++) {
        const result = event.results[index];
        if (result.isFinal) {
          finalParts.push(result[0].transcript);
        } else {
          interimParts.push(result[0].transcript);
        }
      }

      finalTranscriptRef.current = finalParts.join(" ").trim();
      setTranscript(
        [finalTranscriptRef.current, interimParts.join(" ").trim()]
          .filter(Boolean)
          .join(" "),
      );
    };

    recognition.onerror = (event) => {
      setError(getRecognitionErrorMessage(event.error));
      setIsListening(false);
      recognitionRef.current = null;
    };

    recognition.onnomatch = () => {
      setError("Unable to recognize your speech. Please try again.");
    };

    recognition.onend = () => {
      if (recognitionRef.current === recognition) {
        recognitionRef.current = null;
      }
      const finalTranscript = finalTranscriptRef.current;
      setTranscript(finalTranscript);
      if (finalTranscript) onTranscript?.(finalTranscript);
      setIsListening(false);
    };

    try {
      recognition.start();
      setIsListening(true);
    } catch {
      recognitionRef.current = null;
      setIsListening(false);
      setError("Could not start the microphone. Please try again.");
    }
  }, [isNative, startNativeListening, language, onTranscript]);

  const stopListening = useCallback(() => {
    if (isNative) {
      stopNativeListening();
      return;
    }
    try {
      recognitionRef.current?.stop();
    } catch {
      setError("Could not stop voice input. Please try again.");
      recognitionRef.current = null;
      setIsListening(false);
    }
  }, [isNative, stopNativeListening]);

  const resetTranscript = useCallback(() => {
    setTranscript("");
    finalTranscriptRef.current = "";
    setError(null);
  }, []);

  return {
    isSupported,
    isCheckingSupport,
    isListening,
    transcript,
    error,
    startListening,
    stopListening,
    resetTranscript,
  };
}
