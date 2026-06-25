import { NextRequest, NextResponse } from "next/server";
import OpenAI, { toFile } from "openai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "OPENAI_API_KEY is not set.", configured: false }, { status: 200 });
  }

  const form = await req.formData();
  const audio = form.get("audio");
  if (!(audio instanceof Blob) || audio.size === 0) {
    return NextResponse.json({ error: "No audio received." }, { status: 400 });
  }

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const buffer = Buffer.from(await audio.arrayBuffer());
    const type = audio.type || "audio/webm";
    const ext = type.includes("mp4") || type.includes("m4a")
      ? "mp4"
      : type.includes("ogg")
      ? "ogg"
      : type.includes("wav")
      ? "wav"
      : "webm";
    const file = await toFile(buffer, `speech.${ext}`, { type });

    const result = await openai.audio.transcriptions.create({
      file,
      model: process.env.TRANSCRIBE_MODEL || "whisper-1",
    });

    return NextResponse.json({ text: (result.text || "").trim() });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Transcription failed.", configured: true },
      { status: 502 }
    );
  }
}
