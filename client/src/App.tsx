import { useEffect, useMemo, useState } from 'react';
import AFrameScene from './components/AFrameScene';
import GraphView from './components/GraphView';
import NavTabs from './components/NavTabs';
import Panel from './components/Panel';
import { fetchState, pushEmojis, resetState } from './api';
import './style.css';

export type GraphNode = {
  id: string;
  count: number;
  centrality: number;
  density: number;
};

export type GraphLink = {
  source: string;
  target: string;
  weight: number;
};

export type NetworkState = {
  central: string[];
  orbit: string[];
  isolated: string[];
  emerging: string[];
  graph: { nodes: GraphNode[]; links: GraphLink[] };
};

const TABS = [
  { id: 'insight', label: 'Dashboard' },
  { id: 'vr', label: 'VR Space' }
] as const;

type TabId = (typeof TABS)[number]['id'];

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('insight');
  const [state, setState] = useState<NetworkState | null>(null);
  const [emojis, setEmojis] = useState('');
  const [status, setStatus] = useState('Idle');
  const [isLoading, setIsLoading] = useState(false);

  const nodesByRole = useMemo(
    () => ({
      central: state?.central ?? [],
      orbit: state?.orbit ?? [],
      isolated: state?.isolated ?? [],
      emerging: state?.emerging ?? []
    }),
    [state]
  );

  async function refresh() {
    setIsLoading(true);
    try {
      const next = await fetchState();
      setState(next);
      setStatus('Live data updated');
    } catch (err) {
      console.error(err);
      setStatus('Unable to load state');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 6000);
    return () => clearInterval(interval);
  }, []);

  async function handleSend() {
    const items = emojis
      .split(/\s+/)
      .map((item) => item.trim())
      .filter(Boolean);

    if (!items.length) {
      setStatus('Add at least one emoji');
      return;
    }

    setStatus('Sending payload');
    setIsLoading(true);
    try {
      const next = await pushEmojis(items);
      setState(next);
      setEmojis('');
      setStatus('Submission stored');
    } catch (err) {
      console.error(err);
      setStatus('Unable to send payload');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleReset() {
    setStatus('Resetting database');
    setIsLoading(true);
    try {
      await resetState();
      await refresh();
      setStatus('Network cleared');
    } catch (err) {
      console.error(err);
      setStatus('Reset failed');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="app-shell">
      <header className="hero">
        <div>
          <p className="eyebrow">EmojiRéso•°</p>
          <h1>React + A-Frame monitoring panel</h1>
          <p className="muted">Placeholder dashboard for emoji co-occurrence exploration.</p>
          <div className="cta-row">
            <code className="pill">POST /api/emojireso</code>
            <code className="pill ghost">React + Vite</code>
          </div>
        </div>
        <Panel title="Quick payload">
          <p className="muted">Use spaces between emoji placeholders.</p>
          <pre className="mono">😡 📚 🤯 🧭</pre>
        </Panel>
      </header>

      <section className="inputs card">
        <div className="field">
          <label htmlFor="emoji-input">Emoji list</label>
          <input
            id="emoji-input"
            type="text"
            placeholder="😡 📚 🤯"
            value={emojis}
            onChange={(event) => setEmojis(event.target.value)}
          />
        </div>
        <div className="actions">
          <button className="primary" onClick={handleSend} disabled={isLoading}>
            Send batch
          </button>
          <button className="ghost" onClick={handleReset} disabled={isLoading}>
            Reset data
          </button>
          <span className="muted">{status}</span>
        </div>
      </section>

      <NavTabs
        active={activeTab}
        tabs={TABS.map((tab) => ({ ...tab, onSelect: () => setActiveTab(tab.id) }))}
      />

      {activeTab === 'insight' && (
        <div className="grid">
          <Panel title="Network roles" subtitle={isLoading ? 'Loading…' : 'Live snapshot'}>
            <div className="tags">
              {(
                [
                  ['Central', nodesByRole.central],
                  ['Orbit', nodesByRole.orbit],
                  ['Isolated', nodesByRole.isolated],
                  ['Emerging', nodesByRole.emerging]
                ] as const
              ).map(([label, items]) => (
                <div key={label}>
                  <p className="eyebrow">{label}</p>
                  <div className="tag-line">
                    {items.length ? items.map((emoji) => <span className="tag" key={emoji}>{emoji}</span>) : '—'}
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Force layout" subtitle="d3 placeholder">
            <GraphView nodes={state?.graph.nodes ?? []} links={state?.graph.links ?? []} />
          </Panel>
        </div>
      )}

      {activeTab === 'vr' && (
        <Panel title="A-Frame scene" subtitle="VR placeholder">
          <AFrameScene nodes={state?.graph.nodes ?? []} links={state?.graph.links ?? []} />
        </Panel>
      )}
    </div>
  );
}
