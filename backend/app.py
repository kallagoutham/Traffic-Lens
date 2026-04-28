from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_caching import Cache
import pandas as pd
import glob
import os
import calendar

# ─── App & Cache Setup ───────────────────────────────────────────────────────
app = Flask(__name__)
CORS(app)

# In-memory cache; for production you might switch to "RedisCache"
app.config.from_mapping({
    "CACHE_TYPE": "SimpleCache",
    "CACHE_DEFAULT_TIMEOUT": 600,  # seconds
})
cache = Cache(app)

# ─── Load & preprocess all state CSVs ───────────────────────────────────────
# Attempt to locate dataset CSVs. Primary expected location is '../datasets/traffic-accident-sampled-*.csv'.
paths = glob.glob('../datasets/traffic-accident-sampled-*.csv')
if not paths:
    # Try several sensible alternative locations (single-file or other naming patterns)
    alt_patterns = [
        '../traffic-accident-ny-filtered.csv',
        '../traffic-accident-*.csv',
        '../filtered_datasets/traffic-accident-filtered_*.csv',
        '../datasets/*.csv'
    ]
    for p in alt_patterns:
        found = glob.glob(p)
        if found:
            paths.extend(found)

if not paths:
    raise FileNotFoundError(
        "No dataset CSVs found. Expected files like '../datasets/traffic-accident-sampled-*.csv' or '../traffic-accident-ny-filtered.csv'.\n"
        "Place CSVs in 'datasets/' or 'filtered_datasets/', or update the path logic in backend/app.py."
    )

# Deduplicate paths while preserving order (some globs can match the same file twice)
seen = set()
unique_paths = []
for p in paths:
    if p not in seen:
        seen.add(p)
        unique_paths.append(p)

sizes = []
for p in unique_paths:
    try:
        sizes.append((p, os.path.getsize(os.path.join(os.path.dirname(__file__), p))))
    except OSError:
        sizes.append((p, None))

print(f"Loading {len(unique_paths)} dataset file(s): {unique_paths}")
for p, s in sizes:
    print(f" - {p} ({'unknown size' if s is None else f'{s} bytes'})")

# Read and concatenate CSVs
df_all = pd.concat([pd.read_csv(path) for path in unique_paths], ignore_index=True)
df_all['Start_Time'] = pd.to_datetime(df_all['Start_Time'])
df_all['hour']       = df_all['Start_Time'].dt.hour
df_all['day']        = df_all['Start_Time'].dt.day
df_all['month']      = df_all['Start_Time'].dt.month
df_all['year']       = df_all['Start_Time'].dt.year
df_all['weekday']    = df_all['Start_Time'].dt.day_name()

def get_df_for_state(state, visible_states=None):
    if state and state not in ('ALL', 'null', 'undefined'):
        return df_all[df_all['State'] == state]
    if visible_states:
        return df_all[df_all['State'].isin(visible_states)]
    return df_all

def filter_by_time(df, start_time, end_time):
    if start_time not in (None, 'undefined') and end_time not in (None, 'undefined'):
        try:
            st = int(start_time); et = int(end_time)
            return df[(df['hour'] >= st) & (df['hour'] <= et)]
        except ValueError:
            pass
    return df

def filter_by_pcp_values(df, args):
    dims = [
        'Severity', 'Temperature(F)', 'Humidity(%)', 'Pressure(in)',
        'Visibility(mi)', 'Wind_Speed(mph)', 'Precipitation(in)'
    ]
    out = df
    for dim in dims:
        min_k, max_k = f"{dim}_min", f"{dim}_max"
        if min_k in args and max_k in args and dim in out.columns:
            try:
                mn, mx = float(args[min_k]), float(args[max_k])
                out = out[(out[dim] >= mn) & (out[dim] <= mx)]
            except (ValueError, TypeError):
                pass
    return out

def parse_visible_states(args):
    vs = args.get('visibleStates')
    if vs and vs not in ('null','undefined',''):
        return [s for s in vs.split(',') if s]
    return None

