// import React, { useRef, useEffect, useState } from "react";
// import * as d3 from "d3";
// import { API_BASE_URL, ENDPOINTS } from "../constants/constants";

// export default function SunburstChart({
//   selectedState = "",
//   width = 600,
//   height = 600,
// }) {
//   const svgRef = useRef();
//   const [data, setData] = useState(null);
//   const [activeSegment, setActiveSegment] = useState(null);
//   const [loading, setLoading] = useState(true);
//   const [expandedLevels, setExpandedLevels] = useState(2); // Updated to 2 since we removed days layer
//   const [error, setError] = useState(null);

//   // Define seasonal order
//   const seasonOrder = ["Spring", "Summer", "Fall", "Winter"];

//   // Load data with enhanced error handling
//   useEffect(() => {
//     setLoading(true);
//     setError(null);
//     const qs = selectedState ? `?state=${selectedState}` : "";
    
//     fetch(`${API_BASE_URL}${ENDPOINTS.SUNBURST}${qs}`)
//       .then((r) => {
//         if (!r.ok) throw new Error(`Failed to fetch data (${r.status})`);
//         return r.json();
//       })
//       .then((json) => {
//         // Process the data to remove days layer and sort seasons
//         if (json && json.children) {
//           // Sort seasons according to the defined order
//           json.children.sort((a, b) => {
//             return seasonOrder.indexOf(a.name) - seasonOrder.indexOf(b.name);
//           });
          
//           // Define month order within each season
//           const monthOrder = {
//             Winter: ["December", "January", "February"],
//             Spring: ["March", "April", "May"],
//             Summer: ["June", "July", "August"],
//             Fall: ["September", "October", "November"],
//           };
          
//           // Sort each season's months chronologically and remove days layer
//           json.children.forEach(season => {
//             if (season.children && monthOrder[season.name]) {
//               // Sort months within each season
//               season.children.sort((a, b) => {
//                 return monthOrder[season.name].indexOf(a.name) - 
//                        monthOrder[season.name].indexOf(b.name);
//               });
              
//               // Remove days layer by directly assigning values to months
//               // if they have children (days)
//               season.children.forEach(month => {
//                 if (month.children && month.children.length > 0) {
//                   // Sum up all values from days and assign to month
//                   month.value = month.children.reduce((sum, day) => sum + (day.value || 0), 0);
//                   // Remove the children (days) layer
//                   delete month.children;
//                 }
//               });
//             }
//           });
//         }
        
//         setData(json);
//         setLoading(false);
//       })
//       .catch((err) => {
//         console.error(err);
//         setError(err.message);
//         setLoading(false);
//       });
//   }, [selectedState]);

//   // Draw chart with enhanced styling
//   useEffect(() => {
//     if (!data) return;

//     const radius = Math.min(width, height) / 2;
//     const innerRadius = radius * 0.25; // Smaller inner circle for more space

//     // Color schemes - more vibrant and diverse
//     const seasonColors = {
//       Spring: ["#99d98c", "#76c893", "#52b69a"],
//       Summer: ["#e9c46a", "#f4a261", "#e76f51"],
//       Fall: ["#bc6c25", "#dda15e", "#fefae0"],
//       Winter: ["#005f73", "#0a9396", "#94d2bd"]
//     };

//     // Build a d3 hierarchy & partition it
//     const root = d3
//       .hierarchy(data)
//       .sum((d) => d.value || 0);
//       // No sorting by value to preserve chronological month order
    
//     d3.partition().size([2 * Math.PI, radius - 20])(root);

//     // Enhanced arc generator with smoother transitions
//     const arc = d3
//       .arc()
//       .startAngle((d) => d.x0)
//       .endAngle((d) => d.x1)
//       .innerRadius((d) => {
//         // If this segment's depth is beyond our expanded level, use parent's y0
//         if (d.depth > expandedLevels) {
//           return d.parent ? d.parent.y0 : innerRadius;
//         }
//         return d.depth === 1 ? innerRadius : d.y0;
//       })
//       .outerRadius((d) => {
//         // If this segment's depth is beyond our expanded level, use parent's y0
//         if (d.depth > expandedLevels) {
//           return d.parent ? d.parent.y0 : innerRadius;
//         }
//         return d.y1;
//       })
//       .padAngle(0.02) // Increased for better separation
//       .padRadius(radius / 3);

