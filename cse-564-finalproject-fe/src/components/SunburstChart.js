// components/SunburstChart.js - Updated to use data from App.js
import React, { useRef, useEffect, useState } from "react";
import * as d3 from "d3";

export default function SunburstChart({
  data,
  loading = false,
  error = null,
  width = 600,
  height = 600,
  filterInfo = null
}) {
  const svgRef = useRef();
  const [activeSegment, setActiveSegment] = useState(null);
  const [expandedLevels, setExpandedLevels] = useState(2);

  const seasonOrder = ["Spring", "Summer", "Fall", "Winter"];

  useEffect(() => {
    if (!data) return;

    const radius = Math.min(width, height) / 2;
    const innerRadius = radius * 0.25; // Smaller inner circle for more space

    const seasonColors = {
      Spring: ["#99d98c", "#76c893", "#52b69a"],
      Summer: ["#e9c46a", "#f4a261", "#e76f51"],
      Fall: ["#bc6c25", "#dda15e", "#fefae0"],
      Winter: ["#005f73", "#0a9396", "#94d2bd"]
    };

    const root = d3
      .hierarchy(data)
      .sum((d) => d.value || 0);
    
    d3.partition().size([2 * Math.PI, radius - 20])(root);

    const arc = d3
      .arc()
      .startAngle((d) => d.x0)
      .endAngle((d) => d.x1)
      .innerRadius((d) => {
        if (d.depth > expandedLevels) {
          return d.parent ? d.parent.y0 : innerRadius;
        }
        return d.depth === 1 ? innerRadius : d.y0;
      })
      .outerRadius((d) => {
        if (d.depth > expandedLevels) {
          return d.parent ? d.parent.y0 : innerRadius;
        }
        return d.y1;
      })
      .padAngle(0.02) // Increased for better separation
      .padRadius(radius / 3);
    const segments = root
      .descendants()
      .filter((d) => d.depth > 0 && d.depth <= expandedLevels);

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();
    svg.attr("viewBox", `0 0 ${width} ${height}`);

    const defs = svg.append("defs");
    const gradient = defs.append("radialGradient")
      .attr("id", "sunburst-background")
      .attr("cx", "50%")
      .attr("cy", "50%")
      .attr("r", "50%");
      
    gradient.append("stop")
      .attr("offset", "0%")
      .attr("stop-color", "#f8f9fa")
      .attr("stop-opacity", 1);
      
    gradient.append("stop")
      .attr("offset", "100%")
      .attr("stop-color", "#e9ecef")
      .attr("stop-opacity", 1);
    
    svg.append("circle")
      .attr("cx", width / 2)
      .attr("cy", height / 2 + 10)
      .attr("r", radius + 10)
      .attr("fill", "url(#sunburst-background)");

    // Title text with filter info
    const chartTitle = svg
      .append("text")
      .attr("x", width / 2)
      .attr("y", 30)
      .attr("text-anchor", "middle")
      .attr("font-size", "18px")
      .attr("font-weight", "bold")
      .attr("fill", "#343a40");    
    // If there are active filters, add subtitle
    if (filterInfo && (filterInfo.timeRange || Object.keys(filterInfo.pcpValues).length > 0)) {
      svg
        .append("text")
        .attr("x", width / 2)
        .attr("y", 55)
        .attr("text-anchor", "middle")
        .attr("font-size", "14px")
        .attr("fill", "#6c757d")
        .text(() => {
          const filterTexts = [];
          if (filterInfo.timeRange) {
            filterTexts.push(`Time: ${filterInfo.timeRange.start}:00-${filterInfo.timeRange.end}:00`);
          }
          if (filterInfo.pcpValues && Object.keys(filterInfo.pcpValues).length > 0) {
            const pcpFilter = Object.entries(filterInfo.pcpValues)
              .map(([key, [min, max]]) => `${key}: ${min.toFixed(1)}-${max.toFixed(1)}`)
              .join(", ");
            filterTexts.push(pcpFilter);
          }
          return filterTexts.join(" | ");
        });
    }

    const g = svg
      .append("g")
      .attr("transform", `translate(${width / 2},${height / 2 + 10})`);

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
      
    const femerge = filter.append("feMerge");
    femerge.append("feMergeNode")
      .attr("in", "offsetBlur");
    femerge.append("feMergeNode")
      .attr("in", "SourceGraphic");

    // Add filter indicator if filters are active
    if (filterInfo && (filterInfo.timeRange || Object.keys(filterInfo.pcpValues).length > 0)) {
      const filterIndicator = defs.append("filter")
        .attr("id", "glow-filter")
        .attr("height", "130%");
      
      filterIndicator.append("feGaussianBlur")
        .attr("in", "SourceAlpha")
        .attr("stdDeviation", 3)
        .attr("result", "blur");
      
      filterIndicator.append("feComponentTransfer")
        .append("feFuncA")
        .attr("type", "linear")
        .attr("slope", 0.7);
      
      const feMerge = filterIndicator.append("feMerge");
      feMerge.append("feMergeNode")
        .attr("in", "blur");
      feMerge.append("feMergeNode")
        .attr("in", "SourceGraphic");
      
      g.append("circle")
        .attr("r", radius + 15)
        .attr("fill", "none")
        .attr("stroke", "#cc0000")
        .attr("stroke-width", 3)
        .attr("stroke-dasharray", "10,10")
        .attr("opacity", 0.4)
        .attr("filter", "url(#glow-filter)")
        .style("pointer-events", "none");
        
      // Add subtle animation to the filter indicator
      const indicator = g.append("circle")
        .attr("r", radius + 15)
        .attr("fill", "none")
        .attr("stroke", "#cc0000")
        .attr("stroke-width", 3)
        .attr("stroke-dasharray", "10,10")
        .attr("stroke-dashoffset", 0)
        .attr("opacity", 0.6)
        .style("pointer-events", "none");
        
      // Animate the stroke-dashoffset
      indicator.append("animateTransform")
        .attr("attributeName", "transform")
        .attr("type", "rotate")
        .attr("from", "0 0 0")
        .attr("to", "360 0 0")
        .attr("dur", "30s")
        .attr("repeatCount", "indefinite");
    }

    const centerGroup = g.append("g")
      .attr("class", "center-button");
      
    centerGroup.append("circle")
      .attr("r", innerRadius)
      .attr("fill", "white")
      .attr("stroke", "#dee2e6")
      .attr("stroke-width", 2)
      .attr("filter", "url(#drop-shadow)")
      .style("cursor", "pointer")
      .on("click", handleCenterClick);

    const iconSize = innerRadius * 0.4;
    centerGroup.append("rect")
      .attr("x", -iconSize / 4)
      .attr("y", -iconSize / 4)
      .attr("width", iconSize / 2)
      .attr("height", iconSize / 2)
      .attr("fill", "#495057")
      .style("cursor", "pointer")
      .on("click", handleCenterClick);
      
    if (expandedLevels === 1) {
      centerGroup.append("rect")
        .attr("x", -iconSize / 4)
        .attr("y", -iconSize / 4)
        .attr("width", iconSize / 2)
        .attr("height", iconSize / 2)
        .attr("transform", "rotate(90)")
        .attr("fill", "#495057")
        .style("cursor", "pointer")
        .on("click", handleCenterClick);
    }

    // Center text
    centerGroup.append("text")
      .attr("text-anchor", "middle")
      .attr("font-size", "10px")
      .attr("dy", innerRadius * 0.6)
      .attr("fill", "#495057")
      .text(expandedLevels === 1 ? "Expand" : "Collapse")
      .style("cursor", "pointer")
      .on("click", handleCenterClick);

    // Draw arcs with animation and enhanced styling
    const paths = g.selectAll("path.segment")
      .data(segments)
      .enter()
      .append("path")
      .attr("class", "segment")
      .attr("d", arc)
      .attr("fill", (d) => {
        const season = d.ancestors().find(a => a.depth === 1)?.data.name;
        if (!season || !seasonColors[season]) return "#adb5bd";
        
        // Distribute colors based on depth
        return seasonColors[season][Math.min(d.depth - 1, seasonColors[season].length - 1)];
      })
      .attr("stroke", "#fff")
      .attr("stroke-width", 1.5)
      .style("cursor", "pointer")
      .style("opacity", 0) // Start invisible for animation
      .on("mouseover", handleMouseOver)
      .on("mouseout", handleMouseOut)
      .on("click", (event, d) => handleSegmentClick(d));
    
    // Add entrance animation
    paths.transition()
      .duration(600)
      .delay((d, i) => i * 10)
      .style("opacity", 0.9);

    // Labels for depth 1 & 2 segments
    g.selectAll("text.segment-label")
      .data(segments.filter(d => (d.x1 - d.x0) > 0.15)) // Only show labels for segments with enough space
      .enter()
      .append("text")
      .attr("class", "segment-label")
      .attr("transform", d => {
        const [x, y] = arc.centroid(d);
        const angle = (d.x0 + d.x1) / 2 * 180 / Math.PI - 90;
        const rotate = angle > 90 && angle < 270 ? angle + 180 : angle;
        return `translate(${x}, ${y}) rotate(${rotate})`;
      })
      .attr("text-anchor", "middle")
      .attr("font-size", d => d.depth === 1 ? "12px" : "10px")
      .attr("fill", "white")
      .attr("font-weight", d => d.depth === 1 ? "bold" : "normal")
      .style("text-shadow", "0px 0px 3px rgba(0,0,0,0.5)")
      .style("pointer-events", "none") 
      .style("opacity", 0) 
      .text(d => {
        if (root && root.value && (d.x1 - d.x0) > 0.25) { 
          const percentage = ((d.value / root.value) * 100).toFixed(1);
          return `${d.data.name} (${percentage}%)`;
        }
        return d.data.name;
      })
      .transition()
      .duration(800)
      .delay((d, i) => 300 + i * 20)
      .style("opacity", 1);
      
    g.selectAll("text.percentage-label")
      .data(segments.filter(d => (d.x1 - d.x0) <= 0.25 && (d.x1 - d.x0) > 0.12)) // Medium segments
      .enter()
      .append("text")
      .attr("class", "percentage-label")
      .attr("transform", d => {
        let [x, y] = arc.centroid(d);
        const angle = (d.x0 + d.x1) / 2 * 180 / Math.PI - 90;
        const rotate = angle > 90 && angle < 270 ? angle + 180 : angle;
        return `translate(${x}, ${y + 12}) rotate(${rotate})`;
      })
      .attr("text-anchor", "middle")
      .attr("font-size", "9px")
      .attr("fill", "white")
      .style("text-shadow", "0px 0px 2px rgba(0,0,0,0.6)")
      .style("pointer-events", "none")
      .style("opacity", 0)
      .text(d => {
        if (root && root.value) {
          const percentage = ((d.value / root.value) * 100).toFixed(1);
          return `${percentage}%`;
        }
        return "";
      })
      .transition()
      .duration(800)
      .delay((d, i) => 500 + i * 20)
      .style("opacity", 0.9);

    function handleCenterClick() {
      setExpandedLevels(expandedLevels === 1 ? 2 : 1); 
    }

    function handleSegmentClick(d) {
      if (expandedLevels === 2) { 
        setExpandedLevels(d.depth);
      } else {
        if (d.depth <= expandedLevels) {
          setExpandedLevels(Math.min(d.depth + 1, 2)); 
        }
      }
    }
    
    function handleMouseOver(event, d) {
      d3.select(this)
        .transition()
        .duration(200)
        .attr("stroke-width", 2)
        .style("opacity", 1);
      
      setActiveSegment(d);
    }
    
    function handleMouseOut(event, d) {
      d3.select(this)
        .transition()
        .duration(200)
        .attr("stroke-width", 1.5)
        .style("opacity", 0.9);
      
      setActiveSegment(null);
    }
    
  }, [data, width, height, expandedLevels, filterInfo]);

  // Loading state with animation
  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          height: "100%",
          alignItems: "center",
          justifyContent: "center",
          color: "#6c757d",
        }}
      >
        <div 
          style={{
            width: "40px",
            height: "40px",
            borderRadius: "50%",
            border: "3px solid rgba(0,0,0,0.1)",
            borderTopColor: "#007bff",
            animation: "spin 1s linear infinite",
            marginBottom: "10px"
          }}
        />
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
        <div>Loading data...</div>
      </div>
    );
  }
  
  // Error state
  if (error) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          height: "100%",
          alignItems: "center",
          justifyContent: "center",
          color: "#dc3545",
          padding: "20px",
          textAlign: "center"
        }}
      >
        <div style={{ fontSize: "24px", marginBottom: "10px" }}>⚠️</div>
        <div style={{ fontWeight: "bold", marginBottom: "5px" }}>Failed to load chart data</div>
        <div style={{ fontSize: "14px" }}>{error}</div>
      </div>
    );
  }

  // Format filter info for display in a side panel
  const renderFilterInfo = () => {
    if (!filterInfo) return null;
    
    const filterDetails = [];
    
    if (filterInfo.timeRange) {
      filterDetails.push(`Time: ${filterInfo.timeRange.start}:00 - ${filterInfo.timeRange.end}:00`);
    }
    
    if (filterInfo.pcpValues && Object.keys(filterInfo.pcpValues).length > 0) {
      Object.entries(filterInfo.pcpValues).forEach(([key, [min, max]]) => {
        filterDetails.push(`${key}: ${min.toFixed(1)} - ${max.toFixed(1)}`);
      });
    }
    
    if (filterDetails.length === 0) return null;
    
    return (
      <div style={{
        position: "absolute",
        top: 140,
        right: 0,
        background: "rgba(255, 255, 255, 0.9)",
        padding: "6px 10px",
        borderRadius: 4,
        fontSize: 12,
        border: "1px solid #eee",
        boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
        maxWidth: "40%",
        zIndex: 10
      }}>
        <div style={{ fontWeight: "bold", marginBottom: 4, color: "#cc0000" }}>Active Filters:</div>
        {filterDetails.map((detail, i) => (
          <div key={i} style={{ fontSize: 11, marginBottom: 2 }}>{detail}</div>
        ))}
      </div>
    );
  };

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <svg ref={svgRef} style={{ width: "100%", height: "100%" }} />
      
      {/* Render filter info panel */}
      {renderFilterInfo()}
      
      {/* Enhanced tooltip */}
      {activeSegment && (
        <div
          style={{
            position: "absolute",
            bottom: 20,
            left: 20,
            background: "rgba(255,255,255,0.95)",
            padding: "12px 16px",
            borderRadius: "8px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            fontSize: "13px",
            color: "#212529",
            backdropFilter: "blur(4px)",
            border: "1px solid rgba(0,0,0,0.05)",
            transition: "opacity 0.2s ease-in-out",
            maxWidth: "250px",
            zIndex: 20
          }}
        >
          <div style={{ marginBottom: "8px" }}>
            {/* Path breadcrumb */}
            {activeSegment.ancestors().reverse().slice(1).map((ancestor, i) => (
              <span key={i} style={{ color: i === 0 ? "#343a40" : "#495057" }}>
                {ancestor.data.name}
                {i < activeSegment.ancestors().length - 2 && " > "}
              </span>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ fontWeight: "bold", fontSize: "16px" }}>{activeSegment.data.name}</div>
            <div style={{ 
              background: "#e9ecef", 
              padding: "3px 8px", 
              borderRadius: "12px", 
              fontSize: "12px",
              fontWeight: "bold" 
            }}>
              {activeSegment.value.toLocaleString()}
            </div>
          </div>
          
          {/* Percentage calculation */}
          <div style={{ 
            marginTop: "4px", 
            display: "flex", 
            justifyContent: "space-between", 
            alignItems: "center" 
          }}>
            <div style={{ fontSize: "12px", color: "#6c757d" }}>Percentage:</div>
            <div style={{ 
              color: "#0d6efd", 
              fontSize: "12px", 
              fontWeight: "bold", 
              background: "rgba(13, 110, 253, 0.1)", 
              padding: "2px 8px", 
              borderRadius: "10px" 
            }}>
              {/* Calculate percentage based on total value from root node */}
              {activeSegment.root && activeSegment.root.value ? 
                ((activeSegment.value / activeSegment.root.value) * 100).toFixed(1) + '%' : 
                ''}
            </div>
          </div>
          
          {activeSegment.data.details && (
            <div style={{ marginTop: "8px", fontSize: "12px", color: "#6c757d" }}>
              {activeSegment.data.details}
            </div>
          )}
        </div>
      )}
      
      {/* Legend with ordered seasons */}
      <div
        style={{
          position: "absolute",
          top: 20,
          right: 20,
          background: "rgba(255,255,255,0.9)",
          padding: "8px 12px",
          borderRadius: "6px",
          fontSize: "12px",
          boxShadow: "0 2px 5px rgba(0,0,0,0.1)"
        }}
      >
        <div style={{ fontWeight: "bold", marginBottom: "5px", color: "#495057" }}>LEGEND</div>
        {seasonOrder.map((seasonName, i) => {
          const colors = ["#99d98c", "#e9c46a", "#bc6c25", "#005f73"];
          
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", marginBottom: "4px" }}>
              <div
                style={{
                  width: "12px",
                  height: "12px",
                  borderRadius: "3px",
                  background: colors[i],
                  marginRight: "8px",
                }}
              />
              <div>{seasonName}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}