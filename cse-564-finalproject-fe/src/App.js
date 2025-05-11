import React, { useEffect, useState } from "react";
import MapChart from "./components/MapChart";
import BarChart from "./components/BarChart";
import TimeSeries from "./components/TimeSeries";
import ParallelCoords from "./components/ParallelCoords";
import { API_BASE_URL, ENDPOINTS } from "./constants/constants";
import StateYearlyTrend from "./components/StateYearlyTrend";
//import Dropdown from "./components/Dropdown";
// import StateAnalysis from "./components/StateAnalysis";

export default function App() {
  const [stateData, setStateData] = useState([]);
  const [zipData, setZipData] = useState([]);
  const [timeData, setTimeData] = useState([]);
  const [parData, setParData] = useState([]);
  const [selectedState, setSelectedState] = useState(null);
  const [hoveredState, setHoveredState] = useState(null);
  const [yearlyLoading, setYearlyLoading] = useState(false);
  const [yearlyData, setYearlyData]     = useState([]);

  const qs = selectedState ? `?state=${selectedState}` : '';

  useEffect(() => {
    fetch(`${API_BASE_URL}${ENDPOINTS.STATE_COUNT}${qs}`)
      .then((r) => r.json())
      .then(setStateData);
    fetch(`${API_BASE_URL}${ENDPOINTS.ZIP_COUNT}${qs}`)
      .then((r) => r.json())
      .then(setZipData);
    fetch(`${API_BASE_URL}${ENDPOINTS.HOURLY}${qs}`)
      .then((r) => r.json())
      .then(setTimeData);
    fetch(`${API_BASE_URL}${ENDPOINTS.PARALLEL}${qs}`)
      .then((r) => r.json())
      .then(setParData);
    setYearlyLoading(true);
    fetch(`${API_BASE_URL}${ENDPOINTS.YEARLY_TREND}${qs}`)
      .then(r => r.json())
      .then(data => setYearlyData(data))
      .catch(err => {
        console.error("Failed to load yearly trend:", err);
        setYearlyData([]); 
      })
      .finally(() => setYearlyLoading(false));
}, [qs]);

  //eslint-disable-next-line
  const stateOptions = stateData.map((d) => ({
    value: d.state,
    label: d.state,
  }));
  

  return (
    <>
      <header>🚦 Traffic Accident Analysis Dashboard</header>
      {/* <div
        className="controls"
        style={{ padding: "8px 12px"}}
      >
        <Dropdown
          options={[{ value: null, label: "All States" }, ...stateOptions]}
          value={selectedState}
          onChange={setSelectedState}
        />
      </div> */}
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
          <div className="chart-title">Top 10 ZIP Codes</div>
          <BarChart data={zipData} />
        </div>
        <div className="chart-card">
          <div className="chart-title">Hourly Trend</div>
          <TimeSeries data={timeData} />
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
              ? `${selectedState} Yearly Trends`
              : "Yearly Accident Trends"}
          </div>
          <StateYearlyTrend
            data={yearlyData}
            loading={yearlyLoading}
          />
        </div>
        {/* <div className="chart-card">
          <div className="chart-title">
            {hoveredState || selectedState
              ? `${hoveredState || selectedState} Analysis`
              : "State Analysis"}
          </div>
          {hoveredState || selectedState ? (
            <StateAnalysis
              data={stateData.find(
                (d) => d.state === (hoveredState || selectedState)
              )}
            />
          ) : (
            <div style={{ color: "#888", padding: "20px" }}>
              Hover over or select a state to see its numbers.
            </div>
          )}
        </div> */}
      </div>
    </>
  );
}
