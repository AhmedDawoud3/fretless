import type { PageProps } from "../app/useSharedSettings";
import { CatalogGate } from "./CatalogGate";
import { ChordsView } from "./ChordsView";

/** Guitar chord to oud: loads the chord qualities and guitar tunings, then shows the page. */
export function ChordsPage(props: PageProps) {
  return (
    <CatalogGate loading="Loading chords..." failure="the chord lists">
      {(catalog) => (
        <ChordsView {...props} qualities={catalog.qualities} presets={catalog.tunings} />
      )}
    </CatalogGate>
  );
}
