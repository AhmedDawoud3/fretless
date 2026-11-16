import { useState } from "react";
import { type ConvertBody, convertTab, type TabMode } from "../api/client";
import { type Conversion, useConvertReply } from "./convertState";

export type { Conversion };

/** Everything but the text that changes the answer. */
export type ConvertOptions = {
  strings: readonly number[];
  capo: number;
  tuningId: string;
  mode: TabMode;
};

type Asked = { text: string; id: number };

const nextAsked = (previous: Asked | null, text: string): Asked => ({
  text,
  id: (previous?.id ?? 0) + 1,
});

function requestFor(asked: Asked, { strings, capo, tuningId, mode }: ConvertOptions) {
  const body: ConvertBody = {
    text: asked.text,
    guitar: { strings: [...strings], capo },
    oud_tuning: tuningId,
    mode,
  };
  return { body, key: `${asked.id}|${JSON.stringify(body)}` };
}

/**
 * Converts the text last asked for (the Convert button). Once something has been asked,
 * a change of options converts that same text again; before that nothing is sent.
 */
export function useConversion(options: ConvertOptions) {
  const [asked, setAsked] = useState<Asked | null>(null);
  const request = asked ? requestFor(asked, options) : null;
  const conversion = useConvertReply(request?.key ?? null, request?.body ?? null, convertTab);
  return {
    conversion,
    convert: (text: string) => setAsked((previous) => nextAsked(previous, text)),
  };
}
