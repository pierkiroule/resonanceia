type Tab = {
  id: string;
  label: string;
  onSelect: () => void;
};

type Props = {
  active: string;
  tabs: Tab[];
};

export default function NavTabs({ active, tabs }: Props) {
  return (
    <nav className="tabs">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={`tab ${active === tab.id ? 'active' : ''}`}
          onClick={tab.onSelect}
          type="button"
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}
