import csv
import numpy as np
from sklearn.preprocessing import LabelEncoder,OneHotEncoder,MinMaxScaler
from sklearn.linear_model import LinearRegression
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.metrics import mean_squared_error
import matplotlib.pyplot as plt

import warnings
warnings.filterwarnings("ignore",category=FutureWarning)

PARK_NAME_COL=0
ACTIVITY_COL=8
YEAR_COL=1
MONTH_COL=2
PARK_NO=61
MONTH_NO=12
TOTAL_YEAR=11

##please hide this section
# def remove_repeatrows(filename):
#   repeatrows=0
#   keys=set()
#   with open('new_cobined.csv','w') as csvwritefile:
#     writer = csv.writer(csvwritefile, delimiter=',')

#     with open(filename) as csvfile:
#       reader = csv.reader(csvfile, delimiter=',')
#       header=next(reader)# skip header
#       writer.writerow(header)
#       for row in reader:
#         prev=len(keys)
#         keys.add((row[0],row[1],row[2],row[8]))
#         if prev==len(keys):
#           pass
#         else:
#           writer.writerow(row)
# remove_repeatrows('combined2.csv')

def activity_feature(all_activity,activity_dict):
  '''feature extraction for activities \n
    input: 
    all_activity: a list of activities in all parks \n
    activity_dict: dictionary of activities in every national park {parkname: [activities]}\n
    output: \n
    encoded_activity: dictionary of one-hot encoded activities in every national park 
    '''
  # onehot_encoded mapping: onehot_encoded[i] is the one hot vector(31,) for activity i
  integer_encoded = LabelEncoder().fit_transform(all_activity).reshape(-1,1)
  onehot_encoded = OneHotEncoder(sparse=False).fit_transform(integer_encoded)

  #create the activity feature vector
  encoded_activity={}
  for park in activity_dict.keys():
    encoded_activity[park]=np.zeros((len(all_activity),))
    for activity_item in activity_dict[park]:
      index = all_activity.index(activity_item)
      encoded_activity[park] += onehot_encoded[index,:]
  return encoded_activity

def process_park_activity(filename):
  '''process_park_activity(filename): \
  input: filename\
  output: park activity list,pairwise similarity'''
  all_activity_set=set ()
  activity_dict={}
  with open(filename) as csvfile:
    reader = csv.reader(csvfile, delimiter=',')
    next(reader)# skip header
    for row in reader:
      park_name,activity_item =row[PARK_NAME_COL],row[ACTIVITY_COL]
      all_activity_set.add(activity_item)
      if park_name in activity_dict.keys():
        if activity_item not in activity_dict[park_name]:
          activity_dict[park_name].append(activity_item)
      else:
        activity_dict[park_name]=[activity_item]

  encoded_activity=activity_feature(list(all_activity_set),activity_dict)
  encoded_activity_mat=np.array(list(encoded_activity.values()))
  
  return activity_dict,encoded_activity_mat

def process_other_features(filename,year_target):
  monthly_feature={}
  with open(filename) as csvfile:
    reader = csv.reader(csvfile, delimiter=',')
    next(reader)# skip header
    first_activity={}
    for row in reader:
      park_name,year,month,activity=row[PARK_NAME_COL],row[YEAR_COL],row[MONTH_COL],row[ACTIVITY_COL]
      if year==str(year_target):
        row_list= row[3:8]
        row_list.extend(row[9:12])
        row_list_int=[float(row_ele.replace(',','')) for row_ele in row_list]
        if month not in monthly_feature.keys(): 
            monthly_feature[month]=[row_list_int]
            if park_name not in first_activity.keys():
              first_activity[park_name]=activity
        else:
          if row[0] not in first_activity.keys():
            first_activity[park_name]=activity
            monthly_feature[month].append(row_list_int)
          elif first_activity[park_name]==activity:
            monthly_feature[month].append(row_list_int)
          
  mat=np.zeros([PARK_NO,8,MONTH_NO])
  for i in range(12):
    mat[:,:,i]=np.array(monthly_feature[str(i+1)])
  return monthly_feature,mat

