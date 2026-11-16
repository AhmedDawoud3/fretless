import "./tab.css";
import type { PageProps } from "../app/useSharedSettings";
import { useCatalog } from "../chords/useCatalog";
import { TabView } from "./TabView";

/** Guitar tab to oud tab: loads the guitar tunings, then shows the page. */
export function TabPage(props: PageProps) {
  const { catalog, failed } = useCatalog();
  if (failed) {
    return (
      <p className="status status-error" role="alert">
        Could not load the guitar tunings. Start the backend with <code>just api</code>, then
        reload.
      </p>
    );
  }
  if (!catalog) return <p className="status">Loading...</p>;
  return <TabView {...props} presets={catalog.tunings} />;
}
