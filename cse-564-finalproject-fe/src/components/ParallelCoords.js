// src/components/ParallelCoords.js
import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

export default function ParallelCoords({ data }) {
  const ref = useRef();

  useEffect(() => {
    if (!data || data.length === 0) return;

    // set up responsive SVG
    const svg = d3.select(ref.current)
      .attr('viewBox', '0 0 400 300')
      .attr('preserveAspectRatio', 'xMidYMid meet')
      .attr('width', '100%')
      .attr('height', '100%');
    svg.selectAll('*').remove();

    const margin = { top: 30, right: 10, bottom: 20, left: 10 };
    const W = 400, H = 300;
    const innerW = W - margin.left - margin.right;
    const innerH = H - margin.top - margin.bottom;

    const dims = ['Severity', 'Distance(mi)', 'hour'];

    // x-scale for dimensions
    const x = d3.scalePoint()
      .domain(dims)
      .range([0, innerW]);

    // y-scales for each dimension
    const yScales = {};
    dims.forEach(dim => {
      yScales[dim] = d3.scaleLinear()
        .domain(d3.extent(data, d => d[dim])).nice()
        .range([innerH, 0]);
    });

    // tooltip div
    let tooltip = d3.select('body').select('.d3-tooltip');
    if (tooltip.empty()) {
      tooltip = d3.select('body')
        .append('div')
        .attr('class', 'd3-tooltip')
        .style('position', 'absolute')
        .style('pointer-events', 'none')
        .style('background', 'rgba(0,0,0,0.7)')
        .style('color', '#fff')
        .style('padding', '4px 8px')
        .style('font-size', '8px')
        .style('border-radius', '3px')
        .style('opacity', 0);
    }

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // draw lines
    g.selectAll('.pc-line')
      .data(data)
      .join('path')
        .attr('class', 'pc-line')
        .attr('d', d => d3.line()
          (dims.map(dim => [ x(dim), yScales[dim](d[dim]) ]))
        )
        .attr('fill', 'none')
        .attr('stroke', 'rgba(255,77,77,0.1)')
        .attr('stroke-width', 1)
      .on('mouseover', (event, d) => {
        d3.select(event.currentTarget)
          .attr('stroke', 'rgba(255,77,77,0.8)')
          .attr('stroke-width', 2);

        tooltip.html(
          dims.map(dim => `<strong>${dim}:</strong> ${d[dim]}`).join('<br/>')
        )
        .style('left',  `${event.pageX + 5}px`)
        .style('top',   `${event.pageY - 28}px`)
        .transition().duration(200).style('opacity', 0.9);
      })
      .on('mousemove', (event) => {
        tooltip
          .style('left', `${event.pageX + 5}px`)
          .style('top',  `${event.pageY - 28}px`);
      })
      .on('mouseout', (event) => {
        d3.select(event.currentTarget)
          .attr('stroke', 'rgba(255,77,77,0.1)')
          .attr('stroke-width', 1);

        tooltip.transition().duration(200).style('opacity', 0);
      });

    // draw axes and labels
    const axes = g.selectAll('.axis')
      .data(dims)
      .join('g')
        .attr('class', 'axis')
        .attr('transform', dim => `translate(${x(dim)},0)`)
        .each(function(dim) {
          d3.select(this).call(d3.axisLeft(yScales[dim]).ticks(5));
        });

    axes.append('text')
      .attr('y', -8)
      .attr('text-anchor', 'middle')
      .attr('font-size', '9px')
      .attr('fill', '#ff4d4d')
      .text(dim => dim);

  }, [data]);

  return <svg ref={ref} />;
}
