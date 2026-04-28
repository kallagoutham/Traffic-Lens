import React, { useEffect, useRef, useState, useCallback } from "react";
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

// Map to convert state codes to FIPS for reverse lookup
const stateToFips = Object.entries(fipsToState).reduce((acc, [fips, state]) => {
  acc[state] = fips;
  return acc;
}, {});

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
  themeColor,
  setStatesVisibleOnMap
}) {
  const svgRef = useRef();
  const containerRef = useRef();
  const mapGroupRef = useRef();
  const pathRef = useRef(null);
  const geoRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [tooltip, setTooltip] = useState({ show: false, content: '', x: 0, y: 0 });
  const [zoomLevel, setZoomLevel] = useState(1);
  const [transform, setTransform] = useState({ x: 0, y: 0, k: 1 });
  const [isZooming, setIsZooming] = useState(false);
  const [visibleStates, setVisibleStates] = useState([]);
  const [filteredData, setFilteredData] = useState(data);

  // Update filtered data when main data changes
  useEffect(() => {
    if (visibleStates.length === 0) {
      setFilteredData(data);
    } else {
      const newFilteredData = data.filter(d => visibleStates.includes(d.state));
      setFilteredData(newFilteredData);
    }
  }, [data, visibleStates]);
  
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

  // Function to determine which states are visible in the current view
  const updateVisibleStates = useCallback((transform) => {
    if (!geoRef.current || !pathRef.current) return;
    
    const geo = geoRef.current;
    const path = pathRef.current;
    const { width, height } = dimensions;
    
    // Create a screen-space bounding box based on the current viewport
    const viewportBbox = [
      [0, 0],
      [width, height]
    ];
    
    // Convert the screen bbox to map coordinates based on current transform
    const invTransform = d3.zoomIdentity
      .translate(-transform.x, -transform.y)
      .scale(1/transform.k);
    
    const mapBbox = [
      invTransform.apply(viewportBbox[0]),
      invTransform.apply(viewportBbox[1])
    ];
    
    // Check each state to see if it's within the viewport
    const newVisibleStates = [];
    geo.features.forEach(feature => {
      const [[x0, y0], [x1, y1]] = path.bounds(feature);
      
      // Check if the state's bounding box intersects with the viewport bbox
      const isVisible = !(
        x1 < mapBbox[0][0] ||
        x0 > mapBbox[1][0] ||
        y1 < mapBbox[0][1] ||
        y0 > mapBbox[1][1]
      );
      
      if (isVisible) {
        const stateCode = fipsToState[+feature.id];
        newVisibleStates.push(stateCode);
      }
    });
    // Update visible states if changed
    if (newVisibleStates.length > 0 && 
        JSON.stringify(newVisibleStates) !== JSON.stringify(visibleStates)) {
      setVisibleStates(newVisibleStates);
      setStatesVisibleOnMap(newVisibleStates);
    } else if (newVisibleStates.length === 0 && visibleStates.length > 0) {
      // Reset to all states if none are visible
      setVisibleStates([]);
    }
  }, [dimensions, visibleStates]);

  useEffect(() => {
    if (dimensions.width === 0) return;
    const { width, height } = dimensions;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    // Get geo features ready for later use
    const geo = topojson.feature(us, us.objects.states);
    geoRef.current = geo;

    // Define the projection and path
    const projection = d3.geoAlbersUsa().fitExtent(
      [
        [10, 10],
        [width - 10, height - 10],
      ],
      geo
    );
    const path = d3.geoPath(projection);
    pathRef.current = path;

    // Define the zoom behavior
    const zoom = d3.zoom()
      .scaleExtent([1, 8])
      .extent([[0, 0], [width, height]])
      .on("zoom", (event) => {
        setIsZooming(true);
        setTransform(event.transform);
        
        const g = d3.select(mapGroupRef.current);
        g.attr("transform", event.transform);
        
        // Update zoom level for informational display
        setZoomLevel(event.transform.k);
        
        // After zooming ends, update visible states and reset the isZooming flag
        clearTimeout(zoom.timeout);
        zoom.timeout = setTimeout(() => {
          updateVisibleStates(event.transform);
          setIsZooming(false);
        }, 200);
      });

    // Create a group we'll zoom/transform
    const g = svg.append("g").attr("class", "map-group");
    mapGroupRef.current = g.node();
    
    // Apply the initial transform if there is one
    if (transform.k !== 1 || transform.x !== 0 || transform.y !== 0) {
      g.attr("transform", `translate(${transform.x},${transform.y}) scale(${transform.k})`);
    }

    // Enable zoom on the svg
    svg.call(zoom);

    // Add zoom controls
    const zoomControls = svg.append("g")
      .attr("class", "zoom-controls")
      .attr("transform", `translate(${width - 45}, 20)`)
      .style("pointer-events", "all");
    
    // Zoom in button
    const zoomInBtn = zoomControls.append("g")
      .attr("class", "zoom-btn zoom-in")
      .style("cursor", "pointer");
      
    zoomInBtn.append("rect")
      .attr("width", 30)
      .attr("height", 30)
      .attr("rx", 4)
      .attr("fill", "white")
      .attr("stroke", "#ccc");
      
    zoomInBtn.append("text")
      .attr("x", 15)
      .attr("y", 20)
      .attr("text-anchor", "middle")
      .style("font-size", "18px")
      .style("font-weight", "bold")
      .style("user-select", "none")
      .text("+");
      
    zoomInBtn.on("click", () => {
      svg.transition().call(zoom.scaleBy, 1.5);
    });
    
    // Zoom out button
    const zoomOutBtn = zoomControls.append("g")
      .attr("class", "zoom-btn zoom-out")
      .attr("transform", "translate(0, 35)")
      .style("cursor", "pointer");
      
    zoomOutBtn.append("rect")
      .attr("width", 30)
      .attr("height", 30)
      .attr("rx", 4)
      .attr("fill", "white")
      .attr("stroke", "#ccc");
      
    zoomOutBtn.append("text")
      .attr("x", 15)
      .attr("y", 20)
      .attr("text-anchor", "middle")
      .style("font-size", "18px")
      .style("font-weight", "bold")
      .style("user-select", "none")
      .text("−");
      
    zoomOutBtn.on("click", () => {
      svg.transition().call(zoom.scaleBy, 0.75);
    });
    
    // Reset zoom button
    const resetBtn = zoomControls.append("g")
      .attr("class", "zoom-btn reset")
      .attr("transform", "translate(0, 70)")
      .style("cursor", "pointer");
      
    resetBtn.append("rect")
      .attr("width", 30)
      .attr("height", 30)
      .attr("rx", 4)
      .attr("fill", "white")
      .attr("stroke", "#ccc");
      
    resetBtn.append("text")
      .attr("x", 15)
      .attr("y", 20)
      .attr("text-anchor", "middle")
      .style("font-size", "18px")
      .style("font-weight", "bold")
      .style("user-select", "none")
      .html("&#8634;"); // Reset symbol
      
    resetBtn.on("click", () => {
      svg.transition().call(zoom.transform, d3.zoomIdentity);
      setVisibleStates([]); // Reset visible states filter
    });

    // Color scale for data visualization
    const counts = new Map(filteredData.map((d) => [d.state, d.count]));
    const maxCount = d3.max(filteredData, (d) => d.count) || 1;
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

    // Draw sea + states
    g.append("rect").attr("width", width).attr("height", height).attr("fill", "#fff")
      .style("pointer-events", "none");
      
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
        
        // Only trigger state hover if we're not actively zooming
        if (!isZooming) {
          onStateHover(code);
        }
        
        d3.select(event.currentTarget)
          .attr("stroke", "#ffcc00")
          .attr("stroke-width", 2);
        
        // Calculate tooltip position based on mouse coords instead of path centroid
        const [x, y] = d3.pointer(event, svg.node());
        const cnt = counts.get(code) || 0;
        
        setTooltip({
          show: true,
          content: `<strong>${stateNames[code] || code}</strong><br/>Count: ${cnt}`,
          x,
          y: y - 10 // offset slightly above cursor
        });
      })
      .on("mousemove", (event) => {
        // Update tooltip position as mouse moves
        const [x, y] = d3.pointer(event, svg.node());
        setTooltip({
          ...tooltip,
          x,
          y: y - 10
        });
      })
      .on("mouseout", (event, d) => {
        const code = fipsToState[+d.id];
        
        // Only reset hover state if we're not actively zooming
        if (!isZooming) {
          onStateHover(null);
        }
        
        d3.select(event.currentTarget)
          .attr("stroke", code === selectedState ? "#2ecc71" : "#222")
          .attr("stroke-width", code === selectedState ? 2 : 0.5);
          
        setTooltip({ ...tooltip, show: false });
      })
      .on("click", (event, d) => {
        event.stopPropagation(); // Prevent zoom from interfering
        const code = fipsToState[+d.id];

        // compute bounding box of that state
        const [[x0, y0], [x1, y1]] = path.bounds(d);
        const dx = x1 - x0,
              dy = y1 - y0,
              x = (x0 + x1) / 2,
              y = (y0 + y1) / 2;
        const scale = Math.min(width / dx, height / dy) * 0.8;
        const translate = [width / 2 - scale * x, height / 2 - scale * y];

        // Set zooming state to prevent hover effects during animation
        setIsZooming(true);
        
        // Animate the zoom
        svg.transition()
          .duration(750)
          .call(
            zoom.transform,
            d3.zoomIdentity
              .translate(translate[0], translate[1])
              .scale(scale)
          )
          .on("end", () => {
            // After animation completes, update visible states and select the state
            updateVisibleStates({
              x: translate[0],
              y: translate[1],
              k: scale
            });
            onStateSelect(code);
            setTimeout(() => setIsZooming(false), 200);
          });
      });
      
    // Add click handler on the background to deselect/reset when clicking outside states
    svg.on("click", (event) => {
      if (event.target === svg.node()) {
        // Only reset if we're clicking on the background and not on a state
        svg.transition()
          .duration(750)
          .call(zoom.transform, d3.zoomIdentity)
          .on("end", () => {
            setVisibleStates([]); // Reset visible states filter
            onStateSelect(null);
          });
      }
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

    // If selectedState exists, zoom to it initially
    if (selectedState && !transform.k > 1) {
      // Find the feature for the selected state
      const selectedFeature = geo.features.find(f => fipsToState[+f.id] === selectedState);
      
      if (selectedFeature) {
        // compute bounding box of that state
        const [[x0, y0], [x1, y1]] = path.bounds(selectedFeature);
        const dx = x1 - x0,
              dy = y1 - y0,
              x = (x0 + x1) / 2,
              y = (y0 + y1) / 2;
        const scale = Math.min(width / dx, height / dy) * 0.8;
        const translate = [width / 2 - scale * x, height / 2 - scale * y];

        // Set the transform directly
        g.attr("transform", `translate(${translate[0]},${translate[1]}) scale(${scale})`);
        
        // Update transform state
        const newTransform = { x: translate[0], y: translate[1], k: scale };
        setTransform(newTransform);
        
        // Update visible states based on this zoom level
        updateVisibleStates(newTransform);
      }
    }
    
    // Initialize visible states if we're at default view (all states visible)
    if (transform.k === 1 && visibleStates.length === 0) {
      updateVisibleStates({ x: 0, y: 0, k: 1 });
    }

  }, [selectedState, hoveredState, onStateSelect, onStateHover, dimensions, loading, filteredData, transform, isZooming, themeColor, visibleStates, updateVisibleStates]);

  // Update map when hoveredState changes from outside
  useEffect(() => {
    if (!svgRef.current || !mapGroupRef.current) return;
    
    const svg = d3.select(svgRef.current);
    const g = d3.select(mapGroupRef.current);
    
    g.selectAll("path")
      .attr("stroke", (d) => {
        const code = fipsToState[+d.id];
        if (code === selectedState) return "#2ecc71";
        if (code === hoveredState && code !== selectedState) return "#ffcc00";
        return "#222";
      })
      .attr("stroke-width", (d) => {
        const code = fipsToState[+d.id];
        return code === selectedState || code === hoveredState ? 2 : 0.5;
      });
      
  }, [hoveredState, selectedState]);

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
  const noDataOverlay = (!loading && (!filteredData || filteredData.length === 0)) ? (
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

  // Show current zoom level indicator and visible states count
  const zoomInfo = transform.k > 1 ? (
    <div 
      style={{ 
        position: "absolute",
        bottom: "10px",
        left: "10px",
        padding: "5px 10px",
        color: "#666", 
        fontSize: "0.75rem", 
        fontFamily: "sans-serif",
        backgroundColor: "rgba(255, 255, 255, 0.9)",
        borderRadius: "4px",
        border: "1px solid #ddd",
        zIndex: 5,
        display: "flex",
        flexDirection: "column",
        gap: "3px"
      }}
    >
      <div>Zoom: {Math.round(transform.k * 100)}%</div>
      {visibleStates.length > 0 && visibleStates.length < Object.keys(stateNames).length && (
        <div>
          {visibleStates.length} states visible
          <div style={{
            fontSize: "0.7rem",
            color: "#888",
            marginTop: "3px",
            display: visibleStates.length > 0 ? "block" : "none"
          }}>
            {visibleStates.length <= 6 
              ? visibleStates.map(s => stateNames[s]).join(", ")
              : `${visibleStates.slice(0, 5).map(s => stateNames[s]).join(", ")}, +${visibleStates.length - 5} more`}
          </div>
        </div>
      )}
    </div>
  ) : null;
  
  // Show filtered data info
  const filterInfo = (visibleStates.length > 0 && visibleStates.length < Object.keys(stateNames).length) ? (
    <div 
      style={{ 
        position: "absolute",
        top: "10px",
        right: "10px",
        padding: "5px 10px",
        color: "#666", 
        fontSize: "0.75rem", 
        fontFamily: "sans-serif",
        backgroundColor: themeColor === 'red' ? "rgba(255, 200, 200, 0.2)" :
                         themeColor === 'yellow' ? "rgba(255, 255, 200, 0.2)" :
                         "rgba(200, 255, 200, 0.2)",
        borderRadius: "4px",
        border: `1px solid ${themeColor === 'red' ? "#ffcccc" : 
                            themeColor === 'yellow' ? "#ffffcc" : 
                            "#ccffcc"}`,
        zIndex: 5
      }}
    >
      Data filtered: {filteredData.length} of {data.length} records
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
      {zoomInfo}
      {filterInfo}
      
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