import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

export default function ParallelCoords({ data }) {
  const ref = useRef();
  useEffect(() => {
    const dims = ['Severity','Distance(mi)','hour'];
    const w=600,h=200, padding=40;
    const svg = d3.select(ref.current)
      .attr('width', w).attr('height', h);
    svg.selectAll('*').remove();

    const y = {};
    dims.forEach(d => {
      y[d] = d3.scaleLinear()
        .domain(d3.extent(data, p=>p[d]))
        .range([h-padding, padding]);
    });
    const x = d3.scalePoint().domain(dims).range([padding, w-padding]);

    svg.selectAll('path')
      .data(data)
      .join('path')
        .attr('d', d=>{
          return d3.line()(dims.map(p=>[x(p), y[p](d[p])]));
        })
        .attr('fill','none')
        .attr('stroke','rgba(255,77,77,0.1)');

    svg.selectAll('.axis')
      .data(dims).enter()
      .append('g')
        .attr('class','axis')
        .attr('transform', d=>`translate(${x(d)},0)`)
        .each(function(d) { d3.select(this).call(d3.axisLeft(y[d])); })
      .append('text')
        .attr('y', padding/2)
        .attr('text-anchor','middle')
        .attr('fill','#ff4d4d')
        .text(d=>d);
  }, [data]);
  return <svg ref={ref}/>;
}