def new_year_prediction():
  mat_all=np.zeros((PARK_NO,8,MONTH_NO,TOTAL_YEAR))
  for year in range(2008,2019):
    _,mat_yearly = process_other_features("new_cobined.csv",year)
    mat_all[:,:,:,year-2008]=mat_yearly
  mse=np.zeros((PARK_NO,5,MONTH_NO))
  ylast=np.zeros((PARK_NO,5,MONTH_NO))
  year_lag=3
  for feature_ID in range(5):
    for parkID in range(PARK_NO):
      for month in range(MONTH_NO):
        profile=mat_all[parkID,feature_ID,month,:]
        
        X=np.array([profile[shift:-year_lag+shift]for shift in range(year_lag)]).T
        y=profile[year_lag:].reshape(-1,1)
        reg = LinearRegression().fit(X, y)
        #ridge
        #reg = Ridge(alpha=.1).fit(X, y)
        y_pred=reg.predict(X)
        mse[parkID,feature_ID,month]=mean_squared_error(y_pred, y)
        ylast[parkID,feature_ID,month]=reg.predict(profile[-year_lag:].reshape([-1,3]))
  return ylast,mse
#extract activity feature
activity_dict,encoded_activity_mat=process_park_activity("combined2.csv")
#calculate activity similarity
activity_similarity=cosine_similarity(encoded_activity_mat,encoded_activity_mat)
#extract yearly feature
monthly_feature,mat_yearly = process_other_features("new_cobined.csv",2018)
ynew,mse=new_year_prediction()
#swap the first 5 feature, the last 3 features are costant
mat_yearly[:,:5,:]=ynew
#calculate yearly similarity
similarities=[]
for i in range(MONTH_NO):
    scaler = MinMaxScaler(feature_range=(0, 1)).fit(mat_yearly[:,:,i])
    normalized = scaler.transform(mat_yearly[:,:,i])
    similarities.append(cosine_similarity(normalized))

similarities_mat=np.array(similarities)
csv_file="result_similarity.csv"
park_names=list(activity_dict.keys())
with open(csv_file, 'w') as fp:
  fieldnames=['park1', 'park2', 'activity similariy', 'crowdedness similarity Jan', 
              'crowdedness similarity Feb', 'crowdedness similarity Mar',
              'crowdedness similarity Apr', 'crowdedness similarity May',
              'crowdedness similarity Jun', 'crowdedness similarity Jul',
              'crowdedness similarity Aug', 'crowdedness similarity Sep',
              'crowdedness similarity Oct', 'crowdedness similarity Nov',
              'crowdedness similarity Dec']
  dw = csv.DictWriter(fp, fieldnames=fieldnames)
  dw.writeheader()

  for source_park in range(PARK_NO):
    for target_park in range(PARK_NO):
      source_name=park_names[source_park]
      target_name=park_names[target_park]
      act_score=activity_similarity[source_park,target_park]
      crowdness_score=similarities_mat[:,source_park,target_park]
      dw.writerow({fieldnames[0]: source_name, 
                    fieldnames[1]: target_name, 
                    fieldnames[2]: "%.4f" % act_score,
                    fieldnames[3]: "%.4f" % crowdness_score[0], 
                    fieldnames[4]: "%.4f" %crowdness_score[1], 
                    fieldnames[5]: "%.4f" %crowdness_score[2],
                    fieldnames[6]: "%.4f" %crowdness_score[3], 
                    fieldnames[7]: "%.4f" %crowdness_score[4],
                    fieldnames[8]: "%.4f" %crowdness_score[5],
                    fieldnames[9]: "%.4f" %crowdness_score[6],
                    fieldnames[10]: "%.4f" %crowdness_score[7], 
                    fieldnames[11]: "%.4f" %crowdness_score[8],
                    fieldnames[12]: "%.4f" %crowdness_score[9], 
                    fieldnames[13]: "%.4f" %crowdness_score[10],
                    fieldnames[14]: "%.4f" %crowdness_score[11]})


  