def apply_all_filters(state=None, args=None):
    args = args or {}
    vs = parse_visible_states(args)
    df = get_df_for_state(state, vs)
    df = filter_by_time(df, args.get('startTime'), args.get('endTime'))
    df = filter_by_pcp_values(df, args)
    return df

# ─── Health check (no cache) ────────────────────────────────────────────────
@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy"}), 200

# ─── Cached endpoints ────────────────────────────────────────────────────────

@app.route('/api/state-count', methods=['GET'])
@cache.cached(query_string=True)
def state_count():
    df = apply_all_filters(request.args.get('state'), request.args)
    data = (
        df['State']
        .value_counts()
        .rename_axis('state')
        .reset_index(name='count')
        .to_dict(orient='records')
    )
    return jsonify(data), 200

@app.route('/api/zip-count', methods=['GET'])
@cache.cached(query_string=True)
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

@app.route('/api/county-count', methods=['GET'])
@cache.cached(query_string=True)
def county_count():
    state = request.args.get('state')
    limit = request.args.get('limit', default=15, type=int)
    df = apply_all_filters(state, request.args)
    if 'County' not in df.columns:
        return jsonify({"error": "County data not available"}), 404
    top = (
        df['County']
        .fillna('Unknown')
        .value_counts()
        .head(limit)
        .rename_axis('county')
        .reset_index(name='count')
        .to_dict(orient='records')
    )
    return jsonify(top), 200

@app.route('/api/hourly', methods=['GET'])
@cache.cached(query_string=True)
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

@app.route('/api/weekday-count', methods=['GET'])
@cache.cached(query_string=True)
def weekday_count():
    state = request.args.get('state')
    df = apply_all_filters(state, request.args)
    days = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"]
    counts = (
        df['weekday']
        .value_counts()
        .reindex(days, fill_value=0)
        .rename_axis('weekday')
        .reset_index(name='count')
        .to_dict(orient='records')
    )
    return jsonify(counts), 200

@app.route('/api/parallel', methods=['GET'])
@cache.cached(query_string=True)
def parallel():
    state = request.args.get('state')
    vs = parse_visible_states(request.args)
    df = filter_by_time(get_df_for_state(state, vs), request.args.get('startTime'), request.args.get('endTime'))
    attrs = [
        'Severity','Temperature(F)','Humidity(%)','Pressure(in)',
        'Visibility(mi)','Wind_Speed(mph)','Precipitation(in)'
    ]
    cols = [c for c in attrs if c in df.columns]
    data = df[cols].dropna().head(500).to_dict(orient='records')
    return jsonify(data), 200

@app.route('/api/yearly-trend', methods=['GET'])
@cache.cached(query_string=True)
def yearly_trend():
    state = request.args.get('state')
    df = apply_all_filters(state, request.args)
    data = (
        df['year']
        .value_counts()
        .sort_index()
        .rename_axis('year')
        .reset_index(name='count')
        .to_dict(orient='records')
    )
    return jsonify(data), 200

@app.route('/api/accident-locations', methods=['GET'])
@cache.cached(query_string=True)
def accident_locations():
    state = request.args.get('state')
    if not state:
        return jsonify({"error": "State parameter is required"}), 400
    path = f"../filtered_datasets/traffic-accident-filtered_{state}.csv"
    try:
        tdf = pd.read_csv(path)
    except FileNotFoundError:
        return jsonify({"error": f"No data file for state '{state}'"}), 404

    tdf['Start_Time'] = pd.to_datetime(tdf['Start_Time'], errors='coerce')
    tdf['hour'] = tdf['Start_Time'].dt.hour
    tdf = filter_by_time(tdf, request.args.get('startTime'), request.args.get('endTime'))
    tdf = filter_by_pcp_values(tdf, request.args)

    cols = ['Start_Lat','Start_Lng','Severity','Start_Time']
    if 'Description' in tdf.columns:
        cols.append('Description')
    out = tdf.dropna(subset=['Start_Lat','Start_Lng','Start_Time'])
    if len(out) > 30000:
        out = out.sample(30000, random_state=42)
    out['Start_Time'] = out['Start_Time'].dt.strftime('%Y-%m-%dT%H:%M:%SZ')
    return jsonify(out[cols].to_dict(orient='records')), 200

