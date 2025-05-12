import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import * as topojson from 'topojson-client';
import us from 'us-atlas/states-10m.json';


export default function StateDetailMap({ selectedState, data = [], loading = false }) {
  const containerRef = useRef();
  const svgRef = useRef();
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [tooltip, setTooltip] = useState({ show: false, content: '', x: 0, y: 0 });

  // State name mapping
  const stateNames = {
    'AL': 'Alabama', 'AK': 'Alaska', 'AZ': 'Arizona', 'AR': 'Arkansas', 
    'CA': 'California', 'CO': 'Colorado', 'CT': 'Connecticut', 'DE': 'Delaware', 
    'DC': 'District of Columbia', 'FL': 'Florida', 'GA': 'Georgia', 'HI': 'Hawaii', 
    'ID': 'Idaho', 'IL': 'Illinois', 'IN': 'Indiana', 'IA': 'Iowa', 
    'KS': 'Kansas', 'KY': 'Kentucky', 'LA': 'Louisiana', 'ME': 'Maine', 
    'MD': 'Maryland', 'MA': 'Massachusetts', 'MI': 'Michigan', 'MN': 'Minnesota', 
    'MS': 'Mississippi', 'MO': 'Missouri', 'MT': 'Montana', 'NE': 'Nebraska', 
    'NV': 'Nevada', 'NH': 'New Hampshire', 'NJ': 'New Jersey', 'NM': 'New Mexico', 
    'NY': 'New York', 'NC': 'North Carolina', 'ND': 'North Dakota', 'OH': 'Ohio', 
    'OK': 'Oklahoma', 'OR': 'Oregon', 'PA': 'Pennsylvania', 'RI': 'Rhode Island', 
    'SC': 'South Carolina', 'SD': 'South Dakota', 'TN': 'Tennessee', 'TX': 'Texas', 
    'UT': 'Utah', 'VT': 'Vermont', 'VA': 'Virginia', 'WA': 'Washington', 
    'WV': 'West Virginia', 'WI': 'Wisconsin', 'WY': 'Wyoming'
  };

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

  // Find state by code
  const getStateFeature = (stateCode) => {
    if (!stateCode) return null;
    
    const states = topojson.feature(us, us.objects.states).features;
    
    // State FIPS to state code mapping (reverse of what's in MapChart)
    const stateToFips = {
      'AL': '01', 'AK': '02', 'AZ': '04', 'AR': '05', 'CA': '06', 'CO': '08',
      'CT': '09', 'DE': '10', 'DC': '11', 'FL': '12', 'GA': '13', 'HI': '15',
      'ID': '16', 'IL': '17', 'IN': '18', 'IA': '19', 'KS': '20', 'KY': '21',
      'LA': '22', 'ME': '23', 'MD': '24', 'MA': '25', 'MI': '26', 'MN': '27',
      'MS': '28', 'MO': '29', 'MT': '30', 'NE': '31', 'NV': '32', 'NH': '33',
      'NJ': '34', 'NM': '35', 'NY': '36', 'NC': '37', 'ND': '38', 'OH': '39',
      'OK': '40', 'OR': '41', 'PA': '42', 'RI': '44', 'SC': '45', 'SD': '46',
      'TN': '47', 'TX': '48', 'UT': '49', 'VT': '50', 'VA': '51', 'WA': '53',
      'WV': '54', 'WI': '55', 'WY': '56'
    };
    
    const stateFips = stateToFips[stateCode];
    return states.find(state => state.id === stateFips);
  };

  // Render map when state or data changes
  useEffect(() => {
    if (!selectedState || dimensions.width === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();
    
    const { width, height } = dimensions;
    const margin = { top: 10, right: 10, bottom: 10, left: 10 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    
    // Add defs for filters and gradients
    const defs = svg.append("defs");
    
    // First, fill the entire SVG with green background (for the map area)
    svg.append("rect")
      .attr("width", width)
      .attr("height", height)
      .attr("fill", "#fff"); 
    
    // Create main group
    const g = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);
      
    // Get the selected state geometry
    const stateFeature = getStateFeature(selectedState);
    
    if (!stateFeature) {
      // If state not found, show message
      svg.append("text")
        .attr("x", width / 2)
        .attr("y", height / 2)
        .attr("text-anchor", "middle")
        .attr("font-size", "14px")
        .attr("fill", "#555")
        .text(`No map data available for ${selectedState}`);
      return;
    }
    const projection = d3.geoMercator();
    projection.fitExtent(
      [[margin.left, margin.top], [width - margin.right, height - margin.bottom]],
      stateFeature
    );
    const path = d3.geoPath().projection(projection);
    const dropShadow = defs.append("filter")
      .attr("id", "drop-shadow")
      .attr("height", "120%");
    
    dropShadow.append("feGaussianBlur")
      .attr("in", "SourceAlpha")
      .attr("stdDeviation", 3)
      .attr("result", "blur");
    
    dropShadow.append("feOffset")
      .attr("in", "blur")
      .attr("dx", 2)
      .attr("dy", 2)
      .attr("result", "offsetBlur");
      
    const feMerge = dropShadow.append("feMerge");
    feMerge.append("feMergeNode")
      .attr("in", "offsetBlur");
    feMerge.append("feMergeNode")
      .attr("in", "SourceGraphic");
    
    g.append("path")
      .datum(stateFeature)
      .attr("d", path)
      .attr("fill", "#e5f5e0") 
      .attr("stroke", "#bbb")
      .attr("stroke-width", 0.5)
      .style("filter", "url(#drop-shadow)");
    
    if (us.objects.counties) {
      const counties = topojson.feature(us, us.objects.counties).features;
      const stateFips = stateFeature.id;
      const stateCounties = counties.filter(county => county.id.startsWith(stateFips));
      
      g.append("g")
        .selectAll("path")
        .data(stateCounties)
        .join("path")
          .attr("d", path)
          .attr("fill", "none")
          .attr("stroke", "#ddd")
          .attr("stroke-width", 0.2)
          .attr("stroke-opacity", 0.7);
    }
    
    // Filter accident data for valid coordinates
    const validData = data.filter(d => (
      d.Start_Lat !== undefined && 
      d.Start_Lng !== undefined && 
      !isNaN(d.Start_Lat) && 
      !isNaN(d.Start_Lng)
    ));

    const severityColors = {
      1: "#FFC2C2", // Light red/pink for Level 1
      2: "#FF8F8F", // Medium red for Level 2
      3: "#FF5C5C", // Darker red for Level 3
      4: "#8B0000"  // Deep red for Level 4
    };
    
    // Create point glow filter
    const glow = defs.append("filter")
      .attr("id", "point-glow");
    
    glow.append("feGaussianBlur")
      .attr("stdDeviation", "1.5")
      .attr("result", "coloredBlur");
      
    const feMergeGlow = glow.append("feMerge");
    feMergeGlow.append("feMergeNode")
      .attr("in", "coloredBlur");
    feMergeGlow.append("feMergeNode")
      .attr("in", "SourceGraphic");
    
    // Add accident points
    g.append("g")
      .attr("class", "accident-points")
      .selectAll("circle")
      .data(validData)
      .join("circle")
        .attr("cx", d => {
          const [x] = projection([d.Start_Lng, d.Start_Lat]);
          return x;
        })
        .attr("cy", d => {
          const [, y] = projection([d.Start_Lng, d.Start_Lat]);
          return y;
        })
        .attr("r", 2.5)
        .attr("fill", d => d.Severity ? severityColors[d.Severity] : "#FF8F8F")
        .attr("opacity", 1.0) // Full opacity to match reference
        .attr("stroke-width", 0) // No stroke to match reference
        .style("cursor", "pointer")
        .on("mouseover", (event, d) => {
          // Make point larger on hover with glow
          d3.select(event.currentTarget)
            .attr("r", 5)
            .style("filter", "url(#point-glow)");
          
          // Show tooltip
          const [x, y] = projection([d.Start_Lng, d.Start_Lat]);
          setTooltip({
            show: true,
            content: formatTooltip(d),
            x,
            y
          });
        })
        .on("mouseout", (event, d) => {
          // Reset point size
          d3.select(event.currentTarget)
            .attr("r", 2.5)
            .style("filter", "none");
          
          // Hide tooltip
          setTooltip({ ...tooltip, show: false });
        });
    
    // Add legend exactly matching the reference image
    const legendX = 25;
    const legendY = 25;
    const legendWidth = 140;
    const legendHeight = 125;
    
    // Create legend shadow
    const legendShadow = svg.append("rect")
      .attr("x", legendX + 3)
      .attr("y", legendY + 3)
      .attr("width", legendWidth)
      .attr("height", legendHeight)
      .attr("rx", 4)
      .attr("ry", 4)
      .attr("fill", "#888")
      .attr("opacity", 0.3);
      
    // Create legend background
    const legendBackground = svg.append("rect")
      .attr("x", legendX)
      .attr("y", legendY)
      .attr("width", legendWidth)
      .attr("height", legendHeight)
      .attr("rx", 4)
      .attr("ry", 4)
      .attr("fill", "#fff")
      .attr("stroke", "#ddd")
      .attr("stroke-width", 1);
    
    // Create legend title
    svg.append("text")
      .attr("x", legendX + 70)
      .attr("y", legendY + 20)
      .attr("text-anchor", "middle")
      .attr("font-size", "11px")
      .attr("font-weight", "bold")
      .attr("fill", "#555")
      .attr("font-family", "sans-serif")
      .text("Map Legend");
    
    // Add accident location to legend
    svg.append("circle")
      .attr("cx", legendX + 15)
      .attr("cy", legendY + 40)
      .attr("r", 4)
      .attr("fill", "#ff5c5c");
    
    svg.append("text")
      .attr("x", legendX + 25)
      .attr("y", legendY + 43)
      .attr("font-size", "10px")
      .attr("fill", "#333")
      .attr("font-family", "sans-serif")
      .text("Accident Location");
    
    // Add Severity label
    svg.append("text")
      .attr("x", legendX + 15)
      .attr("y", legendY + 65)
      .attr("font-size", "10px")
      .attr("fill", "#333")
      .attr("font-weight", "bold")
      .attr("font-family", "sans-serif")
      .text("Severity:");
    
    // Add severity levels exactly as in reference image
    const levels = [
      { level: 1, color: severityColors[1] },
      { level: 2, color: severityColors[2] },
      { level: 3, color: severityColors[3] },
      { level: 4, color: severityColors[4] }
    ];
    
    levels.forEach((item, i) => {
      svg.append("circle")
        .attr("cx", legendX + 15)
        .attr("cy", legendY + 80 + i * 15)
        .attr("r", 4)
        .attr("fill", item.color);
      
      svg.append("text")
        .attr("x", legendX + 25)
        .attr("y", legendY + 83 + i * 15)
        .attr("font-size", "10px")
        .attr("fill", "#333")
        .attr("font-family", "sans-serif")
        .text(`Level ${item.level}`);
    });
    
    // Add a subtle attribution text at bottom left
    svg.append("text")
      .attr("x", 10)
      .attr("y", height - 5)
      .attr("font-size", "7px")
      .attr("fill", "#aaa")
      .attr("font-family", "sans-serif")
      .text("Map data: US Census Bureau");
    
  }, [selectedState, data, dimensions]);

  // Format tooltip content with enhanced styling
  const formatTooltip = (accident) => {
    // Format based on available fields - adjust as needed for your data
    let content = `
      <div style="font-family: sans-serif;">
        <div style="font-weight: bold; border-bottom: 1px solid #ff6666; padding-bottom: 3px; margin-bottom: 3px;">
          Accident Details
        </div>`;
    
    if (accident.Severity) 
      content += `<div><span style="color: #ffaaaa;">Severity:</span> ${accident.Severity}</div>`;
    
    if (accident.Start_Time) {
      const date = new Date(accident.Start_Time);
      content += `<div><span style="color: #ffaaaa;">Date:</span> ${date.toLocaleDateString()}</div>`;
      content += `<div><span style="color: #ffaaaa;">Time:</span> ${date.toLocaleTimeString()}</div>`;
    }
    
    if (accident.Description) 
      content += `<div><span style="color: #ffaaaa;">Description:</span> ${accident.Description.substring(0, 50)}${accident.Description.length > 50 ? '...' : ''}</div>`;
    
    content += `</div>`;
    
    return content;
  };

  // Create stylish no state selected message
  const noStateMessage = !selectedState ? (
    <div style={{
      position: "absolute",
      top: 0,
      left: 0,
      width: "100%",
      height: "100%",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: "#fff",
      color: "#666",
      fontSize: "13px"
    }}>
      <div style={{ 
        width: "60px", 
        height: "60px", 
        marginBottom: "15px",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        borderRadius: "50%",
        backgroundColor: "#f8f8f8",
        border: "1px dashed #ddd"
      }}>
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="#aaa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M12 17V17.01" stroke="#aaa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M12 13.5C11.9816 13.1754 12.0692 12.8536 12.2495 12.5804C12.4299 12.3071 12.6938 12.0978 13 11.98C13.3779 11.8157 13.7132 11.566 13.9819 11.2516C14.2506 10.9373 14.4462 10.5666 14.5534 10.1668C14.6607 9.76704 14.6767 9.34857 14.6001 8.94137C14.5235 8.53417 14.3563 8.14749 14.11 7.80999C13.8638 7.47249 13.5451 7.19223 13.1769 6.98854C12.8087 6.78485 12.4007 6.66348 11.9813 6.63326C11.5619 6.60303 11.1404 6.66458 10.7457 6.81322C10.351 6.96185 9.99241 7.1944 9.69997 7.49999" stroke="#aaa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      <div style={{ fontWeight: "bold", marginBottom: "5px" }}>No State Selected</div>
      <div style={{ fontSize: "12px", color: "#888", maxWidth: "80%", textAlign: "center" }}>
        Click on a state in the map above to view detailed accident locations
      </div>
    </div>
  ) : null;

  const loadingOverlay = loading ? (
    <div style={{ 
      position: "absolute",
      top: 0,
      left: 0,
      width: "100%",
      height: "100%",
      display: "flex", 
      flexDirection: "column",
      justifyContent: "center", 
      alignItems: "center", 
      backgroundColor: "rgba(255, 255, 255, 0.8)",
      color: "#666",
      fontSize: "13px",
      zIndex: 5
    }}>
      <div style={{ 
        width: "30px", 
        height: "30px", 
        borderRadius: "50%", 
        border: "3px solid #f3f3f3",
        borderTop: "3px solid #ff4d4d",
        animation: "spin 1s linear infinite",
        marginBottom: "10px"
      }} />
      <div>Loading accident data...</div>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  ) : null;

  // Enhanced no data overlay
  const noDataOverlay = (!loading && selectedState && (!data || data.length === 0)) ? (
    <div style={{ 
      position: "absolute",
      top: 0,
      left: 0,
      width: "100%",
      height: "100%",
      display: "flex", 
      flexDirection: "column",
      justifyContent: "center", 
      alignItems: "center", 
      backgroundColor: "rgba(255, 255, 255, 0.9)",
      color: "#666",
      fontSize: "13px",
      zIndex: 5
    }}>
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="#ccc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M8 12H16" stroke="#ccc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      <div style={{ marginTop: "10px", fontWeight: "bold" }}>No Accident Data</div>
      <div style={{ fontSize: "12px", color: "#888", maxWidth: "80%", textAlign: "center", marginTop: "5px" }}>
        No accident records available for {stateNames[selectedState] || selectedState}
      </div>
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
        borderRadius: "8px",
        overflow: "hidden"
      }}
    >
      <svg
        ref={svgRef}
        style={{ 
          width: "100%", 
          height: "100%"
        }}
      />
      
      {/* Enhanced Tooltip with styling */}
      {tooltip.show && (
        <div
          style={{
            position: "absolute",
            left: `${tooltip.x}px`,
            top: `${tooltip.y}px`,
            transform: "translate(-50%, -110%)",
            backgroundColor: "rgba(40, 40, 40, 0.95)",
            color: "#fff",
            borderRadius: "6px",
            fontSize: "11px",
            fontFamily: "sans-serif",
            pointerEvents: "none",
            zIndex: 1000,
            maxWidth: "200px",
            boxShadow: "0 4px 8px rgba(0, 0, 0, 0.2)",
            border: "1px solid rgba(255, 255, 255, 0.1)"
          }}
          dangerouslySetInnerHTML={{ __html: tooltip.content }}
        />
      )}
      
      {noStateMessage}
      {loadingOverlay}
      {noDataOverlay}
    </div>
  );
}