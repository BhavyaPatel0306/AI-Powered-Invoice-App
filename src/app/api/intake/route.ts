import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Field = { key: string; type: string; label: string; optional?: boolean };

export async function POST(req: NextRequest) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "OPENAI_API_KEY is not set.", configured: false }, { status: 200 });
  }

  const body = await req.json();
  const fields: Field[] = body.fields || [];
  const transcripts: Record<string, string> = body.transcripts || {};
  const packages: string[] = body.packages || [];
  const eventTypes: string[] = body.eventTypes || [];
  const today: string = body.today || new Date().toISOString().slice(0, 10);

  const fieldSpec = fields
    .map((f) => {
      let rule = "";
      switch (f.type) {
        case "packages":
          rule = `array of strings; each MUST exactly match one of these package names: ${JSON.stringify(packages)}. Pick the closest matches the person named (they may name several). Use [] if none.`;
          break;
        case "email":
          rule = `a valid email address parsed from spoken form (e.g. "john dot doe at gmail dot com" -> "john.doe@gmail.com"). "" if not provided/skipped.`;
          break;
        case "phone":
          rule = `phone number digits, formatted nicely. "" if not provided/skipped.`;
          break;
        case "eventType":
          rule = `one of ${JSON.stringify(eventTypes)} if it matches, otherwise the closest one. "" if not provided.`;
          break;
        case "date":
          rule = `ISO date "YYYY-MM-DD" resolved relative to today (${today}). "" if not provided/skipped.`;
          break;
        case "dueInDays":
          rule = `integer number of days (e.g. "two weeks" -> 14, "a month" -> 30). null if not provided.`;
          break;
        case "depositPercent":
          rule = `integer, one of 0, 25, 50 (e.g. "half" -> 50, "pay in full" -> 0). null if not provided.`;
          break;
        default:
          rule = `cleaned string with proper capitalization. "" if not provided/skipped.`;
      }
      return `- "${f.key}" (${f.label}): ${rule} Raw spoken text: ${JSON.stringify(transcripts[f.key] || "")}`;
    })
    .join("\n");

  const sys =
    "You convert a photographer's spoken intake into clean structured JSON for a form. " +
    "Return ONLY a JSON object whose keys are exactly the field keys provided. " +
    "If a person clearly skipped a field or said 'skip', use the empty/null default for that field. " +
    "Never invent data that wasn't said.";

  const user = `Today is ${today}.\nProduce JSON for these fields:\n${fieldSpec}`;

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const completion = await openai.chat.completions.create({
      model: process.env.INTAKE_MODEL || "gpt-4o-mini",
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: sys },
        { role: "user", content: user },
      ],
    });
    const raw = completion.choices[0]?.message?.content || "{}";
    const values = JSON.parse(raw);
    return NextResponse.json({ values });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Parsing failed.", configured: true },
      { status: 502 }
    );
  }
}
