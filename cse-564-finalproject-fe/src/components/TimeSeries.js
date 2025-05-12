import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

/**
 * TimeSeries - A component for visualizing time-based data distributions
 * 
 * Props:
 *  - hourlyData: Array<{ hour: number; count: number }>
 *  - yearlyData: Array<{ year: number; count: number }>
 *  - hourlyLoading: boolean
 *  - yearlyLoading: boolean
 *  - theme: {
 *      primary: string,    // Primary color for hourly chart
 *      secondary: string,  // Primary color for yearly chart
 *      background: string, // Background color
 *      text: string,       // Text color
 *      grid: string        // Grid line color
 *    }
 */
export default function TimeSeries({
  hourlyData = [],
  yearlyData = [],
  hourlyLoading = false,
  yearlyLoading = false,
  theme = {
    primary: '#4dff4d',
    secondary: '#4d79ff',
    background: '#ffffff',
    text: '#333333',
    grid: '#e0e0e0'
  }
}) {
  const containerRef = useRef();
  const hourlyChartRef = useRef();
  const yearlyChartRef = useRef();
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  // Responsive dimensions
  useEffect(() => {
    if (!containerRef.current) return;
    
    const update = () => {
      const { width, height } = containerRef.current.getBoundingClientRect();
      setDimensions({ width, height });
    };
    
    update();
    
    // Add debounced resize listener
    let timeoutId;
    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(update, 250);
    };
    
    window.addEventListener('resize', handleResize);
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Render hourly chart
  useEffect(() => {
    if (hourlyLoading || !hourlyData.length || !dimensions.width) return;
    
    const svg = d3.select(hourlyChartRef.current)
      .attr('viewBox', `0 0 ${dimensions.width} ${dimensions.height / 2}`)
      .attr('preserveAspectRatio', 'xMidYMid meet');
    
    svg.selectAll('*').remove();

    const margin = { top: 20, right: 25, bottom: 45, left: 65 };
    const innerW = dimensions.width - margin.left - margin.right;
    const innerH = dimensions.height / 2 - margin.top - margin.bottom;
    
    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Scales
    const x = d3.scaleLinear()
      .domain([0, 23])
      .range([0, innerW]);
    
    const maxY = d3.max(hourlyData, d => d.count) || 0;
    const y = d3.scaleLinear()
      .domain([0, maxY * 1.1])
      .nice()
      .range([innerH, 0]);

    // Background grid
    g.append('g')
      .attr('class', 'grid-lines')
      .call(d3.axisLeft(y)
        .ticks(5)
        .tickSize(-innerW)
        .tickFormat(''))
      .selectAll('line')
        .attr('stroke', theme.grid)
        .attr('stroke-dasharray', '3,3')
        .attr('opacity', 0.7);
    
    g.select('.domain').remove();

    // Horizontal grid lines
    g.append('g')
      .attr('class', 'grid-lines')
      .call(d3.axisBottom(x)
        .ticks(12)
        .tickSize(innerH)
        .tickFormat(''))
      .attr('transform', `translate(0,0)`)
      .selectAll('line')
        .attr('stroke', theme.grid)
        .attr('stroke-dasharray', '3,3')
        .attr('opacity', 0.3);
    
    g.selectAll('.grid-lines .domain').remove();

    // Area and line generators
    const area = d3.area()
      .curve(d3.curveCardinal.tension(0.4))
      .x(d => x(d.hour))
      .y0(innerH)
      .y1(d => y(d.count));
    
    const line = d3.line()
      .curve(d3.curveCardinal.tension(0.4))
      .x(d => x(d.hour))
      .y(d => y(d.count));

    // Area
    const gradientId = `hourly-gradient-${Math.random().toString(36).substring(2, 9)}`;
    
    const gradient = svg.append('defs')
      .append('linearGradient')
      .attr('id', gradientId)
      .attr('gradientUnits', 'userSpaceOnUse')
      .attr('x1', 0)
      .attr('y1', 0)
      .attr('x2', 0)
      .attr('y2', innerH);
    
    gradient.append('stop')
      .attr('offset', '0%')
      .attr('stop-color', theme.primary)
      .attr('stop-opacity', 0.6);
    
    gradient.append('stop')
      .attr('offset', '100%')
      .attr('stop-color', theme.primary)
      .attr('stop-opacity', 0.1);

    // Draw area
    g.append('path')
      .datum(hourlyData)
      .attr('fill', `url(#${gradientId})`)
      .attr('d', area);

    // Draw line
    g.append('path')
      .datum(hourlyData)
      .attr('fill', 'none')
      .attr('stroke', theme.primary)
      .attr('stroke-width', 3)
      .attr('stroke-linejoin', 'round')
      .attr('stroke-linecap', 'round')
      .attr('d', line);

    // Draw points
    g.selectAll('.point')
      .data(hourlyData)
      .enter()
      .append('circle')
      .attr('class', 'point')
      .attr('cx', d => x(d.hour))
      .attr('cy', d => y(d.count))
      .attr('r', 4)
      .attr('fill', theme.background)
      .attr('stroke', theme.primary)
      .attr('stroke-width', 2)
      .attr('opacity', 0)
      .on('mouseover', function(event, d) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('r', 6)
          .attr('opacity', 1);
          
        tooltip
          .style('opacity', 1)
          .html(`<div style="font-weight:bold">${d.hour}:00</div>${d.count.toLocaleString()} events`)
          .style('left', `${event.pageX + 10}px`)
          .style('top', `${event.pageY - 30}px`);
      })
      .on('mouseout', function() {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('r', 4)
          .attr('opacity', 0);
          
        tooltip
          .style('opacity', 0);
      });

    // X axis
    g.append('g')
      .attr('transform', `translate(0,${innerH})`)
      .call(d3.axisBottom(x)
        .ticks(12)
        .tickFormat(d => `${d}:00`))
      .selectAll('text')
        .attr('font-size', '10px')
        .attr('font-family', 'system-ui, sans-serif')
        .attr('font-weight', 500)
        .attr('transform', 'rotate(-30)')
        .attr('text-anchor', 'end')
        .attr('fill', theme.text)
        .attr('dx', '-0.8em')
        .attr('dy', '0.15em');

    // Y axis
    g.append('g')
      .call(d3.axisLeft(y)
        .ticks(5)
        .tickFormat(v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v))
      .selectAll('text')
        .attr('font-size', '10px')
        .attr('font-family', 'system-ui, sans-serif')
        .attr('font-weight', 500)
        .attr('fill', theme.text)
        .attr('dx', '-0.5em');

    // Title
    svg.append('text')
      .attr('x', margin.left)
      .attr('y', 15)
      .attr('font-size', '13px')
      .attr('font-weight', 'bold')
      .attr('font-family', 'system-ui, sans-serif')
      .attr('fill', theme.text)
      .text('Hourly Distribution');

    // Y-axis label
    svg.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', 20)
      .attr('x', -(dimensions.height / 4))
      .attr('font-size', '11px')
      .attr('font-family', 'system-ui, sans-serif')
      .attr('text-anchor', 'middle')
      .attr('fill', theme.text)
      .text('Number of Events');

    // Tooltip
    const tooltip = d3.select(containerRef.current)
      .append('div')
      .attr('class', 'tooltip')
      .style('position', 'absolute')
      .style('background-color', 'rgba(255, 255, 255, 0.9)')
      .style('border-radius', '4px')
      .style('padding', '8px')
      .style('box-shadow', '0 2px 10px rgba(0, 0, 0, 0.15)')
      .style('font-size', '12px')
      .style('font-family', 'system-ui, sans-serif')
      .style('pointer-events', 'none')
      .style('transition', 'opacity 0.2s')
      .style('opacity', 0)
      .style('z-index', 100);

  }, [hourlyData, hourlyLoading, dimensions, theme]);

  // Render yearly chart
  useEffect(() => {
    if (yearlyLoading || !yearlyData.length || !dimensions.width) return;
    
    const svg = d3.select(yearlyChartRef.current)
      .attr('viewBox', `0 0 ${dimensions.width} ${dimensions.height / 2}`)
      .attr('preserveAspectRatio', 'xMidYMid meet');
    
    svg.selectAll('*').remove();

    const margin = { top: 20, right: 25, bottom: 45, left: 65 };
    const innerW = dimensions.width - margin.left - margin.right;
    const innerH = dimensions.height / 2 - margin.top - margin.bottom;
    
    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Scales
    const x = d3.scaleBand()
      .domain(yearlyData.map(d => d.year))
      .range([0, innerW])
      .padding(0.3);
    
    const maxY = d3.max(yearlyData, d => d.count) || 0;
    const y = d3.scaleLinear()
      .domain([0, maxY * 1.1])
      .nice()
      .range([innerH, 0]);

    // Background grid
    g.append('g')
      .attr('class', 'grid-lines')
      .call(d3.axisLeft(y)
        .ticks(5)
        .tickSize(-innerW)
        .tickFormat(''))
      .selectAll('line')
        .attr('stroke', theme.grid)
        .attr('stroke-dasharray', '3,3')
        .attr('opacity', 0.7);
    
    g.select('.domain').remove();

    // Y axis
    g.append('g')
      .call(d3.axisLeft(y)
        .ticks(5)
        .tickFormat(v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v))
      .selectAll('text')
        .attr('font-size', '10px')
        .attr('font-family', 'system-ui, sans-serif')
        .attr('font-weight', 500)
        .attr('fill', theme.text)
        .attr('dx', '-0.5em');
    
    g.select('.domain').attr('stroke', theme.grid);

    // X axis
    g.append('g')
      .attr('transform', `translate(0,${innerH})`)
      .call(d3.axisBottom(x))
      .selectAll('text')
        .attr('font-size', '10px')
        .attr('font-family', 'system-ui, sans-serif')
        .attr('font-weight', 500)
        .attr('fill', theme.text);

    // Bar chart with gradient
    const barGradientId = `bar-gradient-${Math.random().toString(36).substring(2, 9)}`;
    
    const barGradient = svg.append('defs')
      .append('linearGradient')
      .attr('id', barGradientId)
      .attr('gradientUnits', 'userSpaceOnUse')
      .attr('x1', 0)
      .attr('y1', 0)
      .attr('x2', 0)
      .attr('y2', innerH);
    
    barGradient.append('stop')
      .attr('offset', '0%')
      .attr('stop-color', theme.secondary)
      .attr('stop-opacity', 0.9);
    
    barGradient.append('stop')
      .attr('offset', '100%')
      .attr('stop-color', theme.secondary)
      .attr('stop-opacity', 0.6);

    // Draw bars
    g.selectAll('.bar')
      .data(yearlyData)
      .enter()
      .append('rect')
      .attr('class', 'bar')
      .attr('x', d => x(d.year))
      .attr('y', d => y(d.count))
      .attr('width', x.bandwidth())
      .attr('height', d => innerH - y(d.count))
      .attr('fill', `url(#${barGradientId})`)
      .attr('rx', 3)
      .attr('ry', 3)
      .on('mouseover', function(event, d) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('opacity', 0.8);
          
        tooltip
          .style('opacity', 1)
          .html(`<div style="font-weight:bold">${d.year}</div>${d.count.toLocaleString()} events`)
          .style('left', `${event.pageX + 10}px`)
          .style('top', `${event.pageY - 30}px`);
      })
      .on('mouseout', function() {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('opacity', 1);
          
        tooltip
          .style('opacity', 0);
      });

    // Line connecting bars
    const line = d3.line()
      .x(d => x(d.year) + x.bandwidth() / 2)
      .y(d => y(d.count))
      .curve(d3.curveMonotoneX);

    g.append('path')
      .datum(yearlyData)
      .attr('fill', 'none')
      .attr('stroke', theme.secondary)
      .attr('stroke-width', 3)
      .attr('stroke-dasharray', '5,5')
      .attr('opacity', 0.7)
      .attr('d', line);

    // Draw points
    g.selectAll('.year-point')
      .data(yearlyData)
      .enter()
      .append('circle')
      .attr('class', 'year-point')
      .attr('cx', d => x(d.year) + x.bandwidth() / 2)
      .attr('cy', d => y(d.count))
      .attr('r', 5)
      .attr('fill', theme.background)
      .attr('stroke', theme.secondary)
      .attr('stroke-width', 2);

    // Add value labels on top of bars
    g.selectAll('.value-label')
      .data(yearlyData)
      .enter()
      .append('text')
      .attr('class', 'value-label')
      .attr('x', d => x(d.year) + x.bandwidth() / 2)
      .attr('y', d => y(d.count) - 10)
      .attr('text-anchor', 'middle')
      .attr('font-size', '9px')
      .attr('font-weight', 'bold')
      .attr('font-family', 'system-ui, sans-serif')
      .attr('fill', theme.text)
      .text(d => d.count >= 1000 ? `${(d.count/1000).toFixed(1)}k` : d.count);

    // Title
    svg.append('text')
      .attr('x', margin.left)
      .attr('y', 15)
      .attr('font-size', '13px')
      .attr('font-weight', 'bold')
      .attr('font-family', 'system-ui, sans-serif')
      .attr('fill', theme.text)
      .text('Yearly Distribution');

    // Y-axis label
    svg.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', 20)
      .attr('x', -(dimensions.height / 4))
      .attr('font-size', '11px')
      .attr('font-family', 'system-ui, sans-serif')
      .attr('text-anchor', 'middle')
      .attr('fill', theme.text)
      .text('Number of Events');

    // Tooltip
    const tooltip = d3.select(containerRef.current)
      .append('div')
      .attr('class', 'tooltip')
      .style('position', 'absolute')
      .style('background-color', 'rgba(255, 255, 255, 0.9)')
      .style('border-radius', '4px')
      .style('padding', '8px')
      .style('box-shadow', '0 2px 10px rgba(0, 0, 0, 0.15)')
      .style('font-size', '12px')
      .style('font-family', 'system-ui, sans-serif')
      .style('pointer-events', 'none')
      .style('transition', 'opacity 0.2s')
      .style('opacity', 0)
      .style('z-index', 100);

  }, [yearlyData, yearlyLoading, dimensions, theme]);

  const isLoading = hourlyLoading || yearlyLoading;
  const hasData = hourlyData.length || yearlyData.length;

  return (
    <div 
      ref={containerRef} 
      style={{ 
        width: '100%', 
        height: '100%', 
        position: 'relative',
        fontFamily: 'system-ui, sans-serif',
        backgroundColor: theme.background,
        borderRadius: '8px',
        boxShadow: '0 2px 12px rgba(0, 0, 0, 0.05)',
        padding: '10px',
        overflow: 'hidden'
      }}
    >
      {/* Hourly Chart */}
      <div style={{ height: '50%', position: 'relative', paddingBottom: '10px' }}>
        <svg ref={hourlyChartRef} style={{ width: '100%', height: '100%' }} />
        {hourlyLoading && (
          <div style={{ 
            position: 'absolute', 
            top: 0, 
            left: 0, 
            width: '100%', 
            height: '100%',
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            backgroundColor: 'rgba(255,255,255,0.8)', 
            fontSize: '12px', 
            color: theme.text,
            borderRadius: '8px'
          }}>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '10px'
            }}>
              <div className="loading-spinner" style={{
                width: '20px',
                height: '20px',
                border: `2px solid ${theme.primary}`,
                borderRadius: '50%',
                borderTopColor: 'transparent',
                animation: 'spin 1s linear infinite'
              }} />
              <style>
                {`
                  @keyframes spin {
                    to { transform: rotate(360deg); }
                  }
                `}
              </style>
              Loading hourly data...
            </div>
          </div>
        )}
      </div>

      {/* Divider */}
      <div style={{
        height: '1px',
        backgroundColor: theme.grid,
        margin: '0 10px 10px 10px'
      }} />

      {/* Yearly Chart */}
      <div style={{ height: '50%', position: 'relative', paddingTop: '10px' }}>
        <svg ref={yearlyChartRef} style={{ width: '100%', height: '100%' }} />
        {yearlyLoading && (
          <div style={{ 
            position: 'absolute', 
            top: 0, 
            left: 0, 
            width: '100%', 
            height: '100%',
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            backgroundColor: 'rgba(255,255,255,0.8)', 
            fontSize: '12px', 
            color: theme.text,
            borderRadius: '8px'
          }}>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '10px'
            }}>
              <div className="loading-spinner" style={{
                width: '20px',
                height: '20px',
                border: `2px solid ${theme.secondary}`,
                borderRadius: '50%',
                borderTopColor: 'transparent',
                animation: 'spin 1s linear infinite'
              }} />
              Loading yearly data...
            </div>
          </div>
        )}
      </div>

      {/* No data overlay */}
      {!isLoading && !hasData && (
        <div style={{ 
          position: 'absolute', 
          top: 0, 
          left: 0, 
          width: '100%', 
          height: '100%',
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          backgroundColor: 'rgba(255,255,255,0.9)', 
          fontStyle: 'italic', 
          color: '#888',
          borderRadius: '8px'
        }}>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '15px'
          }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            No data available
          </div>
        </div>
      )}
    </div>
  );
}