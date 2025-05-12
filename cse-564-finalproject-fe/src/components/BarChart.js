import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

export default function BarChart({ data = [], viewMode = 'bar', title = "ZIP Code Distribution" }) {
  const svgRef = useRef();
  const containerRef = useRef();
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [chartMode, setChartMode] = useState(viewMode);

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

  // Update chartMode when viewMode prop changes
  useEffect(() => {
    setChartMode(viewMode);
  }, [viewMode]);

  // Render bar chart
  const renderBarChart = () => {
    if (!data || data.length === 0 || dimensions.width === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // Set viewBox for better responsiveness
    svg
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('viewBox', `0 0 ${dimensions.width} ${dimensions.height}`);

    // margins + inner size
    const margin = { top: 35, right: 20, bottom: 45, left: 50 };
    const innerWidth = dimensions.width - margin.left - margin.right;
    const innerHeight = dimensions.height - margin.top - margin.bottom;

    // Add title
    svg.append('text')
      .attr('x', dimensions.width / 2)
      .attr('y', 15)
      .attr('text-anchor', 'middle')
      .attr('font-size', '14px')
      .attr('font-weight', 'bold')
      .attr('fill', '#333')
      .text(title);

    // group for chart area
    const chart = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // scales
    const x = d3.scaleBand()
      .domain(data.map(d => d.zipcode || d.county || d.id))
      .range([0, innerWidth])
      .padding(0.2); // More spacing between bars

    const y = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.count) * 1.1]).nice() // Add 10% padding at top
      .range([innerHeight, 0]);

    // Add grid lines
    chart.append('g')
      .attr('class', 'grid')
      .call(d3.axisLeft(y)
        .tickSize(-innerWidth)
        .tickFormat('')
      )
      .selectAll('line')
      .style('stroke', '#e0e0e0')
      .style('stroke-opacity', 0.7)
      .style('shape-rendering', 'crispEdges');

    // Add bottom axis
    chart.append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(d3.axisBottom(x))
      .selectAll('text')
        .attr('transform', 'rotate(-45)')
        .attr('text-anchor', 'end')
        .attr('dx', '-0.5em')
        .attr('dy', '0.5em')
        .style('font-size', '10px');

    // Add left axis with formatted ticks
    chart.append('g')
      .attr('class', 'y-axis')
      .call(d3.axisLeft(y)
        .ticks(5)
        .tickFormat(d => {
          if (d >= 1000000) return `${(d / 1000000).toFixed(1)}M`;
          if (d >= 1000) return `${(d / 1000).toFixed(0)}k`;
          return d;
        }))
      .selectAll('text')
        .style('font-size', '10px');

    // axis labels
    svg.append('text')
      .attr('x', margin.left + innerWidth / 2)
      .attr('y', dimensions.height - 5)
      .attr('text-anchor', 'middle')
      .attr('fill', '#666')
      .style('font-size', '12px')
      .text(data[0]?.zipcode ? 'ZIP Code' : (data[0]?.county ? 'County' : 'ID'));

    svg.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -(margin.top + innerHeight / 2))
      .attr('y', 15)
      .attr('text-anchor', 'middle')
      .attr('fill', '#666')
      .style('font-size', '12px')
      .text('Count');

    // Custom tooltip (contained within the component)
    const tooltip = svg.append('g')
      .attr('class', 'tooltip')
      .style('opacity', 0)
      .style('pointer-events', 'none');
      
    tooltip.append('rect')
      .attr('width', 120)
      .attr('height', 50)
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

    // Add bars
    chart.selectAll('.bar')
      .data(data)
      .join('rect')
        .attr('class', 'bar')
        .attr('x', d => x(d.zipcode || d.county || d.id))
        .attr('width', x.bandwidth())
        .attr('y', innerHeight) // Start at bottom for animation
        .attr('height', 0) // Start with height 0 for animation
        .attr('fill', '#ff4d4d')
        .attr('stroke', 'none')
        .attr('rx', 1) // Slightly rounded corners
        .attr('ry', 1)
        .style('transition', 'fill 0.2s')
      .on('mouseover', function(event, d) {
        // Highlight bar
        d3.select(this)
          .attr('fill', '#ff9999')
          .attr('stroke', '#ff6666')
          .attr('stroke-width', 1);
          
        // Position tooltip text
        tooltipText.selectAll('*').remove();
        tooltipText.append('tspan')
          .attr('x', 8)
          .attr('y', 20)
          .attr('font-weight', 'bold')
          .text(d.zipcode || d.county || d.id);
        tooltipText.append('tspan')
          .attr('x', 8)
          .attr('y', 35)
          .text(`Count: ${d.count.toLocaleString()}`);
          
        // Position tooltip
        const [x, y] = d3.pointer(event, svg.node());
        tooltip
          .attr('transform', `translate(${x + 10}, ${y - 50})`)
          .transition().duration(200)
          .style('opacity', 1);
      })
      .on('mousemove', function(event) {
        const [x, y] = d3.pointer(event, svg.node());
        tooltip.attr('transform', `translate(${x + 10}, ${y - 50})`);
      })
      .on('mouseout', function() {
        d3.select(this)
          .attr('fill', '#ff4d4d')
          .attr('stroke', 'none');
          
        tooltip.transition().duration(200).style('opacity', 0);
      })
      // Animate bars on load
      .transition()
      .duration(800)
      .delay((d, i) => i * 50)
      .attr('y', d => y(d.count))
      .attr('height', d => innerHeight - y(d.count))
      .ease(d3.easeBounceOut);

    // Add toggle button
    const toggleBtn = svg.append('g')
      .attr('class', 'toggle-btn')
      .attr('transform', `translate(${dimensions.width - 40}, 15)`)
      .style('cursor', 'pointer')
      .on('click', () => {
        setChartMode(chartMode === 'bar' ? 'treemap' : 'bar');
      });

    toggleBtn.append('rect')
      .attr('width', 25)
      .attr('height', 25)
      .attr('rx', 4)
      .attr('fill', '#eee')
      .attr('stroke', '#ccc');

    toggleBtn.append('text')
      .attr('x', 12.5)
      .attr('y', 17)
      .attr('text-anchor', 'middle')
      .attr('font-size', '16px')
      .attr('fill', '#666')
      .text(chartMode === 'bar' ? '🔄' : '📊');
  };

  // Render treemap
  const renderTreemap = () => {
    if (!data || data.length === 0 || dimensions.width === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // Set viewBox for better responsiveness
    svg
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('viewBox', `0 0 ${dimensions.width} ${dimensions.height}`);

    // margins
    const margin = { top: 40, right: 10, bottom: 10, left: 10 };
    const innerWidth = dimensions.width - margin.left - margin.right;
    const innerHeight = dimensions.height - margin.top - margin.bottom;

    // Add title
    svg.append('text')
      .attr('x', dimensions.width / 2)
      .attr('y', 20)
      .attr('text-anchor', 'middle')
      .attr('font-size', '14px')
      .attr('font-weight', 'bold')
      .attr('fill', '#333')
      .text(title);

    // Create hierarchical data for treemap
    const root = d3.hierarchy({ children: data })
      .sum(d => d.count)
      .sort((a, b) => b.value - a.value);

    // Create treemap layout
    const treemap = d3.treemap()
      .size([innerWidth, innerHeight])
      .paddingOuter(3)
      .paddingInner(1)
      .round(true);

    treemap(root);

    // Color scale
    const colorScale = d3.scaleSequential(d3.interpolateReds)
      .domain([0, d3.max(data, d => d.count)]);

    // Create container for treemap
    const chart = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Custom tooltip
    const tooltip = svg.append('g')
      .attr('class', 'tooltip')
      .style('opacity', 0)
      .style('pointer-events', 'none');
      
    tooltip.append('rect')
      .attr('width', 120)
      .attr('height', 50)
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

    cell.append('rect')
      .attr('width', d => d.x1 - d.x0)
      .attr('height', d => d.y1 - d.y0)
      .attr('fill', d => colorScale(d.data.count))
      .attr('stroke', '#fff')
      .attr('stroke-width', 1)
      .style('opacity', 0) // Start invisible for animation
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
          .text(d.data.zipcode || d.data.county || d.data.id || '');
        tooltipText.append('tspan')
          .attr('x', 8)
          .attr('y', 35)
          .text(`Count: ${d.data.count.toLocaleString()}`);
          
        // Position tooltip
        const [x, y] = d3.pointer(event, svg.node());
        tooltip
          .attr('transform', `translate(${x + 10}, ${y - 50})`)
          .transition().duration(200)
          .style('opacity', 1);
      })
      .on('mousemove', function(event) {
        const [x, y] = d3.pointer(event, svg.node());
        tooltip.attr('transform', `translate(${x + 10}, ${y - 50})`);
      })
      .on('mouseout', function() {
        d3.select(this)
          .attr('stroke', '#fff')
          .attr('stroke-width', 1);
          
        tooltip.transition().duration(200).style('opacity', 0);
      })
      .transition() // Animate appearance
      .duration(800)
      .delay((d, i) => i * 30)
      .style('opacity', 1);

    // Add text labels to larger cells
    cell.append('text')
      .attr('x', 4)
      .attr('y', 14)
      .style('font-size', '10px')
      .style('font-weight', 'bold')
      .style('fill', 'white')
      .style('opacity', 0) // Start invisible for animation
      .text(d => {
        const width = d.x1 - d.x0;
        const height = d.y1 - d.y0;
        // Only show text for cells large enough to fit it
        if (width > 40 && height > 25) {
          return (d.data.zipcode || d.data.county || d.data.id || '').substring(0, 8);
        }
        return '';
      })
      .transition() // Animate appearance
      .duration(800)
      .delay((d, i) => i * 30 + 400)
      .style('opacity', 1);

    // Add toggle button
    const toggleBtn = svg.append('g')
      .attr('class', 'toggle-btn')
      .attr('transform', `translate(${dimensions.width - 40}, 15)`)
      .style('cursor', 'pointer')
      .on('click', () => {
        setChartMode(chartMode === 'bar' ? 'treemap' : 'bar');
      });

    toggleBtn.append('rect')
      .attr('width', 25)
      .attr('height', 25)
      .attr('rx', 4)
      .attr('fill', '#eee')
      .attr('stroke', '#ccc');

    toggleBtn.append('text')
      .attr('x', 12.5)
      .attr('y', 17)
      .attr('text-anchor', 'middle')
      .attr('font-size', '16px')
      .attr('fill', '#666')
      .text(chartMode === 'bar' ? '🔄' : '📊');
  };

  // Main rendering effect
  useEffect(() => {
    if (chartMode === 'bar') {
      renderBarChart();
    } else {
      renderTreemap();
    }
  }, [data, dimensions, chartMode]);

  // Show loading or no data states
  const loadingOrEmpty = () => {
    if (!data || data.length === 0) {
      return (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          color: '#888',
          fontStyle: 'italic',
          backgroundColor: '#fff'
        }}>
          No data available
        </div>
      );
    }
    return null;
  };

  return (
    <div 
      ref={containerRef}
      style={{ 
        width: '100%', 
        height: '100%',
        position: 'relative',
        backgroundColor: '#fff',
        borderRadius: '4px',
        overflow: 'hidden',
      }}
    >
      {loadingOrEmpty()}
      <svg 
        ref={svgRef}
        style={{ 
          width: '100%', 
          height: '100%',
          display: (!data || data.length === 0) ? 'none' : 'block'
        }}
      />
    </div>
  );
}