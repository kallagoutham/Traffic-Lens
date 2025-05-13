// Updated App.js with SunburstChart data fetching added
import React, { useEffect, useState } from "react";
import MapChart from "./components/MapChart";
import TimeSeries from "./components/TimeSeries";
import ParallelCoords from "./components/ParallelCoords";
import { API_BASE_URL, ENDPOINTS } from "./constants/constants";
import StateDetailMap from "./components/StateDetailMap";
import IntegratedVisualization from "./components/IntegratedVisualization";
import SunburstChart from "./components/SunburstChart";
import RadialBarChart from "./components/RadialBarChart";

export default function App() {
  const [stateData, setStateData] = useState([]);
  const [zipData, setZipData] = useState([]);
  const [timeData, setTimeData] = useState([]);
  const [parData, setParData] = useState([]);
  const [selectedState, setSelectedState] = useState(null);
  const [hoveredState, setHoveredState] = useState(null);
  const [weekdayLoading, setWeekdayLoading] = useState(false);
  const [weekdayData, setWeekdayData] = useState([]);
  const [timeLoading, setTimeLoading] = useState(false);
  const [locationData, setLocationData] = useState([]);
  const [locationLoading, setLocationLoading] = useState(false);
  const [countyData, setCountyData] = useState([]);
  const [countyLoading, setCountyLoading] = useState(false);
  const [zipLoading, setZipLoading] = useState(false);
  
  // Added state for RadialBarChart
  const [poiData, setPoiData] = useState(null);
  const [poiLoading, setPoiLoading] = useState(false);
  const [poiError, setPoiError] = useState(null);
  
  // Added state for SunburstChart
  const [sunburstData, setSunburstData] = useState(null);
  const [sunburstLoading, setSunburstLoading] = useState(false);
  const [sunburstError, setSunburstError] = useState(null);
  
  const [filters, setFilters] = useState({
    timeRange: null, 
    pcpValues: {},  
  });

  const updateFilters = (newFilters) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  };

  useEffect(() => {
    // only add start/end if we've brushed a timeRange
    const params = {};
    if (selectedState) params.state = selectedState;
    if (filters.timeRange) {
      params.startTime = filters.timeRange.start;
      params.endTime   = filters.timeRange.end;
    }
    Object.entries(filters.pcpValues).forEach(([key, [min, max]]) => {
      params[`${key}_min`] = min;
      params[`${key}_max`] = max;
    });
    const qs = new URLSearchParams(params).toString();
    
    // Load state data
    fetch(`${API_BASE_URL}${ENDPOINTS.STATE_COUNT}?${qs}`)
      .then((r) => r.json())
      .then(setStateData)
      .catch((err) => console.error("Failed to load state data:", err));

    // Load ZIP code data
    fetch(`${API_BASE_URL}${ENDPOINTS.ZIP_COUNT}?${qs}`)
      .then((r) => r.json())
      .then(setZipData)
      .catch((err) => console.error("Failed to load ZIP data:", err));

    // Load hourly data with loading state
    setTimeLoading(true);
    fetch(`${API_BASE_URL}${ENDPOINTS.HOURLY}?${qs}`)
      .then((r) => r.json())
      .then(setTimeData)
      .catch((err) => {
        console.error("Failed to load hourly data:", err);
        setTimeData([]);
      })
      .finally(() => setTimeLoading(false));

    // Load parallel coordinates data
    fetch(`${API_BASE_URL}${ENDPOINTS.PARALLEL}?${qs}`)
      .then((r) => r.json())
      .then(setParData)
      .catch((err) => console.error("Failed to load parallel data:", err));

    // Load weekday data with loading state
    setWeekdayLoading(true);
    fetch(`${API_BASE_URL}${ENDPOINTS.WEEKDAY_COUNT}?${qs}`)
      .then((r) => r.json())
      .then((data) => setWeekdayData(data))
      .catch((err) => {
        console.error("Failed to load weekday data:", err);
        setWeekdayData([]);
      })
      .finally(() => setWeekdayLoading(false));

    if (selectedState) {
      setLocationLoading(true);
      fetch(`${API_BASE_URL}${ENDPOINTS.ACCIDENT_LOCATIONS}?${qs}`)
        .then((r) => r.json())
        .then((data) => setLocationData(data))
        .catch((err) => {
          console.error("Failed to load location data:", err);
          setLocationData([]);
        })
        .finally(() => setLocationLoading(false));
    } else {
      setLocationData([]);
    }

    // Load county data - works with or without selected state
    setCountyLoading(true);
    fetch(`${API_BASE_URL}${ENDPOINTS.COUNTY_COUNT}?${qs}`)
      .then((r) => r.json())
      .then((data) => setCountyData(data))
      .catch((err) => {
        console.error("Failed to load county data:", err);
        setCountyData([]);
      })
      .finally(() => setCountyLoading(false));
      
    // Load POI data for RadialBarChart
    setPoiLoading(true);
    fetch(`${API_BASE_URL}${ENDPOINTS.POI_DATA}?${qs}`)
      .then((r) => {
        if (!r.ok) throw new Error(`Status: ${r.status}`);
        return r.json();
      })
      .then((result) => {
        // compute counts if missing
        if (result.yes_no_data && result.total_accidents) {
          result.yes_no_data = result.yes_no_data.map(item => ({
            ...item,
            count: item.count ?? Math.round(item.percentage/100 * result.total_accidents)
          }));
        }
        setPoiData(result);
        setPoiError(null);
      })
      .catch((err) => {
        console.error("Failed to load POI data:", err);
        setPoiError("Failed to load POI data");
        setPoiData(null);
      })
      .finally(() => setPoiLoading(false));
      
    // Load Sunburst Chart data
    setSunburstLoading(true);
    setSunburstError(null);
    
    fetch(`${API_BASE_URL}${ENDPOINTS.SUNBURST}?${qs}`)
      .then((r) => {
        if (!r.ok) throw new Error(`Failed to fetch data (${r.status})`);
        return r.json();
      })
      .then((json) => {
        // Process the data to remove days layer and sort seasons
        if (json && json.children) {
          const seasonOrder = ["Spring", "Summer", "Fall", "Winter"];
          
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
              
              season.children.forEach(month => {
                if (month.children && month.children.length > 0) {
                  month.value = month.children.reduce((sum, day) => sum + (day.value || 0), 0);
                  delete month.children;
                }
              });
            }
          });
        }
        setSunburstData(json);
        setSunburstError(null);
      })
      .catch((err) => {
        console.error("Failed to load sunburst data:", err);
        setSunburstError(err.message);
        setSunburstData(null);
      })
      .finally(() => setSunburstLoading(false));
      
  }, [selectedState, filters]);

  const stateOptions = stateData.map((d) => ({
    value: d.state,
    label: d.state,
  }));

  return (
    <>
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 20px",
        }}
      >
        <h1 style={{ margin: 0 }}>🚦 Traffic Accident Analysis Dashboard</h1>
        {(selectedState || filters.timeRange || Object.keys(filters.pcpValues).length > 0) && (
          <div style={{ display: "flex", gap: "10px" }}>
            {selectedState && (
              <button
                onClick={() => setSelectedState(null)}
                style={{
                  padding: "6px 12px",
                  fontSize: "0.9rem",
                  cursor: "pointer",
                  border: "1px solid #ccc",
                  borderRadius: "4px",
                  background: "#fff",
                }}
              >
                Reset State
              </button>
            )}
            {(filters.timeRange || Object.keys(filters.pcpValues).length > 0) && (
              <button
                onClick={() => setFilters({ timeRange: null, pcpValues: {} })}
                style={{
                  padding: "6px 12px",
                  fontSize: "0.9rem",
                  cursor: "pointer",
                  border: "1px solid #ccc",
                  borderRadius: "4px",
                  background: "#fff",
                }}
              >
                Reset Filters
              </button>
            )}
            {(selectedState || filters.timeRange || Object.keys(filters.pcpValues).length > 0) && (
              <button
                onClick={() => {
                  setSelectedState(null);
                  setFilters({ timeRange: null, pcpValues: {} });
                }}
                style={{
                  padding: "6px 12px",
                  fontSize: "0.9rem",
                  cursor: "pointer",
                  border: "1px solid #cc0000",
                  borderRadius: "4px",
                  background: "#fff",
                  color: "#cc0000",
                }}
              >
                Reset All
              </button>
            )}
          </div>
        )}
      </header>

      <div className="dashboard">
        {!selectedState && (
          <div className="chart-card">
            <div className="chart-title">State-wise Crashes</div>
            <MapChart
              data={stateData}
              selectedState={selectedState}
              hoveredState={hoveredState}
              onStateSelect={setSelectedState}
              onStateHover={setHoveredState}
            />
          </div>
        )}
        {selectedState && (
          <div className="chart-card">
            <div className="chart-title">Accident Locations</div>
            <StateDetailMap
              selectedState={selectedState}
              data={locationData}
              loading={locationLoading}
            />
          </div>
        )}
        <div className="chart-card">
          <div className="chart-title">Time & Weekday Analysis</div>
          <TimeSeries
            hourlyData={timeData}
            weekdayData={weekdayData}
            hourlyLoading={timeLoading}
            weekdayLoading={weekdayLoading}
            timeRange={filters.timeRange}
            onTimeRangeSelect={(range) => updateFilters({ timeRange: range })}
          />
        </div>
        <div className="chart-card">
          <div className="chart-title">
            Severity / Distance / Hour Relationships
          </div>
          <ParallelCoords 
            data={parData} 
            onPCPSelect={(values) => updateFilters({ pcpValues: values })}
          />
        </div>
        <div className="chart-card">
          <div className="chart-title">
            {selectedState 
              ? `${selectedState} County Distribution` 
              : "Top Counties Overall"}
          </div>
          <IntegratedVisualization
            countyData={countyData}
            zipData={zipData}
            countyLoading={countyLoading}
            zipLoading={zipLoading}
            state={selectedState}
            height={500}
            colorScheme="Reds"
            animated={true}
            treemapTitle={selectedState ? `${selectedState} Top Counties` : "Top Counties Overall"}
            barChartTitle={selectedState ? `${selectedState} Top ZIP Codes` : "Top ZIP Codes Overall"}
          />
        </div>
        <div className="chart-card">
          <div className="chart-title">
            Accident Timeline Sunburst
            {filters.timeRange && (
              <span style={{ 
                fontSize: "0.8rem", 
                fontWeight: "normal", 
                marginLeft: "8px",
                color: "#666"
              }}>
                (Time: {filters.timeRange.start}:00 - {filters.timeRange.end}:00)
              </span>
            )}
          </div>
          <SunburstChart
            data={sunburstData}
            loading={sunburstLoading}
            error={sunburstError}
            width={500}
            height={500}
            filterInfo={
              Object.keys(filters).some(key => 
                filters[key] && 
                (typeof filters[key] === 'object' ? Object.keys(filters[key]).length > 0 : true)
              ) ? filters : null
            }
          />
        </div>
        <div className="chart-card">
          <div className="chart-title">
            Point of Interest Analysis
            {filters.timeRange && (
              <span style={{ 
                fontSize: "0.8rem", 
                fontWeight: "normal", 
                marginLeft: "8px",
                color: "#666"
              }}>
                (Time: {filters.timeRange.start}:00 - {filters.timeRange.end}:00)
              </span>
            )}
          </div>
          <RadialBarChart
            data={poiData}
            loading={poiLoading}
            error={poiError}
            width={500}
            height={500}
            filterInfo={
              Object.keys(filters).some(key => 
                filters[key] && 
                (typeof filters[key] === 'object' ? Object.keys(filters[key]).length > 0 : true)
              ) ? filters : null
            }
          />
        </div>
      </div>
    </>
  );
}