import csv
import numpy as np

PARK_NO = 61

def save_similarity_to_csv(activity_dict, activity_similarity, crowdedness_similarity, csv_filename="result_similarity.csv"):
    park_names = list(activity_dict.keys())
    with open(csv_filename, 'w') as fp:
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
                source_name = park_names[source_park]
                target_name = park_names[target_park]
                act_score = activity_similarity[source_park,target_park]
                crowdedness_score = crowdedness_similarity[:,source_park,target_park]
                dw.writerow({fieldnames[0]: source_name, 
                                fieldnames[1]: target_name, 
                                fieldnames[2]: "%.4f" % act_score,
                                fieldnames[3]: "%.4f" % crowdedness_score[0], 
                                fieldnames[4]: "%.4f" % crowdedness_score[1], 
                                fieldnames[5]: "%.4f" % crowdedness_score[2],
                                fieldnames[6]: "%.4f" % crowdedness_score[3], 
                                fieldnames[7]: "%.4f" % crowdedness_score[4],
                                fieldnames[8]: "%.4f" % crowdedness_score[5],
                                fieldnames[9]: "%.4f" % crowdedness_score[6],
                                fieldnames[10]: "%.4f" % crowdedness_score[7], 
                                fieldnames[11]: "%.4f" % crowdedness_score[8],
                                fieldnames[12]: "%.4f" % crowdedness_score[9], 
                                fieldnames[13]: "%.4f" % crowdedness_score[10],
                                fieldnames[14]: "%.4f" % crowdedness_score[11]})
