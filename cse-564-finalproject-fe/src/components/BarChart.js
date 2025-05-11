import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

export default function BarChart({ data, width=300, height=200 }) {
  const ref = useRef();
  useEffect(() => {
    const svg = d3.select(ref.current)
      .attr('width', width).attr('height', height);
    svg.selectAll('*').remove();

    const x = d3.scaleBand()
      .domain(data.map(d=>d.zipcode)).range([40, width-20]).padding(0.1);
    const y = d3.scaleLinear()
      .domain([0, d3.max(data,d=>d.count)]).range([height-30,20]);

    svg.append('g')
      .attr('transform','translate(0,'+ (height-30) +')')
      .call(d3.axisBottom(x).tickSize(0).tickFormat(d=>d).tickPadding(2))
      .selectAll('text').attr('transform','rotate(-45)').style('font-size','8px');

    svg.append('g')
      .attr('transform','translate(40,0)')
      .call(d3.axisLeft(y).ticks(5));

    svg.selectAll('.bar')
      .data(data)
      .join('rect')
        .attr('class','bar')
        .attr('x', d=> x(d.zipcode))
        .attr('y', d=> y(d.count))
        .attr('width', x.bandwidth())
        .attr('height', d=> height-30 - y(d.count))
        .attr('fill','#ff4d4d');
  }, [data, width, height]);

  return <svg ref={ref}/>;
}
