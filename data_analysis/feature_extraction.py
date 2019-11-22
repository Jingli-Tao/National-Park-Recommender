from sklearn.preprocessing import LabelEncoder, OneHotEncoder
import numpy as np
import pandas as pd

import warnings
warnings.filterwarnings("ignore",category=FutureWarning)

def convert_activity_feature(all_activity, activity_dict):
  # onehot_encoded mapping: onehot_encoded[i] is the one hot vector(31,) for activity i
  integer_encoded = LabelEncoder().fit_transform(all_activity).reshape(-1,1)
  onehot_encoded = OneHotEncoder(sparse=False).fit_transform(integer_encoded)

  # create the activity feature vector
  encoded_activity = {}
  for park in activity_dict.keys():
    encoded_activity[park] = np.zeros((len(all_activity),))
    for activity_item in activity_dict[park]:
      index = all_activity.index(activity_item)
      encoded_activity[park] += onehot_encoded[index,:]
  return encoded_activity

def extract_activity_feature(dataFrame):
  park_activity_dict = {}
  
  all_activity = dataFrame['Activity'].drop_duplicates().to_list()
  df_activity = dataFrame[['Park', 'Activity']].drop_duplicates().groupby(['Park'])['Activity'].apply(list).reset_index()
  for _, row in df_activity.iterrows():
    park_activity_dict[row['Park']] = row['Activity']

  encoded_activity = convert_activity_feature(all_activity, park_activity_dict)
  encoded_activity = np.array(list(encoded_activity.values()))
  return park_activity_dict, encoded_activity

def extract_crowdedness_feature(dataFrame, target_year=2018):
  feature = {} #{month: [[8 crowdedness features] * 61 parks]}

  df_year = dataFrame.loc[dataFrame['Year'] == target_year].drop(['Activity', 'State', 'Entrance Pass', 'Coordinate'], axis=1).drop_duplicates()
  df_year['combined'] = df_year[df_year.columns[3:]].values.tolist()
  df_crowdedness = df_year.groupby(['Month'])['combined'].apply(list).reset_index()
  
  for _, row in df_crowdedness.iterrows():
    feature[row['Month']] = row['combined']
  
  crowdness_feature = np.zeros([61, 8, 12]) # '61': 61 parks, '8': 8 crowdedness features, '12': 12 months
  for i in range(12):
    crowdness_feature[:,:,i] = np.array(feature[i+1])
  return crowdness_feature