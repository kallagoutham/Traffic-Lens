import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import * as topojson from "topojson-client";
import us from "us-atlas/states-10m.json";

// Two-letter codes by numeric FIPS
const fipsToState = {
  1: 'AL', 2: 'AK', 4: 'AZ', 5: 'AR', 6: 'CA', 8: 'CO',
  9: 'CT', 10:'DE',11:'DC',12:'FL',13:'GA',15:'HI',
  16:'ID',17:'IL',18:'IN',19:'IA',20:'KS',21:'KY',
  22:'LA',23:'ME',24:'MD',25:'MA',26:'MI',27:'MN',
  28:'MS',29:'MO',30:'MT',31:'NE',32:'NV',33:'NH',
  34:'NJ',35:'NM',36:'NY',37:'NC',38:'ND',39:'OH',
  40:'OK',41:'OR',42:'PA',44:'RI',45:'SC',46:'SD',
  47:'TN',48:'TX',49:'UT',50:'VT',51:'VA',53:'WA',
  54:'WV',55:'WI',56:'WY'
};

// Map from state code to full state name
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

export default function MapChart({
  data = [],
  selectedState = null,
  hoveredState = null,
  onStateSelect = () => {},
  onStateHover = () => {},
  loading = false,
  themeColor 
}) {
  const svgRef = useRef();
  const containerRef = useRef();
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [tooltip, setTooltip] = useState({ show: false, content: '', x: 0, y: 0 });
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

  useEffect(() => {
    if (dimensions.width === 0) return;
    const { width, height } = dimensions;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    // group we’ll zoom/transform
    const g = svg.append("g");

    // draw background + map
    const geo = topojson.feature(us, us.objects.states);
    const projection = d3.geoAlbersUsa().fitExtent(
      [
        [10, 10],
        [width - 10, height - 10],
      ],
      geo
    );
    const path = d3.geoPath(projection);

    // color scale…
    const counts = new Map(data.map((d) => [d.state, d.count]));
    const maxCount = d3.max(data, (d) => d.count) || 1;
    let color;

if (themeColor === "red") {
  color = d3
    .scaleSequential()
    .domain([0, maxCount])
    .interpolator(d3.interpolateRgb("#ffdddd", "#cc0000"));
} else if (themeColor === "yellow") {
  color = d3
    .scaleSequential()
    .domain([0, maxCount])
    .interpolator(d3.interpolateRgb("#ffffdd", "#cccc00"));
} else if (themeColor === "green") {
  color = d3
    .scaleSequential()
    .domain([0, maxCount])
    .interpolator(d3.interpolateRgb("#ddffdd", "#00cc00"));
} else {
  // fallback to red
  color = d3
    .scaleSequential()
    .domain([0, maxCount])
    .interpolator(d3.interpolateRgb("#ffdddd", "#cc0000"));
}

    // sea + states
    g.append("rect").attr("width", width).attr("height", height).attr("fill", "#fff");
    g.append("g")
      .selectAll("path")
      .data(geo.features)
      .join("path")
      .attr("d", path)
      .attr("fill", (d) => {
        const code = fipsToState[+d.id];
        return color(counts.get(code) || 0);
      })
      .attr("stroke", (d) => {
        const code = fipsToState[+d.id];
        if (code === selectedState) return "#2ecc71";
        if (code === hoveredState && code !== selectedState) return "#ffcc00";
        return "#222";
      })
      .attr("stroke-width", (d) => {
        const code = fipsToState[+d.id];
        return code === selectedState || code === hoveredState ? 2 : 0.5;
      })
      .style("cursor", "pointer")
      .on("mouseover", (event, d) => {
        const code = fipsToState[+d.id];
        onStateHover(code);
        d3.select(event.currentTarget)
          .attr("stroke", "#ffcc00")
          .attr("stroke-width", 2);
        const [x, y] = path.centroid(d);
        const cnt = counts.get(code) || 0;
        setTooltip({
          show: true,
          content: `<strong>${stateNames[code] || code}</strong><br/>Count: ${cnt}`,
          x,
          y,
        });
      })
      .on("mouseout", (event, d) => {
        const code = fipsToState[+d.id];
        onStateHover(null);
        d3.select(event.currentTarget)
          .attr("stroke", code === selectedState ? "#2ecc71" : "#222")
          .attr("stroke-width", code === selectedState ? 2 : 0.5);
        setTooltip({ ...tooltip, show: false });
      })
      .on("click", (event, d) => {
        const code = fipsToState[+d.id];

        // compute bounding box of that state
        const [[x0, y0], [x1, y1]] = path.bounds(d);
        const dx = x1 - x0,
          dy = y1 - y0,
          x = (x0 + x1) / 2,
          y = (y0 + y1) / 2;
        const scale = Math.min(width / dx, height / dy) * 0.8;
        const translate = [width / 2 - scale * x, height / 2 - scale * y];

        // disable further clicks while animating
        g.style("pointer-events", "none");

        // animate the zoom
        g.transition()
          .duration(750)
          .attr("transform", `translate(${translate}) scale(${scale})`)
          .on("end", () => {
            onStateSelect(code);
          });
      });

    // Add an improved legend with better visibility
    const legendWidth = 20;
    const legendHeight = 120;
    const legendX = width - legendWidth - 15;
    const legendY = height - legendHeight - 15;
    
    // Create a legend background for better visibility
    svg.append("rect")
      .attr("x", legendX - 30)
      .attr("y", legendY - 10)
      .attr("width", 55)
      .attr("height", legendHeight + 30)
      .attr("fill", "white")
      .attr("stroke", "#ddd")
      .attr("stroke-width", 1)
      .attr("rx", 4)
      .attr("ry", 4);
    
    // Create gradient
    const defs = svg.append("defs");
    
    const gradient = defs.append("linearGradient")
      .attr("id", "color-gradient")
      .attr("x1", "0%")
      .attr("y1", "0%")
      .attr("x2", "0%")
      .attr("y2", "100%");
      
    // Add gradient stops
    gradient.append("stop")
      .attr("offset", "0%")
      .attr("stop-color", color(maxCount));
      
    gradient.append("stop")
      .attr("offset", "100%")
      .attr("stop-color", color(0));
    
    // Draw the legend rectangle
    const legend = svg.append("g")
      .attr("class", "legend");
      
    legend.append("rect")
      .attr("x", legendX)
      .attr("y", legendY)
      .attr("width", legendWidth)
      .attr("height", legendHeight)
      .style("fill", "url(#color-gradient)");
      
    // Add a border to the legend
    legend.append("rect")
      .attr("x", legendX)
      .attr("y", legendY)
      .attr("width", legendWidth)
      .attr("height", legendHeight)
      .style("fill", "none")
      .style("stroke", "#666")
      .style("stroke-width", 1);
    
    // Add improved legend labels with background for better visibility
    const maxLabel = formatNumber(maxCount);
    legend.append("text")
      .attr("x", legendX - 5)
      .attr("y", legendY + 5)
      .attr("text-anchor", "end")
      .attr("font-size", "10px")
      .attr("font-weight", "bold")
      .attr("font-family", "sans-serif")
      .attr("fill", "#333")
      .text(maxLabel);
      
    legend.append("text")
      .attr("x", legendX - 5)
      .attr("y", legendY + legendHeight)
      .attr("text-anchor", "end")
      .attr("font-size", "10px")
      .attr("font-weight", "bold")
      .attr("font-family", "sans-serif")
      .attr("fill", "#333")
      .text("0");

  }, [selectedState, hoveredState, onStateSelect, onStateHover, dimensions, loading, data]);

  // Helper function to format numbers
  const formatNumber = (value) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(0)}k`;
    }
    return value;
  };

  // Show loading indicator overlay when loading
  const loadingOverlay = loading ? (
    <div 
      style={{ 
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
      }}
    >
      Loading...
    </div>
  ) : null;
  
  // We'll show a small "No data" text in corner instead of replacing entire component
  const noDataOverlay = (!loading && (!data || data.length === 0)) ? (
    <div 
      style={{ 
        position: "absolute",
        top: "10px",
        right: "10px",
        padding: "5px 10px",
        color: "#888", 
        fontSize: "0.8rem", 
        fontStyle: "italic",
        fontFamily: "sans-serif",
        backgroundColor: "rgba(255, 255, 255, 0.8)",
        borderRadius: "4px",
        border: "1px solid #ddd",
        zIndex: 5
      }}
    >
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
      <svg
        ref={svgRef}
        style={{ 
          width: "100%", 
          height: "100%",
          backgroundColor: "#fff"
        }}
      />
      
      {/* Overlays */}
      {loadingOverlay}
      {noDataOverlay}
      
      {/* Custom tooltip */}
      {tooltip.show && (
        <div
          style={{
            position: "absolute",
            left: `${tooltip.x}px`,
            top: `${tooltip.y}px`,
            transform: "translate(-50%, -100%)",
            padding: "6px 10px",
            backgroundColor: "rgba(0, 0, 0, 0.8)",
            color: "#fff",
            borderRadius: "4px",
            fontSize: "12px",
            fontFamily: "sans-serif",
            pointerEvents: "none",
            zIndex: 1000,
            whiteSpace: "nowrap",
            maxWidth: "200px",
            boxShadow: "0 2px 4px rgba(0, 0, 0, 0.2)",
            border: "1px solid rgba(255, 204, 0, 0.5)"
          }}
          dangerouslySetInnerHTML={{ __html: tooltip.content }}
        />
      )}
    </div>
  );
}