//     // Only show segments up to our expanded level (now max is 2 since we removed days)
//     const segments = root
//       .descendants()
//       .filter((d) => d.depth > 0 && d.depth <= expandedLevels);

//     // Prepare SVG
//     const svg = d3.select(svgRef.current);
//     svg.selectAll("*").remove();
//     svg.attr("viewBox", `0 0 ${width} ${height}`);

//     // Add a subtle gradient background
//     const defs = svg.append("defs");
//     const gradient = defs.append("radialGradient")
//       .attr("id", "sunburst-background")
//       .attr("cx", "50%")
//       .attr("cy", "50%")
//       .attr("r", "50%");
      
//     gradient.append("stop")
//       .attr("offset", "0%")
//       .attr("stop-color", "#f8f9fa")
//       .attr("stop-opacity", 1);
      
//     gradient.append("stop")
//       .attr("offset", "100%")
//       .attr("stop-color", "#e9ecef")
//       .attr("stop-opacity", 1);
    
//     // Background circle
//     svg.append("circle")
//       .attr("cx", width / 2)
//       .attr("cy", height / 2 + 10)
//       .attr("r", radius + 10)
//       .attr("fill", "url(#sunburst-background)");

//     // Title with enhanced styling
//     svg
//       .append("text")
//       .attr("x", width / 2)
//       .attr("y", 30)
//       .attr("text-anchor", "middle")
//       .attr("font-size", "18px")
//       .attr("font-weight", "bold")
//       .attr("fill", "#343a40")
//       .text(selectedState ? `${selectedState} Seasonal Visitation` : "National Seasonal Visitation");
    
//     svg
//       .append("text")
//       .attr("x", width / 2)
//       .attr("y", 55)
//       .attr("text-anchor", "middle")
//       .attr("font-size", "14px")
//       .attr("fill", "#6c757d")
//       .text("By Season and Month");

//     const g = svg
//       .append("g")
//       .attr("transform", `translate(${width / 2},${height / 2 + 10})`);

//     // Create drop shadow filter
//     const filter = defs.append("filter")
//       .attr("id", "drop-shadow")
//       .attr("height", "130%");
    
//     filter.append("feGaussianBlur")
//       .attr("in", "SourceAlpha")
//       .attr("stdDeviation", 3)
//       .attr("result", "blur");
    
//     filter.append("feOffset")
//       .attr("in", "blur")
//       .attr("dx", 1)
//       .attr("dy", 1)
//       .attr("result", "offsetBlur");
      
//     const femerge = filter.append("feMerge");
//     femerge.append("feMergeNode")
//       .attr("in", "offsetBlur");
//     femerge.append("feMergeNode")
//       .attr("in", "SourceGraphic");

//     // Add clickable center circle with enhanced styling
//     const centerGroup = g.append("g")
//       .attr("class", "center-button");
      
//     centerGroup.append("circle")
//       .attr("r", innerRadius)
//       .attr("fill", "white")
//       .attr("stroke", "#dee2e6")
//       .attr("stroke-width", 2)
//       .attr("filter", "url(#drop-shadow)")
//       .style("cursor", "pointer")
//       .on("click", handleCenterClick);

//     // Center icon (simple plus/minus toggle)
//     const iconSize = innerRadius * 0.4;
//     centerGroup.append("rect")
//       .attr("x", -iconSize / 4)
//       .attr("y", -iconSize / 4)
//       .attr("width", iconSize / 2)
//       .attr("height", iconSize / 2)
//       .attr("fill", "#495057")
//       .style("cursor", "pointer")
//       .on("click", handleCenterClick);
      
