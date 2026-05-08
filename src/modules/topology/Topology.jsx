import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { api } from '../../api/client';
import * as theme from '../../styles/theme';

const { C, FONTS } = theme;

function nodeColor(severity) {
  return severity === 'crit' ? C.red : severity === 'warn' ? C.orange : C.green;
}

function nodeRadius(healthScore) {
  return 8 + (healthScore / 100) * 14;
}

function buildLinks(nodes) {
  if (nodes.length < 2) return [];
  const links = [];
  for (let i = 1; i < nodes.length; i++) {
    links.push({ source: nodes[0].id, target: nodes[i].id });
  }
  for (let i = 1; i < nodes.length - 1; i++) {
    links.push({ source: nodes[i].id, target: nodes[i + 1].id });
  }
  return links;
}

export default function Topology() {
  const containerRef = useRef(null);
  const svgRef = useRef(null);
  const simRef = useRef(null);
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tooltip, setTooltip] = useState(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    api.getAssets()
      .then(res => {
        if (!active) return;
        setAssets(Array.isArray(res?.data?.assets) ? res.data.assets : []);
      })
      .catch(err => {
        if (!active) return;
        setError(err.message ?? 'Failed to load assets');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || assets.length === 0) return;

    if (simRef.current) simRef.current.stop();

    const width = containerRef.current.clientWidth || 600;
    const height = containerRef.current.clientHeight || 400;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();
    svg.attr('width', width).attr('height', height);

    const g = svg.append('g');

    svg.call(
      d3.zoom()
        .scaleExtent([0.25, 4])
        .on('zoom', e => g.attr('transform', e.transform))
    ).on('click', () => setTooltip(null));

    const nodes = assets.map(a => ({ ...a }));
    const links = buildLinks(nodes);

    const sim = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id(d => d.id).distance(120))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(d => nodeRadius(d.health_score) + 10));

    simRef.current = sim;

    const linkEls = g.append('g')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', 'rgba(79,142,247,0.15)')
      .attr('stroke-width', 1);

    const nodeEls = g.append('g')
      .selectAll('g')
      .data(nodes)
      .join('g')
      .attr('cursor', 'pointer')
      .call(
        d3.drag()
          .on('start', (e, d) => { if (!e.active) sim.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
          .on('drag', (e, d) => { d.fx = e.x; d.fy = e.y; })
          .on('end', (e, d) => { if (!e.active) sim.alphaTarget(0); d.fx = null; d.fy = null; })
      )
      .on('click', (e, d) => {
        e.stopPropagation();
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        setTooltip({ x: e.clientX - rect.left, y: e.clientY - rect.top, asset: d });
      });

    nodeEls.filter(d => d.severity === 'crit')
      .append('circle')
      .attr('r', d => nodeRadius(d.health_score) + 8)
      .attr('fill', 'none')
      .attr('stroke', C.red)
      .attr('stroke-width', 1)
      .attr('stroke-opacity', 0.5)
      .attr('class', 'pulse');

    nodeEls.append('circle')
      .attr('r', d => nodeRadius(d.health_score))
      .attr('fill', d => `${nodeColor(d.severity)}18`)
      .attr('stroke', d => nodeColor(d.severity))
      .attr('stroke-width', 2)
      .attr('style', d => `filter: drop-shadow(0 0 6px ${nodeColor(d.severity)}44)`);

    nodeEls.append('text')
      .text(d => d.name.length > 16 ? `${d.name.slice(0, 15)}…` : d.name)
      .attr('text-anchor', 'middle')
      .attr('dy', d => nodeRadius(d.health_score) + 14)
      .attr('fill', 'rgba(209,220,240,0.6)')
      .attr('font-size', 10)
      .attr('font-family', "'Fira Code',monospace")
      .attr('pointer-events', 'none');

    sim.on('tick', () => {
      linkEls
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y);
      nodeEls.attr('transform', d => `translate(${d.x},${d.y})`);
    });

    return () => sim.stop();
  }, [assets]);

  return (
    <div className="page-padding" style={{ padding: '22px 28px', display: 'flex', flexDirection: 'column', gap: 18, height: '100%', overflowX: 'hidden' }}>
      <div style={{ flexShrink: 0 }}>
        <div style={{ fontFamily: FONTS.display, fontSize: 14, letterSpacing: '0.1em', marginBottom: 4 }}>TOPOLOGY MAP</div>
        <div style={{ fontFamily: FONTS.mono, fontSize: 10, color: C.dim }}>
          {loading ? '—' : `${assets.length} assets · force-directed graph · drag nodes · scroll to zoom`}
        </div>
      </div>

      {error ? (
        <div style={{ padding: '8px 10px', borderRadius: 8, border: `1px solid ${C.orange}66`, background: 'rgba(255,155,67,0.08)', color: C.orange, fontFamily: FONTS.mono, fontSize: 10, flexShrink: 0 }}>
          {error}
        </div>
      ) : null}

      <div
        ref={containerRef}
        className="card card-topline"
        style={{ flex: 1, position: 'relative', overflow: 'hidden', minHeight: 300 }}
      >
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 10, color: C.dim, fontFamily: FONTS.mono, fontSize: 11 }}>
            <div className="pulse" style={{ width: 6, height: 6, borderRadius: '50%', background: C.blue }} />
            Loading topology...
          </div>
        ) : assets.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 10, color: C.dim, fontFamily: FONTS.mono, fontSize: 11, textAlign: 'center', padding: '24px' }}>
            No assets registered. Add your first asset to begin monitoring.
          </div>
        ) : (
          <svg ref={svgRef} style={{ display: 'block', width: '100%', height: '100%' }} />
        )}

        {tooltip ? (
          <div style={{
            position: 'absolute',
            left: Math.min(tooltip.x + 14, (containerRef.current?.clientWidth ?? 600) - 180),
            top: Math.max(tooltip.y - 10, 8),
            background: 'rgba(7,10,16,0.97)',
            border: `1px solid ${nodeColor(tooltip.asset.severity)}44`,
            borderRadius: 9,
            padding: '11px 15px',
            pointerEvents: 'none',
            zIndex: 10,
            minWidth: 164,
            backdropFilter: 'blur(8px)',
          }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: C.text, marginBottom: 7, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 140 }}>{tooltip.asset.name}</div>
            <div style={{ fontFamily: FONTS.mono, fontSize: 10, color: C.dim, lineHeight: 2 }}>
              <div>TYPE&nbsp;&nbsp;&nbsp;<span style={{ color: C.blue }}>{tooltip.asset.type}</span></div>
              <div>HEALTH&nbsp;<span style={{ color: nodeColor(tooltip.asset.severity) }}>{tooltip.asset.health_score}</span></div>
              <div>STATUS&nbsp;<span style={{ color: nodeColor(tooltip.asset.severity) }}>{tooltip.asset.severity.toUpperCase()}</span></div>
            </div>
          </div>
        ) : null}
      </div>

      <div style={{ display: 'flex', gap: 18, flexShrink: 0, flexWrap: 'wrap' }}>
        {[
          { color: C.red, label: 'CRITICAL' },
          { color: C.orange, label: 'WARNING' },
          { color: C.green, label: 'HEALTHY' },
        ].map(item => (
          <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: item.color, boxShadow: `0 0 6px ${item.color}` }} />
            <span style={{ fontFamily: FONTS.mono, fontSize: 9, color: C.dim, letterSpacing: '0.08em' }}>{item.label}</span>
          </div>
        ))}
        <span style={{ fontFamily: FONTS.mono, fontSize: 9, color: C.dim, marginLeft: 'auto' }}>Node size = health score · click node for details</span>
      </div>
    </div>
  );
}