@app.route('/api/sunburst', methods=['GET'])
@cache.cached(query_string=True)
def sunburst_data():
    state = request.args.get('state')
    df = apply_all_filters(state, request.args).dropna(subset=['Start_Time'])
    df['month']   = df['Start_Time'].dt.month
    df['weekday'] = df['Start_Time'].dt.day_name()
    def to_season(m):
        if m in (12,1,2): return 'Winter'
        if m in (3,4,5):  return 'Spring'
        if m in (6,7,8):  return 'Summer'
        return 'Fall'
    df['season'] = df['month'].apply(to_season)

    groups = df.groupby(['season','month','weekday']).size()
    tree = {'name':'All','children':[]}
    for (s,m,w),cnt in groups.items():
        # find or create season node
        sn = next((x for x in tree['children'] if x['name']==s), None)
        if not sn:
            sn = {'name':s,'children':[]}
            tree['children'].append(sn)
        # find or create month node
        mn = calendar.month_name[m]
        mn_node = next((x for x in sn['children'] if x['name']==mn), None)
        if not mn_node:
            mn_node = {'name':mn,'children':[]}
            sn['children'].append(mn_node)
        mn_node['children'].append({'name':w,'value':int(cnt)})

    return jsonify(tree), 200

@app.route('/api/poi-data', methods=['GET'])
@cache.cached(query_string=True)
def poi_data():
    state = request.args.get('state')
    df = apply_all_filters(state, request.args)
    poi_cols = [
        'Amenity','Bump','Crossing','Give_Way','Junction','No_Exit',
        'Railway','Roundabout','Station','Stop','Traffic_Calming','Traffic_Signal','Turning_Loop'
    ]
    avail = [c for c in poi_cols if c in df.columns]
    counts = {c: int(df[c].sum()) for c in avail}
    total = len(df)
    poi_list = []
    for name, cnt in counts.items():
        if cnt > 0:
            pct = round(cnt/total*100, 1) if total else 0
            poi_list.append({'poi':name,'count':cnt,'percentage':pct})
    poi_list.sort(key=lambda x: x['percentage'], reverse=True)

    yes = sum(counts.values())
    no = len(avail)*total - yes
    yes_pct = round(yes/(yes+no)*100,1) if (yes+no)>0 else 0

    return jsonify({
        'poi_data': poi_list,
        'yes_no_data': [
            {'category':'Yes','percentage':yes_pct},
            {'category':'No','percentage':100-yes_pct}
        ],
        'total_accidents': total
    }), 200

@app.route('/api/debug-filters', methods=['GET'])
@cache.cached(query_string=True)
def debug_filters():
    params = dict(request.args)
    applied = []

    if 'state' in params and params['state'] not in ('ALL','null','undefined'):
        applied.append(f"State: {params['state']}")
    vs = parse_visible_states(request.args)
    if vs:
        applied.append(f"Visible States: {', '.join(vs)}")
    if 'startTime' in params and 'endTime' in params:
        applied.append(f"Time: {params['startTime']}:00 - {params['endTime']}:00")

    dims = [
        'Severity','Temperature(F)','Humidity(%)','Pressure(in)',
        'Visibility(mi)','Wind_Speed(mph)','Precipitation(in)'
    ]
    for d in dims:
        mn, mx = f"{d}_min", f"{d}_max"
        if mn in params and mx in params:
            try:
                applied.append(f"{d}: {float(params[mn])} - {float(params[mx])}")
            except ValueError:
                pass

    return jsonify({"filter_params": params, "applied_filters": applied}), 200

if __name__ == "__main__":
    app.run(debug=True)
