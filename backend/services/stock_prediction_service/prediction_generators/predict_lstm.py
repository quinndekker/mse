import os
import json
import argparse
import numpy as np
import pandas as pd
import tensorflow as tf
import joblib
from tensorflow.keras.models import load_model

# === Logging Utility === #
def log_message(message, log_file):
    """Logs messages to both console and a file."""
    print(message)
    with open(log_file, "a") as f:
        f.write(message + "\n")

# === Load Feature Properties from properties_v1.txt === #
def load_properties(filepath, log_file):
    """Loads feature column names from a properties file."""
    if not os.path.exists(filepath):
        log_message(f"❌ Error: {filepath} not found.", log_file)
        exit(1)

    with open(filepath, "r") as file:
        properties = [line.strip() for line in file if line.strip()]

    if not properties:
        log_message("❌ Error: properties_v1.txt is empty.", log_file)
        exit(1)

    # Remove "target_price" if it exists (only used during training)
    if "target_price" in properties:
        properties.remove("target_price")

    log_message(f"✅ Loaded {len(properties)} features from {filepath}", log_file)
    return properties

# === Load CSV and Process Data === #
def load_and_preprocess_csv(csv_path, feature_scaler, expected_features, log_file):
    """Loads a CSV file, aligns features, and preprocesses it for making predictions."""
    if not os.path.exists(csv_path):
        log_message(f"❌ Error: {csv_path} not found.", log_file)
        exit(1)

    df = pd.read_csv(csv_path, index_col=0)
    df.index = pd.to_datetime(df.index)
    df.sort_index(ascending=True, inplace=True)

    # Drop "target_price" if it exists (only used during training)
    if "target_price" in df.columns:
        log_message("⚠️ Found 'target_price' in test data. Dropping it for prediction.", log_file)
        df.drop(columns=["target_price"], inplace=True)

    if "ticker" in df.columns:
        df["ticker"] = df["ticker"].astype("category").cat.codes

    df = df.apply(pd.to_numeric, errors='coerce')
    df.fillna(df.mean(), inplace=True)

    # Ensure only expected features are used in the test data
    df = df[[col for col in expected_features if col in df.columns]]

    # Log any feature mismatches
    extra_features = set(df.columns) - set(expected_features)
    missing_features = set(expected_features) - set(df.columns)

    if extra_features:
        log_message(f"⚠️ Extra features in test data (not in training): {list(extra_features)}", log_file)
    if missing_features:
        log_message(f"⚠️ Missing features in test data (were in training): {list(missing_features)}", log_file)

    log_message(f"✅ Adjusted test data to match expected features: {len(df.columns)} columns (Expected: {len(expected_features)})", log_file)

    # Convert to NumPy array and scale
    X_scaled = feature_scaler.transform(df.values)

    return df.index, X_scaled  # Return index (dates) and scaled data

# === Predict Using the LSTM Model === #
def predict_stock_prices(model_path, csv_path, log_file):
    """Loads a trained LSTM model and predicts stock prices for every row in a CSV file."""
    if not os.path.exists(model_path):
        log_message(f"❌ Error: Model file {model_path} not found.", log_file)
        exit(1)

    # Extract model name
    model_name = os.path.basename(model_path).replace(".h5", "")

    # Load the trained model
    model = load_model(model_path)
    log_message(f"🔄 Loaded model from {model_path}", log_file)

    # Load scalers
    feature_scaler_path = f"models/{model_name}_feature_scaler.pkl"
    target_scaler_path = f"models/{model_name}_target_scaler.pkl"

    if not os.path.exists(feature_scaler_path) or not os.path.exists(target_scaler_path):
        log_message("❌ Error: Missing scalers. Ensure the model was trained properly.", log_file)
        exit(1)

    feature_scaler = joblib.load(feature_scaler_path)
    target_scaler = joblib.load(target_scaler_path)

    # Load actual training features from JSON file
    feature_names_actual_path = f"models/{model_name}_actual_features.json"
    if not os.path.exists(feature_names_actual_path):
        log_message(f"❌ Error: Missing feature file {feature_names_actual_path}. Ensure the model was trained correctly.", log_file)
        exit(1)

    with open(feature_names_actual_path, "r") as f:
        expected_features = json.load(f)

    log_message(f"✅ Loaded {len(expected_features)} actual training features", log_file)

    # Load and preprocess the CSV data
    sequence_length = 60
    dates, X_scaled = load_and_preprocess_csv(csv_path, feature_scaler, expected_features, log_file)

    # Ensure enough data points exist
    if len(X_scaled) < sequence_length:
        log_message("❌ Error: Not enough data points for sequence length.", log_file)
        exit(1)

    # Iterate through each row and make a prediction
    for i in range(sequence_length, len(X_scaled)):
        X_seq = np.array([X_scaled[i-sequence_length:i]])  # Create sequence for prediction
        predicted_price_scaled = model.predict(X_seq)
        predicted_price = target_scaler.inverse_transform(predicted_price_scaled.reshape(-1, 1))[0][0]

        # Get the exact date of the row where the prediction is made
        prediction_date = dates[i]  # Now it matches the row correctly!

        # Log the prediction with the exact row's date
        log_message(f"{prediction_date.strftime('%Y-%m-%d')} 📈 Predicted Stock Price: ${predicted_price:.2f}", log_file)


# === Main Execution === #
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Predict stock price using a trained LSTM model.")
    parser.add_argument("model_path", help="Path to the trained LSTM model (.h5 file)")
    parser.add_argument("csv_path", help="Path to the CSV file for prediction")
    parser.add_argument("log_file", help="Path to log file")

    args = parser.parse_args()
    predict_stock_prices(args.model_path, args.csv_path, args.log_file)
