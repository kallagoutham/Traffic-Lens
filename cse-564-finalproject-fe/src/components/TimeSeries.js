import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

export default function TimeSeries({ 
  hourlyData = [], 
  weekdayData = [],
  loading = false,
  hourlyLoading = false,
  weekdayLoading = false,
}) {
  const containerRef = useRef();
  const hourlyChartRef = useRef();
  const weekdayChartRef = useRef();
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

  // Render hourly chart
  useEffect(() => {
    if (hourlyLoading || !hourlyData || hourlyData.length === 0 || dimensions.width === 0) return;
    
    const svg = d3.select(hourlyChartRef.current);
    renderTimeChart(svg, hourlyData, dimensions, 'hourly');
  }, [hourlyData, hourlyLoading, dimensions]);

  // Render weekday chart
  useEffect(() => {
    if (weekdayLoading || !weekdayData || weekdayData.length === 0 || dimensions.width === 0) return;
    
    const svg = d3.select(weekdayChartRef.current);
    renderTimeChart(svg, weekdayData, dimensions, 'weekday');
  }, [weekdayData, weekdayLoading, dimensions]);

  // Shared chart rendering function
  const renderTimeChart = (svg, data, dimensions, type) => {
    svg.selectAll('*').remove();

    const margin = { top: 15, right: 20, bottom: 40, left: 60 };
    const chartHeight = (dimensions.height / 2) - 30; // Half height minus padding
    const innerWidth = dimensions.width - margin.left - margin.right;
    const innerHeight = chartHeight - margin.top - margin.bottom;

    // Set viewBox for better responsiveness
    svg.attr('viewBox', `0 0 ${dimensions.width} ${chartHeight}`)
       .attr('preserveAspectRatio', 'xMidYMid meet');

    // Chart group
    const chart = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Scales
    let x;
    
    if (type === 'hourly') {
      // For hourly data
      x = d3.scaleLinear()
        .domain([0, 23])
        .range([0, innerWidth]);
    } else {
      // For weekday data
      const weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
      x = d3.scaleBand()
        .domain(weekdays)
        .range([0, innerWidth])
        .padding(0.1);
    }

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

    // Color based on chart type
    const lineColor = type === 'hourly' ? '#4dff4d' : '#3399ff'; 
    const areaColor = type === 'hourly' ? 'rgba(77, 255, 77, 0.1)' : 'rgba(51, 153, 255, 0.1)';

    if (type === 'hourly') {
      // Area under the curve for hourly data
      const area = d3.area()
        .curve(d3.curveMonotoneX)
        .x(d => x(d.hour))
        .y0(innerHeight)
        .y1(d => y(d.count));

      chart.append('path')
        .datum(data)
        .attr('d', area)
        .attr('fill', areaColor);

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
        .attr('stroke', lineColor)
        .attr('stroke-width', 2);
    } else {
      // For weekday data, using proper band scale
      // Area under the curve
      chart.append('path')
        .datum(data)
        .attr('fill', areaColor)
        .attr('d', d3.area()
          .x(d => x(d.weekday) + x.bandwidth() / 2)
          .y0(innerHeight)
          .y1(d => y(d.count))
          .curve(d3.curveMonotoneX)
        );

      // Line connecting points
      chart.append('path')
        .datum(data)
        .attr('fill', 'none')
        .attr('stroke', lineColor)
        .attr('stroke-width', 2)
        .attr('d', d3.line()
          .x(d => x(d.weekday) + x.bandwidth() / 2)
          .y(d => y(d.count))
          .curve(d3.curveMonotoneX)
        );
    }

    // Axes
    let xAxis;
    if (type === 'hourly') {
      xAxis = d3.axisBottom(x)
        .ticks(12)
        .tickFormat(d => `${d}:00`);
    } else {
      xAxis = d3.axisBottom(x);
    }
    
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
        .attr('transform', type === 'hourly' ? 'rotate(-30)' : 'rotate(0)') // Angle the labels for hourly
        .attr('text-anchor', type === 'hourly' ? 'end' : 'middle')
        .attr('dx', type === 'hourly' ? '-0.8em' : '0')
        .attr('dy', type === 'hourly' ? '0.15em' : '0.7em');

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
    const xAxisLabel = type === 'hourly' ? 'Hour of Day' : 'Day of Week';
    
    svg.append('text')
      .attr('x', margin.left + innerWidth / 2)
      .attr('y', chartHeight - 5)
      .attr('text-anchor', 'middle')
      .attr('font-size', '10px')
      .attr('font-family', 'sans-serif')
      .attr('fill', '#555')
      .text(xAxisLabel);

    svg.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -(margin.top + innerHeight / 2))
      .attr('y', 16)
      .attr('text-anchor', 'middle')
      .attr('font-size', '10px')
      .attr('font-family', 'sans-serif')
      .attr('fill', '#555')
      .text('Count');

    // Add chart title on the top left
    svg.append('text')
      .attr('x', margin.left)
      .attr('y', 12)
      .attr('font-size', '11px')
      .attr('font-weight', 'bold')
      .attr('font-family', 'sans-serif')
      .attr('fill', '#333')
      .text(type === 'hourly' ? 'Hourly Distribution' : 'Weekday Distribution');

    // Data points
    const dataPoints = chart.selectAll('.data-point')
      .data(data)
      .join('circle')
        .attr('class', 'data-point')
        .attr('cx', d => type === 'hourly' ? x(d.hour) : x(d.weekday) + x.bandwidth() / 2)
        .attr('cy', d => y(d.count))
        .attr('r', 3)
        .attr('fill', lineColor)
        .attr('stroke', '#fff')
        .attr('stroke-width', 1)
        .style('opacity', 0);

    // Custom tooltip
    const tooltip = svg.append('g')
      .attr('class', 'tooltip')
      .style('opacity', 0)
      .style('pointer-events', 'none');
      
    tooltip.append('rect')
      .attr('width', 100)
      .attr('height', 50)
      .attr('rx', 4)
      .attr('ry', 4)
      .style('fill', 'rgba(0, 0, 0, 0.8)')
      .style('stroke', lineColor)
      .style('stroke-width', 1);
      
    const tooltipText = tooltip.append('text')
      .attr('x', 8)
      .attr('y', 20)
      .style('font-size', '12px')
      .style('fill', '#fff');

    // Invisible larger hover targets
    chart.selectAll('.hover-target')
      .data(data)
      .join('circle')
        .attr('class', 'hover-target')
        .attr('cx', d => type === 'hourly' ? x(d.hour) : x(d.weekday) + x.bandwidth() / 2)
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
        
        const label = type === 'hourly' ? `${d.hour}:00` : d.weekday;
        
        // Update tooltip content
        tooltipText.selectAll('*').remove();
        tooltipText.append('tspan')
          .attr('x', 8)
          .attr('y', 20)
          .attr('font-weight', 'bold')
          .text(label);
        tooltipText.append('tspan')
          .attr('x', 8)
          .attr('y', 35)
          .text(`Count: ${formattedCount}`);
        
        // Calculate position for tooltip
        const [mouseX, mouseY] = d3.pointer(event, svg.node());
        tooltip
          .attr('transform', `translate(${mouseX + 10}, ${mouseY - 50})`)
          .transition().duration(200)
          .style('opacity', 1);
        
        // Show data point
        dataPoints.style('opacity', 0);
        
        // Find the index of the current data point to highlight it
        const dataIndex = data.findIndex(item => 
          type === 'hourly' 
            ? item.hour === d.hour 
            : item.weekday === d.weekday
        );
        
        if (dataIndex !== -1) {
          d3.select(dataPoints.nodes()[dataIndex])
            .style('opacity', 1)
            .attr('r', 4);
        }
      })
      .on('mousemove', (event) => {
        const [mouseX, mouseY] = d3.pointer(event, svg.node());
        tooltip
          .attr('transform', `translate(${mouseX + 10}, ${mouseY - 50})`);
      })
      .on('mouseout', () => {
        tooltip.transition().duration(200).style('opacity', 0);
        dataPoints.style('opacity', 0);
      });
  };

  // Determine combined loading state
  const isLoading = loading || (hourlyLoading && weekdayLoading);
  const hasData = (hourlyData && hourlyData.length > 0) || (weekdayData && weekdayData.length > 0);

  // Loading overlay
  const loadingOverlay = isLoading ? (
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
  const noDataOverlay = (!isLoading && !hasData) ? (
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
      {/* Main title */}
      <div style={{ 
        padding: "10px 15px", 
        fontSize: "12px", 
        fontWeight: "bold",
        fontFamily: "sans-serif",
        color: "#333"
      }}>
      </div>
      
      {/* Charts container */}
      <div style={{ 
        display: "flex", 
        flexDirection: "column", 
        height: "calc(100% - 36px)", 
        padding: "0 5px" 
      }}>
        {/* Hourly chart */}
        <div style={{ height: "50%", position: "relative" }}>
          <svg
            ref={hourlyChartRef}
            style={{ 
              width: "100%", 
              height: "100%"
            }}
          />
          {hourlyLoading && (
            <div style={{ 
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              display: "flex", 
              justifyContent: "center", 
              alignItems: "center", 
              backgroundColor: "rgba(255, 255, 255, 0.7)",
              fontSize: "11px",
              color: "#666"
            }}>
              Loading hourly data...
            </div>
          )}
        </div>
        
        {/* Weekday chart */}
        <div style={{ height: "50%", position: "relative" }}>
          <svg
            ref={weekdayChartRef}
            style={{ 
              width: "100%", 
              height: "100%"
            }}
          />
          {weekdayLoading && (
            <div style={{ 
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              display: "flex", 
              justifyContent: "center", 
              alignItems: "center", 
              backgroundColor: "rgba(255, 255, 255, 0.7)",
              fontSize: "11px",
              color: "#666"
            }}>
              Loading weekday data...
            </div>
          )}
        </div>
      </div>
      
      {/* Global overlays */}
      {loadingOverlay}
      {noDataOverlay}
    </div>
  );
}