"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

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
  const support = useSyncExternalStore(
    subscribeToSpeechSupport,
    getSpeechSupportSnapshot,
    getServerSpeechSupportSnapshot,
  );
  const isSupported = support === true;
  const isCheckingSupport = support === null;
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
      recognitionRef.current = null;
    };
  }, []);

  const startListening = useCallback(() => {
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
  }, [language, onTranscript]);

  const stopListening = useCallback(() => {
    try {
      recognitionRef.current?.stop();
    } catch {
      setError("Could not stop voice input. Please try again.");
      recognitionRef.current = null;
      setIsListening(false);
    }
  }, []);

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
