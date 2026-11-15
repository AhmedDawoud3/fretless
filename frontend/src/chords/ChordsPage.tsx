import type { PageProps } from "../app/useSharedSettings";
import { ChordsView } from "./ChordsView";
import { useCatalog } from "./useCatalog";

/** Guitar chord to oud: loads the chord qualities and guitar tunings, then shows the page. */
export function ChordsPage(props: PageProps) {
  const { catalog, failed } = useCatalog();
  if (failed) {
    return (
      <p className="status status-error" role="alert">
        Could not load the chord lists. Start the backend with <code>just api</code>, then reload.
      </p>
    );
  }
  if (!catalog) return <p className="status">Loading chords...</p>;
  return <ChordsView {...props} qualities={catalog.qualities} presets={catalog.tunings} />;
}
