import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

export default function IntegratedVisualization({
  countyData = [],
  zipData = [],

  countyLoading = false,
  zipLoading = false,

  width = '100%',
  height = '100%',
  state = null,
  colorScheme = 'YlOrRd',
  animated = true,

  maxBars = 10
}) {
  const containerRef = useRef();
  const treemapRef = useRef();
  const sunburstRef = useRef();
  const [dims, setDims] = useState({ width: 0, height: 0 });

  // measure container on mount & resize
  useEffect(() => {
    const measure = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        setDims({ width, height });
      }
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  useEffect(() => {
    if (!countyData.length || dims.height === 0) return;
    const svg = d3.select(treemapRef.current);
    svg.selectAll('*').remove();

    const totalH = dims.height * 0.4;
    const margin = { top: 5, right: 5, bottom: 5, left: 5 };
    const innerW = dims.width - margin.left - margin.right;
    const innerH = totalH - margin.top - margin.bottom;

    svg
      .attr('viewBox', `0 0 ${dims.width} ${totalH}`)
      .attr('preserveAspectRatio', 'xMidYMid meet');

    // Process data to show top counties
    const topCounties = [...countyData]
      .sort((a, b) => b.count - a.count)
      .slice(0, maxBars);

    // build hierarchy
    const root = d3.hierarchy({ children: topCounties })
      .sum(d => d.count)
      .sort((a, b) => b.value - a.value);

    d3.treemap()
      .size([innerW, innerH])
      .paddingInner(1)
      .paddingOuter(0)
      .round(true)
      (root);

    const maxVal = d3.max(topCounties, d => d.count);
    const colorScale = d3.scaleSequential(d3[`interpolate${colorScheme}`])
      .domain([0, maxVal]);

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);
    
    // cells
    const cell = g.selectAll('g')
      .data(root.leaves())
      .join('g')
        .attr('transform', d => `translate(${d.x0},${d.y0})`);

    // Add rects with enhanced hover effects
    const rects = cell.append('rect')
      .attr('width', d => d.x1 - d.x0)
      .attr('height', d => d.y1 - d.y0)
      .attr('fill', d => colorScale(d.value))
      .attr('rx', 2) // Slight rounding of corners
      .style('cursor', 'pointer')
      .style('transition', 'all 0.2s ease-in-out') // Smooth transition for hover effects
      .on('mouseover', function() {
        d3.select(this)
          .attr('stroke', '#fff')
          .attr('stroke-width', 2)
          .style('filter', 'brightness(1.1)'); // Brighten on hover
      })
      .on('mouseout', function() {
        d3.select(this)
          .attr('stroke', 'none')
          .attr('stroke-width', 0)
          .style('filter', 'none');
      });
    
    if (animated) {
      rects.style('opacity', 0)
        .transition().duration(600)
        .style('opacity', 1)
        .delay((d, i) => i * 25);
    }

    // County name text - IMPROVED: larger font size and bolder text
    cell.append('text')
      .attr('x', 3).attr('y', 14) // Adjusted y position for better alignment
      .attr('font-size', d => {
        const w = d.x1 - d.x0;
        // Increased font sizes for better visibility
        return w > 100 ? '14px' : w > 70 ? '12px' : '10px';
      })
      .attr('font-weight', '900') // Bolder text (900 instead of bold)
      .attr('fill', '#fff')
      .attr('text-shadow', '0px 1px 2px rgba(0,0,0,0.8)') // Added text shadow for better contrast
      .text(d => {
        const w = d.x1 - d.x0, h = d.y1 - d.y0;
        if (w > 50 && h > 25) return d.data.county;
        if (w > 40 && h > 20) return d.data.county.slice(0, Math.floor(w/7)); // Adjusted to show more text
        return '';
      });

    // Count value text - slightly improved for consistency
    cell.append('text')
      .attr('x', 3).attr('y', 28) // Adjusted y position to accommodate larger county name
      .attr('font-size', '10px') // Increased from 8px
      .attr('font-weight', '700') // Added semi-bold weight
      .attr('fill', '#fff')
      .attr('text-shadow', '0px 1px 1px rgba(0,0,0,0.5)') // Added subtle text shadow
      .text(d => {
        if (d.value >= 1000000) return `${(d.value/1000000).toFixed(1)}M`;
        if (d.value >= 1000) return `${(d.value/1000).toFixed(1)}k`;
        return d.value;
      });

    // tooltip
    const tooltip = d3.select(containerRef.current)
      .append('div')
        .attr('class', 'treemap-tooltip')
        .style('position', 'absolute')
        .style('visibility', 'hidden')
        .style('background', 'rgba(0,0,0,0.8)')
        .style('color', '#fff')
        .style('padding', '8px 12px')
        .style('border-radius', '4px')
        .style('font-size', '12px')
        .style('pointer-events', 'none')
        .style('z-index', '100')
        .style('box-shadow', '0 3px 14px rgba(0,0,0,0.2)');

    cell
      .on('mouseover', function(e, d) {
        // Apply highlight to current rectangle
        d3.select(this).select('rect')
          .attr('stroke', '#fff')
          .attr('stroke-width', 2)
          .style('filter', 'brightness(1.1)');
          
        // Enhance text visibility
        d3.select(this).selectAll('text')
          .style('font-weight', '900')
          .style('text-shadow', '0px 1px 3px rgba(0,0,0,1)');
          
        // Show tooltip
        tooltip.html(`
          <strong>${d.data.county}</strong><br>
          Count: ${d.value.toLocaleString()}
        `)
        .style('top', `${e.pageY - 10}px`)
        .style('left', `${e.pageX + 10}px`)
        .style('visibility', 'visible');
      })
      .on('mousemove', (e) => {
        tooltip
          .style('top', `${e.pageY - 10}px`)
          .style('left', `${e.pageX + 10}px`);
      })
      .on('mouseout', function() {
        // Remove highlight
        d3.select(this).select('rect')
          .attr('stroke', 'none')
          .attr('stroke-width', 0)
          .style('filter', 'none');
          
        // Restore text to normal
        d3.select(this).selectAll('text')
          .style('font-weight', function() { 
            return d3.select(this).attr('font-weight'); 
          })
          .style('text-shadow', function() { 
            return d3.select(this).attr('text-shadow'); 
          });
          
        tooltip.style('visibility', 'hidden');
      });

  }, [countyData, dims, state, colorScheme, animated, maxBars]);

  // SUNBURST (bottom 40% of total height)
  useEffect(() => {
    if (!zipData.length || dims.height === 0) return;
    const svg = d3.select(sunburstRef.current);
    svg.selectAll('*').remove();

    const totalH = dims.height * 0.4;
    const margin = { top: 5, right: 5, bottom: 5, left: 5 };
    const innerW = dims.width - margin.left - margin.right;
    const innerH = totalH - margin.top - margin.bottom;
    const radius = Math.min(innerW, innerH) / 2.2; // Slightly smaller to fit better

    svg
      .attr('viewBox', `0 0 ${dims.width} ${totalH}`)
      .attr('preserveAspectRatio', 'xMidYMid meet');

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left + innerW/2}, ${margin.top + innerH/2})`);

    const display = [...zipData]
      .sort((a, b) => b.count - a.count)
      .slice(0, maxBars);

    const root = d3.hierarchy({ name: "ZIP Codes", children: display })
      .sum(d => d.count)
      .sort((a, b) => b.value - a.value);

    // Use partition layout for sunburst
    d3.partition()
      .size([2 * Math.PI, radius])
      (root);

    // Use more vibrant colors
    const color = d3.scaleOrdinal()
      .domain(display.map(d => d.zipcode))
      .range([
        '#3366CC', '#DC3912', '#FF9900', '#109618', '#990099',
        '#0099C6', '#DD4477', '#66AA00', '#B82E2E', '#316395',
        '#994499', '#22AA99', '#AAAA11', '#6633CC', '#E67300'
      ]);

    // Arc generator with minimal padding
    const arc = d3.arc()
      .startAngle(d => d.x0)
      .endAngle(d => d.x1)
      .innerRadius(d => Math.max(0, d.y0))
      .outerRadius(d => Math.max(0, d.y1))
      .padAngle(0.005)
      .padRadius(radius);

    // Create slices with enhanced hover effects
    const slices = g.selectAll('path')
      .data(root.descendants().filter(d => d.depth))
      .join('path')
        .attr('d', arc)
        .attr('fill', d => color(d.data.zipcode))
        .attr('stroke', '#fff')
        .attr('stroke-width', 0.5)
        .style('cursor', 'pointer')
        .style('transition', 'all 0.2s ease-in-out') // Smooth transition for hover
        .on('mouseover', function(e, d) {
          // Highlight current slice
          d3.select(this)
            .attr('stroke', '#fff')
            .attr('stroke-width', 2)
            .style('filter', 'brightness(1.2)')
            .style('transform', 'scale(1.03)')
            .style('transform-origin', 'center');
            
          // Show tooltip
          tooltip.html(`
            <strong>${d.data.zipcode}</strong><br>
            Count: ${d.value.toLocaleString()}<br>
            ${d.data.city ? `City: ${d.data.city}` : ''}
          `)
          .style('top', `${e.pageY - 10}px`)
          .style('left', `${e.pageX + 10}px`)
          .style('visibility', 'visible');
        })
        .on('mousemove', (e) => {
          tooltip
            .style('top', `${e.pageY - 10}px`)
            .style('left', `${e.pageX + 10}px`);
        })
        .on('mouseout', function() {
          // Remove highlight
          d3.select(this)
            .attr('stroke', '#fff')
            .attr('stroke-width', 0.5)
            .style('filter', 'none')
            .style('transform', 'scale(1)');
            
          tooltip.style('visibility', 'hidden');
        });

    // Animate slices if requested
    if (animated) {
      slices.style('opacity', 0)
        .transition().duration(800)
        .style('opacity', 1)
        .delay((d, i) => i * 50);
    }

    // Labels for ZIP codes - IMPROVED: larger font and better visibility
    // Show only the zipcode (no "ZIP" prefix text)
    g.selectAll('text')
      .data(root.descendants().filter(d => d.depth && (d.x1 - d.x0) > 0.15)) // Reduced threshold to show more labels
      .join('text')
        .attr('transform', d => {
          const x = (d.x0 + d.x1) / 2;
          const y = (d.y0 + d.y1) / 2;
          const angle = x - Math.PI / 2;
          const radius = y;
          return `translate(${Math.cos(angle) * radius},${Math.sin(angle) * radius}) rotate(${angle * 180 / Math.PI})`;
        })
        .attr('text-anchor', 'middle')
        .attr('font-size', '11px') // Further increased from 10px
        .attr('font-weight', '900') // Maximum boldness
        .attr('fill', '#fff')
        .attr('text-shadow', '0px 1px 3px rgba(0,0,0,0.9)') // Enhanced text shadow
        .style('pointer-events', 'none')
        .text(d => d.data.zipcode); // Just show the zipcode number

    // tooltip
    const tooltip = d3.select(containerRef.current)
      .append('div')
        .attr('class', 'sunburst-tooltip')
        .style('position', 'absolute')
        .style('visibility', 'hidden')
        .style('background', 'rgba(0,0,0,0.8)')
        .style('color', '#fff')
        .style('padding', '8px 12px')
        .style('border-radius', '4px')
        .style('font-size', '12px')
        .style('pointer-events', 'none')
        .style('z-index', '100')
        .style('box-shadow', '0 3px 14px rgba(0,0,0,0.2)');

    slices
      .on('mouseover', (e, d) => {
        tooltip.html(`
          <strong>ZIP: ${d.data.zipcode}</strong><br>
          Count: ${d.value.toLocaleString()}<br>
          ${d.data.city ? `City: ${d.data.city}` : ''}
        `)
        .style('top', `${e.pageY - 10}px`)
        .style('left', `${e.pageX + 10}px`)
        .style('visibility', 'visible');
        
        // Highlight current slice
        d3.select(e.currentTarget)
          .attr('stroke', '#000')
          .attr('stroke-width', 2)
          .style('filter', 'brightness(1.1)');
      })
      .on('mousemove', (e) => {
        tooltip
          .style('top', `${e.pageY - 10}px`)
          .style('left', `${e.pageX + 10}px`);
      })
      .on('mouseout', (e) => {
        tooltip.style('visibility', 'hidden');
        
        // Remove highlight
        d3.select(e.currentTarget)
          .attr('stroke', '#fff')
          .attr('stroke-width', 1)
          .style('filter', 'none');
      });

    // Don't add the central circle as requested
    /* Removed central circle
    g.append('circle')
      .attr('r', radius * 0.12)
      .attr('fill', '#fff')
      .attr('stroke', '#ddd');
    */

  }, [zipData, dims, state, maxBars, animated]);

  const isLoading = countyLoading || zipLoading;

  return (
    <div
      ref={containerRef}
      style={{
        width, 
        height,
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        background: '#fff',
        borderRadius: 0,
        overflow: 'hidden',
        padding: 0,
      }}
    >
      {isLoading && (
        <div style={{
          position: 'absolute', 
          top: 0, 
          left: 0,
          width: '100%', 
          height: '100%',
          background: 'rgba(255,255,255,0.9)',
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          zIndex: 10
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: 40, 
              height: 40,
              border: '4px solid #f3f3f3',
              borderTop: '4px solid #ff5252',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 10px'
            }} />
            <strong>Loading data...</strong>
            <style>{`
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `}</style>
          </div>
        </div>
      )}

      <div style={{ flex: '0 0 40%', width: '100%' }}>
        <svg ref={treemapRef} style={{ width: '100%', height: '100%' }} />
      </div>

      <div style={{ flex: '0 0 40%', width: '100%' }}>
        <svg ref={sunburstRef} style={{ width: '100%', height: '100%' }} />
      </div>
    </div>
  );
}