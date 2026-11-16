import type { ReactNode } from "react";
import { useCatalog } from "./useCatalog";

type Catalog = NonNullable<ReturnType<typeof useCatalog>["catalog"]>;

type CatalogGateProps = {
  /** Shown while loading, and when the lists could not be loaded (after "Could not load"). */
  loading: string;
  failure: string;
  children: (catalog: Catalog) => ReactNode;
};

/** Loads the chord qualities and guitar tunings, and shows its children once they are there. */
export function CatalogGate({ loading, failure, children }: CatalogGateProps) {
  const { catalog, failed } = useCatalog();
  if (failed) {
    return (
      <p className="status status-error" role="alert">
        Could not load {failure}. Start the backend with <code>just api</code>, then reload.
      </p>
    );
  }
  if (!catalog) return <p className="status">{loading}</p>;
  return children(catalog);
}
