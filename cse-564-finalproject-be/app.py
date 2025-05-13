from flask import Flask, jsonify, request
from flask_cors import CORS
import pandas as pd
import glob
import calendar

app = Flask(__name__)
CORS(app)

# ─── Load & preprocess all state CSVs ───────────────────────────────────────
df_all = pd.concat(
    [pd.read_csv(path) for path in glob.glob('../datasets/traffic-accident-sampled-*.csv')],
    ignore_index=True
)
df_all['Start_Time'] = pd.to_datetime(df_all['Start_Time'])
df_all['hour'] = df_all['Start_Time'].dt.hour
df_all['day'] = df_all['Start_Time'].dt.day
df_all['month'] = df_all['Start_Time'].dt.month
df_all['year'] = df_all['Start_Time'].dt.year
df_all['weekday'] = df_all['Start_Time'].dt.day_name()

def get_df_for_state(state):
    """Return filtered DataFrame if state is given, else full DataFrame."""
    if state and state not in ('ALL', 'null', 'undefined'):
        return df_all[df_all['State'] == state]
    return df_all

def filter_by_time(df, start_time, end_time):
    """Filter DataFrame by start_time and end_time if they are valid."""
    if start_time not in (None, 'undefined') and end_time not in (None, 'undefined'):
        start_time = int(start_time)
        end_time = int(end_time)
        return df[(df['hour'] >= start_time) & (df['hour'] <= end_time)]
    return df

def filter_by_pcp_values(df, args):
    """Filter DataFrame by parallel coordinates plot parameters."""
    filtered_df = df.copy()
    
    # List of potential PCP dimensions that might be filtered
    pcp_dimensions = [
        'Severity', 
        'Temperature(F)', 
        'Humidity(%)', 
        'Pressure(in)',
        'Visibility(mi)', 
        'Wind_Speed(mph)', 
        'Precipitation(in)'
    ]
    
    # Check for min/max filters for each dimension
    for dim in pcp_dimensions:
        min_key = f"{dim}_min"
        max_key = f"{dim}_max"
        
        if min_key in args and max_key in args and dim in filtered_df.columns:
            try:
                min_val = float(args.get(min_key))
                max_val = float(args.get(max_key))
                
                # Apply the filter
                filtered_df = filtered_df[(filtered_df[dim] >= min_val) & (filtered_df[dim] <= max_val)]
            except (ValueError, TypeError):
                # Skip if parameters aren't valid numbers
                pass
    
    return filtered_df

def apply_all_filters(state=None, args=None):
    """Apply all filters to the DataFrame in the correct order."""
    if args is None:
        args = {}
        
    # Get state-filtered dataframe
    df = get_df_for_state(state)
    
    # Apply time filter
    start_time = args.get('startTime')
    end_time = args.get('endTime')
    df = filter_by_time(df, start_time, end_time)
    
    # Apply PCP dimension filters
    df = filter_by_pcp_values(df, args)
    
    return df

# ─── Health check ───────────────────────────────────────────────────────────
@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy"}), 200

