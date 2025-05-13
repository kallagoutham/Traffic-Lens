// Modified App.js to avoid re-render loops with PCP component
import React, { useEffect, useState, useCallback, useRef } from "react";
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
  const [themeColor, setThemeColor] = useState('red');

  // Added state for RadialBarChart
  const [poiData, setPoiData] = useState(null);
  const [poiLoading, setPoiLoading] = useState(false);
  const [poiError, setPoiError] = useState(null);
  
  // Added state for SunburstChart
  const [sunburstData, setSunburstData] = useState(null);
  const [sunburstLoading, setSunburstLoading] = useState(false);
  const [sunburstError, setSunburstError] = useState(null);
  
  const filtersRef = useRef({
    timeRange: null, 
    pcpValues: {},  
  });
  const [filtersForUI, setFiltersForUI] = useState({
    timeRange: null, 
    pcpValues: {},
  });
  const [shouldRefetchData, setShouldRefetchData] = useState(false);
  const updateFilters = useCallback((newFilters) => {
    const prevFilters = { ...filtersRef.current };
    filtersRef.current = { ...prevFilters, ...newFilters };
    
    const timeRangeChanged = 
      (newFilters.timeRange !== undefined && 
       JSON.stringify(newFilters.timeRange) !== JSON.stringify(prevFilters.timeRange));
       
    const pcpValuesChanged = 
      (newFilters.pcpValues !== undefined && 
       JSON.stringify(newFilters.pcpValues) !== JSON.stringify(prevFilters.pcpValues));
    
    if (timeRangeChanged || pcpValuesChanged) {
      setFiltersForUI({ ...filtersRef.current });
      setShouldRefetchData(true);
    }
  }, []);

  const handlePCPSelect = useCallback((values) => {
    updateFilters({ pcpValues: values });
  }, [updateFilters]);
  
  const handleTimeRangeSelect = useCallback((range) => {
    updateFilters({ timeRange: range });
  }, [updateFilters]);

  const resetFilters = useCallback(() => {
    filtersRef.current = { timeRange: null, pcpValues: {} };
    setFiltersForUI({ timeRange: null, pcpValues: {} });
    setShouldRefetchData(true);
  }, []);

  useEffect(() => {
    if (!shouldRefetchData && filtersRef.current === filtersForUI) return;
      setShouldRefetchData(false);
    const params = {};
    if (selectedState) params.state = selectedState;
    
    const filters = filtersRef.current;
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

    // Load parallel coordinates data - do not reload if brushes are active to prevent data jumping
    if (Object.keys(filters.pcpValues).length === 0) {
      fetch(`${API_BASE_URL}${ENDPOINTS.PARALLEL}?${qs}`)
        .then((r) => r.json())
        .then(setParData)
        .catch((err) => console.error("Failed to load parallel data:", err));
    }

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
  }, [selectedState, shouldRefetchData, themeColor, filtersForUI]);

  useEffect(() => {
    resetFilters();
  }, [selectedState, resetFilters]);

  const stateOptions = stateData.map((d) => ({
    value: d.state,
    label: d.state,
  }));
  
  // Get active filter count for displaying in the filter panel
  const getActiveFilterCount = () => {
    let count = 0;
    if (filtersForUI.timeRange) count++;
    count += Object.keys(filtersForUI.pcpValues).length;
    return count;
  };
  
  // Format active filters for display
  const formatActiveFilters = () => {
    const filterTexts = [];
    
    if (filtersForUI.timeRange) {
      filterTexts.push(`Time: ${filtersForUI.timeRange.start}:00 - ${filtersForUI.timeRange.end}:00`);
    }
    
    Object.entries(filtersForUI.pcpValues).forEach(([key, [min, max]]) => {
      filterTexts.push(`${key}: ${min.toFixed(1)} - ${max.toFixed(1)}`);
    });
    
    return filterTexts;
  };
  
  // Check if any filters are active
  const hasActiveFilters = () => {
    return filtersForUI.timeRange || Object.keys(filtersForUI.pcpValues).length > 0;
  };

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
        <div style={{ display: "flex", alignItems: "center" }}>
          {/* Traffic Light Emojis */}
          <div style={{ marginRight: "10px" }}>
            <span 
              onClick={() => setThemeColor('red')}
              style={{ 
                cursor: "pointer", 
                fontSize: "1.2rem", 
                margin: "0 3px",
                opacity: themeColor === 'red' ? 1 : 0.6
              }}
              title="Red theme"
            >
              🔴
            </span>
            <span 
              onClick={() => setThemeColor('yellow')}
              style={{ 
                cursor: "pointer", 
                fontSize: "1.2rem", 
                margin: "0 3px",
                opacity: themeColor === 'yellow' ? 1 : 0.6
              }}
              title="Yellow theme"
            >
              🟡
            </span>
            <span 
              onClick={() => setThemeColor('green')}
              style={{ 
                cursor: "pointer", 
                fontSize: "1.2rem", 
                margin: "0 3px",
                opacity: themeColor === 'green' ? 1 : 0.6
              }}
              title="Green theme"
            >
              🟢
            </span>
          </div>
          <h1 style={{ margin: 0 }}>Traffic Accident Analysis Dashboard</h1>
          
          {/* Active Filters Panel */}
          {hasActiveFilters() && (
            <div style={{
              marginLeft: "15px",
              fontSize: "0.8rem",
              padding: "4px 8px",
              background: themeColor === 'red' ? "rgba(204, 0, 0, 0.1)" :
                         themeColor === 'yellow' ? "rgba(243, 156, 18, 0.1)" :
                         "rgba(46, 204, 113, 0.1)",
              borderRadius: "4px",
              border: `1px solid ${themeColor === 'red' ? "#cc0000" : 
                                   themeColor === 'yellow' ? "#f39c12" : 
                                   "#2ecc71"}`,
              display: "flex",
              alignItems: "center"
            }}>
              <span style={{ fontWeight: "bold", marginRight: "8px" }}>
                Active Filters: {getActiveFilterCount()}
              </span>
              {formatActiveFilters().slice(0, 1).map((filter, i) => (
                <span key={i} style={{ marginRight: "8px" }}>{filter}</span>
              ))}
              {formatActiveFilters().length > 1 && (
                <span>+{formatActiveFilters().length - 1} more</span>
              )}
            </div>
          )}
        </div>
        
        {(selectedState || hasActiveFilters()) && (
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
            {hasActiveFilters() && (
              <button
                onClick={resetFilters}
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
            {(selectedState || hasActiveFilters()) && (
              <button
                onClick={() => {
                  setSelectedState(null);
                  resetFilters();
                }}
                style={{
                  padding: "6px 12px",
                  fontSize: "0.9rem",
                  cursor: "pointer",
                  border: themeColor === 'red' ? "1px solid #cc0000" :
                          themeColor === 'yellow' ? "1px solid #f39c12" :
                          "1px solid #2ecc71",
                  borderRadius: "4px",
                  background: "#fff",
                  color: themeColor === 'red' ? "#cc0000" :
                          themeColor === 'yellow' ? "#f39c12" :
                          "#2ecc71",
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
              themeColor={themeColor}
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
              themeColor={themeColor}
            />
          </div>
        )}
        <div className="chart-card">
          <div className="chart-title">
            Time & Weekday Analysis
            {filtersForUI.timeRange && (
              <span style={{ 
                fontSize: "0.8rem", 
                fontWeight: "normal", 
                marginLeft: "8px",
                color: "#666"
              }}>
                (Filtered: {filtersForUI.timeRange.start}:00 - {filtersForUI.timeRange.end}:00)
              </span>
            )}
          </div>
          <TimeSeries
            hourlyData={timeData}
            weekdayData={weekdayData}
            hourlyLoading={timeLoading}
            weekdayLoading={weekdayLoading}
            timeRange={filtersForUI.timeRange}
            onTimeRangeSelect={handleTimeRangeSelect}
            themeColor={themeColor}
          />
        </div>
        <div className="chart-card">
          <div className="chart-title">
            Severity / Distance / Hour Relationships
            {Object.keys(filtersForUI.pcpValues).length > 0 && (
              <span style={{ 
                fontSize: "0.8rem", 
                fontWeight: "normal", 
                marginLeft: "8px",
                color: "#666"
              }}>
                ({Object.keys(filtersForUI.pcpValues).length} dimensions filtered)
              </span>
            )}
          </div>
          <ParallelCoords 
            data={parData} 
            onPCPSelect={handlePCPSelect}
            themeColor={themeColor}
          />
        </div>
        <div className="chart-card">
          <div className="chart-title">
            {selectedState 
              ? `${selectedState} County Distribution` 
              : "Top Counties Overall"}
            {hasActiveFilters() && (
              <span style={{ 
                fontSize: "0.8rem", 
                fontWeight: "normal", 
                marginLeft: "8px",
                color: "#666"
              }}>
                (Filtered data)
              </span>
            )}
          </div>
          <IntegratedVisualization
            countyData={countyData}
            zipData={zipData}
            countyLoading={countyLoading}
            zipLoading={zipLoading}
            state={selectedState}
            height={500}
            colorScheme={themeColor === 'red' ? "Reds" : 
                         themeColor === 'yellow' ? "Oranges" : 
                         "Greens"}
            animated={true}
            treemapTitle={selectedState ? `${selectedState} Top Counties` : "Top Counties Overall"}
            barChartTitle={selectedState ? `${selectedState} Top ZIP Codes` : "Top ZIP Codes Overall"}
            themeColor={themeColor}
          />
        </div>
        <div className="chart-card">
          <div className="chart-title">
            Accident Timeline Sunburst
            {hasActiveFilters() && (
              <span style={{ 
                fontSize: "0.8rem", 
                fontWeight: "normal", 
                marginLeft: "8px",
                color: "#666"
              }}>
                (Filtered data)
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
              hasActiveFilters() ? filtersForUI : null
            }
            themeColor={themeColor}
          />
        </div>
        <div className="chart-card">
          <div className="chart-title">
            Point of Interest Analysis
            {hasActiveFilters() && (
              <span style={{ 
                fontSize: "0.8rem", 
                fontWeight: "normal", 
                marginLeft: "8px",
                color: "#666"
              }}>
                (Filtered data)
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
              hasActiveFilters() ? filtersForUI : null
            }
            themeColor={themeColor}
          />
        </div>
      </div>
    </>
  );
}