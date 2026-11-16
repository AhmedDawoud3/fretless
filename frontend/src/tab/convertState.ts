import type { Converted, ConvertReply } from "../api/client";
import { useRequest } from "../app/useRequest";

export type Conversion =
  | { status: "idle" | "loading" | "rejected" | "failed" }
  | { status: "done"; converted: Converted };

/** Runs a tab/audio conversion request whenever `key` changes after an initial ask. */
export function useConvertReply<Body>(
  key: string | null,
  body: Body | null,
  send: (body: Body) => Promise<ConvertReply>,
): Conversion {
  const { value, failed } = useRequest(key, () =>
    body ? send(body) : Promise.reject(new Error("nothing asked")),
  );
  if (key === null) return { status: "idle" };
  if (failed) return { status: "failed" };
  if (value === null) return { status: "loading" };
  return value.rejected ? { status: "rejected" } : { status: "done", converted: value.converted };
}
