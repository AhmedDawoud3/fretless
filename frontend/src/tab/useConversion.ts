import { useState } from "react";
import { type ConvertBody, type Converted, convertTab, type TabMode } from "../api/client";
import { useRequest } from "../app/useRequest";

/** Everything but the text that changes the answer. */
export type ConvertOptions = {
  strings: readonly number[];
  capo: number;
  tuningId: string;
  mode: TabMode;
};

export type Conversion =
  | { status: "idle" | "loading" | "rejected" | "failed" }
  | { status: "done"; converted: Converted };

type Asked = { text: string; id: number };
type Reply = Awaited<ReturnType<typeof convertTab>>;

const nextAsked = (previous: Asked | null, text: string): Asked => ({
  text,
  id: (previous?.id ?? 0) + 1,
});

/** What to send for the text asked for, and a key that changes when the answer could. */
function requestFor(asked: Asked, { strings, capo, tuningId, mode }: ConvertOptions) {
  const body: ConvertBody = {
    text: asked.text,
    guitar: { strings: [...strings], capo },
    oud_tuning: tuningId,
    mode,
  };
  return { body, key: `${asked.id}|${JSON.stringify(body)}` };
}

function toConversion(key: string | null, value: Reply | null, failed: boolean): Conversion {
  if (key === null) return { status: "idle" };
  if (failed) return { status: "failed" };
  if (value === null) return { status: "loading" };
  return value.rejected ? { status: "rejected" } : { status: "done", converted: value.converted };
}

const load = (request: ReturnType<typeof requestFor> | null) =>
  request ? convertTab(request.body) : Promise.reject(new Error("nothing asked"));

/**
 * Converts the text last asked for (the Convert button). Once something has been asked,
 * a change of options converts that same text again; before that nothing is sent.
 */
export function useConversion(options: ConvertOptions) {
  const [asked, setAsked] = useState<Asked | null>(null);
  const request = asked ? requestFor(asked, options) : null;
  const key = request?.key ?? null;
  const { value, failed } = useRequest(key, () => load(request));
  return {
    conversion: toConversion(key, value, failed),
    convert: (text: string) => setAsked((previous) => nextAsked(previous, text)),
  };
}
