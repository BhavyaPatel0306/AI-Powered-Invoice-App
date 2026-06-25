"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type DictType =
  | "packages"
  | "text"
  | "email"
  | "phone"
  | "eventType"
  | "date"
  | "dueInDays"
  | "depositPercent";

export type DictStep = {
  key: string;
  type: DictType;
  label: string;
  hint?: string;
  optional?: boolean;
};

const BAR_COUNT = 28;

function pickMime(): string {
  if (typeof MediaRecorder === "undefined") return "";
  if (MediaRecorder.isTypeSupported("audio/webm")) return "audio/webm";
  if (MediaRecorder.isTypeSupported("audio/mp4")) return "audio/mp4";
  return "";
}

export function DictationDialog({
  title,
  steps,
  packages,
  eventTypes,
  onClose,
  onComplete,
}: {
  title: string;
  steps: DictStep[];
  packages: { id: string; name: string }[];
  eventTypes: string[];
  onClose: () => void;
  onComplete: (values: Record<string, unknown>) => void;
}) {
  const [status, setStatus] = useState<
    "init" | "denied" | "recording" | "transcribing" | "parsing" | "error"
  >("init");
  const [stepIndex, setStepIndex] = useState(0);
  const [error, setError] = useState("");
  const [transcripts, setTranscripts] = useState<Record<string, string>>({});

  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const skipRef = useRef(false);
  const barsRef = useRef<(HTMLSpanElement | null)[]>([]);
  const stepIndexRef = useRef(0);

  const step = steps[stepIndex];

  const cleanup = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    try {
      recorderRef.current?.state !== "inactive" && recorderRef.current?.stop();
    } catch {}
    streamRef.current?.getTracks().forEach((t) => t.stop());
    audioCtxRef.current?.close().catch(() => {});
  }, []);

  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  const startRecording = useCallback(() => {
    const stream = streamRef.current;
    if (!stream) return;
    const mime = pickMime();
    const mr = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
    chunksRef.current = [];
    skipRef.current = false;
    mr.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorderRef.current = mr;
    mr.start();
    setStatus("recording");
  }, []);

  const visualize = useCallback(() => {
    const analyser = analyserRef.current;
    if (!analyser) return;
    const data = new Uint8Array(analyser.frequencyBinCount);
    const loop = () => {
      analyser.getByteFrequencyData(data);
      const bars = barsRef.current;
      for (let i = 0; i < bars.length; i++) {
        const el = bars[i];
        if (!el) continue;
        const idx = Math.floor((i / bars.length) * (data.length * 0.6));
        const v = data[idx] / 255;
        el.style.height = `${6 + v * 40}px`;
        el.style.opacity = `${0.45 + v * 0.55}`;
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    loop();
  }, []);

  // Initialize mic + visualizer, then begin step 0.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const ctx = new Ctx();
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 128;
        analyser.smoothingTimeConstant = 0.75;
        ctx.createMediaStreamSource(stream).connect(analyser);
        audioCtxRef.current = ctx;
        analyserRef.current = analyser;
        visualize();
        startRecording();
      } catch {
        setStatus("denied");
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function stopRecorder(): Promise<Blob | null> {
    return new Promise((resolve) => {
      const mr = recorderRef.current;
      if (!mr || mr.state === "inactive") return resolve(null);
      mr.onstop = () => resolve(new Blob(chunksRef.current, { type: pickMime() || "audio/webm" }));
      mr.stop();
    });
  }

  async function transcribe(blob: Blob): Promise<string> {
    const fd = new FormData();
    fd.append("audio", blob, "speech.webm");
    const res = await fetch("/api/transcribe", { method: "POST", body: fd });
    const d = await res.json().catch(() => ({}));
    if (d.configured === false) {
      throw new Error("Add an OPENAI_API_KEY to use voice dictation.");
    }
    if (!res.ok || d.error) throw new Error(d.error || "Couldn't transcribe that.");
    return (d.text || "").trim();
  }

  async function advanceTo(next: number) {
    if (next >= steps.length) {
      await finish();
      return;
    }
    stepIndexRef.current = next;
    setStepIndex(next);
    startRecording();
  }

  async function handleNext() {
    if (status !== "recording") return;
    setStatus("transcribing");
    try {
      const blob = await stopRecorder();
      let text = "";
      if (blob && blob.size > 0) text = await transcribe(blob);
      const key = steps[stepIndexRef.current].key;
      setTranscripts((prev) => ({ ...prev, [key]: text }));
      await advanceTo(stepIndexRef.current + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setStatus("error");
    }
  }

  async function handleSkip() {
    skipRef.current = true;
    try {
      await stopRecorder();
    } catch {}
    const key = steps[stepIndexRef.current].key;
    setTranscripts((prev) => ({ ...prev, [key]: "" }));
    await advanceTo(stepIndexRef.current + 1);
  }

  async function finish() {
    setStatus("parsing");
    try {
      const res = await fetch("/api/intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fields: steps.map((s) => ({ key: s.key, type: s.type, label: s.label, optional: s.optional })),
          transcripts,
          packages: packages.map((p) => p.name),
          eventTypes,
          today: new Date().toISOString().slice(0, 10),
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (d.configured === false) throw new Error("Add an OPENAI_API_KEY to use voice dictation.");
      if (!res.ok || d.error) throw new Error(d.error || "Couldn't read that back.");
      cleanup();
      onComplete(d.values || {});
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setStatus("error");
    }
  }

  const lastStep = stepIndex >= steps.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-ink/50 backdrop-blur-sm" onClick={() => { cleanup(); onClose(); }} />
      <div className="relative card w-full sm:max-w-md m-0 sm:m-5 rounded-t-3xl sm:rounded-3xl p-6 animate-pop">
        <div className="flex items-center justify-between mb-1">
          <p className="label !mb-0">{title}</p>
          <button onClick={() => { cleanup(); onClose(); }} className="text-muted hover:text-ink w-7 h-7 grid place-items-center" aria-label="Close">
            ✕
          </button>
        </div>

        {status === "denied" ? (
          <div className="py-8 text-center">
            <p className="font-display text-xl">Microphone blocked</p>
            <p className="text-muted text-sm mt-2">
              Allow microphone access in your browser, then try again.
            </p>
            <button onClick={() => { cleanup(); onClose(); }} className="btn btn-ghost mt-5">
              Close
            </button>
          </div>
        ) : status === "parsing" ? (
          <div className="py-10 text-center">
            <span className="inline-block w-9 h-9 rounded-full border-2 border-line border-t-clay animate-spin" />
            <p className="text-muted mt-4">Filling in your form…</p>
          </div>
        ) : status === "error" ? (
          <div className="py-8 text-center">
            <p className="font-display text-xl">Hmm, that didn&apos;t work</p>
            <p className="text-muted text-sm mt-2">{error}</p>
            <button onClick={() => { cleanup(); onClose(); }} className="btn btn-ghost mt-5">
              Close
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-1 mt-3 mb-5">
              {steps.map((s, i) => (
                <span
                  key={s.key}
                  className={`h-1 flex-1 rounded-full transition-colors ${
                    i < stepIndex ? "bg-sage" : i === stepIndex ? "bg-clay" : "bg-line"
                  }`}
                />
              ))}
            </div>

            <p className="text-muted text-xs uppercase tracking-[0.14em] font-semibold">
              Step {stepIndex + 1} of {steps.length}
            </p>
            <h2 className="font-display text-2xl mt-1">{step.label}</h2>
            {step.hint && <p className="text-muted text-sm mt-1">{step.hint}</p>}

            {/* Visualizer */}
            <div className="flex items-center justify-center gap-[3px] h-16 my-6">
              {Array.from({ length: BAR_COUNT }).map((_, i) => (
                <span
                  key={i}
                  ref={(el) => {
                    barsRef.current[i] = el;
                  }}
                  className="w-[5px] rounded-full bg-clay"
                  style={{ height: 6, transition: "height 0.06s linear" }}
                />
              ))}
            </div>

            <div className="flex items-center justify-center gap-2 mb-5 text-sm">
              {status === "recording" ? (
                <span className="inline-flex items-center gap-2 text-clay font-semibold">
                  <span className="w-2.5 h-2.5 rounded-full bg-clay animate-pulse" />
                  Listening…
                </span>
              ) : (
                <span className="inline-flex items-center gap-2 text-muted">
                  <span className="w-3.5 h-3.5 rounded-full border-2 border-line border-t-clay animate-spin" />
                  Transcribing…
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {step.optional && (
                <button onClick={handleSkip} disabled={status !== "recording"} className="btn btn-ghost flex-1">
                  Skip
                </button>
              )}
              <button onClick={handleNext} disabled={status !== "recording"} className="btn btn-primary flex-1">
                {lastStep ? "Finish & fill form" : "Next"}
                {!lastStep && (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                )}
              </button>
            </div>

            <p className="text-center text-muted text-[0.7rem] mt-3">
              Speak, then tap {lastStep ? "Finish" : "Next"}. You can edit everything afterward.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
