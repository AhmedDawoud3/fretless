import { PAGE_IDS, type PageId } from "../explorer/settings";

const TITLES: Record<PageId, string> = { maqam: "Maqam explorer", chords: "Chords" };

type PageTabsProps = { page: PageId; onPage: (page: PageId) => void };

export function PageTabs({ page, onPage }: PageTabsProps) {
  return (
    <div className="tabs" role="tablist" aria-label="Pages">
      {PAGE_IDS.map((id) => (
        <button
          key={id}
          type="button"
          role="tab"
          aria-selected={page === id}
          className="tab"
          onClick={() => onPage(id)}
        >
          {TITLES[id]}
        </button>
      ))}
    </div>
  );
}
