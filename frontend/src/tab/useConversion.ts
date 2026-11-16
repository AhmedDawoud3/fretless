import { useState } from "react";
import { type Converted, convertTab, type TabMode } from "../api/client";
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

/**
 * Converts the text last asked for (the Convert button). Once something has been asked,
 * a change of options converts that same text again; before that nothing is sent.
 */
export function useConversion({ strings, capo, tuningId, mode }: ConvertOptions) {
  const [asked, setAsked] = useState<{ text: string; id: number } | null>(null);
  const body = asked && {
    text: asked.text,
    guitar: { strings: [...strings], capo },
    oud_tuning: tuningId,
    mode,
  };
  const key = body && asked ? `${asked.id}|${JSON.stringify(body)}` : null;
  const { value, failed } = useRequest(key, () =>
    body ? convertTab(body) : Promise.reject(new Error("nothing asked")),
  );

  const conversion = toConversion(key, value, failed);
  const convert = (text: string) => setAsked((a) => ({ text, id: (a?.id ?? 0) + 1 }));
  return { conversion, convert };
}

function toConversion(
  key: string | null,
  value: Awaited<ReturnType<typeof convertTab>> | null,
  failed: boolean,
): Conversion {
  if (key === null) return { status: "idle" };
  if (failed) return { status: "failed" };
  if (value === null) return { status: "loading" };
  return value.rejected ? { status: "rejected" } : { status: "done", converted: value.converted };
}
