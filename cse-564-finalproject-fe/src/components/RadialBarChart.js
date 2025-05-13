// components/RadialBarChart.js
import React, { useEffect, useState, useRef } from "react";
import * as d3 from "d3";
import { API_BASE_URL, ENDPOINTS } from "../constants/constants";

const RadialBarChart = ({ selectedState, width = 600, height = 500 }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tooltip, setTooltip] = useState({ show: false, content: "", x: 0, y: 0 });
  const chartRef = useRef(null);

  const sampleData = {
    poi_data: [
      { poi: "Traffic_Signal", percentage: 10.2, count: 2234 },
      { poi: "Crossing",        percentage:  9.2, count: 2016 },
      { poi: "Junction",        percentage:  7.3, count: 1599 },
      { poi: "Station",         percentage:  2.5, count:  548 },
      { poi: "Stop",            percentage:  2.4, count:  526 }
    ],
    yes_no_data: [
      { category: "Yes", percentage: 3 },
      { category: "No",  percentage: 97 }
    ],
    total_accidents: 21901
  };

  // Fetch POI data
  useEffect(() => {
    setLoading(true);
    fetch(`${API_BASE_URL}${ENDPOINTS.POI_DATA}${selectedState ? `?state=${selectedState}` : ""}`)
      .then((r) => {
        if (!r.ok) throw new Error(`Status ${r.status}`);
        return r.json();
      })
      .then((json) => {
        setData(json);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError("Failed to load POI data");
        setData(sampleData);
        setLoading(false);
      });
  }, [selectedState]);

  // hide tooltip on outside click
  useEffect(() => {
    const onClick = (e) => {
      if (chartRef.current && !chartRef.current.contains(e.target)) {
        setTooltip((t) => ({ ...t, show: false }));
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  if (loading) {
    return (
      <div style={{ height, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div>Loading POI data…</div>
      </div>
    );
  }

  const chartData = data.poi_data && data.poi_data.length ? data : sampleData;
  const centerX = width / 2 - 50;
  const centerY = height / 2;
  const outerRadius = Math.min(width, height) * 0.35;
  const innerRadius = outerRadius * 0.3;

  // prepare scales
  const maxPct = d3.max(chartData.poi_data, (d) => d.percentage) || 0;
  const rScale = d3
    .scaleLinear()
    .domain([0, maxPct])
    .range([innerRadius, outerRadius]);

  const angles = chartData.poi_data.slice(0, 5);
  const angleStep = (2 * Math.PI) / angles.length;

  const colors = ["#b25dd6", "#cdcdcd", "#f96b69", "#72c556", "#f8d950"];

  return (
    <div ref={chartRef} style={{ position: "relative", width, height }}>
      <svg width={width} height={height}>
        {/* Title */}
        <text x={centerX} y={30} textAnchor="middle" fontSize="16" fontWeight="bold">
          POINT OF INTEREST ANALYSIS
        </text>

        {/* Gray backdrop circle */}
        <circle
          cx={centerX}
          cy={centerY}
          r={outerRadius + 10}
          fill="#fcfcfc"
          stroke="#eaeaea"
        />

        {/* Radial bars */}
        {chartData.poi_data.slice(0, 5).map((d, i) => {
          const start = -Math.PI / 2 + i * angleStep;
          const end = start + angleStep * 0.8; // small gap
          const arcGen = d3
            .arc()
            .innerRadius(innerRadius)
            .outerRadius(rScale(d.percentage))
            .startAngle(start)
            .endAngle(end)
            .padAngle(0.02)
            .padRadius(innerRadius);

          // tooltip position at midpoint of arc
          const mid = (start + end) / 2;
          const tx = centerX + (rScale(d.percentage) + 10) * Math.cos(mid);
          const ty = centerY + (rScale(d.percentage) + 10) * Math.sin(mid);

          return (
            <g key={d.poi}>
              <path
                d={arcGen()}
                fill={colors[i]}
                stroke="#fff"
                strokeWidth={1}
                onMouseEnter={(e) =>
                  setTooltip({
                    show: true,
                    content: `${d.poi.replace("_", " ")}: ${d.count.toLocaleString()} (${d.percentage}%)`,
                    x: e.clientX,
                    y: e.clientY,
                  })
                }
                onMouseLeave={() => setTooltip((t) => ({ ...t, show: false }))}
                style={{ cursor: "pointer" }}
              />
              {/* Label */}
              <text
                x={centerX + (outerRadius + 20) * Math.cos(mid)}
                y={centerY + (outerRadius + 20) * Math.sin(mid)}
                textAnchor={Math.cos(mid) > 0 ? "start" : "end"}
                alignmentBaseline="middle"
                fontSize="12"
                fill="#333"
              >
                {d.poi.replace("_", " ")} ({d.percentage}%)
              </text>
            </g>
          );
        })}

        {/* Center circle */}
        <circle
          cx={centerX}
          cy={centerY}
          r={innerRadius - 5}
          fill="#fff"
          stroke="#ddd"
          strokeWidth={1}
        />
        {/* Total */}
        <text x={centerX} y={centerY - 10} textAnchor="middle" fontSize="12" fill="#666">
          Total
        </text>
        <text x={centerX} y={centerY + 12} textAnchor="middle" fontSize="20" fontWeight="bold">
          {chartData.total_accidents.toLocaleString()}
        </text>

        {/* Yes/No vertical bar */}
        {(() => {
          const barW = 60;
          const barH = height * 0.5;
          const x0 = width - barW - 40;
          const y0 = centerY - barH / 2;
          const yes = chartData.yes_no_data.find((x) => x.category === "Yes")?.percentage || 0;
          const no = chartData.yes_no_data.find((x) => x.category === "No")?.percentage || 0;
          const noH = (no / 100) * barH;
          const yesH = (yes / 100) * barH;

          return (
            <g>
              {/* bar bg */}
              <rect x={x0} y={y0} width={barW} height={barH} fill="#f8f8f8" rx={4} />
              {/* No */}
              <rect
                x={x0}
                y={y0}
                width={barW}
                height={noH}
                fill="#e74c3c"
                onMouseEnter={(e) =>
                  setTooltip({
                    show: true,
                    content: `Non-POI: ${no}%`,
                    x: e.clientX,
                    y: e.clientY,
                  })
                }
                onMouseLeave={() => setTooltip((t) => ({ ...t, show: false }))}
              />
              <text
                x={x0 + barW / 2}
                y={y0 + noH / 2}
                textAnchor="middle"
                fill="#fff"
                fontSize="14"
                fontWeight="bold"
              >
                No {no}%
              </text>
              {/* Yes */}
              <rect
                x={x0}
                y={y0 + noH}
                width={barW}
                height={yesH}
                fill="#3498db"
                onMouseEnter={(e) =>
                  setTooltip({
                    show: true,
                    content: `POI: ${yes}%`,
                    x: e.clientX,
                    y: e.clientY,
                  })
                }
                onMouseLeave={() => setTooltip((t) => ({ ...t, show: false }))}
              />
              {yes > 5 && (
                <text
                  x={x0 + barW / 2}
                  y={y0 + noH + yesH / 2}
                  textAnchor="middle"
                  fill="#fff"
                  fontSize="14"
                  fontWeight="bold"
                >
                  Yes {yes}%
                </text>
              )}
              {/* label */}
              <text
                x={x0 + barW / 2}
                y={y0 - 10}
                textAnchor="middle"
                fill="#333"
                fontSize="14"
                fontWeight="bold"
              >
                POI
              </text>
            </g>
          );
        })()}
      </svg>

      {/* Tooltip */}
      {tooltip.show && (
        <div
          style={{
            position: "absolute",
            left: tooltip.x - chartRef.current.getBoundingClientRect().left + 10,
            top: tooltip.y - chartRef.current.getBoundingClientRect().top - 30,
            background: "rgba(0,0,0,0.75)",
            color: "#fff",
            padding: "6px 10px",
            borderRadius: 4,
            pointerEvents: "none",
            fontSize: "12px",
            zIndex: 10,
          }}
        >
          {tooltip.content}
        </div>
      )}
    </div>
  );
};

export default RadialBarChart;
