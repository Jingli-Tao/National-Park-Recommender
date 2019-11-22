import numpy as np
import pandas as pd
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.preprocessing import StandardScaler
from feature_extraction import extract_activity_feature,extract_crowdedness_feature
from regression_model import predict_visitation
from save_similarities import save_similarity_to_csv

import warnings
warnings.filterwarnings("ignore",category=FutureWarning)

def main():
    df = pd.read_csv("../data/new_combined.csv", thousands=',', low_memory=False)
    
    # Extract activity features
    park_activity_dict, encoded_activity = extract_activity_feature(df)

    # Calculate activity similarity
    print("calculating activity similarity")
    activity_similarity = cosine_similarity(encoded_activity)

    # Extract crowdedness features
    crowdedness_features = extract_crowdedness_feature(df)

    # Replace the visitation of the current year with the prediction of the next year
    visit_pred_next_year, visit_pred_past_years = predict_visitation(df)
    crowdedness_features[:,:5,:] = visit_pred_next_year

    # Calculate crowdedness similarity
    print("calculating crowdedness similarity")
    crowdedness_similarity = np.zeros((12, 61, 61))
    standardized = np.zeros([61,8])
    for i_month in range(12):
        for i_feature in range(8):
            scaler = StandardScaler()
            standardized[:,i_feature] = scaler.fit_transform(np.log(crowdedness_features[:,i_feature,i_month]+1).reshape([-1,1])).ravel() # standardize crowdedness features
        crowdedness_similarity[i_month,:,:] = cosine_similarity(standardized)
    
    # Save all similarity scores to a csv file
    print("saving similarity")
    save_similarity_to_csv(park_activity_dict, activity_similarity, crowdedness_similarity)

    # Save visitation predictions for plotting
    np.save('visit_pred_next_year', visit_pred_next_year)
    np.save('visit_pred_past_years', visit_pred_past_years) 

if __name__ == "__main__":
    main()










