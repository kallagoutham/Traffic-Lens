from flask import Flask, jsonify, request
from flask_cors import CORS
import pandas as pd
import glob

app = Flask(__name__)
CORS(app)

# ─── Load & preprocess all state CSVs ───────────────────────────────────────
df_all = pd.concat(
    [pd.read_csv(path) for path in glob.glob('../datasets/traffic-accident-sampled-*.csv')],
    ignore_index=True
)
df_all['Start_Time'] = pd.to_datetime(df_all['Start_Time'])
df_all['hour']       = df_all['Start_Time'].dt.hour
df_all['day']        = df_all['Start_Time'].dt.day
df_all['month']      = df_all['Start_Time'].dt.month
df_all['year']       = df_all['Start_Time'].dt.year
df_all['weekday'] = df_all['Start_Time'].dt.day_name()

def get_df_for_state(state):
    """Return filtered DataFrame if state is given, else full DataFrame."""
    if state and state not in ('ALL', 'null', 'undefined'):
        return df_all[df_all['State'] == state]
    return df_all

# ─── Health check ───────────────────────────────────────────────────────────
@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy"}), 200

# ─── State counts ────────────────────────────────────────────────────────────
@app.route('/api/state-count', methods=['GET'])
def state_count():
    data = (
        df_all['State']
        .value_counts()
        .rename_axis('state')
        .reset_index(name='count')
        .to_dict(orient='records')
    )
    return jsonify(data), 200

# ─── ZIP counts ──────────────────────────────────────────────────────────────
@app.route('/api/zip-count', methods=['GET'])
def zip_count():
    state = request.args.get('state')
    df = get_df_for_state(state)
    top10 = (
        df['Zipcode']
        .astype(str).str.slice(0,5)
        .value_counts()
        .head(10)
        .rename_axis('zipcode')
        .reset_index(name='count')
        .to_dict(orient='records')
    )
    return jsonify(top10), 200

# ─── NEW - County counts ───────────────────────────────────────────────────────
@app.route('/api/county-count', methods=['GET'])
def county_count():
    state = request.args.get('state')
    limit = request.args.get('limit', default=15, type=int)
    
    df = get_df_for_state(state)
    if 'County' not in df.columns:
        return jsonify({"error": "County data not available"}), 404
    
    top_counties = (
        df['County']
        .fillna('Unknown')
        .value_counts()
        .head(limit)
        .rename_axis('county')
        .reset_index(name='count')
        .to_dict(orient='records')
    )
    return jsonify(top_counties), 200

# ─── Hourly counts ──────────────────────────────────────────────────────────
@app.route('/api/hourly', methods=['GET'])
def hourly():
    state = request.args.get('state')
    df = get_df_for_state(state)
    data = (
        df.groupby('hour')
        .size()
        .reset_index(name='count')
        .to_dict(orient='records')
    )
    return jsonify(data), 200

# ─── Weekday counts ─────────────────────────────────────────────────────────
@app.route('/api/weekday-count', methods=['GET'])
def weekday_count():
    state = request.args.get('state')
    df = get_df_for_state(state)
    # ensure Monday→Sunday order
    weekdays = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"]
    counts = (
        df['weekday']
        .value_counts()
        .reindex(weekdays, fill_value=0)
        .rename_axis('weekday')
        .reset_index(name='count')
        .to_dict(orient='records')
    )
    return jsonify(counts), 200

# ─── Parallel‐coords data ─────────────────────────────────────
@app.route('/api/parallel', methods=['GET'])
def parallel():
    state = request.args.get('state')
    df = get_df_for_state(state)
    weather_attributes = [
        'Severity', 
        'Temperature(F)', 
        'Humidity(%)', 
        'Pressure(in)',
        'Visibility(mi)', 
        'Wind_Speed(mph)', 
        'Precipitation(in)'
    ]
    available_columns = [col for col in weather_attributes if col in df.columns]
    selected_data = df[available_columns].dropna()
    result = selected_data.head(500).to_dict(orient='records')
    result = result 
    return jsonify(result), 200

# ─── Yearly trends ──────────────────────────────────────────────────────────
@app.route('/api/yearly-trend', methods=['GET'])
def yearly_trend():
    state = request.args.get('state')
    df = get_df_for_state(state)
    yearly = (
        df['year']
        .value_counts()
        .sort_index()
        .rename_axis('year')
        .reset_index(name='count')
        .to_dict(orient='records')
    )
    return jsonify(yearly), 200

# ─── Location Data ──────────────────────────────────────────────────────
@app.route('/api/accident-locations', methods=['GET'])
def accident_locations():
    state = request.args.get('state')
    if not state:
        return jsonify({"error": "State parameter is required"}), 400
    csv_path = f"../filtered_datasets/traffic-accident-filtered_{state}.csv"
    try:
        tdf = pd.read_csv(csv_path)
    except FileNotFoundError:
        return jsonify({"error": f"No data file for state '{state}'"}), 404
    tdf['Start_Time'] = pd.to_datetime(tdf['Start_Time'], errors='coerce')
    cols = ['Start_Lat', 'Start_Lng', 'Severity', 'Start_Time']
    if 'Description' in tdf.columns:
        cols.append('Description')
    filtered = tdf[cols]
    filtered = filtered.dropna(subset=['Start_Lat', 'Start_Lng', 'Start_Time'])
    if len(filtered) > 30000:
        filtered = filtered.sample(n=30000, random_state=42)
    filtered['Start_Time'] = filtered['Start_Time'].dt.strftime('%Y-%m-%dT%H:%M:%SZ')
    records = filtered.to_dict(orient='records')
    return jsonify(records), 200

if __name__ == "__main__":
    app.run(debug=True)
