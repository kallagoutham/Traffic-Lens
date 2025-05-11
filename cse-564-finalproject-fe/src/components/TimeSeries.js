import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

export default function TimeSeries({ data }) {
  const ref = useRef();
  useEffect(() => {
    const w=300,h=200, margin={top:20,right:20,bottom:30,left:40};
    const svg = d3.select(ref.current)
      .attr('width', w).attr('height', h);
    svg.selectAll('*').remove();

    const x = d3.scaleLinear()
      .domain([0,23]).range([margin.left, w - margin.right]);
    const y = d3.scaleLinear()
      .domain([0, d3.max(data,d=>d.count)]).range([h - margin.bottom, margin.top]);

    const line = d3.line()
      .x(d=> x(d.hour))
      .y(d=> y(d.count));

    svg.append('path')
      .datum(data)
      .attr('d', line)
      .attr('fill','none')
      .attr('stroke','#4dff4d')
      .attr('stroke-width',2);

    svg.append('g')
      .attr('transform','translate(0,'+(h-margin.bottom)+')')
      .call(d3.axisBottom(x).ticks(6));

    svg.append('g')
      .attr('transform','translate('+margin.left+',0)')
      .call(d3.axisLeft(y).ticks(5));
  }, [data]);

  return <svg ref={ref}/>;
}
