import csv
import numpy as np

def get_recomendation(selected_month,selected_park,threshold=0.25,min_candidates=3):
    '''get_recomendation(selected_month,selected_park,threshold=0.25) \n \
    selected_month = [0,1,2,3,4,5,6,7,8,9,10,11,12]\n 
    month 0 is default choice, only activity is used for making recommandation\
    , 1~12 is using activities similarities and crowdness similarities from Jan to Dec of next year,\n \
    selected park has to be one of 61 national parks, \n\
    threshold is used to control the proximity of returned results'''
    assert selected_month in range(0,13)
    center=np.array([1,1])
    recomanded_list=[]
    dist_dict={}
    with open("result_similarity.csv") as csvfile:
        reader = csv.reader(csvfile, delimiter=',')
        next(reader)# skip header
        for row in reader:
            if selected_park in row[0:2]:
                activity_score=float(row[2])
                crowdness_score=float(row[selected_month+2])
                distance=np.linalg.norm(np.array([activity_score,crowdness_score])-center)
                if selected_park==row[0]:
                    dist_dict[row[1]]=distance
                else:
                    dist_dict[row[0]]=distance
    recomanded_dict=sorted(dist_dict.items(), key=lambda item: item[1])
    recomanded_res=dict((key,value) for key, value in recomanded_dict if value <threshold)
    if len(recomanded_res)<min_candidates:
        return recomanded_dict[:min_candidates]
    return recomanded_res


recommended_list=get_recomendation(0,'Yellowstone NP')
print(recommended_list)
