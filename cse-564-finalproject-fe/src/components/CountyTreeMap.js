import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

export default function CountyTreeMap({ 
  state = null,
  limit = 15, 
  width = '100%', 
  height = 400, 
  title = 'County Distribution',
  colorScheme = 'Reds',
  animated = true,
  data = [], // Receive data directly from parent component
  loading = false // Receive loading state from parent component
}) {
  const svgRef = useRef();
  const containerRef = useRef();
  const [error, setError] = useState(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  // Get container dimensions on mount and resize
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

  // Render treemap
  useEffect(() => {
    if (!data || data.length === 0 || dimensions.width === 0 || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // Set viewBox for better responsiveness
    svg
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('viewBox', `0 0 ${dimensions.width} ${dimensions.height}`);

    // Margins
    const margin = { top: 40, right: 10, bottom: 10, left: 10 };
    const innerWidth = dimensions.width - margin.left - margin.right;
    const innerHeight = dimensions.height - margin.top - margin.bottom;

    // Add title
    svg.append('text')
      .attr('x', dimensions.width / 2)
      .attr('y', 25)
      .attr('text-anchor', 'middle')
      .attr('font-size', '16px')
      .attr('font-weight', 'bold')
      .attr('fill', '#333')
      .text(title + (state ? ` - ${state}` : ' - All States'));

    // Create hierarchical data for treemap
    const root = d3.hierarchy({ children: data })
      .sum(d => d.count)
      .sort((a, b) => b.value - a.value);

    // Create treemap layout with squarified algorithm
    const treemap = d3.treemap()
      .size([innerWidth, innerHeight])
      .paddingOuter(3)
      .paddingTop(15) // Space for labels
      .paddingInner(2)
      .round(true)
      .tile(d3.treemapSquarify); // Use squarified algorithm

    treemap(root);

    // Get max value for color scale
    const maxValue = d3.max(data, d => d.count);

    // Color scale
    const colorScale = d3.scaleSequential(d3[`interpolate${colorScheme}`])
      .domain([0, maxValue]);

    // Create container for treemap
    const chart = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Custom tooltip
    const tooltip = svg.append('g')
      .attr('class', 'county-tooltip')
      .style('opacity', 0)
      .style('pointer-events', 'none');
      
    tooltip.append('rect')
      .attr('width', 150)
      .attr('height', 60)
      .attr('rx', 4)
      .attr('ry', 4)
      .style('fill', 'rgba(0, 0, 0, 0.8)')
      .style('stroke', '#ffcc00')
      .style('stroke-width', 1);
      
    const tooltipText = tooltip.append('text')
      .attr('x', 8)
      .attr('y', 20)
      .style('font-size', '12px')
      .style('fill', '#fff');

    // Add cells
    const cell = chart.selectAll('g')
      .data(root.leaves())
      .join('g')
        .attr('transform', d => `translate(${d.x0},${d.y0})`);

    // Add rectangle for each county
    cell.append('rect')
      .attr('width', d => Math.max(0, d.x1 - d.x0))
      .attr('height', d => Math.max(0, d.y1 - d.y0))
      .attr('fill', d => colorScale(d.data.count))
      .attr('stroke', '#fff')
      .attr('stroke-width', 1)
      .style('opacity', animated ? 0 : 1) // Start invisible for animation if enabled
      .on('mouseover', function(event, d) {
        // Highlight rectangle
        d3.select(this)
          .attr('stroke', '#ffcc00')
          .attr('stroke-width', 2);
          
        // Position tooltip text
        tooltipText.selectAll('*').remove();
        tooltipText.append('tspan')
          .attr('x', 8)
          .attr('y', 20)
          .attr('font-weight', 'bold')
          .text(d.data.county);
          
        tooltipText.append('tspan')
          .attr('x', 8)
          .attr('y', 38)
          .text(`Accidents: ${d.data.count.toLocaleString()}`);
          
        tooltipText.append('tspan')
          .attr('x', 8)
          .attr('y', 53)
          .text(`${(d.value / root.value * 100).toFixed(1)}% of total`);
          
        // Position tooltip
        const [x, y] = d3.pointer(event, svg.node());
        tooltip
          .attr('transform', `translate(${x + 10}, ${y - 60})`)
          .transition().duration(200)
          .style('opacity', 1);
      })
      .on('mousemove', function(event) {
        const [x, y] = d3.pointer(event, svg.node());
        tooltip.attr('transform', `translate(${x + 10}, ${y - 60})`);
      })
      .on('mouseout', function() {
        d3.select(this)
          .attr('stroke', '#fff')
          .attr('stroke-width', 1);
          
        tooltip.transition().duration(200).style('opacity', 0);
      });
      
    // Animate rectangles if animation is enabled
    if (animated) {
      cell.selectAll('rect')
        .transition()
        .duration(800)
        .delay((d, i) => i * 20)
        .style('opacity', 1);
    }

    // Add text labels to cells
    cell.append('text')
      .attr('x', 4)
      .attr('y', 14)
      .attr('font-size', '9px')
      .attr('font-weight', 'bold')
      .style('fill', 'white')
      .style('text-shadow', '0px 0px 2px rgba(0,0,0,0.7)')
      .style('opacity', animated ? 0 : 1) // Start invisible for animation if enabled
      .text(d => {
        const width = d.x1 - d.x0;
        const height = d.y1 - d.y0;
        // Only show text if cell is large enough
        if (width > 60 && height > 25) {
          return d.data.county;
        } else if (width > 30 && height > 20) {
          return d.data.county.substring(0, Math.floor(width / 8));
        }
        return '';
      });
      
    // Animate text if animation is enabled
    if (animated) {
      cell.selectAll('text')
        .transition()
        .duration(800)
        .delay((d, i) => i * 20 + 400)
        .style('opacity', 1);
    }

    // Add a legend showing color scale
    const legendWidth = innerWidth * 0.8;
    const legendHeight = 15;
    const legendX = (innerWidth - legendWidth) / 2;
    const legendY = innerHeight - 30;
    
    // Create gradient for legend
    const legendGradient = svg.append('defs')
      .append('linearGradient')
      .attr('id', 'county-legend-gradient')
      .attr('x1', '0%')
      .attr('x2', '100%')
      .attr('y1', '0%')
      .attr('y2', '0%');
    
    // Add color stops to gradient
    const colorSteps = 10;
    for (let i = 0; i <= colorSteps; i++) {
      const value = (maxValue / colorSteps) * i;
      legendGradient.append('stop')
        .attr('offset', `${i * (100 / colorSteps)}%`)
        .attr('stop-color', colorScale(value));
    }
    
    // Create legend rectangle with gradient
    chart.append('rect')
      .attr('x', legendX)
      .attr('y', legendY)
      .attr('width', legendWidth)
      .attr('height', legendHeight)
      .style('fill', 'url(#county-legend-gradient)')
      .style('stroke', '#ccc')
      .style('stroke-width', 0.5);
    
    // Add ticks to legend
    const legendScale = d3.scaleLinear()
      .domain([0, maxValue])
      .range([0, legendWidth]);
    
    const legendAxis = d3.axisBottom(legendScale)
      .ticks(5)
      .tickFormat(d => {
        if (d >= 1000000) return `${(d / 1000000).toFixed(1)}M`;
        if (d >= 1000) return `${(d / 1000).toFixed(0)}k`;
        return d;
      });
    
    chart.append('g')
      .attr('transform', `translate(${legendX}, ${legendY + legendHeight})`)
      .call(legendAxis)
      .selectAll('text')
      .style('font-size', '8px');
    
    // Add legend title
    chart.append('text')
      .attr('x', legendX + legendWidth / 2)
      .attr('y', legendY - 5)
      .attr('text-anchor', 'middle')
      .attr('font-size', '9px')
      .attr('fill', '#666')
      .text('Accident Count');

  }, [data, dimensions, state, title, colorScheme, animated]);

  return (
    <div 
      ref={containerRef}
      style={{ 
        width: width, 
        height: height,
        position: 'relative',
        backgroundColor: '#fff',
        borderRadius: '4px',
        overflow: 'hidden',
      }}
    >
      {loading && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(255, 255, 255, 0.8)',
          zIndex: 10
        }}>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
          }}>
            <div style={{
              width: 40,
              height: 40,
              border: '4px solid #f3f3f3',
              borderTop: '4px solid #3498db',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              marginBottom: 10
            }} />
            <div>Loading county data...</div>
            <style>{`
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `}</style>
          </div>
        </div>
      )}
      
      {error && !loading && (
        <div style={{
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#d32f2f',
          padding: 20,
          textAlign: 'center'
        }}>
          <div>
            <div style={{ fontSize: 18, marginBottom: 10 }}>Error Loading Data</div>
            <div style={{ fontSize: 14 }}>{error}</div>
          </div>
        </div>
      )}
      
      {!loading && !error && data.length === 0 && (
        <div style={{
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#666',
          fontStyle: 'italic'
        }}>
          No county data available
        </div>
      )}
      
      <svg 
        ref={svgRef}
        style={{ 
          width: '100%', 
          height: '100%',
          display: (!data || data.length === 0 || loading || error) ? 'none' : 'block'
        }}
      />
    </div>
  );
}