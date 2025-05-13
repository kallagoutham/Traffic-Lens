// components/SunburstChart.js
import React, { useRef, useEffect, useState } from "react";
import * as d3 from "d3";
import { API_BASE_URL, ENDPOINTS } from "../constants/constants";

export default function SunburstChart({
  selectedState = "",
  width = 600,
  height = 600,
}) {
  const svgRef = useRef();
  const [data, setData] = useState(null);
  const [activeSegment, setActiveSegment] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch data
  useEffect(() => {
    setLoading(true);
    const qs = selectedState ? `?state=${selectedState}` : "";
    fetch(`${API_BASE_URL}${ENDPOINTS.SUNBURST}${qs}`)
      .then((r) => r.json())
      .then(data => {
        setData(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [selectedState]);

  // Function to get the full path of a node
  const getNodePath = (node) => {
    if (!node) return "";
    const path = [];
    let current = node;
    
    while (current) {
      if (current.data && current.data.name) {
        path.unshift(current.data.name);
      }
      current = current.parent;
    }
    
    return path.join(" → ");
  };

  useEffect(() => {
    if (!data) return;

    // Dimensions
    const radius = Math.min(width, height) / 2;
    const innerRadius = radius * 0.3;
    
    // Custom color schemes for seasons
    const seasonColors = {
      // Spring colors (greens)
      "Spring": ["#8dd3c7", "#a1d99b", "#b3de69", "#cceca6"],
      // Summer colors (warm tones)
      "Summer": ["#fb8072", "#fdb462", "#ffbb78", "#fdd0a2"],
      // Fall colors (earth tones)
      "Fall": ["#bc80bd", "#d9a6c2", "#fccde5", "#f2f2f2"],
      // Winter colors (cool tones)
      "Winter": ["#80b1d3", "#a6cee3", "#b8d2ec", "#cce6f6"],
      // Additional named seasons
      "Q1": ["#8dd3c7", "#a1d99b", "#b3de69", "#cceca6"],
      "Q2": ["#fb8072", "#fdb462", "#ffbb78", "#fdd0a2"],
      "Q3": ["#bc80bd", "#d9a6c2", "#fccde5", "#f2f2f2"],
      "Q4": ["#80b1d3", "#a6cee3", "#b8d2ec", "#cce6f6"]
    };

    // Default color scheme
    const defaultColorScheme = d3.schemeCategory10;

    // Build hierarchy & partition
    const root = d3
      .hierarchy(data)
      .sum((d) => d.value || 0)
      .sort((a, b) => b.value - a.value);
      
    // Store reference to root for percentage calculations
    const rootValue = root.value;

    d3.partition()
      .size([2 * Math.PI, radius - 20])
      .padding(0.02)(root);

    // Arc generator with padAngle for space between segments
    const arc = d3
      .arc()
      .startAngle((d) => d.x0)
      .endAngle((d) => d.x1)
      .innerRadius((d) => (d.depth > 1 ? d.y0 : innerRadius))
      .outerRadius((d) => d.y1)
      .padAngle(0.02)
      .padRadius(radius / 3);

    // Clear SVG
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    // Create root group
    const g = svg
      .attr("viewBox", `0 0 ${width} ${height}`)
      .append("g")
      .attr("transform", `translate(${width/2},${height/2})`);

    // Add drop shadow effect for depth
    const defs = svg.append("defs");
    const filter = defs.append("filter")
      .attr("id", "drop-shadow")
      .attr("height", "130%");
    
    filter.append("feGaussianBlur")
      .attr("in", "SourceAlpha")
      .attr("stdDeviation", 3)
      .attr("result", "blur");
      
    filter.append("feOffset")
      .attr("in", "blur")
      .attr("dx", 1)
      .attr("dy", 1)
      .attr("result", "offsetBlur");
      
    const feComponentTransfer = filter.append("feComponentTransfer")
      .attr("in", "offsetBlur")
      .attr("result", "offsetBlur");
      
    feComponentTransfer.append("feFuncA")
      .attr("type", "linear")
      .attr("slope", 0.5);
      
    const feMerge = filter.append("feMerge");
    feMerge.append("feMergeNode")
      .attr("in", "offsetBlur");
    feMerge.append("feMergeNode")
      .attr("in", "SourceGraphic");

    // Filter segments: depth 1 to 3
    const segments = root.descendants().filter(d => d.depth > 0 && d.depth <= 3);

    // Helper function to check if nodes are related
    const isRelated = (node, target) => {
      if (!node || !target) return false;
      
      // Same node
      if (node === target) return true;
      
      // Check ancestry
      let current = target;
      while (current.parent) {
        if (current.parent === node) return true;
        current = current.parent;
      }
      
      current = node;
      while (current.parent) {
        if (current.parent === target) return true;
        current = current.parent;
      }
      
      return false;
    };

    // Calculate color for a node
    const getColor = (d) => {
      // Find top-level parent (season)
      const topParent = d.ancestors().find(a => a.depth === 1);
      if (!topParent) return defaultColorScheme[0];
      
      const seasonName = topParent.data.name;
      const seasonPalette = seasonColors[seasonName] || defaultColorScheme;
      
      // Different shade based on depth
      const depthIndex = Math.min(d.depth - 1, seasonPalette.length - 1);
      return seasonPalette[depthIndex];
    };

    // Create paths for segments with enhanced interactivity
    const path = g.selectAll("path")
      .data(segments)
      .enter()
      .append("path")
      .attr("d", arc)
      .attr("fill", getColor)
      .attr("stroke", "#fff")
      .attr("stroke-width", 1.5)
      .style("cursor", "pointer")
      .style("transition", "all 0.3s ease")
      .on("mouseover", (event, d) => {
        // Highlight the current segment
        setActiveSegment(d);
        
        // Highlight related segments, dim others
        path
          .transition()
          .duration(300)
          .attr("opacity", node => isRelated(node, d) ? 1 : 0.4)
          .attr("transform", node => {
            if (node === d) {
              // Push outward for emphasis
              const angle = (node.x0 + node.x1) / 2;
              const distance = 5; // pixels to move
              return `translate(${Math.cos(angle) * distance},${Math.sin(angle) * distance})`;
            }
            return "";
          });
        
        // Make text more visible for related segments
        text
          .transition()
          .duration(300)
          .attr("opacity", node => isRelated(node, d) ? 1 : 0.5);
      })
      .on("mouseout", () => {
        // Reset all segments
        setActiveSegment(null);
        
        path
          .transition()
          .duration(300)
          .attr("opacity", 1)
          .attr("transform", "");
        
        text
          .transition()
          .duration(300)
          .attr("opacity", 1);
      })
      .on("click", (event, d) => {
        // Zoom functionality could be added here
        console.log(`Clicked: ${d.data.name}, Value: ${d.value}`);
        
        // Example: toggle selection
        // if (activeSegment === d) {
        //   setActiveSegment(null);
        // } else {
        //   setActiveSegment(d);
        // }
      });

    // Add percentage labels directly in segments
    const addPercent = (d) => {
      if (!rootValue) return "";
      const percentage = ((100 * d.value) / rootValue).toFixed(1);
      if (percentage < 1) return ""; // Don't show very small percentages
      return `${percentage}%`;
    };

    // Smart label positioning for better readability
    const text = g.selectAll("text")
      .data(segments.filter(d => {
        // Only show text for segments that have enough space
        const angle = d.x1 - d.x0;
        const area = angle * (d.y1 - d.y0);
        return d.depth <= 2 && area > 0.03;
      }))
      .enter()
      .append("text")
      .attr("transform", d => {
        const angle = ((d.x0 + d.x1) / 2) * 180 / Math.PI - 90;
        const radius = (d.y0 + d.y1) / 2;
        const rotate = angle > 90 ? angle - 180 : angle;
        return `rotate(${angle}) translate(${radius},0) rotate(${-rotate})`;
      })
      .attr("dy", "0.35em")
      .attr("text-anchor", "middle")
      .attr("pointer-events", "none") // Make text non-interactive
      .attr("font-size", d => {
        // Adjust font size based on segment size
        const angle = d.x1 - d.x0;
        if (angle < 0.2) return "8px";
        if (d.depth === 1) return "12px";
        return "10px";
      })
      .attr("font-weight", d => d.depth === 1 ? "bold" : "normal")
      .style("text-shadow", "0px 0px 2px rgba(255,255,255,0.8)")
      .text(d => {
        // Show name for larger segments, percentage for smaller ones
        const angle = d.x1 - d.x0;
        if (angle < 0.1) return addPercent(d);
        return d.data.name;
      });
      
    // Add percentage as separate tspan for larger segments
    text.filter(d => (d.x1 - d.x0) > 0.1)
      .append("tspan")
      .attr("x", 0)
      .attr("dy", "1.2em")
      .attr("font-size", "9px")
      .attr("font-weight", "normal")
      .text(addPercent);
      
    // Add center circle with subtle shadow
    g.append("circle")
      .attr("r", innerRadius)
      .attr("fill", "white")
      .attr("stroke", "#eee")
      .style("filter", "url(#drop-shadow)");

    // Add center text
    const centerLabel = g.append("text")
      .attr("text-anchor", "middle")
      .attr("pointer-events", "none");
      
    centerLabel.append("tspan")
      .attr("x", 0)
      .attr("dy", "-0.2em")
      .attr("font-size", "14px")
      .attr("font-weight", "bold")
      .text("Season");
      
    centerLabel.append("tspan")
      .attr("x", 0)
      .attr("dy", "1.2em")
      .attr("font-size", "12px")
      .text("Analysis");

    // Add shadow to improve contrast with background
    text.style("text-shadow", "0px 0px 3px rgba(255, 255, 255, 0.7)");

    // Add legend for top categories
    const topCategories = root.children || [];
    const legendG = svg.append("g")
      .attr("transform", `translate(${width - 120}, 30)`)
      .attr("font-size", "10px");

    const legendItems = legendG.selectAll(".legend-item")
      .data(topCategories)
      .enter()
      .append("g")
      .attr("class", "legend-item")
      .attr("transform", (d, i) => `translate(0, ${i * 20})`)
      .style("cursor", "pointer")
      .on("mouseover", (event, d) => {
        // Highlight related segments on legend hover
        path
          .transition()
          .duration(200)
          .attr("opacity", node => {
            const isChild = node.ancestors().some(a => a === d);
            return isChild ? 1 : 0.3;
          });
      })
      .on("mouseout", () => {
        // Reset on mouseout
        path
          .transition()
          .duration(200)
          .attr("opacity", 1);
      });

    legendItems.append("rect")
      .attr("width", 12)
      .attr("height", 12)
      .attr("rx", 2)
      .attr("fill", d => getColor(d));

    legendItems.append("text")
      .attr("x", 18)
      .attr("y", 9)
      .text(d => {
        const percentage = rootValue ? ((100 * d.value) / rootValue).toFixed(1) : "0.0";
        return `${d.data.name} (${percentage}%)`;
      });

  }, [data, width, height]);

  // Show loading state
  if (loading && !data) {
    return (
      <div className="sunburst-loading" style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        width: "100%",
        minHeight: "300px"
      }}>
        <div className="loading-spinner" style={{
          width: "40px",
          height: "40px",
          border: "4px solid rgba(0, 0, 0, 0.1)",
          borderLeft: "4px solid #767676",
          borderRadius: "50%",
          animation: "spin 1s linear infinite"
        }}></div>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="sunburst-container" style={{ 
      position: "relative", 
      width: "100%", 
      height: "100%",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
    }}>
      <svg ref={svgRef} style={{ width: "100%", height: "100%" }} />
      
      {activeSegment && (
        <div className="info-panel" style={{
          position: "absolute",
          bottom: 20,
          left: 20,
          background: "rgba(255,255,255,0.95)",
          padding: "10px 15px",
          borderRadius: "8px",
          boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
          border: "1px solid rgba(0,0,0,0.05)",
          transition: "all 0.3s ease",
          maxWidth: "250px",
          zIndex: 10
        }}>
          <div style={{ 
            fontWeight: "bold", 
            marginBottom: "5px",
            borderBottom: "1px solid #eee",
            paddingBottom: "5px", 
            fontSize: "14px"
          }}>
            {getNodePath(activeSegment)}
          </div>
          
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px" }}>
            <span style={{ color: "#666", fontSize: "12px" }}>Value:</span>
            <span style={{ fontWeight: "500", fontSize: "12px" }}>{activeSegment.value.toLocaleString()}</span>
          </div>
          
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "#666", fontSize: "12px" }}>Percentage:</span>
            <span style={{ 
              fontWeight: "500", 
              fontSize: "12px",
              color: "#1a73e8" 
            }}>
              {((100 * activeSegment.value) / activeSegment.parent?.value || 0).toFixed(1)}%
            </span>
          </div>
        </div>
      )}
    </div>
  );
}