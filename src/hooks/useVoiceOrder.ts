// Second File (updated to match First File logic)

import { useState, useRef, useCallback } from "react";
import { Product, VoiceParseResult } from "@/types";
import { supabase } from "@/integrations/supabase/client";

export type VoiceState = "idle" | "listening" | "processing" | "success" | "error" | "fallback";

interface UseVoiceOrderProps {
  products: Product[];
}

export interface UseVoiceOrderReturn {
  voiceState:          VoiceState;
  rawTranscript:       string;
  parseResult:         VoiceParseResult | null;
  errorMessage:        string;
  micVolume:           number;
  startListening:      () => Promise<void>;
  stopListening:       () => void;
  reprocessTranscript: (editedTranscript: string) => Promise<void>;
  reset:               () => void;
}

export const useVoiceOrder = ({ products }: UseVoiceOrderProps): UseVoiceOrderReturn => {
  const [voiceState, setVoiceState]       = useState<VoiceState>("idle");
  const [rawTranscript, setRawTranscript] = useState("");
  const [parseResult, setParseResult]     = useState<VoiceParseResult | null>(null);
  const [errorMessage, setErrorMessage]   = useState("");
  const [micVolume, setMicVolume]         = useState(0);

  const recognitionRef      = useRef<any>(null);
  const micStreamRef        = useRef<MediaStream | null>(null);
  const finalTranscriptRef  = useRef("");
  const silenceTimerRef     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const maxTimerRef         = useRef<ReturnType<typeof setTimeout> | null>(null);

  const MAX_RECORDING_TIME = 30_000;
  const SILENCE_TIMEOUT_MS = 4000;

  const clearTimers = useCallback(() => {
    if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null; }
    if (maxTimerRef.current)     { clearTimeout(maxTimerRef.current);     maxTimerRef.current = null; }
  }, []);

  const cleanup = useCallback(() => {
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((t) => t.stop());
      micStreamRef.current = null;
    }
    clearTimers();
    recognitionRef.current = null;
    setMicVolume(0);
  }, [clearTimers]);

  // ── Transliteration (from First File) ────────────────────────────────────
  const transliterateToEnglish = useCallback((text: string): string => {
    let result = text;

    // Devanagari digit → Arabic digit
    const devanagariDigits: Record<string, string> = {
      "०": "0", "१": "1", "२": "2", "३": "3", "४": "4",
      "५": "5", "६": "6", "७": "7", "८": "8", "९": "9",
    };
    result = result.replace(/[०-९]/g, (ch) => devanagariDigits[ch] || ch);

    // Hindi words → English equivalents (product/brand names + numbers)
    const hindiToEnglish: [RegExp, string][] = [
      // Brand names in Devanagari
      [/सैमसंग/g, "Samsung"], [/रेडमी/g, "Redmi"], [/रियलमी/g, "Realme"],
      [/वीवो/g, "Vivo"], [/ओप्पो/g, "Oppo"], [/नोकिया/g, "Nokia"],
      [/आईफोन/g, "iPhone"], [/एप्पल/g, "Apple"], [/वनप्लस/g, "OnePlus"],
      [/शाओमी/g, "Xiaomi"], [/मोटोरोला/g, "Motorola"], [/गैलेक्सी/g, "Galaxy"],
      [/नोट/g, "Note"], [/प्रो/g, "Pro"], [/मैक्स/g, "Max"], [/लाइट/g, "Lite"],
      [/अल्ट्रा/g, "Ultra"], [/प्लस/g, "Plus"], [/मिनी/g, "Mini"],
      // Number words
      [/\bएक\b/g, "one"], [/\bदो\b/g, "two"], [/\bतीन\b/g, "three"],
      [/\bचार\b/g, "four"], [/\bपांच\b/g, "five"], [/\bपाँच\b/g, "five"],
      [/\bछह\b/g, "six"], [/\bछ:\b/g, "six"], [/\bसात\b/g, "seven"],
      [/\bआठ\b/g, "eight"], [/\bनौ\b/g, "nine"], [/\bदस\b/g, "ten"],
      // Common words
      [/पीस/g, "piece"], [/यूनिट/g, "unit"], [/और/g, "and"],
      [/दे\s*दो/g, "give"], [/चाहिए/g, "need"], [/लगा\s*दो/g, "add"],
      [/जीबी/g, "GB"], [/टीबी/g, "TB"], [/एमबी/g, "MB"],
    ];

    for (const [pattern, replacement] of hindiToEnglish) {
      result = result.replace(pattern, replacement);
    }

    // Romanized Hindi number words → English
    result = result
      .replace(/\b(ek)\b/gi, "one").replace(/\b(do)\b/gi, "two")
      .replace(/\b(teen)\b/gi, "three").replace(/\b(char|chaar)\b/gi, "four")
      .replace(/\b(panch|paanch)\b/gi, "five").replace(/\b(chhe|chah)\b/gi, "six")
      .replace(/\b(saat)\b/gi, "seven").replace(/\b(aath)\b/gi, "eight")
      .replace(/\b(nau)\b/gi, "nine").replace(/\b(das)\b/gi, "ten");

    return result.trim();
  }, []);

  // ── AI parsing via Supabase edge function (from First File) ───────────────
  const parseWithAI = useCallback(async (transcript: string): Promise<VoiceParseResult> => {
    try {
      const productData = products.map((p) => ({
        id: p.id,
        name: p.name,
        brand: p.brand,
        model: p.model,
        price: p.price,
        stock: p.stock,
      }));

      const { data, error } = await supabase.functions.invoke("parse-voice-order", {
        body: { transcript, products: productData },
      });

      if (error) {
        console.error("Edge function error:", error);
        return {
          success: false,
          error: "network_error",
          message: "Network issue while processing voice. Please try again.",
          parsed: [],
          rawTranscript: transcript,
        };
      }

      return data as VoiceParseResult;
    } catch (err) {
      console.error("AI parse error:", err);
      return {
        success: false,
        error: "parse_failed",
        message: "Could not process voice input. Please try again.",
        parsed: [],
        rawTranscript: transcript,
      };
    }
  }, [products]);

  // ── Core processing once recognition ends ─────────────────────────────────
  const processTranscript = useCallback(async (transcript: string) => {
    const cleaned = transliterateToEnglish(transcript.trim());

    const meaningfulWords = cleaned.split(/\s+/).filter((w) => w.length > 1);
    if (!cleaned || meaningfulWords.length < 2) {
      setErrorMessage("Could not hear clearly. Please speak louder and closer to the mic, and try again.");
      setVoiceState("error");
      return;
    }

    setRawTranscript(cleaned);
    setVoiceState("processing");

    console.log("🎤 Raw transcript:", cleaned);
    const result = await parseWithAI(cleaned);
    console.log("🧠 Parse result:", result);

    setParseResult(result);

    if (result.success && result.parsed.length > 0) {
      const highConfidence = result.parsed.filter((p) => p.confidence >= 0.7);
      const lowConfidence  = result.parsed.filter((p) => p.confidence < 0.7);
      const hasUnmatched   = (result.unmatchedSegments?.length ?? 0) > 0;

      if (lowConfidence.length > 0 || hasUnmatched) {
        setVoiceState("fallback");
      } else if (highConfidence.length > 0) {
        setVoiceState("success");
      } else {
        setVoiceState("fallback");
      }
    } else {
      setVoiceState("fallback");
    }
  }, [transliterateToEnglish, parseWithAI]);

  // ── startListening ────────────────────────────────────────────────────────
  const startListening = useCallback(async (): Promise<void> => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setErrorMessage("Speech recognition is not supported in this browser. Please use Chrome or Edge.");
      setVoiceState("error");
      return;
    }

    try {
      setVoiceState("listening");
      setMicVolume(0.5);
      setErrorMessage("");
      setParseResult(null);
      setRawTranscript("");
      finalTranscriptRef.current = "";

      // Request mic with noise suppression for retail environments
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            sampleRate: { ideal: 16000 },
            channelCount: 1,
          },
        });
        micStreamRef.current = stream;
      } catch (micErr) {
        console.warn("Could not get enhanced mic stream, falling back to default:", micErr);
      }

      const recognition = new SpeechRecognition();
      recognition.continuous      = true;
      recognition.interimResults  = true;
      recognition.lang            = "hi-IN"; // Hindi primary for Indian retail
      recognition.maxAlternatives = 3;
      recognitionRef.current = recognition;

      const resetSilenceTimer = () => {
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = setTimeout(() => {
          try { recognition.stop(); } catch {}
        }, SILENCE_TIMEOUT_MS);
      };

      recognition.onresult = (event: any) => {
        resetSilenceTimer();
        let interim = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalTranscriptRef.current += event.results[i][0].transcript + " ";
          } else {
            interim += event.results[i][0].transcript;
          }
        }
        setRawTranscript(transliterateToEnglish(finalTranscriptRef.current + interim));
      };

      recognition.onerror = (event: any) => {
        clearTimers();
        cleanup();

        const errorMessages: Record<string, string> = {
          "no-speech":     "Could not hear anything. Please speak louder and try again.",
          "audio-capture": "Microphone access failed. Please check your microphone.",
          "not-allowed":   "Microphone permission denied. Please allow microphone access.",
          "network":       "Network issue during speech recognition. Please check your connection.",
          "aborted":       "Speech recognition was cancelled.",
        };

        setErrorMessage(errorMessages[event.error] || `Speech recognition error: ${event.error}`);
        setVoiceState("error");
      };

      recognition.onend = async () => {
        clearTimers();
        cleanup();
        await processTranscript(finalTranscriptRef.current);
      };

      recognition.start();
      resetSilenceTimer();

      // Hard stop after MAX_RECORDING_TIME
      maxTimerRef.current = setTimeout(() => {
        try { recognition.stop(); } catch {}
      }, MAX_RECORDING_TIME);

    } catch {
      setErrorMessage("Microphone access failed. Please check permissions.");
      setVoiceState("error");
      cleanup();
    }
  }, [cleanup, clearTimers, processTranscript, transliterateToEnglish]);

  // ── stopListening ─────────────────────────────────────────────────────────
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((t) => t.stop());
      micStreamRef.current = null;
    }
    cleanup();
  }, [cleanup]);

  // ── reprocessTranscript ───────────────────────────────────────────────────
  const reprocessTranscript = useCallback(async (editedTranscript: string): Promise<void> => {
    setRawTranscript(editedTranscript);
    setVoiceState("processing");
    const result = await parseWithAI(editedTranscript);
    setParseResult(result);

    if (result.success && result.parsed.length > 0) {
      const highConfidence = result.parsed.filter((p) => p.confidence >= 0.7);
      if (
        highConfidence.length === result.parsed.length &&
        (!result.unmatchedSegments || result.unmatchedSegments.length === 0)
      ) {
        setVoiceState("success");
      } else {
        setVoiceState("fallback");
      }
    } else {
      setVoiceState("fallback");
    }
  }, [parseWithAI]);

  // ── reset ─────────────────────────────────────────────────────────────────
  const reset = useCallback(() => {
    setVoiceState("idle");
    setRawTranscript("");
    setParseResult(null);
    setErrorMessage("");
    setMicVolume(0);
    finalTranscriptRef.current = "";
    cleanup();
  }, [cleanup]);

  return {
    voiceState,
    rawTranscript,
    parseResult,
    errorMessage,
    micVolume,
    startListening,
    stopListening,
    reprocessTranscript,
    reset,
  };
};