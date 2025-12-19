import type { GraphLink, GraphNode } from '../App';

const WIDTH = 720;
const HEIGHT = 420;

function nodePosition(index: number, total: number) {
  const angle = (index / Math.max(total, 1)) * Math.PI * 2;
  const radius = 150 + (index % 2 === 0 ? 20 : -20);
  const x = WIDTH / 2 + Math.cos(angle) * radius;
  const y = HEIGHT / 2 + Math.sin(angle) * radius;
  return { x, y };
}

export default function GraphView({ nodes, links }: { nodes: GraphNode[]; links: GraphLink[] }) {
  const positioned = nodes.map((node, index) => ({ ...node, ...nodePosition(index, nodes.length) }));

  return (
    <svg className="graph" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label="Graph placeholder">
      <defs>
        <marker id="arrow" markerWidth="10" markerHeight="10" refX="10" refY="3" orient="auto">
          <path d="M0,0 L0,6 L9,3 z" fill="#7c8ca4" />
        </marker>
      </defs>
      <g stroke="#7c8ca4" strokeOpacity="0.6">
        {links.map((link, index) => {
          const source = positioned.find((node) => node.id === link.source);
          const target = positioned.find((node) => node.id === link.target);
          if (!source || !target) return null;
          return (
            <line
              key={`${link.source}-${link.target}-${index}`}
              x1={source.x}
              y1={source.y}
              x2={target.x}
              y2={target.y}
              strokeWidth={1 + link.weight * 0.2}
              markerEnd="url(#arrow)"
            />
          );
        })}
      </g>
      {positioned.map((node) => (
        <g key={node.id} transform={`translate(${node.x},${node.y})`}>
          <circle r={12 + node.centrality * 14} fill="#2f6af6" fillOpacity="0.2" stroke="#2f6af6" />
          <text textAnchor="middle" dy="4" className="node-label">
            {node.id}
          </text>
        </g>
      ))}
    </svg>
  );
}
