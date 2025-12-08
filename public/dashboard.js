const graphEl = document.getElementById('graph');
const updatedEl = document.getElementById('updatedAt');
const statusEl = document.getElementById('status');
const centralEl = document.getElementById('central');
const orbitEl = document.getElementById('orbit');
const isolatedEl = document.getElementById('isolated');
const emergingEl = document.getElementById('emerging');
const tableBody = document.querySelector('#summaryTable tbody');
const inputEl = document.getElementById('emojisInput');

const width = 700;
const height = 480;
let simulation;

function tagLine(target, list) {
  target.innerHTML = '';
  if (!list || !list.length) {
    target.textContent = '—';
    return;
  }
  list.forEach((emoji) => {
    const span = document.createElement('span');
    span.className = 'tag';
    span.textContent = emoji;
    target.appendChild(span);
  });
}

function renderTable(nodes = []) {
  tableBody.innerHTML = '';
  nodes.forEach((node) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${node.id}</td><td>${node.count}</td><td>${node.centrality}</td><td>${node.density}</td>`;
    tableBody.appendChild(tr);
  });
}

function renderGraph(nodes = [], links = []) {
  graphEl.innerHTML = '';
  const svg = d3.select(graphEl);
  simulation?.stop();

  const link = svg
    .append('g')
    .attr('stroke', '#7c8ca4')
    .attr('stroke-opacity', 0.5)
    .selectAll('line')
    .data(links)
    .enter()
    .append('line')
    .attr('stroke-width', (d) => Math.max(1, d.weight * 0.4));

  const node = svg
    .append('g')
    .selectAll('g')
    .data(nodes)
    .enter()
    .append('g')
    .call(
      d3
        .drag()
        .on('start', (event) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          event.subject.fx = event.subject.x;
          event.subject.fy = event.subject.y;
        })
        .on('drag', (event) => {
          event.subject.fx = event.x;
          event.subject.fy = event.y;
        })
        .on('end', (event) => {
          if (!event.active) simulation.alphaTarget(0);
          event.subject.fx = null;
          event.subject.fy = null;
        }),
    );

  node
    .append('circle')
    .attr('r', (d) => 12 + d.centrality * 20)
    .attr('fill', '#2f6af6')
    .attr('fill-opacity', 0.16)
    .attr('stroke', '#2f6af6')
    .attr('stroke-width', 2);

  node
    .append('text')
    .text((d) => d.id)
    .attr('text-anchor', 'middle')
    .attr('dy', 4)
    .attr('class', 'node-label');

  simulation = d3
    .forceSimulation(nodes)
    .force('link', d3.forceLink(links).id((d) => d.id).distance(140))
    .force('charge', d3.forceManyBody().strength(-400))
    .force('center', d3.forceCenter(width / 2, height / 2))
    .on('tick', () => {
      link
        .attr('x1', (d) => d.source.x)
        .attr('y1', (d) => d.source.y)
        .attr('x2', (d) => d.target.x)
        .attr('y2', (d) => d.target.y);

      node.attr('transform', (d) => `translate(${d.x},${d.y})`);
    });
}

async function fetchGraph() {
  const res = await fetch('/api/emojireso');
  if (!res.ok) throw new Error('Lecture réseau impossible');
  return res.json();
}

async function pushEmojis(emojis) {
  const res = await fetch('/api/emojireso', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ emojis }),
  });
  if (!res.ok) throw new Error('Écriture impossible');
  return res.json();
}

async function resetDb() {
  const res = await fetch('/api/emojireso/reset', { method: 'POST' });
  if (!res.ok) throw new Error('reset impossible');
}

function renderState(state) {
  tagLine(centralEl, state.central);
  tagLine(orbitEl, state.orbit);
  tagLine(isolatedEl, state.isolated);
  tagLine(emergingEl, state.emerging);
  renderTable(state.graph.nodes);
  renderGraph(state.graph.nodes, state.graph.links);
  updatedEl.textContent = new Date().toLocaleTimeString();
}

async function hydrate() {
  try {
    const state = await fetchGraph();
    renderState(state);
    statusEl.textContent = 'à jour';
  } catch (err) {
    console.error(err);
    statusEl.textContent = 'hors ligne';
  }
}

async function handleSend() {
  const emojis = (inputEl.value || '')
    .split(/\s+/)
    .map((e) => e.trim())
    .filter(Boolean);
  if (!emojis.length) {
    statusEl.textContent = 'ajoutez des emojis';
    return;
  }
  statusEl.textContent = 'envoi…';
  try {
    const state = await pushEmojis(emojis);
    renderState(state);
    statusEl.textContent = 'ok';
  } catch (err) {
    console.error(err);
    statusEl.textContent = 'erreur';
  }
}

async function handleReset() {
  statusEl.textContent = 'reset…';
  try {
    await resetDb();
    await hydrate();
    statusEl.textContent = 'base vidée';
  } catch (err) {
    console.error(err);
    statusEl.textContent = 'reset impossible';
  }
}

hydrate();
setInterval(hydrate, 6000);

document.getElementById('sendBtn').addEventListener('click', handleSend);
document.getElementById('resetBtn').addEventListener('click', handleReset);
inputEl.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') handleSend();
});
