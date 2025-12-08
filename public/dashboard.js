const graphEl = document.getElementById('graph');
const listEl = document.getElementById('topList');
const updatedEl = document.getElementById('updatedAt');

const width = 700;
const height = 500;

function polarToCartesian(index, total, radius) {
  const angle = (index / Math.max(total, 1)) * Math.PI * 2;
  return {
    x: width / 2 + radius * Math.cos(angle),
    y: height / 2 + radius * Math.sin(angle),
  };
}

function renderList(nodes) {
  listEl.innerHTML = '';
  nodes.slice(0, 10).forEach((node) => {
    const li = document.createElement('li');
    li.innerHTML = `<span class="badge">${node.count}</span><div><div class="term">${node.id}</div><div class="muted">centralité ${node.centrality}</div></div>`;
    listEl.appendChild(li);
  });
  updatedEl.textContent = new Date().toLocaleTimeString();
}

function renderGraph(nodes, links) {
  graphEl.innerHTML = '';
  const maxCount = Math.max(...nodes.map((n) => n.count), 1);

  const positions = new Map();
  nodes.forEach((node, idx) => {
    const radius = 140 + (node.centrality || 0) * 6;
    positions.set(node.id, polarToCartesian(idx, nodes.length, radius));
  });

  links.forEach((link) => {
    const from = positions.get(link.source);
    const to = positions.get(link.target);
    if (!from || !to) return;
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', from.x);
    line.setAttribute('y1', from.y);
    line.setAttribute('x2', to.x);
    line.setAttribute('y2', to.y);
    line.setAttribute('stroke-width', 1 + link.weight * 0.4);
    line.setAttribute('stroke', '#7c8ca4');
    line.setAttribute('stroke-linecap', 'round');
    line.setAttribute('opacity', '0.5');
    graphEl.appendChild(line);
  });

  nodes.forEach((node) => {
    const pos = positions.get(node.id);
    if (!pos) return;
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');

    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    const r = 10 + (node.count / maxCount) * 30;
    circle.setAttribute('cx', pos.x);
    circle.setAttribute('cy', pos.y);
    circle.setAttribute('r', r);
    circle.setAttribute('fill', '#2f6af6');
    circle.setAttribute('fill-opacity', '0.18');
    circle.setAttribute('stroke', '#2f6af6');
    circle.setAttribute('stroke-width', '2');

    const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    label.setAttribute('x', pos.x);
    label.setAttribute('y', pos.y + 4);
    label.setAttribute('text-anchor', 'middle');
    label.setAttribute('class', 'node-label');
    label.textContent = node.id;

    group.appendChild(circle);
    group.appendChild(label);
    graphEl.appendChild(group);
  });
}

async function refresh() {
  try {
    const res = await fetch('/api/graph');
    if (!res.ok) throw new Error('Graph non disponible');
    const data = await res.json();
    renderList(data.nodes || []);
    renderGraph(data.nodes || [], data.links || []);
  } catch (err) {
    console.error(err);
    updatedEl.textContent = 'hors ligne';
  }
}

refresh();
setInterval(refresh, 4000);
