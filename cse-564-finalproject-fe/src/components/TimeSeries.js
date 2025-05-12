import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
/**
 * Props:
 *  - hourlyData: Array<{ hour: number; count: number }>
 *  - yearlyData: Array<{ year: number; count: number }>
 *  - hourlyLoading: boolean
 *  - yearlyLoading: boolean
 */
export default function TimeSeries({
  hourlyData = [],
  yearlyData = [],
  hourlyLoading = false,
  yearlyLoading = false,
}) {
  const containerRef = useRef();
  const hourlyChartRef = useRef();
  const yearlyChartRef = useRef();
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  // Measure container
  useEffect(() => {
    if (!containerRef.current) return;
    const update = () => {
      const { width, height } = containerRef.current.getBoundingClientRect();
      setDimensions({ width, height });
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  // Render hourly chart
  useEffect(() => {
    if (hourlyLoading || !hourlyData.length || !dimensions.width) return;
    const svg = d3.select(hourlyChartRef.current)
      .attr('viewBox', `0 0 ${dimensions.width} ${dimensions.height / 2}`)
      .attr('preserveAspectRatio', 'xMidYMid meet');
    svg.selectAll('*').remove();

    const margin = { top: 15, right: 20, bottom: 40, left: 60 };
    const innerW = dimensions.width - margin.left - margin.right;
    const innerH = dimensions.height / 2 - margin.top - margin.bottom;
    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const x = d3.scaleLinear().domain([0, 23]).range([0, innerW]);
    const maxY = d3.max(hourlyData, d => d.count) || 0;
    const y = d3.scaleLinear().domain([0, maxY * 1.1]).nice().range([innerH, 0]);

    g.append('g')
      .call(d3.axisLeft(y).ticks(5).tickSize(-innerW).tickFormat(''))
      .selectAll('line').attr('stroke', '#e0e0e0').attr('stroke-dasharray', '3,3');
    g.select('.domain').remove();

    const area = d3.area()
      .curve(d3.curveMonotoneX)
      .x(d => x(d.hour))
      .y0(innerH)
      .y1(d => y(d.count));
    const line = d3.line()
      .curve(d3.curveMonotoneX)
      .x(d => x(d.hour))
      .y(d => y(d.count));

    g.append('path').datum(hourlyData)
      .attr('fill', 'rgba(77,255,77,0.1)').attr('d', area);
    g.append('path').datum(hourlyData)
      .attr('fill', 'none').attr('stroke', '#4dff4d').attr('stroke-width', 2).attr('d', line);

    g.append('g').attr('transform', `translate(0,${innerH})`)
      .call(d3.axisBottom(x).ticks(12).tickFormat(d => `${d}:00`))
      .selectAll('text')
        .attr('font-size', '9px')
        .attr('font-family', 'sans-serif')
        .attr('transform', 'rotate(-30)')
        .attr('text-anchor', 'end')
        .attr('dx', '-0.8em')
        .attr('dy', '0.15em');

    g.append('g')
      .call(d3.axisLeft(y).ticks(5).tickFormat(v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v))
      .selectAll('text')
        .attr('font-size', '9px')
        .attr('font-family', 'sans-serif')
        .attr('dx', '-0.5em');

    svg.append('text')
      .attr('x', margin.left).attr('y', 12)
      .attr('font-size', '11px').attr('font-weight', 'bold')
      .attr('font-family', 'sans-serif').attr('fill', '#333')
      .text('Hourly Distribution');
  }, [hourlyData, hourlyLoading, dimensions]);

  // Render yearly chart
  useEffect(() => {
    if (yearlyLoading || !yearlyData.length || !dimensions.width) return;
    const svg = d3.select(yearlyChartRef.current)
      .attr('viewBox', `0 0 ${dimensions.width} ${dimensions.height / 2}`)
      .attr('preserveAspectRatio', 'xMidYMid meet');
    svg.selectAll('*').remove();

    const margin = { top: 15, right: 20, bottom: 40, left: 60 };
    const innerW = dimensions.width - margin.left - margin.right;
    const innerH = dimensions.height / 2 - margin.top - margin.bottom;
    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const x = d3.scaleBand().domain(yearlyData.map(d => d.year)).range([0, innerW]).padding(0.2);
    const maxY = d3.max(yearlyData, d => d.count) || 0;
    const y = d3.scaleLinear().domain([0, maxY * 1.1]).nice().range([innerH, 0]);

    g.append('g')
      .call(d3.axisLeft(y).ticks(5).tickFormat(v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v))
      .selectAll('text')
        .attr('font-size', '9px')
        .attr('font-family', 'sans-serif')
        .attr('dx', '-0.5em');
    g.select('.domain').attr('stroke', '#ccc');

    g.append('g').attr('transform', `translate(0,${innerH})`)
      .call(d3.axisBottom(x))
      .selectAll('text')
        .attr('font-size', '9px')
        .attr('font-family', 'sans-serif');

    const line = d3.line()
      .x(d => x(d.year) + x.bandwidth() / 2)
      .y(d => y(d.count))
      .curve(d3.curveMonotoneX);

    g.append('path').datum(yearlyData)
      .attr('fill', 'none').attr('stroke', '#4d79ff').attr('stroke-width', 2).attr('d', line);

    svg.append('text')
      .attr('x', margin.left).attr('y', 12)
      .attr('font-size', '11px').attr('font-weight', 'bold')
      .attr('font-family', 'sans-serif').attr('fill', '#333')
      .text('Yearly Distribution');
  }, [yearlyData, yearlyLoading, dimensions]);

  const isLoading = hourlyLoading || yearlyLoading;
  const hasData = hourlyData.length || yearlyData.length;

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative' }}>
      {/* Hourly Chart */}
      <div style={{ height: '50%', position: 'relative' }}>
        <svg ref={hourlyChartRef} style={{ width: '100%', height: '100%' }} />
        {hourlyLoading && (
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
            display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.7)', fontSize: '11px', color: '#666' }}>
            Loading hourly data...
          </div>
        )}
      </div>

      {/* Yearly Chart */}
      <div style={{ height: '50%', position: 'relative' }}>
        <svg ref={yearlyChartRef} style={{ width: '100%', height: '100%' }} />
        {yearlyLoading && (
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
            display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.7)', fontSize: '11px', color: '#666' }}>
            Loading yearly data...
          </div>
        )}
      </div>

      {/* No data overlay */}
      {!isLoading && !hasData && (
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
          display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.7)', fontStyle: 'italic', color: '#888' }}>
          No data available
        </div>
      )}
    </div>
  );
}
