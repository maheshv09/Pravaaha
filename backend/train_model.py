import os
import pandas as pd
from ml.pipeline import ProxyCongestionModel

def main():
    print("Initiating ML pipeline training process...")
    
    # We create the models directory if it doesn't exist
    os.makedirs("models", exist_ok=True)
    
    # Normally, we would load our preprocessed CSV data here:
    # df = pd.read_csv("data/processed_hotspots.csv")
    # For now, we pass a dummy DataFrame to satisfy the pipeline structure
    dummy_df = pd.DataFrame()
    
    # Instantiate and train the model
    # This will save the pickled model file into models/congestion_model.pkl
    model = ProxyCongestionModel(model_path="models/congestion_model.pkl")
    model.train(dummy_df)
    
    print("\nTraining complete! The models directory is now populated.")
    print("Check backend/models/congestion_model.pkl")

if __name__ == "__main__":
    main()