//     if (expandedLevels === 1) {
//       centerGroup.append("rect")
//         .attr("x", -iconSize / 4)
//         .attr("y", -iconSize / 4)
//         .attr("width", iconSize / 2)
//         .attr("height", iconSize / 2)
//         .attr("transform", "rotate(90)")
//         .attr("fill", "#495057")
//         .style("cursor", "pointer")
//         .on("click", handleCenterClick);
//     }

//     // Center text
//     centerGroup.append("text")
//       .attr("text-anchor", "middle")
//       .attr("font-size", "10px")
//       .attr("dy", innerRadius * 0.6)
//       .attr("fill", "#495057")
//       .text(expandedLevels === 1 ? "Expand" : "Collapse")
//       .style("cursor", "pointer")
//       .on("click", handleCenterClick);

//     // Draw arcs with animation and enhanced styling
//     const paths = g.selectAll("path.segment")
//       .data(segments)
//       .enter()
//       .append("path")
//       .attr("class", "segment")
//       .attr("d", arc)
//       .attr("fill", (d) => {
//         const season = d.ancestors().find(a => a.depth === 1)?.data.name;
//         if (!season || !seasonColors[season]) return "#adb5bd";
        
//         // Distribute colors based on depth
//         return seasonColors[season][Math.min(d.depth - 1, seasonColors[season].length - 1)];
//       })
//       .attr("stroke", "#fff")
//       .attr("stroke-width", 1.5)
//       .style("cursor", "pointer")
//       .style("opacity", 0) // Start invisible for animation
//       .on("mouseover", handleMouseOver)
//       .on("mouseout", handleMouseOut)
//       .on("click", (event, d) => handleSegmentClick(d));
    
//     // Add entrance animation
//     paths.transition()
//       .duration(600)
//       .delay((d, i) => i * 10)
//       .style("opacity", 0.9);

//     // Labels for depth 1 & 2 segments
//     g.selectAll("text.segment-label")
//       .data(segments.filter(d => (d.x1 - d.x0) > 0.15)) // Only show labels for segments with enough space
//       .enter()
//       .append("text")
//       .attr("class", "segment-label")
//       .attr("transform", d => {
//         const [x, y] = arc.centroid(d);
//         const angle = (d.x0 + d.x1) / 2 * 180 / Math.PI - 90;
//         const rotate = angle > 90 && angle < 270 ? angle + 180 : angle;
//         return `translate(${x}, ${y}) rotate(${rotate})`;
//       })
//       .attr("text-anchor", "middle")
//       .attr("font-size", d => d.depth === 1 ? "12px" : "10px")
//       .attr("fill", "white")
//       .attr("font-weight", d => d.depth === 1 ? "bold" : "normal")
//       .style("text-shadow", "0px 0px 3px rgba(0,0,0,0.5)")
//       .style("pointer-events", "none") // Prevents text from intercepting mouse events
//       .style("opacity", 0) // Start invisible for animation
//       .text(d => d.data.name)
//       .transition()
//       .duration(800)
//       .delay((d, i) => 300 + i * 20)
//       .style("opacity", 1);

//     // Function to handle center circle click
//     function handleCenterClick() {
//       // Toggle between showing all levels or just level 1
//       setExpandedLevels(expandedLevels === 1 ? 2 : 1); // Update toggle to max 2 since days are removed
//     }

//     // Function to handle segment click
//     function handleSegmentClick(d) {
//       // If we're at a fully expanded state
//       if (expandedLevels === 2) { // Updated to 2 as max
//         // Collapse to the clicked segment's depth
//         setExpandedLevels(d.depth);
//       } else {
//         // If we're in a collapsed state and clicked on a visible segment
//         if (d.depth <= expandedLevels) {
//           // Expand one level further (if we're not at max)
//           setExpandedLevels(Math.min(d.depth + 1, 2)); // Updated to 2 as max
//         }
//       }
//     }
    
//     // Enhanced mouse events
//     function handleMouseOver(event, d) {
//       d3.select(this)
//         .transition()
//         .duration(200)
//         .attr("stroke-width", 2)
//         .style("opacity", 1);
      
//       setActiveSegment(d);
//     }
    
