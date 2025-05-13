import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";

export default function ParallelCoords({
  data = [],
  loading = false,
  theme = {
    background: "#ffffff",
    text: "#333333",
    axes: "#666666",
    axisLines: "#e0e0e0",
    highlight: "#ff4d4d",
    tooltipBackground: "rgba(0, 0, 0, 0.8)",
    tooltipText: "#ffffff",
    tooltipBorder: "#ff4d4d",
    fontFamily: "system-ui, -apple-system, sans-serif",
  },
}) {
  const containerRef = useRef();
  const svgRef = useRef();
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [orderedDimensions, setOrderedDimensions] = useState([]);
  const [draggedDimension, setDraggedDimension] = useState(null);

  const initialDimensions = [
    "Severity",
    "Temperature(F)",
    "Humidity(%)",
    "Visibility(mi)",
    "Wind_Speed(mph)",
  ];

  useEffect(() => {
    if (orderedDimensions.length === 0 && data.length > 0) {
      const availableDims = initialDimensions.filter((dim) =>
        data.some((d) => d[dim] !== undefined && d[dim] !== null)
      );
      setOrderedDimensions(availableDims);
    }
  }, [data, orderedDimensions]);

  useEffect(() => {
    if (!containerRef.current) return;

    const updateDimensions = () => {
      const { width, height } = containerRef.current.getBoundingClientRect();
      setDimensions({ width, height });
    };

    updateDimensions();

    let resizeTimer;
    const handleResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(updateDimensions, 250);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      clearTimeout(resizeTimer);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    if (
      !data ||
      data.length === 0 ||
      dimensions.width === 0 ||
      orderedDimensions.length === 0
    )
      return;

    const svg = d3
      .select(svgRef.current)
      .attr("width", "100%")
      .attr("height", "100%")
      .attr("viewBox", `0 0 ${dimensions.width} ${dimensions.height}`)
      .attr("preserveAspectRatio", "xMidYMid meet");

    svg.selectAll("*").remove();

    const margin = { top: 50, right: 60, bottom: 30, left: 40 };
    const innerWidth = dimensions.width - margin.left - margin.right;
    const innerHeight = dimensions.height - margin.top - margin.bottom;

    const g = svg
      .append("g")
      .attr("class", "parallel-coords-container")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    g.append("rect")
      .attr("width", innerWidth)
      .attr("height", innerHeight)
      .attr("fill", theme.background)
      .attr("rx", 4)
      .attr("ry", 4)
      .attr("stroke", theme.axisLines)
      .attr("stroke-width", 1)
      .attr("stroke-opacity", 0.5)
      .attr("fill-opacity", 0.3);

    const x = d3.scalePoint().domain(orderedDimensions).range([0, innerWidth]);

    const yScales = {};
    orderedDimensions.forEach((dim) => {
      yScales[dim] = d3
        .scaleLinear()
        .domain(d3.extent(data, (d) => d[dim]))
        .nice()
        .range([innerHeight, 0]);
    });

    svg
      .append("text")
      .attr("x", dimensions.width / 2)
      .attr("y", 25)
      .attr("text-anchor", "middle")
      .attr("font-size", "14px")
      .attr("font-weight", "bold")
      .attr("font-family", theme.fontFamily)
      .attr("fill", theme.text);

    const axesGroup = g.append("g").attr("class", "axes-group");
    orderedDimensions.forEach((dim) => {
      const xPos = x(dim);
      axesGroup
        .append("line")
        .attr("class", "vertical-grid")
        .attr("x1", xPos)
        .attr("x2", xPos)
        .attr("y1", 0)
        .attr("y2", innerHeight)
        .attr("stroke", theme.axisLines)
        .attr("stroke-width", 1)
        .attr("stroke-opacity", 0.7);

      // Tick gridlines
      const scale = yScales[dim];
      const ticks = scale.ticks(5);

      ticks.forEach((tick) => {
        axesGroup
          .append("line")
          .attr("class", "horizontal-grid")
          .attr("x1", xPos - 4)
          .attr("x2", xPos + 4)
          .attr("y1", scale(tick))
          .attr("y2", scale(tick))
          .attr("stroke", theme.axisLines)
          .attr("stroke-width", 0.5)
          .attr("stroke-opacity", 0.7);
      });
    });

    const axes = axesGroup
      .selectAll(".axis")
      .data(orderedDimensions)
      .join("g")
      .attr("class", (dim) => `axis axis-${dim.replace(/[\s()%]/g, "_")}`)
      .attr("transform", (dim) => `translate(${x(dim)},0)`)
      .each(function (dim) {
        d3.select(this).call(
          d3
            .axisLeft(yScales[dim])
            .ticks(5)
            .tickSize(-4)
            .tickFormat((d) => {
              if (d >= 1000) return `${d / 1000}k`;
              if (Number.isInteger(d)) return d;
              return d.toFixed(1);
            })
        );
        d3.select(this)
          .selectAll(".domain")
          .attr("stroke", theme.axes)
          .attr("stroke-width", 1.5);

        d3.select(this)
          .selectAll("text")
          .attr("font-family", theme.fontFamily)
          .attr("font-size", "10px")
          .attr("fill", theme.axes);
      });

    axes
      .append("text")
      .attr(
        "class",
        (dim) => `axis-title axis-title-${dim.replace(/[\s()%]/g, "_")}`
      )
      .attr("y", -16)
      .attr("text-anchor", "middle")
      .attr("cursor", "move")
      .attr("font-size", "11px")
      .attr("font-weight", "bold")
      .attr("font-family", theme.fontFamily)
      .attr("fill", theme.axes)
      .text((dim) => {
        const formatted = dim.replace("_", " ");
        return formatted;
      })
      .attr("data-dimension", (d) => d)
      .on("mouseenter", function () {
        d3.select(this).attr("fill", theme.highlight).attr("font-size", "12px");
      })
      .on("mouseleave", function () {
        if (draggedDimension !== d3.select(this).attr("data-dimension")) {
          d3.select(this).attr("fill", theme.axes).attr("font-size", "11px");
        }
      })
      .call(
        d3
          .drag()
          .on("start", function (event, dim) {
            setDraggedDimension(dim);
            d3.select(this)
              .raise()
              .attr("fill", theme.highlight)
              .attr("font-size", "12px");
          })
          .on("drag", function (event, dim) {
            const newX = event.x;
            let closestDim = orderedDimensions[0];
            let minDistance = Infinity;

            orderedDimensions.forEach((d) => {
              const distance = Math.abs(x(d) - newX);
              if (distance < minDistance) {
                minDistance = distance;
                closestDim = d;
              }
            });
            d3.select(this).attr("x", newX - margin.left);
            axesGroup
              .selectAll(".axis-title")
              .attr("fill", (d) =>
                d === closestDim ? theme.highlight : theme.axes
              )
              .attr("font-size", (d) => (d === closestDim ? "12px" : "11px"));
          })
          .on("end", function (event, dim) {
            const newX = event.x;
            let closestDim = orderedDimensions[0];
            let minDistance = Infinity;
            let closestIndex = 0;
            orderedDimensions.forEach((d, i) => {
              const distance = Math.abs(x(d) - newX);
              if (distance < minDistance) {
                minDistance = distance;
                closestDim = d;
                closestIndex = i;
              }
            });

            const fromIndex = orderedDimensions.indexOf(dim);
            if (fromIndex !== closestIndex) {
              const newOrderedDimensions = [...orderedDimensions];
              newOrderedDimensions.splice(fromIndex, 1);
              newOrderedDimensions.splice(closestIndex, 0, dim);
              setOrderedDimensions(newOrderedDimensions);
            }

            setDraggedDimension(null);
            axesGroup
              .selectAll(".axis-title")
              .attr("fill", theme.axes)
              .attr("font-size", "11px");
          })
      );

    const line = d3
      .line()
      .defined((d, i, data) => d !== null && d !== undefined)
      .x((d, i) => x(orderedDimensions[i]))
      .y((d, i) => {
        const dim = orderedDimensions[i];
        return yScales[dim](d);
      })
      .curve(d3.curveMonotoneX);
    const colorScale = d3
      .scaleSequential()
      .domain([1, 4])
      .interpolator(d3.interpolateReds);
    const linesGroup = g.append("g").attr("class", "lines-group");
    linesGroup
      .selectAll(".pc-line")
      .data(data)
      .join("path")
      .attr("class", "pc-line")
      .attr("d", (d) => {
        const values = orderedDimensions.map((dim) => d[dim]);
        return line(values);
      })
      .attr("fill", "none")
      .attr("stroke", (d) => {
        const severity = d.Severity || 1;
        return d3.color(colorScale(severity)).copy({ opacity: 0.35 });
      })
      .attr("stroke-width", 1.5)
      .attr("stroke-linecap", "round")
      .attr("stroke-linejoin", "round")
      .style("cursor", "pointer")
      .style("transition", "stroke-width 0.2s, opacity 0.2s");

    const tooltip = svg
      .append("g")
      .attr("class", "tooltip")
      .style("opacity", 0)
      .style("pointer-events", "none");

    tooltip
      .append("rect")
      .attr("width", 160)
      .attr("height", 140)
      .attr("rx", 6)
      .attr("ry", 6)
      .style("fill", theme.tooltipBackground)
      .style("stroke", theme.tooltipBorder)
      .style("stroke-width", 1.5);

    const tooltipHeader = tooltip
      .append("text")
      .attr("x", 10)
      .attr("y", 18)
      .attr("font-family", theme.fontFamily)
      .attr("font-size", "12px")
      .attr("font-weight", "bold")
      .style("fill", theme.tooltipText);

    const tooltipContent = tooltip
      .append("g")
      .attr("class", "tooltip-content")
      .attr("transform", "translate(10, 30)");

    linesGroup
      .selectAll(".pc-line")
      .on("mouseover", function (event, d) {
        d3.select(this)
          .raise()
          .attr("stroke", (d) => {
            const severity = d.Severity || 1;
            return colorScale(severity);
          })
          .attr("stroke-width", 3)
          .attr("opacity", 1);
        linesGroup
          .selectAll(".pc-line")
          .filter((p) => p !== d)
          .attr("opacity", 0.15);

        tooltipHeader.text(`Incident Severity: ${d.Severity || "N/A"}`);
        tooltipContent.selectAll("*").remove();
        orderedDimensions.forEach((dim, i) => {
          const row = tooltipContent
            .append("g")
            .attr("transform", `translate(0, ${i * 20})`);
          row
            .append("text")
            .attr("x", 0)
            .attr("y", 0)
            .attr("font-family", theme.fontFamily)
            .attr("font-size", "11px")
            .attr("fill", theme.tooltipText)
            .attr("opacity", 0.8)
            .text(`${dim.replace("_", " ")}:`);

          // Value
          row
            .append("text")
            .attr("x", 150)
            .attr("y", 0)
            .attr("text-anchor", "end")
            .attr("font-family", theme.fontFamily)
            .attr("font-size", "11px")
            .attr("font-weight", "bold")
            .attr("fill", theme.tooltipText)
            .text(() => {
              const val = d[dim];
              if (val === undefined || val === null) return "N/A";
              if (Number.isInteger(val)) return val;
              return val.toFixed(2);
            });
        });

        // Position and show tooltip
        const [mouseX, mouseY] = d3.pointer(event, svg.node());

        let tooltipX = mouseX + 15;
        let tooltipY = mouseY - 70;
        if (tooltipX + 160 > dimensions.width) {
          tooltipX = mouseX - 175;
        }
        if (tooltipY < 0) {
          tooltipY = 10;
        }
        if (tooltipY + 140 > dimensions.height) {
          tooltipY = dimensions.height - 150;
        }

        tooltip
          .attr("transform", `translate(${tooltipX}, ${tooltipY})`)
          .transition()
          .duration(200)
          .style("opacity", 1);
      })
      .on("mousemove", function (event) {
        const [mouseX, mouseY] = d3.pointer(event, svg.node());
        let tooltipX = mouseX + 15;
        let tooltipY = mouseY - 70;
        if (tooltipX + 160 > dimensions.width) {
          tooltipX = mouseX - 175;
        }
        if (tooltipY < 0) {
          tooltipY = 10;
        }
        if (tooltipY + 140 > dimensions.height) {
          tooltipY = dimensions.height - 150;
        }

        tooltip.attr("transform", `translate(${tooltipX}, ${tooltipY})`);
      })
      .on("mouseout", function () {
        linesGroup
          .selectAll(".pc-line")
          .attr("stroke", (d) => {
            const severity = d.Severity || 1;
            return d3.color(colorScale(severity)).copy({ opacity: 0.35 });
          })
          .attr("stroke-width", 1.5)
          .attr("opacity", 1);
        tooltip.transition().duration(200).style("opacity", 0);
      });

    // Add a dragging instruction note
    svg
      .append("text")
      .attr("x", margin.left)
      .attr("y", 25)
      .attr("font-family", theme.fontFamily)
      .attr("font-size", "11px")
      .attr("font-style", "italic")
      .attr("fill", theme.axes)
      .attr("opacity", 0.8);
  }, [data, dimensions, orderedDimensions, draggedDimension, theme]);

  const loadingOverlay = loading ? (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        color: theme.text,
        fontSize: "14px",
        display: "flex",
        flexDirection: "column",
        gap: "15px",
        justifyContent: "center",
        alignItems: "center",
        fontFamily: theme.fontFamily,
        backgroundColor: "rgba(255, 255, 255, 0.8)",
        zIndex: 5,
        borderRadius: "8px",
      }}
    >
      <div
        className="loading-spinner"
        style={{
          width: "30px",
          height: "30px",
          border: `3px solid rgba(0, 0, 0, 0.1)`,
          borderTopColor: theme.highlight,
          borderRadius: "50%",
          animation: "spin 1s linear infinite",
        }}
      />
      <div>Loading data...</div>
      <style>
        {`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  ) : null;

  const noDataOverlay =
    !loading && (!data || data.length === 0) ? (
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          color: theme.text,
          display: "flex",
          flexDirection: "column",
          gap: "15px",
          justifyContent: "center",
          alignItems: "center",
          fontFamily: theme.fontFamily,
          backgroundColor: "rgba(255, 255, 255, 0.9)",
          zIndex: 5,
          borderRadius: "8px",
        }}
      >
        <svg
          width="40"
          height="40"
          viewBox="0 0 24 24"
          fill="none"
          stroke={theme.axes}
          strokeWidth="2"
        >
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
        <div style={{ fontWeight: 500 }}>No data available</div>
      </div>
    ) : null;

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        backgroundColor: theme.background,
        borderRadius: "8px",
        overflow: "hidden",
      }}
    >
      <svg
        ref={svgRef}
        style={{
          width: "100%",
          height: "100%",
          overflow: "visible",
        }}
      />
      {loadingOverlay}
      {noDataOverlay}
    </div>
  );
}
