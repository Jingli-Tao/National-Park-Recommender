import numpy as np
from sklearn import ensemble
from sklearn.metrics import mean_squared_error
from feature_extraction import extract_crowdedness_feature

import warnings
warnings.filterwarnings("ignore",category=FutureWarning)

PARK_NO = 61
MONTH_NO = 12
FIRST_YEAR = 2008
LAST_YEAR = 2018

def predict_visitation(dataFrame):
  year_lag = 3
  crowdedness_features_all_years = np.zeros((PARK_NO, 8, MONTH_NO, LAST_YEAR-FIRST_YEAR+1)) # '8' means 8 crowdedness features
  for year in range(FIRST_YEAR, LAST_YEAR+1):
    crowdedness_features_one_year = extract_crowdedness_feature(dataFrame, year)
    crowdedness_features_all_years[:,:,:,year-FIRST_YEAR] = crowdedness_features_one_year

  visitation_feature_no = 5 # 5 monthly visitation features: Recreation Visits, Recreation Hours, Tent Campers, RV Campers, Backcountry Campers
  y_pred_next_year = np.zeros((PARK_NO, visitation_feature_no, MONTH_NO)) # prediction of all parks' visitation in the next year
  y_pred_past_years = np.zeros((PARK_NO, visitation_feature_no, MONTH_NO, (LAST_YEAR - FIRST_YEAR + 1 - year_lag))) # prediction of all parks' visitaiton in the last 8 years
  
  for feature_ID in range(visitation_feature_no):
    mse_all_parks = []
    for park_ID in range(PARK_NO):
      for month in range(MONTH_NO):
        visitation_feature = crowdedness_features_all_years[park_ID,feature_ID,month,:]
        X_one_month = np.array([visitation_feature[shift:-year_lag+shift] for shift in range(year_lag)]).T # a park's visitation in the same month of the previous 3 years of the target year
        y_one_month = visitation_feature[year_lag:].reshape([-1,1]) # a park's visitation in the same month of the target year
        if month == 0:
          X, y = X_one_month, y_one_month
        else:
          X, y = np.vstack([X, X_one_month]), np.vstack([y, y_one_month])
    
      rf = ensemble.RandomForestRegressor(random_state=100).fit(X, y.ravel())
      y_pred = rf.predict(X) # predict a park's visitation in the last 8 years
      y_pred_past_years[park_ID,feature_ID,:,:] = y_pred.reshape([12,8])
      y_pred_next_year[park_ID,feature_ID,:] = rf.predict(crowdedness_features_all_years[park_ID,feature_ID,:,-3:]) # predict a park's visitation in the next year

      mse_one_park = mean_squared_error(y.ravel(), y_pred)
      mse_all_parks.append(mse_one_park)
    # print("visitation feature {}, rmse: {}".format(feature_ID, np.sqrt(np.mean(mse_all_parks))))

  return y_pred_next_year, y_pred_past_years