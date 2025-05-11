import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

export default function TimeSeries({ data }) {
  const ref = useRef();

  useEffect(() => {
    const svg = d3.select(ref.current)
      .attr('width',  '100%')
      .attr('height', '100%')
      .attr('viewBox', '0 0 300 200');
    svg.selectAll('*').remove();

    const margin = { top: 20, right: 20, bottom: 40, left: 50 };
    const width  = 300, height = 200;
    const innerWidth  = width  - margin.left - margin.right;
    const innerHeight = height - margin.top  - margin.bottom;

    // chart group
    const chart = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // scales
    const x = d3.scaleLinear()
      .domain([0, 23])
      .range([0, innerWidth]);

    const y = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.count)]).nice()
      .range([innerHeight, 0]);

    // line generator with smooth curve
    const line = d3.line()
      .curve(d3.curveMonotoneX)
      .x(d => x(d.hour))
      .y(d => y(d.count));

    // draw the line
    chart.append('path')
      .datum(data)
      .attr('d', line)
      .attr('fill', 'none')
      .attr('stroke', '#4dff4d')
      .attr('stroke-width', 2)
      .style('transition', 'stroke 0.2s');

    // axes
    const xAxis = d3.axisBottom(x).ticks(6).tickFormat(d => `${d}:00`);
    const yAxis = d3.axisLeft(y).ticks(5);

    chart.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(xAxis)
      .selectAll('text')
        .attr('font-size', '8px');

    chart.append('g')
      .call(yAxis)
      .selectAll('text')
        .attr('font-size', '8px');

    // axis labels
    svg.append('text')
      .attr('x', margin.left + innerWidth / 2)
      .attr('y', height - 5)
      .attr('text-anchor', 'middle')
      .attr('font-size', '10px')
      .text('Hour of Day');

    svg.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -(margin.top + innerHeight / 2))
      .attr('y', 15)
      .attr('text-anchor', 'middle')
      .attr('font-size', '10px')
      .text('Count');

    // tooltip div (create if missing)
    let tooltip = d3.select('body').select('.tooltip');
    if (tooltip.empty()) {
      tooltip = d3.select('body').append('div')
        .attr('class', 'tooltip')
        .style('opacity', 0);
    }

    // draw invisible circles for hover targets
    chart.selectAll('circle')
      .data(data)
      .join('circle')
        .attr('cx', d => x(d.hour))
        .attr('cy', d => y(d.count))
        .attr('r', 5)
        .attr('fill', 'transparent')
        .style('cursor', 'pointer')
      .on('mouseover', (event, d) => {
        tooltip.html(`<strong>${d.hour}:00</strong><br/>Count: ${d.count}`)
          .style('left',  (event.pageX + 5) + 'px')
          .style('top',   (event.pageY - 28) + 'px')
          .transition().duration(200).style('opacity', 0.9);
      })
      .on('mousemove', (event) => {
        tooltip
          .style('left',  (event.pageX + 5) + 'px')
          .style('top',   (event.pageY - 28) + 'px');
      })
      .on('mouseout', () => {
        tooltip.transition().duration(200).style('opacity', 0);
      });

  }, [data]);

  return <svg ref={ref} />;
}
