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

def get_df_for_state(state):
    """Return filtered DataFrame if state is given, else full DataFrame."""
    if state and state not in ('ALL', 'null', 'undefined'):
        return df_all[df_all['State'] == state]
    return df_all

# ─── Health check ───────────────────────────────────────────────────────────
@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy"}), 200

# ─── Cumulative state counts (always full data) ─────────────────────────────
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

# ─── Top 10 ZIP codes (optionally by state) ─────────────────────────────────
@app.route('/api/zip-count', methods=['GET'])
def zip_count():
    state = request.args.get('state')
    df = get_df_for_state(state)
    top10 = (
        df['Zipcode']
        .value_counts()
        .head(10)
        .rename_axis('zipcode')
        .reset_index(name='count')
        .to_dict(orient='records')
    )
    return jsonify(top10), 200

# ─── Hourly crash counts (optionally by state) ───────────────────────────────
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

# ─── Parallel‐coords data (Severity, Distance, Hour; optionally by state) ────
@app.route('/api/parallel', methods=['GET'])
def parallel():
    state = request.args.get('state')
    df = get_df_for_state(state)
    data = df[['Severity', 'Distance(mi)', 'hour']].dropna().to_dict(orient='records')
    return jsonify(data), 200

if __name__ == "__main__":
    app.run(debug=True)
