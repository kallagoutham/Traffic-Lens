import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';


export default function BarChart({ data }) {
  const ref = useRef();

  useEffect(() => {
    const svg = d3.select(ref.current)
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('viewBox', '0 0 300 200');

    svg.selectAll('*').remove();

    // margins + inner size
    const margin = { top: 20, right: 20, bottom: 40, left: 40 };
    const innerWidth  = 300 - margin.left - margin.right;
    const innerHeight = 200 - margin.top  - margin.bottom;

    // group for chart area
    const chart = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // scales
    const x = d3.scaleBand()
      .domain(data.map(d => d.zipcode))
      .range([0, innerWidth])
      .padding(0.1);

    const y = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.count)]).nice()
      .range([innerHeight, 0]);

    // axes
    chart.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(d3.axisBottom(x))
      .selectAll('text')
        .attr('transform', 'rotate(-45)')
        .attr('text-anchor', 'end')
        .attr('dx', '-0.5em')
        .attr('dy', '0.1em')
        .style('font-size', '8px');

    chart.append('g')
      .call(d3.axisLeft(y).ticks(5));

    // axis labels
    svg.append('text')
      .attr('x', margin.left + innerWidth/2)
      .attr('y', 200 - 5)
      .attr('text-anchor', 'middle')
      .style('font-size', '10px')
      .text('ZIP Code');

    svg.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -(margin.top + innerHeight/2))
      .attr('y', 15)
      .attr('text-anchor', 'middle')
      .style('font-size', '10px')
      .text('Count');

    // tooltip div (only once)
    let tooltip = d3.select('body').select('.tooltip');
    if (tooltip.empty()) {
      tooltip = d3.select('body')
        .append('div')
        .attr('class', 'tooltip')
        .style('opacity', 0);
    }

    // bars
    chart.selectAll('.bar')
      .data(data)
      .join('rect')
        .attr('class','bar')
        .attr('x',     d => x(d.zipcode))
        .attr('width', x.bandwidth())
        .attr('y',     d => y(d.count))
        .attr('height',d => innerHeight - y(d.count))
        .attr('fill','#ff4d4d')
        .style('transition','fill 0.2s')
      .on('mouseover', function(event,d) {
        d3.select(this).attr('fill','#ff9999');
        tooltip
          .html(`<strong>${d.zipcode}</strong><br/>Count: ${d.count}`)
          .style('left',  (event.pageX + 5) + 'px')
          .style('top',   (event.pageY - 28) + 'px')
          .transition().duration(200).style('opacity',0.9);
      })
      .on('mousemove', function(event) {
        tooltip
          .style('left', (event.pageX + 5) + 'px')
          .style('top',  (event.pageY - 28) + 'px');
      })
      .on('mouseout', function() {
        d3.select(this).attr('fill','#ff4d4d');
        tooltip.transition().duration(200).style('opacity',0);
      });

  }, [data]);

  return <svg ref={ref} />;
}
