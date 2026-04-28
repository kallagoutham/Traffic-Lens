// components/RadialBarChart.js - Updated to use data from App.js
import React, { useState, useRef, useEffect } from "react";

const RadialBarChart = ({ 
  data,
  loading = false,
  error = null,
  width = 600, 
  height = 400,
  filterInfo = null 
}) => {
  const [tooltip, setTooltip] = useState({ show: false, content: "", x: 0, y: 0 });
  const chartRef = useRef(null);

  // close tooltip on outside click
  useEffect(() => {
    const handleClick = e => {
      if (chartRef.current && !chartRef.current.contains(e.target)) {
        setTooltip(t => ({ ...t, show: false }));
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  if (loading) {
    return <div style={{ textAlign: "center", padding: 20 }}>Loading POI data…</div>;
  }
  if (error) {
    return <div style={{ color: "red", textAlign: "center", padding: 20 }}>{error}</div>;
  }
  if (!data) {
    return <div style={{ textAlign: "center", padding: 20 }}>No data to display</div>;
  }

  const topPoi = data.poi_data.slice(0, 5);
  const total = data.total_accidents;
  const yesItem = data.yes_no_data.find(d => d.category === "Yes") || { percentage:0, count:0 };
  const noItem  = data.yes_no_data.find(d => d.category === "No")  || { percentage:0, count:0 };

  // Format filter info for display
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
        top: 10,
        right: 10,
        background: "rgba(255, 255, 255, 0.9)",
        padding: "6px 10px",
        borderRadius: 4,
        fontSize: 12,
        border: "1px solid #eee",
        maxWidth: "40%"
      }}>
        <div style={{ fontWeight: "bold", marginBottom: 4 }}>Active Filters:</div>
        {filterDetails.map((detail, i) => (
          <div key={i} style={{ fontSize: 11 }}>{detail}</div>
        ))}
      </div>
    );
  };

  // render the two charts
  return (
    <div 
      ref={chartRef}
      style={{
        position: "relative",
        padding: 10
      }}
    >
      {/* Display active filters if present */}
      {renderFilterInfo()}
      
      <svg width={width} height={height}>
        {/* ----- Radial Bars ----- */}
        {(() => {
          const centerX = width * 0.6;
          const centerY = height * 0.4;
          const maxR    = Math.min(width, height) * 0.35;
          const innerR  = maxR * 0.35;
          const barW    = (maxR - innerR) / (topPoi.length + 0.5);
          // background circle + guides
          return (
            <g>
              {/* outer circle */}
              <circle cx={centerX} cy={centerY} r={maxR} fill="#fff" stroke="#f0f0f0" strokeWidth={1} />
              {/* guide rings */}
              {[0.25, 0.5, 0.75].map(f => (
                <circle
                  key={f}
                  cx={centerX} cy={centerY}
                  r={maxR*f}
                  fill="none"
                  stroke="#f8f8f8"
                  strokeWidth={1}
                  strokeDasharray="2,2"
                />
              ))}
              {/* bars */}
              {topPoi.map((item, i) => {
                const radius      = maxR - i*(barW+2);
                const c           = 2*Math.PI*radius;
                const pct         = item.count / Math.max(...topPoi.map(d=>d.count));
                const arcPct      = Math.max(0.15, pct)*0.4; // ensure min visibility
                const dashLength  = arcPct*c;
                const startAngle  = -90;
                return (
                  <circle
                    key={item.poi}
                    cx={centerX} cy={centerY}
                    r={radius}
                    fill="none"
                    stroke={["#b25dd6","#cdcdcd","#f96b69","#72c556","#f8d950"][i]}
                    strokeWidth={barW*0.85}
                    strokeDasharray={`${dashLength} ${c}`}
                    strokeLinecap="round"
                    transform={`rotate(${startAngle},${centerX},${centerY})`}
                    onMouseEnter={e=>setTooltip({
                      show:true,
                      content:`${item.poi.replace(/_/g," ")}: ${item.count.toLocaleString()} (${item.percentage}%)`,
                      x:e.clientX,y:e.clientY
                    })}
                    onMouseLeave={()=>setTooltip(t=>({ ...t, show:false }))}
                    style={{ cursor:"pointer" }}
                  />
                );
              })}
              {/* center circle */}
              <filter id="ds"><feDropShadow dx="0" dy="1" stdDeviation="2" floodOpacity="0.1"/></filter>
              <circle
                cx={centerX} cy={centerY}
                r={innerR}
                fill="#fff"
                stroke="#f0f0f0"
                strokeWidth={1}
                filter="url(#ds)"
              />
              {/* total text */}
              <text x={centerX} y={centerY-12} textAnchor="middle" fill="#666" fontSize={12}>
                Total
              </text>
              <text x={centerX} y={centerY+14} textAnchor="middle" fill="#333" fontSize={20} fontWeight="bold">
                {total.toLocaleString()}
              </text>
              {/* labels legend */}
              {topPoi.map((item, i) => {
                const y = centerY - (maxR - i*(barW+2)) + 4;
                return (
                  <g key={item.poi}>
                    <circle cx={centerX - maxR - 110} cy={y} r={4}
                      fill={["#b25dd6","#cdcdcd","#f96b69","#72c556","#f8d950","#00b02a"][i]}
                    />
                    <text
                      x={centerX - maxR - 98}
                      y={y}
                      fontSize={12}
                      fill="#555"
                      textAnchor="start"
                      alignmentBaseline="middle"
                    >
                      {item.poi.replace(/_/g," ")}
                    </text>
                    <text
                      x={centerX - maxR - 20}
                      y={y}
                      fontSize={12}
                      fill="#333"
                      fontWeight="bold"
                      textAnchor="start"
                      alignmentBaseline="middle"
                    >
                      {item.count.toLocaleString()}
                    </text>
                  </g>
                );
              })}
            </g>
          );
        })()}

        {/* ----- Yes/No Bar ----- */}
        {(() => {
          const barW = 60;
          const barH = height * 0.6;
          const x0   = width * 1.05;
          const y0   = (height-barH)/2.25;
          const noH  = (noItem.percentage/100)*barH;
          const yesH = (yesItem.percentage/100)*barH;
          return (
            <g>
              {/* title */}
              <text x={x0+barW/2} y={y0-20} fontSize={16} fontWeight="bold" textAnchor="middle" fill="#333">
                POI
              </text>
              {/* background */}
              <filter id="bs"><feDropShadow dx="0" dy="1" stdDeviation="1" floodOpacity="0.1"/></filter>
              <rect
                x={x0} y={y0}
                width={barW} height={barH}
                fill="#f8f8f8" stroke="#e0e0e0" strokeWidth={1}
                filter="url(#bs)"
              />
              {/* No */}
              <rect
                x={x0} y={y0}
                width={barW} height={noH}
                rx={4} ry={4} fill="#e74c3c"
                onMouseEnter={e=>setTooltip({
                  show:true,
                  content:`Non-POI: ${noItem.count.toLocaleString()} (${noItem.percentage}%)`,
                  x:e.clientX,y:e.clientY
                })}
                onMouseLeave={()=>setTooltip(t=>({ ...t, show:false }))}
                style={{ cursor:"pointer" }}
              />
              {/* Yes */}
              <rect
                x={x0} y={y0+noH}
                width={barW} height={Math.max(2,yesH)}
                fill="#3498db"
                onMouseEnter={e=>setTooltip({
                  show:true,
                  content:`POI: ${yesItem.count.toLocaleString()} (${yesItem.percentage}%)`,
                  x:e.clientX,y:e.clientY
                })}
                onMouseLeave={()=>setTooltip(t=>({ ...t, show:false }))}
                style={{ cursor:"pointer" }}
              />
              {/* labels */}
              <text x={x0+barW/2} y={y0+noH/2} textAnchor="middle" fill="#fff" fontSize={14} fontWeight="bold">
                No {Math.round(noItem.percentage)}%
              </text>
              {yesItem.percentage > 2 && (
                <text
                  x={x0+barW/2}
                  y={y0+noH + yesH/2}
                  textAnchor="middle"
                  fill="#fff"
                  fontSize={14}
                  fontWeight="bold"
                >
                  Yes {Math.round(yesItem.percentage)}%
                </text>
              )}
            </g>
          );
        })()}
        
        {/* Filter visual indicator */}
        {filterInfo && (
          <g>
            <filter id="glow">
              <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
            <circle 
              cx={width - 20} 
              cy={20} 
              r={8} 
              fill="#cc0000"
              opacity={0.7}
              filter="url(#glow)"
            >
              <animate 
                attributeName="opacity" 
                values="0.5;0.8;0.5" 
                dur="2s" 
                repeatCount="indefinite" 
              />
            </circle>
          </g>
        )}
      </svg>

      {/* Tooltip */}
      {tooltip.show && (
        <div style={{
          position: "absolute",
          left: tooltip.x + 10,
          top: tooltip.y - 10,
          padding: "6px 10px",
          background: "rgba(0,0,0,0.8)",
          color: "#fff",
          borderRadius: 4,
          fontSize: 12,
          pointerEvents: "none",
          whiteSpace: "nowrap",
          zIndex: 10
        }}>
          {tooltip.content}
        </div>
      )}
    </div>
  );
};

export default RadialBarChart;