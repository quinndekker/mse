import os
import sys
import numpy as np
import pandas as pd
import tensorflow as tf
import joblib
import json
from tensorflow.keras.models import load_model

def load_latest_data(csv_file, feature_names, sequence_length=60):
    df = pd.read_csv(csv_file, index_col=0)
    df.index = pd.to_datetime(df.index)
    df.sort_index(ascending=True, inplace=True)

    missing_cols = [col for col in feature_names if col not in df.columns and col != "log_return"]
    if missing_cols:
        raise ValueError(f"Missing columns in input data: {', '.join(missing_cols)}")

    df = df.apply(pd.to_numeric, errors='coerce')
    df.fillna(df.mean(), inplace=True)

    if "log_return" not in df.columns:
        df["log_return"] = np.log(df["close"] / df["close"].shift(1))
        df.fillna(0.0, inplace=True)

    latest_data = df.iloc[-sequence_length:][feature_names].values

    if latest_data.shape[0] < sequence_length:
        raise ValueError(f"Only {latest_data.shape[0]} rows available, but {sequence_length} required.")

    return np.array([latest_data])

def predict_next_price(csv_file, model_name):
    model_path = f"services/stock_prediction_service/predictive_models/{model_name}.h5"
    feature_scaler_path = f"services/stock_prediction_service/scalars/{model_name}_feature_scaler.pkl"
    target_scaler_path = f"services/stock_prediction_service/scalars/{model_name}_target_scaler.pkl"
    feature_names_path = f"services/stock_prediction_service/scalars/{model_name}_feature_names.json"

    for path in [model_path, feature_scaler_path, target_scaler_path, feature_names_path]:
        if not os.path.exists(path):
            raise FileNotFoundError(f"Required file not found: {path}")

    print(f"🔄 Loading GRU model: {model_path}")
    model = load_model(model_path)

    print(f"🔄 Loading scalers...")
    feature_scaler = joblib.load(feature_scaler_path)
    target_scaler = joblib.load(target_scaler_path)

    print(f"🔄 Loading feature names...")
    with open(feature_names_path, "r") as f:
        feature_names = json.load(f)

    print(f"📂 Processing input data from: {csv_file}")
    X_latest = load_latest_data(csv_file, feature_names)

    X_scaled = feature_scaler.transform(X_latest.reshape(-1, X_latest.shape[2])).reshape(1, X_latest.shape[1], X_latest.shape[2])

    print("📈 Making prediction...")
    predicted_scaled_log_return = model.predict(X_scaled)

    predicted_log_return = target_scaler.inverse_transform(predicted_scaled_log_return)
    print(f"🔄 Predicted Log Return: {predicted_log_return[0, 0]:.6f}")

    df = pd.read_csv(csv_file, index_col=0)
    df.index = pd.to_datetime(df.index)
    df.sort_index(ascending=True, inplace=True)
    latest_close_price = df["close"].iloc[-1]

    predicted_price = latest_close_price * np.exp(predicted_log_return[0, 0])
    print(f"💰 Predicted Next Day Price: ${predicted_price:.2f}")
    return predicted_price

def main():
    if len(sys.argv) != 3:
        print("Usage: python3 predict_gru_v2.py <csv_file> <model_name>")
        return

    csv_file = sys.argv[1]
    model_name = sys.argv[2]
    predict_next_price(csv_file, model_name)

if __name__ == "__main__":
    main()
