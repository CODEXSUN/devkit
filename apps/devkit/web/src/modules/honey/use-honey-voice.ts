import { useEffect, useRef, useState } from "react";

type RecognitionEvent = Event & {
  resultIndex: number;
  results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }>;
};

type Recognition = EventTarget & {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  onresult: ((event: RecognitionEvent) => void) | null;
  start(): void;
  stop(): void;
};

type RecognitionConstructor = new () => Recognition;

export function useHoneyVoice(onTranscript: (value: string) => void, onComplete: (value: string) => void) {
  const recognitionRef = useRef<Recognition | null>(null);
  const transcriptRef = useRef("");
  const cancelledRef = useRef(false);
  const failedRef = useRef(false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState("");
  const supported = typeof window !== "undefined" && Boolean(getRecognition());

  useEffect(() => () => {
    cancelledRef.current = true;
    recognitionRef.current?.stop();
  }, []);

  function toggle() {
    if (listening) return stop();
    const RecognitionApi = getRecognition();
    if (!RecognitionApi) return setError("Voice typing is not supported in this browser.");
    const recognition = new RecognitionApi();
    transcriptRef.current = "";
    cancelledRef.current = false;
    failedRef.current = false;
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = navigator.language || "en-US";
    recognition.onresult = (event) => {
      const transcript = readTranscript(event);
      transcriptRef.current = transcript;
      onTranscript(transcript);
    };
    recognition.onerror = () => {
      failedRef.current = true;
      setError("Honey could not hear you. Try again.");
      setListening(false);
    };
    recognition.onend = () => {
      recognitionRef.current = null;
      setListening(false);
      const transcript = transcriptRef.current.trim();
      if (!cancelledRef.current && !failedRef.current && transcript) onComplete(transcript);
    };
    recognitionRef.current = recognition;
    setError("");
    setListening(true);
    recognition.start();
  }

  function stop() {
    recognitionRef.current?.stop();
  }

  return { error, listening, supported, toggle };
}

function getRecognition(): RecognitionConstructor | undefined {
  const voiceWindow = window as typeof window & {
    SpeechRecognition?: RecognitionConstructor;
    webkitSpeechRecognition?: RecognitionConstructor;
  };
  return voiceWindow.SpeechRecognition ?? voiceWindow.webkitSpeechRecognition;
}

function readTranscript(event: RecognitionEvent) {
  const phrases: string[] = [];
  for (let index = 0; index < event.results.length; index += 1) {
    const phrase = event.results[index]?.[0]?.transcript.trim();
    if (phrase) phrases.push(phrase);
  }
  return phrases.join(" ");
}
