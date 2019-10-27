
import csv
import sklearn.metrics as sm
import numpy as np
from sklearn.preprocessing import LabelEncoder
from sklearn.preprocessing import OneHotEncoder
import matplotlib.pyplot as plt
from sklearn.preprocessing import MinMaxScaler
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
  '''feature extraction for activities \n\
    input: \
    all_activity: a list of activities in all parks \n\
    activity_dict: dictionary of activities in every national park {parkname: [activities]}\n\
    output: \n\
    encoded_activity: dictionary of one-hot encoded activities in every national park 
    '''
  # onehot_encoded mapping: onehot_encoded[i] is the one hot vector(31,) for activity i
  integer_encoded = LabelEncoder().fit_transform(all_activity).reshape(-1,1)
  onehot_encoded = OneHotEncoder(sparse=False).fit_transform(integer_encoded)

  #create the activity feature vector
  encoded_activity={}
  for park in activity_dict.keys():
    encoded_activity[park]=np.zeros((len(all_activity),))
    for every_activity in activity_dict[park]:
      index = all_activity.index(every_activity)
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
      park_name,activity_item =row[0],row[8]
      all_activity_set.add(activity_item)
      if park_name in activity_dict.keys():
        if activity_item not in activity_dict[park_name]:
          activity_dict[park_name].append(activity_item)
      else:
        activity_dict[park_name]=[activity_item]

  encoded_activity=activity_feature(list(all_activity_set),activity_dict)
  encoded_activity_mat=np.array(encoded_activity.values())
  activity_similarity=sm.pairwise.cosine_similarity(encoded_activity_mat,encoded_activity_mat)
  return activity_dict,activity_similarity,encoded_activity_mat

def process_other_features(filename):
  monthly_feature={}
  with open(filename) as csvfile:
    reader = csv.reader(csvfile, delimiter=',')
    next(reader)# skip header
    first_activity={}
    for row in reader:
      park_name,year,month,activity=row[0],row[1],row[2],row[8]
      if year=='2018':
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
          
  mat=np.zeros([61,8,12])
  similarities=[]
  
  for i in range(12):
    mat[:,:,i]=np.array(monthly_feature[str(i+1)])
    scaler = MinMaxScaler(feature_range=(0, 1)).fit(mat[:,:,i])
    normalized = scaler.transform(mat[:,:,i])
    similarities.append(sm.pairwise.cosine_similarity(normalized))
  return similarities

activity,similarity,encoded_activity_mat=process_park_activity("combined2.csv")
# plt.imshow(similarity)
# plt.show()
monthly_similarities=process_other_features("new_cobined.csv")
# for i in range(12):
#   plt.imshow(monthly_similarities[i])
#   plt.show()