# ─── State counts ────────────────────────────────────────────────────────────
@app.route('/api/state-count', methods=['GET'])
def state_count():
    df = apply_all_filters(args=request.args)
    data = (
        df['State']
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
    df = apply_all_filters(state, request.args)
    top10 = (
        df['Zipcode']
        .astype(str).str.slice(0, 5)
        .value_counts()
        .head(10)
        .rename_axis('zipcode')
        .reset_index(name='count')
        .to_dict(orient='records')
    )
    return jsonify(top10), 200

# ─── County counts ───────────────────────────────────────────────────────────
@app.route('/api/county-count', methods=['GET'])
def county_count():
    state = request.args.get('state')
    limit = request.args.get('limit', default=15, type=int)
    df = apply_all_filters(state, request.args)
    
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
    df = apply_all_filters(state, request.args)
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
    df = apply_all_filters(state, request.args)
    weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    counts = (
        df['weekday']
        .value_counts()
        .reindex(weekdays, fill_value=0)
        .rename_axis('weekday')
        .reset_index(name='count')
        .to_dict(orient='records')
    )
    return jsonify(counts), 200

# ─── Parallel‐coords data ───────────────────────────────────────────────────
@app.route('/api/parallel', methods=['GET'])
def parallel():
    state = request.args.get('state')
    df = apply_all_filters(state, request.args)
    
    # For PCP data, we don't want to apply PCP filters to itself
    # This ensures the scales stay consistent
    # So we only apply state and time filters
    
    start_time = request.args.get('startTime')
    end_time = request.args.get('endTime')
    df = filter_by_time(get_df_for_state(state), start_time, end_time)
    
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
    return jsonify(result), 200

# ─── Yearly trends ──────────────────────────────────────────────────────────
@app.route('/api/yearly-trend', methods=['GET'])
def yearly_trend():
    state = request.args.get('state')
    df = apply_all_filters(state, request.args)
    yearly = (
        df['year']
        .value_counts()
        .sort_index()
        .rename_axis('year')
        .reset_index(name='count')
        .to_dict(orient='records')
    )
    return jsonify(yearly), 200

# ─── Location Data ──────────────────────────────────────────────────────────
@app.route('/api/accident-locations', methods=['GET'])
def accident_locations():
    state = request.args.get('state')
    if not state:
        return jsonify({"error": "State parameter is required"}), 400
    
    # For location data, we need to load from separate files
    # So we can't use the standard filter function
    csv_path = f"../filtered_datasets/traffic-accident-filtered_{state}.csv"
    try:
        tdf = pd.read_csv(csv_path)
    except FileNotFoundError:
        return jsonify({"error": f"No data file for state '{state}'"}), 404
    
    # Process this dataframe
    tdf['Start_Time'] = pd.to_datetime(tdf['Start_Time'], errors='coerce')
    tdf['hour'] = tdf['Start_Time'].dt.hour

    # Apply time filter
    start_time = request.args.get('startTime')
    end_time = request.args.get('endTime')
    tdf = filter_by_time(tdf, start_time, end_time)
    
    # Apply PCP filters if the columns exist in this dataset
    tdf = filter_by_pcp_values(tdf, request.args)

    cols = ['Start_Lat', 'Start_Lng', 'Severity', 'Start_Time']
    if 'Description' in tdf.columns:
        cols.append('Description')
    filtered = tdf[cols].dropna(subset=['Start_Lat', 'Start_Lng', 'Start_Time'])
    if len(filtered) > 30000:
        filtered = filtered.sample(n=30000, random_state=42)
    filtered['Start_Time'] = filtered['Start_Time'].dt.strftime('%Y-%m-%dT%H:%M:%SZ')
    records = filtered.to_dict(orient='records')
    return jsonify(records), 200

# ─── Seasonal data ────────────────────────────────────────────────────────────
@app.route('/api/sunburst', methods=['GET'])
def sunburst_data():
    state = request.args.get('state')
    df = apply_all_filters(state, request.args)

    # drop rows missing Start_Time
    df = df.dropna(subset=['Start_Time'])

    # derive month & weekday
    df['month']   = df['Start_Time'].dt.month
    df['weekday'] = df['Start_Time'].dt.day_name()
    # map month → season
    def to_season(m):
        if m in (12, 1, 2):   return 'Winter'
        if m in (3, 4, 5):    return 'Spring'
        if m in (6, 7, 8):    return 'Summer'
        return 'Fall'
    df['season'] = df['month'].apply(to_season)

    # count by season → month → weekday
    groups = df.groupby(['season','month','weekday']).size()

    # 1) build intermediate dict
    seasons = {}
    for (season, month, weekday), cnt in groups.items():
        seasons\
          .setdefault(season, {})\
          .setdefault(month, {})[weekday] = int(cnt)

    # 2) convert to D3-style tree
    tree = {'name': 'All', 'children': []}
    for season, months in seasons.items():
        s_node = {'name': season, 'children': []}
        for month, weekdays in months.items():
            m_node = {
                'name': calendar.month_name[month],
                'children': []
            }
            for wd, cnt in weekdays.items():
                # weekday leaf with value
                m_node['children'].append({
                    'name': wd,
                    'value': cnt
                })
            s_node['children'].append(m_node)
        tree['children'].append(s_node)

    return jsonify(tree), 200

# ─── POI data ────────────────────────────────────────────────────────────
@app.route('/api/poi-data', methods=['GET'])
def poi_data():
    state = request.args.get('state')
    df = apply_all_filters(state, request.args)
    
    poi_columns = [
        'Amenity', 'Bump', 'Crossing', 'Give_Way', 'Junction', 
        'No_Exit', 'Railway', 'Roundabout', 'Station', 'Stop', 
        'Traffic_Calming', 'Traffic_Signal', 'Turning_Loop'
    ]
    available_poi_columns = [col for col in poi_columns if col in df.columns]
    poi_counts = {}
    for col in available_poi_columns:
        poi_counts[col] = int(df[col].sum())
    total_accidents = len(df)
    poi_data = []
    for poi, count in poi_counts.items():
        if count > 0: 
            percentage = round((count / total_accidents) * 100, 1) if total_accidents > 0 else 0
            poi_data.append({
                'poi': poi,
                'count': count,
                'percentage': percentage
            })
    poi_data = sorted(poi_data, key=lambda x: x['percentage'], reverse=True)
    yes_count = sum(poi_counts.values())
    total_poi_values = yes_count + (len(available_poi_columns) * total_accidents - yes_count)
    yes_percentage = round((yes_count / total_poi_values) * 100, 1) if total_poi_values > 0 else 0
    no_percentage = 100 - yes_percentage
    response = {
        'poi_data': poi_data,
        'yes_no_data': [
            {'category': 'Yes', 'percentage': yes_percentage},
            {'category': 'No', 'percentage': no_percentage}
        ],
        'total_accidents': total_accidents
    }
    return jsonify(response), 200

# Add a debug endpoint to see what filters are being applied
@app.route('/api/debug-filters', methods=['GET'])
def debug_filters():
    """Debug endpoint to see what filters would be applied with current params."""
    filter_params = {}
    
    for key, value in request.args.items():
        filter_params[key] = value
    
    # Check which filters would be applied
    applied_filters = []
    
    if 'state' in request.args and request.args.get('state') not in ('ALL', 'null', 'undefined'):
        applied_filters.append(f"State: {request.args.get('state')}")
    
    if 'startTime' in request.args and 'endTime' in request.args:
        applied_filters.append(f"Time: {request.args.get('startTime')}:00 - {request.args.get('endTime')}:00")
    
    # Check PCP filters
    pcp_dimensions = [
        'Severity', 
        'Temperature(F)', 
        'Humidity(%)', 
        'Pressure(in)',
        'Visibility(mi)', 
        'Wind_Speed(mph)', 
        'Precipitation(in)'
    ]
    
    for dim in pcp_dimensions:
        min_key = f"{dim}_min"
        max_key = f"{dim}_max"
        
        if min_key in request.args and max_key in request.args:
            try:
                min_val = float(request.args.get(min_key))
                max_val = float(request.args.get(max_key))
                applied_filters.append(f"{dim}: {min_val} - {max_val}")
            except (ValueError, TypeError):
                pass
    
    return jsonify({
        "filter_params": filter_params,
        "applied_filters": applied_filters,
    }), 200

if __name__ == "__main__":
    app.run(debug=True)