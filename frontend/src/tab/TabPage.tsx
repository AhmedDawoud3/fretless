import type { PageProps } from "../app/useSharedSettings";
import { CatalogGate } from "../chords/CatalogGate";
import { TabView } from "./TabView";
import "./tab.css";

/** Guitar tab to oud tab: loads the guitar tunings, then shows the page. */
export function TabPage(props: PageProps) {
  return (
    <CatalogGate loading="Loading..." failure="the guitar tunings">
      {(catalog) => <TabView {...props} presets={catalog.tunings} />}
    </CatalogGate>
  );
}
