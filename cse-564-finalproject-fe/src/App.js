import React, { useEffect, useState } from "react";
import MapChart from "./components/MapChart";
import BarChart from "./components/BarChart";
import TimeSeries from "./components/TimeSeries";
import ParallelCoords from "./components/ParallelCoords";
import { API_BASE_URL, ENDPOINTS } from "./constants/constants";
import StateYearlyTrend from "./components/StateYearlyTrend";
import StateDetailMap from "./components/StateDetailMap";
import CountyTreeMap from "./components/CountyTreeMap"
import IntegratedVisualization from "./components/IntegratedVisualization";

export default function App() {
  const [stateData, setStateData] = useState([]);
  const [zipData, setZipData] = useState([]);
  const [timeData, setTimeData] = useState([]);
  const [weekdayData, setWeekdayData] = useState([]);
  const [parData, setParData] = useState([]);
  const [selectedState, setSelectedState] = useState(null);
  const [hoveredState, setHoveredState] = useState(null);
  const [yearlyLoading, setYearlyLoading] = useState(false);
  const [yearlyData, setYearlyData] = useState([]);
  const [weekdayLoading, setWeekdayLoading] = useState(false);
  const [timeLoading, setTimeLoading] = useState(false);
  const [locationData, setLocationData] = useState([]);
  const [locationLoading, setLocationLoading] = useState(false);
  const [countyData, setCountyData] = useState([]);
  const [countyLoading, setCountyLoading] = useState(false);
  const [zipLoading, setZipLoading] = useState(false);


  const qs = selectedState ? `?state=${selectedState}` : "";

  useEffect(() => {
    // Load state data
    fetch(`${API_BASE_URL}${ENDPOINTS.STATE_COUNT}${qs}`)
      .then((r) => r.json())
      .then(setStateData)
      .catch((err) => console.error("Failed to load state data:", err));

    // Load ZIP code data
    fetch(`${API_BASE_URL}${ENDPOINTS.ZIP_COUNT}${qs}`)
      .then((r) => r.json())
      .then(setZipData)
      .catch((err) => console.error("Failed to load ZIP data:", err));

    // Load hourly data with loading state
    setTimeLoading(true);
    fetch(`${API_BASE_URL}${ENDPOINTS.HOURLY}${qs}`)
      .then((r) => r.json())
      .then(setTimeData)
      .catch((err) => {
        console.error("Failed to load hourly data:", err);
        setTimeData([]);
      })
      .finally(() => setTimeLoading(false));

    // Load weekday data with loading state
    setWeekdayLoading(true);
    fetch(`${API_BASE_URL}${ENDPOINTS.WEEKDAY_COUNT}${qs}`)
      .then((r) => r.json())
      .then(setWeekdayData)
      .catch((err) => {
        console.error("Failed to load weekday data:", err);
        setWeekdayData([]);
      })
      .finally(() => setWeekdayLoading(false));

    // Load parallel coordinates data
    fetch(`${API_BASE_URL}${ENDPOINTS.PARALLEL}${qs}`)
      .then((r) => r.json())
      .then(setParData)
      .catch((err) => console.error("Failed to load parallel data:", err));

    // Load yearly trend data with loading state
    setYearlyLoading(true);
    fetch(`${API_BASE_URL}${ENDPOINTS.YEARLY_TREND}${qs}`)
      .then((r) => r.json())
      .then((data) => setYearlyData(data))
      .catch((err) => {
        console.error("Failed to load yearly trend:", err);
        setYearlyData([]);
      })
      .finally(() => setYearlyLoading(false));

    if (selectedState) {
      setLocationLoading(true);
      fetch(`${API_BASE_URL}${ENDPOINTS.ACCIDENT_LOCATIONS}${qs}`)
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
    fetch(`${API_BASE_URL}${ENDPOINTS.COUNTY_COUNT}${qs}`)
      .then((r) => r.json())
      .then((data) => setCountyData(data))
      .catch((err) => {
        console.error("Failed to load county data:", err);
        setCountyData([]);
      })
      .finally(() => setCountyLoading(false));
  }, [qs, selectedState]);

  const stateOptions = stateData.map((d) => ({
    value: d.state,
    label: d.state,
  }));

  return (
    <>
      <header>🚦 Traffic Accident Analysis Dashboard</header>
      <div className="dashboard">
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
        <div className="chart-card">
          <div className="chart-title">
            {selectedState
              ? `${selectedState} Yearly Trends`
              : "Yearly Accident Trends"}
          </div>
          <StateYearlyTrend data={yearlyData} loading={yearlyLoading} />
        </div>
        <div className="chart-card">
          <div className="chart-title">Time Analysis</div>
          <TimeSeries
            hourlyData={timeData}
            weekdayData={weekdayData}
            hourlyLoading={timeLoading}
            weekdayLoading={weekdayLoading}
          />
        </div>
        <div className="chart-card">
          <div className="chart-title">Accident Locations</div>
          <StateDetailMap
            selectedState={selectedState}
            data={locationData}
            loading={locationLoading}
          />
        </div>
        <div className="chart-card">
          <div className="chart-title">
            Severity / Distance / Hour Relationships
          </div>
          <ParallelCoords data={parData} />
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
      </div>
    </>
  );
}
