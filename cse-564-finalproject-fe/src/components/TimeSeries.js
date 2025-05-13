import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

/**
 * TimeSeries - A component for visualizing time-based data distributions
 * 
 * Props:
 *  - hourlyData: Array<{ hour: number; count: number }>
 *  - weekdayData: Array<{ weekday: number; count: number }>
 *  - hourlyLoading: boolean
 *  - weekdayLoading: boolean
 *  - theme: {
 *      primary: string,    // Primary color for hourly chart
 *      secondary: string,  // Primary color for weekday chart
 *      background: string, // Background color
 *      text: string,       // Text color
 *      grid: string        // Grid line color
 *    }
 */
export default function TimeSeries({
  hourlyData = [],
  weekdayData = [],
  hourlyLoading = false,
  weekdayLoading = false,
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
  const weekdayChartRef = useRef();
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

    const margin = { top: 30, right: 25, bottom: 45, left: 65 };
    const innerW = dimensions.width - margin.left - margin.right;
    const innerH = dimensions.height / 2 - margin.top - margin.bottom;
    
    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Create tooltip div if it doesn't exist
    let tooltip = d3.select('body').select('.hourly-tooltip');
    if (tooltip.empty()) {
      tooltip = d3.select('body')
        .append('div')
        .attr('class', 'hourly-tooltip')
        .style('position', 'absolute')
        .style('background-color', 'white')
        .style('border', '1px solid #ddd')
        .style('border-radius', '4px')
        .style('padding', '8px')
        .style('box-shadow', '0 2px 5px rgba(0,0,0,0.1)')
        .style('pointer-events', 'none')
        .style('opacity', 0)
        .style('z-index', 100);
    }

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
      .on('mouseover', function(event, d) {
        // Highlight point
        d3.select(this)
          .attr('r', 6)
          .attr('stroke-width', 3);
          
        // Show tooltip
        tooltip
          .html(`<div style="font-weight:bold">${d.hour}:00</div>${d.count} accidents`)
          .style('left', (event.pageX + 10) + 'px')
          .style('top', (event.pageY - 30) + 'px')
          .transition()
          .duration(200)
          .style('opacity', 0.9);
      })
      .on('mouseout', function() {
        // Reset point
        d3.select(this)
          .attr('r', 4)
          .attr('stroke-width', 2);
          
        // Hide tooltip
        tooltip
          .transition()
          .duration(200)
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

  }, [hourlyData, hourlyLoading, dimensions, theme]);

  // Render day of week heatmap
  useEffect(() => {
    if (weekdayLoading || !weekdayData.length || !dimensions.width) return;
    
    const svg = d3.select(weekdayChartRef.current)
      .attr('viewBox', `0 0 ${dimensions.width} ${dimensions.height / 2}`)
      .attr('preserveAspectRatio', 'xMidYMid meet');
    
    svg.selectAll('*').remove();

    const margin = { top: 40, right: 30, bottom: 40, left: 80 };
    const innerW = dimensions.width - margin.left - margin.right;
    const innerH = dimensions.height / 2 - margin.top - margin.bottom;
    
    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Create tooltip div if it doesn't exist
    let tooltip = d3.select('body').select('.heatmap-tooltip');
    if (tooltip.empty()) {
      tooltip = d3.select('body')
        .append('div')
        .attr('class', 'heatmap-tooltip')
        .style('position', 'absolute')
        .style('background-color', 'white')
        .style('border', '1px solid #ddd')
        .style('border-radius', '4px')
        .style('padding', '8px')
        .style('box-shadow', '0 2px 5px rgba(0,0,0,0.1)')
        .style('pointer-events', 'none')
        .style('opacity', 0)
        .style('z-index', 100);
    }

    // Generate day names (row labels)
    const days = [
      'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
    ];
    
    // Generate hours (column labels)
    const hours = Array.from({ length: 24 }, (_, i) => i);
    
    // Generate random heatmap data
    // In a real application, this would be replaced with actual data
    const heatmapData = [];
    days.forEach((day, dayIndex) => {
      hours.forEach(hour => {
        // Create random heat value (0-1)
        let value;
        
        // Simulate more accidents during rush hours on weekdays
        if ((hour >= 7 && hour <= 9) || (hour >= 16 && hour <= 18)) {
          if (dayIndex >= 1 && dayIndex <= 5) { // Weekdays (Mon-Fri)
            value = Math.random() * 0.5 + 0.5; // Higher values (0.5-1.0)
          } else {
            value = Math.random() * 0.3 + 0.2; // Medium values (0.2-0.5)
          }
        } else if (hour >= 22 || hour <= 5) {
          // Late night/early morning
          value = Math.random() * 0.3; // Lower values (0-0.3)
        } else {
          // Regular hours
          value = Math.random() * 0.6 + 0.1; // Medium values (0.1-0.7)
        }
        
        heatmapData.push({
          day,
          hour,
          value
        });
      });
    });
    
    // Create scales
    const xScale = d3.scaleBand()
      .domain(hours)
      .range([0, innerW])
      .padding(0.05);
      
    const yScale = d3.scaleBand()
      .domain(days)
      .range([0, innerH])
      .padding(0.05);
      
    // Create color scale (white to blue)
    const colorScale = d3.scaleSequential()
      .domain([0, 1])
      .interpolator(d3.interpolateBlues);
    
    // Draw heatmap cells
    g.selectAll('.cell')
      .data(heatmapData)
      .enter()
      .append('rect')
      .attr('class', 'cell')
      .attr('x', d => xScale(d.hour))
      .attr('y', d => yScale(d.day))
      .attr('width', xScale.bandwidth())
      .attr('height', yScale.bandwidth())
      .attr('fill', d => colorScale(d.value))
      .attr('stroke', 'white')
      .attr('stroke-width', 1)
      .on('mouseover', function(event, d) {
        // Highlight cell
        d3.select(this)
          .attr('stroke', '#333')
          .attr('stroke-width', 2);
          
        // Show tooltip
        tooltip
          .html(`<div style="font-weight:bold">${d.day}, ${d.hour}:00</div>Accidents: ${Math.round(d.value * 100)}% of daily max`)
          .style('left', (event.pageX + 10) + 'px')
          .style('top', (event.pageY - 30) + 'px')
          .transition()
          .duration(200)
          .style('opacity', 0.9);
      })
      .on('mouseout', function() {
        // Reset cell highlighting
        d3.select(this)
          .attr('stroke', 'white')
          .attr('stroke-width', 1);
          
        // Hide tooltip
        tooltip
          .transition()
          .duration(200)
          .style('opacity', 0);
      });
    
    // Y axis (days)
    g.append('g')
      .call(d3.axisLeft(yScale))
      .selectAll('text')
        .attr('font-size', '10px')
        .attr('font-family', 'system-ui, sans-serif')
        .attr('fill', theme.text);
    
    // X axis (hours)
    g.append('g')
      .attr('transform', `translate(0,${innerH})`)
      .call(d3.axisBottom(xScale)
        .tickFormat(h => `${h}`))
      .selectAll('text')
        .attr('font-size', '9px')
        .attr('font-family', 'system-ui, sans-serif')
        .attr('fill', theme.text)
        .attr('transform', 'rotate(-90)')
        .attr('text-anchor', 'end')
        .attr('dx', '-0.8em')
        .attr('dy', '0.15em');
    
    // Title
    svg.append('text')
      .attr('x', margin.left)
      .attr('y', 20)
      .attr('font-size', '13px')
      .attr('font-weight', 'bold')
      .attr('font-family', 'system-ui, sans-serif')
      .attr('fill', theme.text)
      .text('Accidents by Day of Week');

  }, [weekdayData, weekdayLoading, dimensions, theme]);

  const isLoading = hourlyLoading || weekdayLoading;
  const hasData = hourlyData.length || weekdayData.length;

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
      <div style={{ height: '50%', position: 'relative' }}>
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

      {/* Weekday Chart */}
      <div style={{ height: '50%', position: 'relative', paddingTop: '10px' }}>
        <svg ref={weekdayChartRef} style={{ width: '100%', height: '100%' }} />
        {weekdayLoading && (
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
              Loading weekday data...
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