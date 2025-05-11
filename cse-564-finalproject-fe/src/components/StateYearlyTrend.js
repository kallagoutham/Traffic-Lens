import React, { useRef, useEffect } from "react";
import * as d3 from "d3";

/**
 * Props:
 *  - data: Array<{ year: number; count: number }>
 *  - loading: boolean
 *  - yAxisLabel?: string       // e.g. "Count (×1 000)"
 */
export default function StateYearlyTrend({
  data,
  loading,
  yAxisLabel = "Count",
}) {
  const svgRef = useRef();

  useEffect(() => {
    if (loading || !data || data.length === 0) return;

    // set up SVG
    const svg = d3.select(svgRef.current)
      .attr("viewBox", "0 0 350 200") // increased width for better spacing
      .attr("preserveAspectRatio", "xMidYMid meet");
    svg.selectAll("*").remove();

    const margin = { top: 20, right: 15, bottom: 40, left: 60 }; // increased left margin for y-axis labels
    const W = 350, H = 200;
    const innerW = W - margin.left - margin.right;
    const innerH = H - margin.top - margin.bottom;

    const g = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // scales
    const x = d3.scaleBand()
      .domain(data.map(d => d.year))
      .range([0, innerW])
      .padding(0.2);

    const maxY = d3.max(data, d => d.count) || 0;
    const y = d3.scaleLinear()
      .domain([0, maxY * 1.1])
      .nice()
      .range([innerH, 0]);

    // grid
    g.append("g")
      .attr("class", "grid")
      .call(d3.axisLeft(y)
        .ticks(5)
        .tickSize(-innerW)
        .tickFormat(""))
      .selectAll("line")
        .attr("stroke", "#e0e0e0")
        .attr("stroke-dasharray", "3,3");

    g.select(".grid").select(".domain").remove(); // Remove axis line from grid

    // Format y-axis values based on magnitude
    const formatYAxis = (value) => {
      if (value >= 1000000) {
        return `${(value / 1000000).toFixed(1)}M`;
      } else if (value >= 1000) {
        return `${(value / 1000).toFixed(0)}k`;
      }
      return value;
    };

    // axes
    const xAxis = d3.axisBottom(x).tickSize(0);
    const yAxis = d3.axisLeft(y)
      .ticks(5)
      .tickFormat(formatYAxis);

    g.append("g")
      .attr("class", "x-axis")
      .attr("transform", `translate(0,${innerH})`)
      .call(xAxis)
      .selectAll("text")
        .attr("font-size", "9px")
        .attr("font-family", "sans-serif");

    g.append("g")
      .attr("class", "y-axis")
      .call(yAxis)
      .selectAll("text")
        .attr("font-size", "9px")
        .attr("font-family", "sans-serif")
        .attr("dx", "-0.5em"); // Adjust text position to avoid overlap

    // Remove axis lines
    g.select(".x-axis").select(".domain").attr("stroke", "#ccc");
    g.select(".y-axis").select(".domain").attr("stroke", "#ccc");

    // axis labels
    svg.append("text")
      .attr("x", margin.left + innerW/2)
      .attr("y", H - 6)
      .attr("text-anchor", "middle")
      .attr("font-size", "10px")
      .attr("font-family", "sans-serif")
      .attr("fill", "#555")
      .text("Year");

    svg.append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -(margin.top + innerH/2))
      .attr("y", 16)
      .attr("text-anchor", "middle")
      .attr("font-size", "10px")
      .attr("font-family", "sans-serif")
      .attr("fill", "#555")
      .text(yAxisLabel);

    // tooltip div (once)
    let tip = d3.select("body").select(".d3-tooltip");
    if (tip.empty()) {
      tip = d3.select("body")
        .append("div")
        .attr("class", "d3-tooltip")
        .style("position", "absolute")
        .style("padding", "6px 10px")
        .style("background", "rgba(0,0,0,0.8)")
        .style("color", "#fff")
        .style("font-size", "12px")
        .style("font-family", "sans-serif")
        .style("border-radius", "4px")
        .style("pointer-events", "none")
        .style("z-index", "1000")
        .style("opacity", 0);
    }

    // bars + hover
    g.selectAll(".bar")
      .data(data)
      .join("rect")
        .attr("class", "bar")
        .attr("x", d => x(d.year))
        .attr("y", d => y(d.count))
        .attr("width", x.bandwidth())
        .attr("height", d => innerH - y(d.count))
        .attr("fill", "#4d79ff")
        .attr("rx", 2) // Slightly rounded corners
        .attr("ry", 2)
      .on("mouseover", (event, d) => {
        d3.select(event.currentTarget).attr("fill", "#759eff");
        
        const formattedValue = d.count >= 1000000 
          ? `${(d.count / 1000000).toFixed(2)}M` 
          : `${d.count.toLocaleString()}`;
        
        tip
          .html(`<strong>${d.year}</strong><br/>${formattedValue}`)
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 28) + "px")
          .transition().duration(200).style("opacity", 0.9);
      })
      .on("mouseout", (event) => {
        d3.select(event.currentTarget).attr("fill", "#4d79ff");
        tip.transition().duration(200).style("opacity", 0);
      });

    // optional bar labels if wide enough
    if (x.bandwidth() > 24) {
      g.selectAll(".bar-label")
        .data(data)
        .join("text")
          .attr("class", "bar-label")
          .attr("x", d => x(d.year) + x.bandwidth()/2)
          .attr("y", d => y(d.count) - 5)
          .attr("text-anchor", "middle")
          .attr("font-size", "8px")
          .attr("font-family", "sans-serif")
          .attr("fill", "#333")
          .text(d => {
            if (d.count >= 1000000) {
              return `${(d.count / 1000000).toFixed(1)}M`;
            }
            return `${(d.count / 1000).toFixed(0)}k`;
          });
    }

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