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
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Find state by code
  const getStateFeature = (stateCode) => {
    if (!stateCode) return null;
    const states = topojson.feature(us, us.objects.states).features;
    const stateToFips = {
      'AL': '01','AK': '02','AZ': '04','AR': '05','CA': '06','CO': '08',
      'CT': '09','DE': '10','DC': '11','FL': '12','GA': '13','HI': '15',
      'ID': '16','IL': '17','IN': '18','IA': '19','KS': '20','KY': '21',
      'LA': '22','ME': '23','MD': '24','MA': '25','MI': '26','MN': '27',
      'MS': '28','MO': '29','MT': '30','NE': '31','NV': '32','NH': '33',
      'NJ': '34','NM': '35','NY': '36','NC': '37','ND': '38','OH': '39',
      'OK': '40','OR': '41','PA': '42','RI': '44','SC': '45','SD': '46',
      'TN': '47','TX': '48','UT': '49','VT': '50','VA': '51','WA': '53',
      'WV': '54','WI': '55','WY': '56'
    };
    const fips = stateToFips[stateCode];
    return states.find(s => s.id === fips);
  };

  // Cluster points that are too close together
  const clusterPoints = (data, projection, threshold = 5) => {
    if (!data || data.length === 0) return [];
    const clusters = [];
    const processed = new Set();
    data.forEach((pt, i) => {
      if (processed.has(i)) return;
      const [x, y] = projection([pt.Start_Lng, pt.Start_Lat]);
      if (isNaN(x) || isNaN(y)) return;
      const cluster = { x, y, size: 1, points: [pt], maxSeverity: pt.Severity || 1 };
      processed.add(i);
      data.forEach((oPt, j) => {
        if (i === j || processed.has(j)) return;
        const [ox, oy] = projection([oPt.Start_Lng, oPt.Start_Lat]);
        if (isNaN(ox) || isNaN(oy)) return;
        const dist = Math.hypot(x - ox, y - oy);
        if (dist < threshold) {
          cluster.size++;
          cluster.points.push(oPt);
          cluster.maxSeverity = Math.max(cluster.maxSeverity, oPt.Severity || 1);
          processed.add(j);
        }
      });
      clusters.push(cluster);
    });
    return clusters;
  };

  // Render map when state or data changes
  useEffect(() => {
    if (!selectedState || dimensions.width === 0) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();
    const { width, height } = dimensions;
    const margin = { top: 10, right: 10, bottom: 10, left: 10 };
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    // defs + background
    const defs = svg.append('defs');
    svg.append('rect')
      .attr('width', width)
      .attr('height', height)
      .attr('fill', '#fff');
    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // State feature + projection
    const feature = getStateFeature(selectedState);
    if (!feature) {
      svg.append('text')
        .attr('x', width/2).attr('y', height/2)
        .attr('text-anchor', 'middle')
        .attr('font-size', '14px')
        .attr('fill', '#555')
        .text(`No map data available for ${selectedState}`);
      return;
    }
    const projection = d3.geoMercator()
      .fitExtent([[margin.left, margin.top], [width - margin.right, height - margin.bottom]], feature);
    const path = d3.geoPath().projection(projection);

    // drop-shadow
    const ds = defs.append('filter').attr('id','drop-shadow').attr('height','120%');
    ds.append('feGaussianBlur').attr('in','SourceAlpha').attr('stdDeviation',3).attr('result','blur');
    ds.append('feOffset').attr('in','blur').attr('dx',2).attr('dy',2).attr('result','offsetBlur');
    const m = ds.append('feMerge');
    m.append('feMergeNode').attr('in','offsetBlur');
    m.append('feMergeNode').attr('in','SourceGraphic');

    // draw state
    g.append('path')
      .datum(feature)
      .attr('d', path)
      .attr('fill', '#e5f5e0')
      .attr('stroke', '#bbb')
      .attr('stroke-width', 0.5)
      .style('filter', 'url(#drop-shadow)');

    // counties
    if (us.objects.counties) {
      const allCounties = topojson.feature(us, us.objects.counties).features;
      const myCounties = allCounties.filter(c => c.id.startsWith(feature.id));
      g.append('g')
        .selectAll('path')
        .data(myCounties)
        .join('path')
        .attr('d', path)
        .attr('fill', 'none')
        .attr('stroke', '#ddd')
        .attr('stroke-width', 0.2)
        .attr('stroke-opacity', 0.7);
    }

    // filter valid data
    const valid = data.filter(d =>
      d.Start_Lat != null &&
      d.Start_Lng != null &&
      !isNaN(d.Start_Lat) &&
      !isNaN(d.Start_Lng)
    );

    const severityColors = {
      1: '#FFC2C2', 2: '#FF8F8F', 3: '#FF5C5C', 4: '#8B0000'
    };

    // glow filter
    const glow = defs.append('filter').attr('id','point-glow');
    glow.append('feGaussianBlur').attr('stdDeviation','1.5').attr('result','coloredBlur');
    const mg = glow.append('feMerge');
    mg.append('feMergeNode').attr('in','coloredBlur');
    mg.append('feMergeNode').attr('in','SourceGraphic');

    // heat gradient
    const heat = defs.append('linearGradient').attr('id','heat-gradient')
      .attr('x1','0%').attr('y1','0%').attr('x2','100%').attr('y2','100%');
    heat.append('stop').attr('offset','0%').attr('stop-color','#FFC2C2').attr('stop-opacity',0.7);
    heat.append('stop').attr('offset','100%').attr('stop-color','#8B0000').attr('stop-opacity',0.7);

    const useClustering = selectedState === 'PA' ||
                          selectedState === 'CA' ||
                          selectedState === 'NY' ||
                          selectedState === 'TX' ||
                          valid.length > 1000;

    if (useClustering) {
      const clusters = clusterPoints(valid, projection, 5);
      const maxSize = Math.max(...clusters.map(c => c.size));
      const radiusScale = d3.scaleSqrt().domain([1, maxSize]).range([3, 15]);

      g.append('g')
        .attr('class','accident-clusters')
        .selectAll('circle')
        .data(clusters)
        .join('circle')
        .attr('cx', d => d.x)
        .attr('cy', d => d.y)
        .attr('r', d => radiusScale(d.size))
        .attr('fill', d => d.size > 5 ? 'url(#heat-gradient)' : severityColors[d.maxSeverity])
        .attr('stroke', d => d.size > 5 ? '#FF5C5C' : 'none')
        .attr('stroke-width', 0.5)
        .attr('opacity', 0.8)
        .style('cursor','pointer')
        .on('mouseover', (e,d) => {
          setTooltip({ show:true, content: formatClusterTooltip(d), x:d.x, y:d.y });
          d3.select(e.currentTarget)
            .attr('stroke','#333').attr('stroke-width',1.5)
            .style('filter','url(#point-glow)');
        })
        .on('mouseout', (e,d) => {
          setTooltip({ ...tooltip, show:false });
          d3.select(e.currentTarget)
            .attr('stroke', d.size > 5 ? '#FF5C5C' : 'none')
            .attr('stroke-width',0.5)
            .style('filter','none');
        });
    } else {
      g.append('g')
        .attr('class','accident-points')
        .selectAll('circle')
        .data(valid)
        .join('circle')
        .attr('cx', d => projection([d.Start_Lng, d.Start_Lat])[0])
        .attr('cy', d => projection([d.Start_Lng, d.Start_Lat])[1])
        .attr('r', 2.5)
        .attr('fill', d => severityColors[d.Severity] || '#FF8F8F')
        .attr('opacity', 1.0)
        .style('cursor','pointer')
        .on('mouseover', (e,d) => {
          const [x,y] = projection([d.Start_Lng, d.Start_Lat]);
          setTooltip({ show:true, content: formatTooltip(d), x, y });
          d3.select(e.currentTarget)
            .attr('r',5).style('filter','url(#point-glow)');
        })
        .on('mouseout', (e,d) => {
          setTooltip({ ...tooltip, show:false });
          d3.select(e.currentTarget)
            .attr('r',2.5).style('filter','none');
        });
    }

    // —— UPDATED LEGEND START —— //

    // compute dynamic legend size
    const levels = [
      { level: 1, color: severityColors[1] },
      { level: 2, color: severityColors[2] },
      { level: 3, color: severityColors[3] },
      { level: 4, color: severityColors[4] }
    ];
    const baseHeight = 60 + levels.length * 15;         // header + each level
    const extraClusterHeight = useClustering ? 20 : 0;
    const legendWidth = 140;
    const legendHeight = baseHeight + extraClusterHeight;

    // choose legend position
    const pos = (() => {
      if (selectedState === 'PA')      return { x: width - 160, y: 25 };
      else if (selectedState === 'TX') return { x: 25, y: 25 };
      else if (['CA','WA','OR'].includes(selectedState)) return { x: width - 160, y: height - 150 };
      else                              return { x: 25, y: height - 150 };
    })();

    // single <g> wrapper
    const legend = svg.append('g')
      .attr('class','legend')
      .attr('transform', `translate(${pos.x},${pos.y})`);

    // shadow
    legend.append('rect')
      .attr('x',3).attr('y',3)
      .attr('width',legendWidth).attr('height',legendHeight)
      .attr('rx',4).attr('ry',4)
      .attr('fill','#000').attr('opacity',0.2);

    // background
    legend.append('rect')
      .attr('width',legendWidth).attr('height',legendHeight)
      .attr('rx',4).attr('ry',4)
      .attr('fill','#fff').attr('opacity',0.9)
      .attr('stroke','#ddd').attr('stroke-width',1);

    // Accident Location
    legend.append('circle')
      .attr('cx',15).attr('cy',25).attr('r',4)
      .attr('fill','#ff5c5c');
    legend.append('text')
      .attr('x',25).attr('y',25)
      .attr('alignment-baseline','middle')
      .attr('font-size','10px')
      .text('Accident Location');

    // Severity label
    legend.append('text')
      .attr('x',15).attr('y',45)
      .attr('alignment-baseline','middle')
      .attr('font-size','10px')
      .attr('font-weight','bold')
      .text('Severity:');

    // each level
    levels.forEach((it,i) => {
      const y = 60 + i*15;
      legend.append('circle')
        .attr('cx',15).attr('cy',y).attr('r',4)
        .attr('fill',it.color);
      legend.append('text')
        .attr('x',25).attr('y',y)
        .attr('alignment-baseline','middle')
        .attr('font-size','10px')
        .text(`Level ${it.level}`);
    });

    // cluster note
    if (useClustering) {
      legend.append('text')
        .attr('x', legendWidth/2)
        .attr('y', baseHeight + 10)
        .attr('text-anchor','middle')
        .attr('font-size','8px')
        .attr('fill','#666')
        .text('Larger circles = multiple accidents');
    }

    // —— UPDATED LEGEND END —— //

    // attribution
    svg.append('text')
      .attr('x', width - 150)
      .attr('y', height - 5)
      .attr('font-size','7px')
      .attr('fill','#aaa')
      .text('Map data: US Census Bureau');
  }, [selectedState, data, dimensions]);

  // Format tooltip content
  const formatTooltip = (d) => {
    let html = `<div style="font-family:sans-serif;padding:6px;">
      <div style="font-weight:bold;border-bottom:1px solid #ff6666;padding-bottom:3px;margin-bottom:3px;">
        Accident Details
      </div>`;
    if (d.Severity) html += `<div><span style="color:#ffaaaa;">Severity:</span> ${d.Severity}</div>`;
    if (d.Start_Time) {
      const dt = new Date(d.Start_Time);
      html += `<div><span style="color:#ffaaaa;">Date:</span> ${dt.toLocaleDateString()}</div>`;
      html += `<div><span style="color:#ffaaaa;">Time:</span> ${dt.toLocaleTimeString()}</div>`;
    }
    if (d.Description) {
      const desc = d.Description.length > 50 ? d.Description.slice(0,50) + '…' : d.Description;
      html += `<div><span style="color:#ffaaaa;">Description:</span> ${desc}</div>`;
    }
    html += `</div>`;
    return html;
  };

  // Format cluster tooltip
  const formatClusterTooltip = (c) => {
    let html = `<div style="font-family:sans-serif;padding:8px;">
      <div style="font-weight:bold;border-bottom:1px solid #ff6666;padding-bottom:4px;margin-bottom:6px;font-size:11px;">
        Accident Cluster
      </div>
      <div><span style="color:#ffaaaa;">Total Accidents:</span> ${c.size}</div>
      <div><span style="color:#ffaaaa;">Max Severity:</span> ${c.maxSeverity}</div>`;
    const times = c.points.filter(p => p.Start_Time).map(p => new Date(p.Start_Time)).sort((a,b)=>a-b);
    if (times.length > 0) {
      html += `<div><span style="color:#ffaaaa;">Date Range:</span> ${times[0].toLocaleDateString()} - ${times[times.length-1].toLocaleDateString()}</div>`;
    }
    html += `</div>`;
    return html;
  };

  // Overlays
  const noState = !selectedState && (
    <div style={{
      position:'absolute',top:0,left:0,width:'100%',height:'100%',
      display:'flex',flexDirection:'column',justifyContent:'center',alignItems:'center',
      backgroundColor:'#fff',color:'#666',fontSize:'13px'
    }}>
      <div style={{
        width:'60px',height:'60px',marginBottom:'15px',
        display:'flex',justifyContent:'center',alignItems:'center',
        borderRadius:'50%',backgroundColor:'#f8f8f8',border:'1px dashed #ddd'
      }}>
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="#aaa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M12 17V17.01" stroke="#aaa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M12 13.5C11.9816 13.1754 12.0692 12.8536 12.2495 12.5804C12.4299 12.3071 12.6938 12.0978 13 11.98C13.3779 11.8157 13.7132 11.566 13.9819 11.2516C14.2506 10.9373 14.4462 10.5666 14.5534 10.1668C14.6607 9.76704 14.6767 9.34857 14.6001 8.94137C14.5235 8.53417 14.3563 8.14749 14.11 7.80999C13.8638 7.47249 13.5451 7.19223 13.1769 6.98854C12.8087 6.78485 12.4007 6.66348 11.9813 6.63326C11.5619 6.60303 11.1404 6.66458 10.7457 6.81322C10.351 6.96185 9.99241 7.1944 9.69997 7.49999" stroke="#aaa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      <div style={{ fontWeight:'bold',marginBottom:'5px' }}>No State Selected</div>
      <div style={{ fontSize:'12px',color:'#888',maxWidth:'80%',textAlign:'center' }}>
        Click on a state in the map above to view detailed accident locations
      </div>
    </div>
  );

  const loadingOverlay = loading && (
    <div style={{
      position:'absolute',top:0,left:0,width:'100%',height:'100%',
      display:'flex',flexDirection:'column',justifyContent:'center',alignItems:'center',
      backgroundColor:'rgba(255,255,255,0.8)',color:'#666',fontSize:'13px',zIndex:5
    }}>
      <div style={{
        width:'30px',height:'30px',borderRadius:'50%',
        border:'3px solid #f3f3f3',borderTop:'3px solid #ff4d4d',
        animation:'spin 1s linear infinite',marginBottom:'10px'
      }} />
      <div>Loading accident data...</div>
      <style>{`
        @keyframes spin { 0%{transform:rotate(0deg);}100%{transform:rotate(360deg);} }
      `}</style>
    </div>
  );

  const noDataOverlay = (!loading && selectedState && (!data || data.length===0)) && (
    <div style={{
      position:'absolute',top:0,left:0,width:'100%',height:'100%',
      display:'flex',flexDirection:'column',justifyContent:'center',alignItems:'center',
      backgroundColor:'rgba(255,255,255,0.9)',color:'#666',fontSize:'13px',zIndex:5
    }}>
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="#ccc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M8 12H16" stroke="#ccc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      <div style={{ marginTop:'10px',fontWeight:'bold' }}>No Accident Data</div>
      <div style={{ fontSize:'12px',color:'#888',maxWidth:'80%',textAlign:'center',marginTop:'5px' }}>
        No accident records available for {stateNames[selectedState] || selectedState}
      </div>
    </div>
  );

  return (
    <div
      ref={containerRef}
      style={{
        width:'100%',height:'100%',
        position:'relative',backgroundColor:'#fff',
        borderRadius:'8px',overflow:'hidden'
      }}
    >
      <svg ref={svgRef} style={{ width:'100%',height:'100%' }} />
      {tooltip.show && (
        <div
          style={{
            position:'absolute',
            left:`${tooltip.x}px`,
            top:`${tooltip.y}px`,
            transform:'translate(-50%,-110%)',
            backgroundColor:'rgba(40,40,40,0.95)',
            color:'#fff',borderRadius:'6px',fontSize:'11px',
            fontFamily:'sans-serif',pointerEvents:'none',
            zIndex:1000,maxWidth:'200px',
            boxShadow:'0 4px 8px rgba(0,0,0,0.2)',
            border:'1px solid rgba(255,255,255,0.1)'
          }}
          dangerouslySetInnerHTML={{ __html: tooltip.content }}
        />
      )}
      {noState}
      {loadingOverlay}
      {noDataOverlay}
    </div>
  );
}
