import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

export default function ParallelCoords({ data = [], loading = false }) {
  const containerRef = useRef();
  const svgRef = useRef();
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!containerRef.current) return;
    
    const updateDimensions = () => {
      const { width, height } = containerRef.current.getBoundingClientRect();
      setDimensions({ width, height });
    };
    
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    
    return () => {
      window.removeEventListener('resize', updateDimensions);
    };
  }, []);

  useEffect(() => {
    if (!data || data.length === 0 || dimensions.width === 0) return;

    const svg = d3.select(svgRef.current)
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('viewBox', `0 0 ${dimensions.width} ${dimensions.height}`)
      .attr('preserveAspectRatio', 'xMidYMid meet');
    
    svg.selectAll('*').remove();

    const margin = { top: 40, right: 50, bottom: 20, left: 30 };
    const innerWidth = dimensions.width - margin.left - margin.right;
    const innerHeight = dimensions.height - margin.top - margin.bottom;

    const dims = [
      'Severity', 
      'Temperature(F)', 
      'Humidity(%)', 
      'Visibility(mi)', 
      'Wind_Speed(mph)', 
    ];

    const availableDimensions = dims.filter(dim => 
      data.some(d => d[dim] !== undefined && d[dim] !== null)
    );

    // x-scale for dimensions
    const x = d3.scalePoint()
      .domain(availableDimensions)
      .range([0, innerWidth]);

    // y-scales for each dimension
    const yScales = {};
    availableDimensions.forEach(dim => {
      yScales[dim] = d3.scaleLinear()
        .domain(d3.extent(data, d => d[dim])).nice()
        .range([innerHeight, 0]);
    });

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const axes = g.selectAll('.axis')
      .data(availableDimensions)
      .join('g')
        .attr('class', 'axis')
        .attr('transform', dim => `translate(${x(dim)},0)`);
    axes.each(function(dim) {
      d3.select(this).call(
        d3.axisLeft(yScales[dim])
          .ticks(5)
          .tickSize(-4)
          .tickFormat(d => {
            if (d >= 1000) return `${d/1000}k`;
            return d;
          })
      );
    });

    axes.append('text')
      .attr('y', -12)
      .attr('text-anchor', 'middle')
      .attr('font-size', '10px')
      .attr('font-weight', 'bold')
      .attr('fill', '#666')
      .text(dim => {
        const formatted = dim.replace('_', ' ');
        return formatted;
      });

    // Create a custom line generator
    const line = d3.line()
      .defined((d, i, data) => d !== null && d !== undefined)
      .x((d, i) => x(availableDimensions[i]))
      .y((d, i) => {
        const dim = availableDimensions[i];
        return yScales[dim](d);
      });

    // Create a color scale based on Severity
    const colorScale = d3.scaleSequential()
      .domain([1, 4]) 
      .interpolator(d3.interpolateReds);

    // Draw the lines
    g.append('g')
      .attr('class', 'lines')
      .selectAll('.pc-line')
      .data(data)
      .join('path')
        .attr('class', 'pc-line')
        .attr('d', d => {
          const values = availableDimensions.map(dim => d[dim]);
          return line(values);
        })
        .attr('fill', 'none')
        .attr('stroke', d => {
          const severity = d.Severity || 1;
          return d3.color(colorScale(severity)).copy({opacity: 0.3});
        })
        .attr('stroke-width', 1)
        .style('cursor', 'pointer')
        .style('transition', 'stroke-width 0.2s, opacity 0.2s');

    const tooltip = svg.append('g')
      .attr('class', 'tooltip')
      .style('opacity', 0)
      .style('pointer-events', 'none');
      
    tooltip.append('rect')
      .attr('width', 130)
      .attr('height', 90)
      .attr('rx', 4)
      .attr('ry', 4)
      .style('fill', 'rgba(0, 0, 0, 0.8)')
      .style('stroke', '#ff4d4d')
      .style('stroke-width', 1);
      
    const tooltipText = tooltip.append('text')
      .attr('x', 8)
      .attr('y', 16)
      .style('font-size', '10px')
      .style('fill', '#fff');

    g.selectAll('.pc-line')
      .on('mouseover', function(event, d) {
        d3.select(this)
          .attr('stroke', d => {
            const severity = d.Severity || 1;
            return colorScale(severity);
          })
          .attr('stroke-width', 2)
          .attr('opacity', 1)
          .raise();
        g.selectAll('.pc-line')
          .filter(p => p !== d)
          .attr('opacity', 0.1);
        tooltipText.selectAll('*').remove();
        availableDimensions.forEach((dim, i) => {
          tooltipText.append('tspan')
            .attr('x', 8)
            .attr('dy', i === 0 ? 0 : 14)
            .attr('font-weight', i === 0 ? 'bold' : 'normal')
            .text(`${dim}: ${d[dim]?.toFixed(2) || 'N/A'}`);
        });
        
        const [mouseX, mouseY] = d3.pointer(event, svg.node());
        tooltip
          .attr('transform', `translate(${mouseX + 10}, ${mouseY - 100})`)
          .transition().duration(200)
          .style('opacity', 1);
      })
      .on('mousemove', function(event) {
        // Update tooltip position
        const [mouseX, mouseY] = d3.pointer(event, svg.node());
        tooltip.attr('transform', `translate(${mouseX + 10}, ${mouseY - 100})`);
      })
      .on('mouseout', function() {
        g.selectAll('.pc-line')
          .attr('stroke', d => {
            const severity = d.Severity || 1;
            return d3.color(colorScale(severity)).copy({opacity: 0.3});
          })
          .attr('stroke-width', 1)
          .attr('opacity', 1);
        tooltip.transition().duration(200).style('opacity', 0);
      });

    svg.append('text')
      .attr('x', dimensions.width / 2)
      .attr('y', 15)
      .attr('text-anchor', 'middle')
      .attr('font-size', '12px')
      .attr('font-weight', 'bold')
      .attr('fill', '#333');
  }, [data, dimensions]);

  // Loading overlay
  const loadingOverlay = loading ? (
    <div style={{ 
      position: "absolute",
      top: 0,
      left: 0,
      width: "100%",
      height: "100%",
      color: "#888", 
      fontSize: "0.9rem", 
      display: "flex", 
      justifyContent: "center", 
      alignItems: "center", 
      fontFamily: "sans-serif",
      backgroundColor: "rgba(255, 255, 255, 0.7)",
      zIndex: 5
    }}>
      Loading...
    </div>
  ) : null;

  // No data overlay
  const noDataOverlay = (!loading && (!data || data.length === 0)) ? (
    <div style={{ 
      position: "absolute",
      top: 0,
      left: 0,
      width: "100%",
      height: "100%",
      color: "#888", 
      fontStyle: "italic", 
      display: "flex", 
      justifyContent: "center", 
      alignItems: "center", 
      fontFamily: "sans-serif",
      backgroundColor: "rgba(255, 255, 255, 0.7)",
      zIndex: 5
    }}>
      No data available
    </div>
  ) : null;

  return (
    <div 
      ref={containerRef}
      style={{ 
        width: "100%", 
        height: "100%", 
        position: "relative",
        backgroundColor: "#fff",
        borderRadius: "4px",
        overflow: "hidden",
      }}
    >
      <svg
        ref={svgRef}
        style={{ 
          width: "100%", 
          height: "100%",
          overflow: "visible" 
        }}
      />
      {loadingOverlay}
      {noDataOverlay}
    </div>
  );
}