import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

/**
 * Props:
 *  - data: Array<{ hour: number; count: number }>
 *  - loading?: boolean
 *  - yAxisLabel?: string
 */
export default function TimeSeries({ 
  data, 
  loading = false,
  yAxisLabel = 'Count'
}) {
  const svgRef = useRef();

  useEffect(() => {
    if (loading || !data || data.length === 0) return;

    // Setup SVG
    const svg = d3.select(svgRef.current)
      .attr('viewBox', '0 0 350 200') // increased width for better spacing
      .attr('preserveAspectRatio', 'xMidYMid meet');
    svg.selectAll('*').remove();

    const margin = { top: 20, right: 20, bottom: 40, left: 60 }; // increased left margin
    const width = 350, height = 200;
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Chart group
    const chart = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Scales
    const x = d3.scaleLinear()
      .domain([0, 23])
      .range([0, innerWidth]);

    const maxY = d3.max(data, d => d.count) || 0;
    const y = d3.scaleLinear()
      .domain([0, maxY * 1.1]).nice() // Add 10% padding at the top
      .range([innerHeight, 0]);

    // Format y-axis values based on magnitude
    const formatYAxis = (value) => {
      if (value >= 1000000) {
        return `${(value / 1000000).toFixed(1)}M`;
      } else if (value >= 1000) {
        return `${(value / 1000).toFixed(0)}k`;
      }
      return value;
    };
    
    // Add grid lines
    chart.append('g')
      .attr('class', 'grid')
      .call(d3.axisLeft(y)
        .ticks(5)
        .tickSize(-innerWidth)
        .tickFormat(''))
      .selectAll('line')
        .attr('stroke', '#e0e0e0')
        .attr('stroke-dasharray', '3,3');
    
    chart.select('.grid').select('.domain').remove(); // Remove axis line from grid

    // Area under the curve
    const area = d3.area()
      .curve(d3.curveMonotoneX)
      .x(d => x(d.hour))
      .y0(innerHeight)
      .y1(d => y(d.count));

    chart.append('path')
      .datum(data)
      .attr('d', area)
      .attr('fill', 'rgba(77, 255, 77, 0.1)'); // Light green fill

    // Line generator with smooth curve
    const line = d3.line()
      .curve(d3.curveMonotoneX)
      .x(d => x(d.hour))
      .y(d => y(d.count));

    // Draw the line
    chart.append('path')
      .datum(data)
      .attr('d', line)
      .attr('fill', 'none')
      .attr('stroke', '#4dff4d')
      .attr('stroke-width', 2);

    // Axes
    const xAxis = d3.axisBottom(x)
      .ticks(12) // show more hour ticks
      .tickFormat(d => `${d}:00`);
    
    const yAxis = d3.axisLeft(y)
      .ticks(5)
      .tickFormat(formatYAxis);

    chart.append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(xAxis)
      .selectAll('text')
        .attr('font-size', '9px')
        .attr('font-family', 'sans-serif')
        .attr('transform', 'rotate(-30)') // Angle the hour labels
        .attr('text-anchor', 'end')
        .attr('dx', '-0.8em')
        .attr('dy', '0.15em');

    chart.append('g')
      .attr('class', 'y-axis')
      .call(yAxis)
      .selectAll('text')
        .attr('font-size', '9px')
        .attr('font-family', 'sans-serif')
        .attr('dx', '-0.5em'); // Adjust text position

    // Axis lines styling
    chart.select('.x-axis').select('.domain').attr('stroke', '#ccc');
    chart.select('.y-axis').select('.domain').attr('stroke', '#ccc');

    // Axis labels
    svg.append('text')
      .attr('x', margin.left + innerWidth / 2)
      .attr('y', height - 5)
      .attr('text-anchor', 'middle')
      .attr('font-size', '10px')
      .attr('font-family', 'sans-serif')
      .attr('fill', '#555')
      .text('Hour of Day');

    svg.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -(margin.top + innerHeight / 2))
      .attr('y', 16)
      .attr('text-anchor', 'middle')
      .attr('font-size', '10px')
      .attr('font-family', 'sans-serif')
      .attr('fill', '#555')
      .text(yAxisLabel);

    // Tooltip div (create if missing)
    let tooltip = d3.select('body').select('.d3-tooltip');
    if (tooltip.empty()) {
      tooltip = d3.select('body').append('div')
        .attr('class', 'd3-tooltip')
        .style('position', 'absolute')
        .style('padding', '6px 10px')
        .style('background', 'rgba(0,0,0,0.8)')
        .style('color', '#fff')
        .style('font-size', '12px')
        .style('font-family', 'sans-serif')
        .style('border-radius', '4px')
        .style('pointer-events', 'none')
        .style('z-index', '1000')
        .style('opacity', 0);
    }

    // Data points
    chart.selectAll('.data-point')
      .data(data)
      .join('circle')
        .attr('class', 'data-point')
        .attr('cx', d => x(d.hour))
        .attr('cy', d => y(d.count))
        .attr('r', 3)
        .attr('fill', '#4dff4d')
        .attr('stroke', '#fff')
        .attr('stroke-width', 1)
        .style('opacity', 0) // Hide initially
        .style('cursor', 'pointer');

    // Invisible larger hover targets
    chart.selectAll('.hover-target')
      .data(data)
      .join('circle')
        .attr('class', 'hover-target')
        .attr('cx', d => x(d.hour))
        .attr('cy', d => y(d.count))
        .attr('r', 8)
        .attr('fill', 'transparent')
        .style('cursor', 'pointer')
      .on('mouseover', (event, d) => {
        const formattedCount = d.count >= 1000000 
          ? `${(d.count / 1000000).toFixed(2)}M` 
          : d.count >= 1000 
            ? `${(d.count / 1000).toFixed(1)}k` 
            : d.count.toLocaleString();
            
        tooltip.html(`<strong>${d.hour}:00</strong><br/>Count: ${formattedCount}`)
          .style('left', (event.pageX + 10) + 'px')
          .style('top', (event.pageY - 28) + 'px')
          .transition().duration(200).style('opacity', 0.9);
          
        // Show data point
        d3.selectAll('.data-point')
          .style('opacity', 0);
        d3.select(chart.selectAll('.data-point').nodes()[d.hour])
          .style('opacity', 1)
          .attr('r', 4);
      })
      .on('mousemove', (event) => {
        tooltip
          .style('left', (event.pageX + 10) + 'px')
          .style('top', (event.pageY - 28) + 'px');
      })
      .on('mouseout', () => {
        tooltip.transition().duration(200).style('opacity', 0);
        d3.selectAll('.data-point').style('opacity', 0);
      });

  }, [data, loading, yAxisLabel]);

  if (loading) {
    return (
      <div style={{ 
        color: "#888", 
        fontSize: "0.9rem", 
        display: "flex", 
        justifyContent: "center", 
        alignItems: "center", 
        height: "100%",
        fontFamily: "sans-serif"
      }}>
        Loading...
      </div>
    );
  }
  
  if (!data || data.length === 0) {
    return (
      <div style={{ 
        color: "#888", 
        fontStyle: "italic", 
        display: "flex", 
        justifyContent: "center", 
        alignItems: "center", 
        height: "100%",
        fontFamily: "sans-serif"
      }}>
        No data available
      </div>
    );
  }

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      <svg
        ref={svgRef}
        style={{ 
          width: "100%", 
          height: "100%", 
          overflow: "visible" 
        }}
      />
    </div>
  );
}