//     function handleMouseOut(event, d) {
//       d3.select(this)
//         .transition()
//         .duration(200)
//         .attr("stroke-width", 1.5)
//         .style("opacity", 0.9);
      
//       setActiveSegment(null);
//     }
    
//   }, [data, width, height, expandedLevels, selectedState]);

//   // Loading state with animation
//   if (loading) {
//     return (
//       <div
//         style={{
//           display: "flex",
//           flexDirection: "column",
//           height: "100%",
//           alignItems: "center",
//           justifyContent: "center",
//           color: "#6c757d",
//         }}
//       >
//         <div 
//           style={{
//             width: "40px",
//             height: "40px",
//             borderRadius: "50%",
//             border: "3px solid rgba(0,0,0,0.1)",
//             borderTopColor: "#007bff",
//             animation: "spin 1s linear infinite",
//             marginBottom: "10px"
//           }}
//         />
//         <style>{`
//           @keyframes spin {
//             to { transform: rotate(360deg); }
//           }
//         `}</style>
//         <div>Loading data...</div>
//       </div>
//     );
//   }
  
//   // Error state
//   if (error) {
//     return (
//       <div
//         style={{
//           display: "flex",
//           flexDirection: "column",
//           height: "100%",
//           alignItems: "center",
//           justifyContent: "center",
//           color: "#dc3545",
//           padding: "20px",
//           textAlign: "center"
//         }}
//       >
//         <div style={{ fontSize: "24px", marginBottom: "10px" }}>⚠️</div>
//         <div style={{ fontWeight: "bold", marginBottom: "5px" }}>Failed to load chart data</div>
//         <div style={{ fontSize: "14px" }}>{error}</div>
//       </div>
//     );
//   }

//   return (
//     <div style={{ position: "relative", width: "100%", height: "100%" }}>
//       <svg ref={svgRef} style={{ width: "100%", height: "100%" }} />
      
//       {/* Enhanced tooltip */}
//       {activeSegment && (
//         <div
//           style={{
//             position: "absolute",
//             bottom: 20,
//             left: 20,
//             background: "rgba(255,255,255,0.95)",
//             padding: "12px 16px",
//             borderRadius: "8px",
//             boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
//             fontSize: "13px",
//             color: "#212529",
//             backdropFilter: "blur(4px)",
//             border: "1px solid rgba(0,0,0,0.05)",
//             transition: "opacity 0.2s ease-in-out",
//             maxWidth: "250px",
//           }}
//         >
//           <div style={{ marginBottom: "8px" }}>
//             {/* Path breadcrumb */}
//             {activeSegment.ancestors().reverse().slice(1).map((ancestor, i) => (
//               <span key={i} style={{ color: i === 0 ? "#343a40" : "#495057" }}>
//                 {ancestor.data.name}
//                 {i < activeSegment.ancestors().length - 2 && " > "}
//               </span>
//             ))}
//           </div>
//           <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
//             <div style={{ fontWeight: "bold", fontSize: "16px" }}>{activeSegment.data.name}</div>
//             <div style={{ 
//               background: "#e9ecef", 
//               padding: "3px 8px", 
//               borderRadius: "12px", 
//               fontSize: "12px",
//               fontWeight: "bold" 
//             }}>
//               {activeSegment.value.toLocaleString()}
//             </div>
//           </div>
//           {activeSegment.data.details && (
//             <div style={{ marginTop: "8px", fontSize: "12px", color: "#6c757d" }}>
//               {activeSegment.data.details}
//             </div>
//           )}
//         </div>
//       )}
      
//       {/* Legend with ordered seasons */}
//       <div
//         style={{
//           position: "absolute",
//           top: 20,
//           right: 20,
//           background: "rgba(255,255,255,0.9)",
//           padding: "8px 12px",
//           borderRadius: "6px",
//           boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
//           fontSize: "12px",
//         }}
//       >
//         <div style={{ fontWeight: "bold", marginBottom: "5px", color: "#495057" }}>LEGEND</div>
//         {/* Use the seasonOrder array to display them in the correct order */}
//         {seasonOrder.map((seasonName, i) => {
//           // Find the corresponding season in data
//           const season = data?.children?.find(s => s.name === seasonName);
//           if (!season) return null;
          
