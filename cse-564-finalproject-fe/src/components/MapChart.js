import React, { useEffect, useRef } from "react";
import * as d3 from "d3";
import * as topojson from "topojson-client";
import us from "us-atlas/states-10m.json";

// map FIPS codes to two‐letter state abbreviations
const fipsToState = {
  1:  'AL', 2:  'AK', 4:  'AZ', 5:  'AR', 6:  'CA', 8:  'CO',
  9:  'CT', 10: 'DE', 11: 'DC', 12: 'FL', 13: 'GA', 15: 'HI',
  16: 'ID', 17: 'IL', 18: 'IN', 19: 'IA', 20: 'KS', 21: 'KY',
  22: 'LA', 23: 'ME', 24: 'MD', 25: 'MA', 26: 'MI', 27: 'MN',
  28: 'MS', 29: 'MO', 30: 'MT', 31: 'NE', 32: 'NV', 33: 'NH',
  34: 'NJ', 35: 'NM', 36: 'NY', 37: 'NC', 38: 'ND', 39: 'OH',
  40: 'OK', 41: 'OR', 42: 'PA', 44: 'RI', 45: 'SC', 46: 'SD',
  47: 'TN', 48: 'TX', 49: 'UT', 50: 'VT', 51: 'VA', 53: 'WA',
  54: 'WV', 55: 'WI', 56: 'WY'
};

export default function MapChart({
  data,
  selectedState,
  hoveredState,
  onStateSelect,
  onStateHover,
}) {
  const ref = useRef();

  useEffect(() => {
    const svg = d3
      .select(ref.current)
      .attr("width", "100%")
      .attr("height", "100%");
    svg.selectAll("*").remove();

    const geo = topojson.feature(us, us.objects.states);
    const projection = d3
      .geoAlbersUsa()
      .fitSize([300, 200], geo);
    const path = d3.geoPath(projection);

    const counts = new Map(data.map((d) => [d.state, d.count]));
    const maxCount = d3.max(data, (d) => d.count) || 0;
    const color = d3.scaleSequentialSqrt([0, maxCount], d3.interpolateReds);

    svg
      .append("g")
      .selectAll("path")
      .data(geo.features)
      .join("path")
        .attr("d", path)
        .attr("fill", (d) => {
          const st = fipsToState[d.id];
          return color(counts.get(st) || 0);
        })
        .attr("stroke", (d) => {
          const st = fipsToState[d.id];
          if (st === selectedState) return "#4dff4d";       // bright green for selected
          if (st === hoveredState)  return "#ffff4d";       // yellow for hover
          return "#333";
        })
        .attr("stroke-width", (d) => {
          const st = fipsToState[d.id];
          return (st === selectedState || st === hoveredState) ? 2 : 1;
        })
        .on("click", (event, d) => {
          const st = fipsToState[d.id];
          onStateSelect(st);
        })
        .on("mouseover", (event, d) => {
          const st = fipsToState[d.id];
          onStateHover(st);
        })
        .on("mouseout", () => {
          onStateHover(null);
        });
  }, [data, selectedState, hoveredState, onStateSelect, onStateHover]);

  return <svg ref={ref} />;
}
