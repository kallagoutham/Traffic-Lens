import React, { useEffect, useRef } from "react";
import * as d3 from "d3";
import * as topojson from "topojson-client";
import us from "us-atlas/states-10m.json";

// two‐letter codes by numeric FIPS
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

export default function MapChart({
  data,
  selectedState,
  hoveredState,
  onStateSelect,
  onStateHover,
}) {
  const ref = useRef();

  useEffect(() => {
    const svg = d3.select(ref.current);
    const width  = ref.current.clientWidth;
    const height = ref.current.clientHeight;

    svg.selectAll("*").remove();

    // GeoJSON for the states
    const geo = topojson.feature(us, us.objects.states);

    // Projection that fits exactly into our SVG
    const projection = d3.geoAlbersUsa();
    const margin = 8;
    projection.fitExtent(
      [[margin, margin], [width - margin, height - margin]],
      geo
    );
    const path = d3.geoPath(projection);

    // Build a color scale from your data
    const counts   = new Map(data.map(d => [d.state, d.count]));
    const maxCount = d3.max(data, d => d.count) || 0;
    const color    = d3.scaleSequentialSqrt([0, maxCount], d3.interpolateReds);

    svg.append("g")
      .selectAll("path")
      .data(geo.features)
      .join("path")
        .attr("d", path)
        .attr("fill", d => {
          // cast id into a number so '06' → 6
          const code = fipsToState[+d.id];
          return color(counts.get(code) || 0);
        })
        .attr("stroke", d => {
          const code = fipsToState[+d.id];
          if (code === selectedState) return "#4dff4d";
          if (code === hoveredState)  return "#ffff4d";
          return "#333";
        })
        .attr("stroke-width", d => {
          const code = fipsToState[+d.id];
          return (code === selectedState || code === hoveredState) ? 2 : 1;
        })
        .on("click", (event, d) => {
          const code = fipsToState[+d.id];
          console.log("Clicked state:", code, " (raw id:", d.id, ")");
          onStateSelect(code);
        })
        .on("mouseover", (event, d) => {
          const code = fipsToState[+d.id];
          onStateHover(code);
        })
        .on("mouseout", () => {
          onStateHover(null);
        });
  }, [data, selectedState, hoveredState, onStateSelect, onStateHover]);

  return (
    <svg ref={ref} style={{ width: "100%", height: "100%" }} />
  );
}
