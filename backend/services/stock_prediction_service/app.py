import os
import re
import subprocess
import sys
from flask import Flask, request, jsonify

app = Flask(__name__)

FLASK_DIR   = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.dirname(os.path.dirname(FLASK_DIR))

GET_DATA_SCRIPT = os.path.join(FLASK_DIR, 'get_daily_data', 'get_daily_data_v2.py')
PROCESS_SCRIPT  = os.path.join(FLASK_DIR, 'get_daily_data', 'process_prediction_data.py')
PREDICT_SCRIPT  = os.path.join(FLASK_DIR, 'prediction_generators', 'predict_{model}_v2.py')
CSV_PATH        = os.path.join(FLASK_DIR, 'stock_data', 'compiled_{ticker}.csv')
END_DATE_SCRIPT = os.path.join(BACKEND_DIR, 'utils', 'compute_end_date_pmc.py')


def run(cmd):
    result = subprocess.run(cmd, capture_output=True, text=True, cwd=BACKEND_DIR)
    if result.returncode != 0:
        raise RuntimeError(result.stdout + result.stderr)
    return result.stdout


@app.route('/predict', methods=['POST'])
def predict():
    body = request.get_json(force=True)
    ticker            = (body.get('ticker') or '').upper().strip()
    model_type        = (body.get('modelType') or '').lower().strip()
    prediction_timeline = (body.get('predictionTimeline') or '').lower().strip()
    sector_ticker     = (body.get('sectorTicker') or 'general').lower().strip()

    if not ticker or not model_type or not prediction_timeline:
        return jsonify({'error': 'ticker, modelType, and predictionTimeline are required'}), 400

    model_name  = f"{sector_ticker}_{prediction_timeline}_{model_type}"
    csv_path    = CSV_PATH.format(ticker=ticker)
    pred_script = PREDICT_SCRIPT.format(model=model_type)

    try:
        # 1) Generate CSV
        run([sys.executable, GET_DATA_SCRIPT, '-t', ticker])

        # 2) Process CSV (fill missing values)
        run([sys.executable, PROCESS_SCRIPT, csv_path, csv_path])

        # 3) Run prediction model — TF writes noise to stderr so combine both streams
        result = subprocess.run(
            [sys.executable, pred_script, csv_path, model_name],
            capture_output=True, text=True, cwd=BACKEND_DIR
        )
        stdout = result.stdout + result.stderr

        m = re.search(r'Predicted Next Day Price:\s*\$?\s*([0-9][0-9,]*\.?[0-9]*)', stdout, re.IGNORECASE)
        if not m:
            return jsonify({'error': 'Failed to parse predicted price from model output', 'output': stdout}), 500

        predicted_price = float(m.group(1).replace(',', ''))
        return jsonify({'predictedPrice': predicted_price})

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/end-date', methods=['POST'])
def end_date():
    body     = request.get_json(force=True)
    timeline = (body.get('timeline') or '').lower().strip()
    start    = (body.get('start') or '').strip()

    if not timeline or not start:
        return jsonify({'error': 'timeline and start are required'}), 400

    try:
        stdout = run([sys.executable, END_DATE_SCRIPT, timeline, '--start', start, '--format', 'iso'])

        result = stdout.strip().splitlines()[-1]
        return jsonify({'endDate': result})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001)
