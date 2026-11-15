import { fetchGuitarTunings, fetchQualities } from "../api/client";
import { useRequest } from "../app/useRequest";

/** What the page needs before it can draw anything: the chord qualities and guitar tunings. */
export function useCatalog() {
  const { value, failed } = useRequest("catalog", async () => {
    const [qualities, tunings] = await Promise.all([fetchQualities(), fetchGuitarTunings()]);
    return { qualities, tunings };
  });
  return { catalog: value, failed };
}