//           // Map colors to the seasons in order
//           const colors = ["#99d98c", "#e9c46a", "#bc6c25", "#005f73"];
          
//           return (
//             <div key={i} style={{ display: "flex", alignItems: "center", marginBottom: "4px" }}>
//               <div
//                 style={{
//                   width: "12px",
//                   height: "12px",
//                   borderRadius: "3px",
//                   background: colors[i],
//                   marginRight: "8px",
//                 }}
//               />
//               <div>{seasonName}</div>
//             </div>
//           );
//         })}
//       </div>
//     </div>
//   );
// }

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
  const [expandedLevels, setExpandedLevels] = useState(2); // Updated to 2 since we removed days layer
  const [error, setError] = useState(null);

  // Define seasonal order
  const seasonOrder = ["Spring", "Summer", "Fall", "Winter"];

  // Load data with enhanced error handling
  useEffect(() => {
    setLoading(true);
    setError(null);
    const qs = selectedState ? `?state=${selectedState}` : "";
    
    fetch(`${API_BASE_URL}${ENDPOINTS.SUNBURST}${qs}`)
      .then((r) => {
        if (!r.ok) throw new Error(`Failed to fetch data (${r.status})`);
        return r.json();
      })
      .then((json) => {
        // Process the data to remove days layer and sort seasons
        if (json && json.children) {
          // Sort seasons according to the defined order
          json.children.sort((a, b) => {
            return seasonOrder.indexOf(a.name) - seasonOrder.indexOf(b.name);
          });
          
          // Define month order within each season
          const monthOrder = {
            Winter: ["December", "January", "February"],
            Spring: ["March", "April", "May"],
            Summer: ["June", "July", "August"],
            Fall: ["September", "October", "November"],
          };
          
          // Sort each season's months chronologically and remove days layer
          json.children.forEach(season => {
            if (season.children && monthOrder[season.name]) {
              // Sort months within each season
              season.children.sort((a, b) => {
                return monthOrder[season.name].indexOf(a.name) - 
                       monthOrder[season.name].indexOf(b.name);
              });
              
              // Remove days layer by directly assigning values to months
              // if they have children (days)
              season.children.forEach(month => {
                if (month.children && month.children.length > 0) {
                  // Sum up all values from days and assign to month
                  month.value = month.children.reduce((sum, day) => sum + (day.value || 0), 0);
                  // Remove the children (days) layer
                  delete month.children;
                }
              });
            }
          });
        }
        
        setData(json);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError(err.message);
        setLoading(false);
      });
  }, [selectedState]);

  // Draw chart with enhanced styling
  useEffect(() => {
    if (!data) return;

    const radius = Math.min(width, height) / 2;
    const innerRadius = radius * 0.25; // Smaller inner circle for more space

    // Color schemes - more vibrant and diverse
    const seasonColors = {
      Spring: ["#99d98c", "#76c893", "#52b69a"],
      Summer: ["#e9c46a", "#f4a261", "#e76f51"],
      Fall: ["#bc6c25", "#dda15e", "#fefae0"],
      Winter: ["#005f73", "#0a9396", "#94d2bd"]
    };

    // Build a d3 hierarchy & partition it
    const root = d3
      .hierarchy(data)
      .sum((d) => d.value || 0);
      // No sorting by value to preserve chronological month order
    
    d3.partition().size([2 * Math.PI, radius - 20])(root);

    // Enhanced arc generator with smoother transitions
    const arc = d3
      .arc()
      .startAngle((d) => d.x0)
      .endAngle((d) => d.x1)
      .innerRadius((d) => {
        // If this segment's depth is beyond our expanded level, use parent's y0
        if (d.depth > expandedLevels) {
          return d.parent ? d.parent.y0 : innerRadius;
        }
        return d.depth === 1 ? innerRadius : d.y0;
      })
      .outerRadius((d) => {
        // If this segment's depth is beyond our expanded level, use parent's y0
        if (d.depth > expandedLevels) {
          return d.parent ? d.parent.y0 : innerRadius;
        }
        return d.y1;
      })
      .padAngle(0.02) // Increased for better separation
      .padRadius(radius / 3);

    // Only show segments up to our expanded level (now max is 2 since we removed days)
    const segments = root
      .descendants()
      .filter((d) => d.depth > 0 && d.depth <= expandedLevels);

    // Prepare SVG
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();
    svg.attr("viewBox", `0 0 ${width} ${height}`);

    // Add a subtle gradient background
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
    
    // Background circle
    svg.append("circle")
      .attr("cx", width / 2)
      .attr("cy", height / 2 + 10)
      .attr("r", radius + 10)
      .attr("fill", "url(#sunburst-background)");

    // Title with enhanced styling
    svg
      .append("text")
      .attr("x", width / 2)
      .attr("y", 30)
      .attr("text-anchor", "middle")
      .attr("font-size", "18px")
      .attr("font-weight", "bold")
      .attr("fill", "#343a40")
    //   .text(selectedState ? `${selectedState} Seasonal Visitation` : "National Seasonal Visitation");
    
    svg
      .append("text")
      .attr("x", width / 2)
      .attr("y", 55)
      .attr("text-anchor", "middle")
      .attr("font-size", "14px")
      .attr("fill", "#6c757d")
    //   .text("By Season and Month");

    const g = svg
      .append("g")
      .attr("transform", `translate(${width / 2},${height / 2 + 10})`);

    // Create drop shadow filter
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

    // Add clickable center circle with enhanced styling
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

    // Center icon (simple plus/minus toggle)
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
      .style("pointer-events", "none") // Prevents text from intercepting mouse events
      .style("opacity", 0) // Start invisible for animation
      .text(d => {
        // For segments with enough space, show percentage for both levels
        if (root && root.value && (d.x1 - d.x0) > 0.25) { // Only for segments with more space
          const percentage = ((d.value / root.value) * 100).toFixed(1);
          return `${d.data.name} (${percentage}%)`;
        }
        return d.data.name;
      })
      .transition()
      .duration(800)
      .delay((d, i) => 300 + i * 20)
      .style("opacity", 1);
      
    // Add percentage labels for larger segments
    g.selectAll("text.percentage-label")
      .data(segments.filter(d => (d.x1 - d.x0) <= 0.25 && (d.x1 - d.x0) > 0.12)) // Medium segments
      .enter()
      .append("text")
      .attr("class", "percentage-label")
      .attr("transform", d => {
        let [x, y] = arc.centroid(d);
        // Move the percentage below the name
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

    // Function to handle center circle click
    function handleCenterClick() {
      // Toggle between showing all levels or just level 1
      setExpandedLevels(expandedLevels === 1 ? 2 : 1); // Update toggle to max 2 since days are removed
    }

    // Function to handle segment click
    function handleSegmentClick(d) {
      // If we're at a fully expanded state
      if (expandedLevels === 2) { // Updated to 2 as max
        // Collapse to the clicked segment's depth
        setExpandedLevels(d.depth);
      } else {
        // If we're in a collapsed state and clicked on a visible segment
        if (d.depth <= expandedLevels) {
          // Expand one level further (if we're not at max)
          setExpandedLevels(Math.min(d.depth + 1, 2)); // Updated to 2 as max
        }
      }
    }
    
    // Enhanced mouse events
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
    
  }, [data, width, height, expandedLevels, selectedState]);

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

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <svg ref={svgRef} style={{ width: "100%", height: "100%" }} />
      
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
          boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
          fontSize: "12px",
        }}
      >
        <div style={{ fontWeight: "bold", marginBottom: "5px", color: "#495057" }}>LEGEND</div>
        {/* Use the seasonOrder array to display them in the correct order */}
        {seasonOrder.map((seasonName, i) => {
          // Find the corresponding season in data
          const season = data?.children?.find(s => s.name === seasonName);
          if (!season) return null;
          
          // Map colors to the seasons in order
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