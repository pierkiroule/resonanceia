import 'aframe';
import { useEffect, useRef } from 'react';
import type { GraphLink, GraphNode } from '../App';

function nodeColor(index: number) {
  const palette = ['#2f6af6', '#22d3ee', '#fb923c', '#a855f7'];
  return palette[index % palette.length];
}

export default function AFrameScene({ nodes, links }: { nodes: GraphNode[]; links: GraphLink[] }) {
  const sceneRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    while (scene.firstChild) {
      scene.removeChild(scene.firstChild);
    }

    nodes.forEach((node, index) => {
      const sphere = document.createElement('a-sphere');
      sphere.setAttribute('position', `${index * 1.4} 1.25 -3`);
      sphere.setAttribute('radius', String(0.35 + node.centrality * 0.5));
      sphere.setAttribute('color', nodeColor(index));
      sphere.setAttribute('shadow', 'cast: true; receive: true');
      sphere.setAttribute('title', node.id);
      scene.appendChild(sphere);
    });

    links.slice(0, 20).forEach((link, index) => {
      const line = document.createElement('a-cylinder');
      line.setAttribute('position', `${index * 0.6} 0.4 -2.5`);
      line.setAttribute('radius', String(0.02 + link.weight * 0.02));
      line.setAttribute('height', '0.9');
      line.setAttribute('color', '#7c8ca4');
      line.setAttribute('opacity', '0.6');
      scene.appendChild(line);
    });
  }, [nodes, links]);

  return (
    <a-scene embedded ref={sceneRef} vr-mode-ui="enabled: false" renderer="colorManagement: true">
      <a-entity position="0 1.6 0">
        <a-camera></a-camera>
      </a-entity>
      <a-sky color="#0b1220"></a-sky>
      <a-plane rotation="-90 0 0" width="10" height="10" color="#0f172a" shadow="receive: true"></a-plane>
    </a-scene>
  );
}
