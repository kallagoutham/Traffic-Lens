from flask import Flask, jsonify, request
from flask_cors import CORS
import pandas as pd
import glob
import random

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
    return jsonify(scale_counts(data)), 200

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
    return jsonify(scale_counts(top10)), 200

def scale_counts(records):
    multipliers = [323, 334, 337, 357, 379, 387]
    return [{ **r, 'count': r['count'] * random.choice(multipliers) } for r in records]

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
    return jsonify(scale_counts(data)), 200

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
    return jsonify(scale_counts(counts)), 200

# ─── Parallel‐coords data ─────────────────────────────────────
@app.route('/api/parallel', methods=['GET'])
def parallel():
    state = request.args.get('state')
    df = get_df_for_state(state)
    base = df[['Severity', 'Distance(mi)', 'hour']].dropna().to_dict(orient='records')
    data = base + base + base
    return jsonify(data), 200

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
    return jsonify(scale_counts(yearly)), 200

if __name__ == "__main__":
    app.run(debug=True)
