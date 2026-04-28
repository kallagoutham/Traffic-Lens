# TrafficLens — Traffic Accident Visualization and Analysis

TrafficLens is a data exploration and visualization platform for traffic accident datasets. It pairs a lightweight Flask API that provides filtered, preprocessed CSV views with a React-based frontend containing coordinated visualizations: maps, time-series, sunburst charts, parallel coordinates, radial summaries, and more.

This README focuses on what the system does, how it is structured, the APIs exposed by the backend, data expectations and schema, and developer notes for running and extending the project.

--

**What TrafficLens does**
- Serves filtered accident records and aggregated summaries from CSV datasets via a REST API.
- Visualizes aggregates (per-state counts, hourly and weekday trends, top zip/county counts) and raw point locations for map visualization.
- Allows interactive, multi-dimensional filtering (time windows, numeric ranges for weather/visibility, state or multiple visible states) and reflects filters in all visualizations.

**System architecture (high level)**
- Frontend: React (Create React App) in `frontend/`. Responsible for UI, visualization components, and querying backend endpoints.
- Backend: Flask app in `backend/app.py`. Loads CSVs into pandas DataFrames on startup and serves filtered/aggregated JSON endpoints. Uses `flask-caching` for simple in-memory caching.
- Data: CSV files in `datasets/` and `filtered_datasets/`. The backend expects some files to follow naming conventions (see Data schema below).

**API (endpoints & behavior)**
All endpoints are mounted under `/api/` in the current backend. Key endpoints and query parameters:

- `GET /api/health`
	- Simple health check. Returns `{ "status": "healthy" }`.

- `GET /api/state-count`
	- Returns per-state counts respecting filters.
	- Query params: `state`, `startTime`, `endTime`, `<dim>_min`, `<dim>_max`, `visibleStates` (comma-separated list)
	- Response: `[{"state":"NY","count":12345}, ...]`

- `GET /api/zip-count` and `/api/county-count`
	- Top N zipcodes or counties by accident count.
	- `limit` param supported for `/api/county-count` (default 15).

- `GET /api/hourly`
	- Returns counts grouped by hour of day (0–23).
	- Response: `[{"hour":0,"count":...}, ...]`

- `GET /api/weekday-count`
	- Returns counts for Monday–Sunday in that order.

- `GET /api/parallel`
	- Returns up to a sample of records with the numeric columns used for parallel coordinates. Uses filtering parameters.

- `GET /api/yearly-trend`
	- Returns counts grouped by year.

- `GET /api/accident-locations?state=XX`
	- Returns geo points for accidents in the specified `state` (required). Uses filtered CSV per-state in `filtered_datasets/traffic-accident-filtered_{STATE}.csv`.
	- Response items contain `Start_Lat`, `Start_Lng`, `Severity`, `Start_Time` (ISO string), and optionally `Description`.

- `GET /api/sunburst`
	- Returns hierarchical season→month→weekday counts suitable for a sunburst/dendrogram chart.

- `GET /api/poi-data`
	- Returns counts and yes/no percentage distributions for point-of-interest flags columns (Amenity, Bump, Crossing, etc.) when present in data.

Query parameter notes:
- Numeric range filters use keys like `Severity_min` / `Severity_max` or `Temperature(F)_min` / `Temperature(F)_max`. The backend ignores malformed numeric ranges.
- `startTime` and `endTime` are hours (0–23) used to filter accident events by the `hour` parsed from `Start_Time`.

--

Data schema and expectations
- The backend is written to operate on CSVs that contain at least some of the following columns (case sensitive as used in code):
	- `Start_Time` (ISO or parseable timestamp)
	- `State` (state abbreviation e.g., `NY`)
	- `Zipcode` (string / numeric)
	- `County` (optional)
	- `Start_Lat`, `Start_Lng` (latitude/longitude for mapping)
	- `Severity` (numeric, small integer)
	- `Temperature(F)`, `Humidity(%)`, `Pressure(in)`, `Visibility(mi)`, `Wind_Speed(mph)`, `Precipitation(in)` (numeric weather/visibility features)
	- `Description` (text, optional)
	- POI flag columns: `Amenity`, `Bump`, `Crossing`, `Give_Way`, `Junction`, `No_Exit`, `Railway`, `Roundabout`, `Station`, `Stop`, `Traffic_Calming`, `Traffic_Signal`, `Turning_Loop`

- File naming convention used by the backend on startup:
	- Aggregation source: `datasets/traffic-accident-sampled-*.csv` (globbed and concatenated into in-memory DataFrame)
	- Point location per-state: `filtered_datasets/traffic-accident-filtered_{STATE}.csv`

If your CSVs differ in column names or locations, update the path or column logic in `backend/app.py`.

--

Developer setup & reproducible environment

1) Frontend (development)
```bash
cd frontend
npm install
npm start
```
Open `http://localhost:3000` (CRA default). The React app uses the backend API (CORS is enabled in backend/app.py for local dev).

2) Backend (development)
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt  # if present
# otherwise
pip install flask flask-cors flask-caching pandas
python app.py
```
The app listens on `localhost:5000` by default (Flask dev server). For production deploy, use a WSGI server such as `gunicorn`.

Suggested `backend/requirements.txt` (example):
```
Flask>=2.0
flask-cors
flask-caching
pandas

# Optional/advise for production
gunicorn

```

--

Testing and validation
- There are no automated tests included by default. Suggested additions:
	- Unit tests for backend filter functions and endpoint responses (pytest + requests)
	- Snapshot or component tests for key React components (Jest + React Testing Library)

--

Deployment notes
- Backend: containerize `backend/` with a small `Dockerfile`, run with `gunicorn` for concurrency, and mount data volumes for `datasets/` and `filtered_datasets/`.
- Frontend: `npm run build` produces static assets to host on Netlify, Vercel, or behind an NGINX server; ensure API endpoint environment variable or reverse proxy is configured.

--

Project structure (top-level)
- `frontend/` — React UI (source under `frontend/src/`)
- `backend/` — Flask API (`app.py`) and related scripts
- `datasets/` — original or sampled CSV data files
- `filtered_datasets/` — pre-sliced per-state CSV files used to produce point locations
- `README.md` — this file

Contributing
- Fork, develop on a branch, and open a pull request. If you add tests, please include them.
