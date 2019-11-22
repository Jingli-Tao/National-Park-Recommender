import requests
import time
import json
from bs4 import BeautifulSoup
import re
import csv

national_parks = ['Acadia', 'American Samoa', 'Arches', 'Badlands', 'Big Bend', 'Biscayne', 
                    'Black Canyon of The Gunnison', 'Bryce Canyon', 'Canyonlands', 'Capitol Reef',
                    'Carlsbad Caverns', 'Channel Islands', 'Congaree', 'Crater Lake', 'Cuyahoga Valley',
                    'Death Valley', 'Denali', 'Dry Tortugas', 'Everglades', 'Gates of The Arctic',
                    'Gateway Arch', 'Glacier', 'Glacier Bay', 'Grand Canyon', 'Grand Teton', 'Great Basin',
                    'Great Sand Dunes', 'Great Smoky Mountains', 'Guadalupe Mountains', 'Haleakalā', 
                    "Hawai'i Volcanoes", 'Hot Springs', 'Indiana Dunes', 'Isle Royale', 'Joshua Tree',
                    'Katmai', 'Kenai Fjords', 'Kings Canyon', 'Kobuk Valley', 'Lake Clark', 'Lassen Volcanic',
                    'Mammoth Cave', 'Mesa Verde', 'Mount Rainier', 'North Cascades', 'Olympic', 
                    'Petrified Forest', 'Pinnacles', 'Redwood', 'Rocky Mountain', 'Saguaro', 'Sequoia',
                    'Shenandoah', 'Theodore Roosevelt', 'Virgin Islands', 'Voyageurs', 'Wind Cave', 
                    'Wrangell - St Elias', 'Wolf Trap', 'Yellowstone', 'Yosemite', 'Zion']

def scrapActivity():
    base_url = "https://findyourpark.com"
    response1 = requests.get(base_url)
    soup1 = BeautifulSoup(response1.text, 'html.parser')
    options = soup1.select("#edit-field-activities > option")

    fields = []
    activities = []
    activities_parks = []

    for option in options:
        fields.append(option['value'])
        activities.append(option.text)
    fields = fields[1:] # remove "Choose an activity"
    activities = activities[1:]
    for i in range(0, len(fields)):
        activity_url = "https://findyourpark.com/your-parks?field_activities={}".format(fields[i])
        response2 = requests.get(activity_url)
        soup2 = BeautifulSoup(response2.text, 'html.parser')

        # First page
        titles = soup2.select("div.field.field__title.title > h2")
        for title in titles:
            activities_parks.append([title.text, activities[i]])

        # Remaining pages
        last_page = str(soup2.select_one("li.pager-last.last > a")['href'])
        last_page_num = int(re.findall("\d+$", last_page)[0])
        if last_page_num == 0:
            continue
        else:
            for n in range(1, last_page_num + 1):
                activity_page_url = "{}&page={}".format(activity_url, str(n))
                print("Processing {}...".format(activity_page_url))

                response3 = requests.get(activity_page_url)
                soup3 = BeautifulSoup(response3.text, 'html.parser')
                titles = soup3.select("div.field.field__title.title > h2")
                for title in titles:
                    activities_parks.append([title.text, activities[i]])
                time.sleep(1) # pause the code for one sec so as not to spam the server

    # Save as csv file
    activities_parks_sorted = sorted(activities_parks, key=lambda x: x[0])
    with open('activity.csv', 'w') as output_file:
        fieldnames = ['park', 'activity']
        dw = csv.DictWriter(output_file, fieldnames=fieldnames, delimiter=',')
        dw.writeheader()
        for pair in activities_parks_sorted:
            dw.writerow({'park': pair[0], 'activity': pair[1]})
    return activities_parks

def mergeActivity(national_parks, activities_parks):
    parks_activities = {}
    for national_park in national_parks:
        parks_activities[national_park] = []

        flag = 0
        for pair in activities_parks:
            if national_park in pair[0]:
                parks_activities[national_park].append(pair[1])
                flag = 1
        if flag == 0:
            print(national_park)

    return parks_activities

def download_NPS_data(apiKey):
    apiData = []
    for start in range(0, 500, 50):
        req = "https://developer.nps.gov/api/v1/parks?parkCode={}&limit={}&start={}&api_key={}".format('', str(50), start, apiKey)
        response = requests.get(req).json()
        apiData.extend(response["data"])

    return apiData

def extractParkCode(apiData):
    park_codes = []
    for park in apiData:
        if "National Park" in park["fullName"]:
            park_codes.append([park["fullName"], park["parkCode"]])
    
    return park_codes

def downloadCampsite(apiKey, park_codes):
    campsites = []
    for park_code in park_codes:
        req = "https://developer.nps.gov/api/v1/campgrounds?parkCode={}&api_key={}".format(park_code[1], apiKey)
        response = requests.get(req).json()
        data = response["data"]
        if len(data) == 0:
            campsites.append({"park": park_code[0], "parkCode": park_code[1], "campsiteName": "null", "totalsites": "null"})
        for datum in data:
            campsites.append({"park": park_code[0], "parkCode": park_code[1], "campsiteName": datum["name"], "totalsites": datum["campsites"]["totalsites"]})
        time.sleep(1)

    with open('campsite.csv', 'w') as output_file:
        fieldnames = ['park', 'parkCode', 'campsiteName', 'totalsites']
        dw = csv.DictWriter(output_file, fieldnames=fieldnames, delimiter=',')
        dw.writeheader()
        for val in campsites:
            dw.writerow({'park': val["park"], 
                        'parkCode': val["parkCode"], 
                        'campsiteName': val['campsiteName'], 
                        'totalsites': val['totalsites']})

def extractEntrancePass(apiData):
    entrance = []
    for datum in apiData:
        if "National Park" in datum["fullName"]:
            if "entrancePasses" in datum and len(datum["entrancePasses"]) > 0:
                total_pass = 0
                for entrancePass in datum["entrancePasses"]:
                    total_pass += float(entrancePass["cost"])
                average_pass = total_pass / len(datum["entrancePasses"])

                if "entranceFees" in datum and len(datum["entranceFees"]) > 0:
                    total_fee = 0
                    for entranceFee in datum["entranceFees"]:
                        total_fee += float(entranceFee["cost"])
                    average_fee = total_fee / len(datum["entranceFees"])

                    entrance.append({'park': datum["fullName"], 
                                    'state': datum["states"], 
                                    'entrancePass': average_pass, 
                                    'entrancePassDescription': datum["entrancePasses"][0]["description"], 
                                    'entranceFee': average_fee, 
                                    'entranceFeeDescription': datum["entranceFees"][0]["description"]})
                else:
                    entrance.append({'park': datum["fullName"], 
                                    'state': datum["states"], 
                                    'entrancePass': average_pass, 
                                    'entrancePassDescription': datum["entrancePasses"][0]["description"], 
                                    'entranceFee': "null", 
                                    'entranceFeeDescription': "null"})
            else:
                if "entranceFees" in datum and len(datum["entrancePasses"] > 0):
                    total_fee = 0
                    for entranceFee in datum["entranceFees"]:
                        total_fee += float(entranceFee["cost"])
                    average_fee = total_fee / len(datum["entranceFees"])

                    entrance.append({'park': datum["fullName"], 
                                    'state': datum["states"], 
                                    'entrancePass': "null", 
                                    'entrancePassDescription': "null", 
                                    'entranceFee': average_fee, 
                                    'entranceFeeDescription': datum["entranceFees"][0]["description"]})
                else:
                    entrance.append({'park': datum["fullName"], 
                                    'state': datum["states"], 
                                    'entrancePass': "null", 
                                    'entrancePassDescription': "null", 
                                    'entranceFee': "null", 
                                    'entranceFeeDescription': "null"})

    with open('entrance.csv', 'w') as output_file:
        fieldnames = ['park', 'state', 'entrancePasses', 'entrancePassDescription', 'entranceFee', 'entranceFeeDescription']
        dw = csv.DictWriter(output_file, fieldnames=fieldnames, delimiter=',')
        dw.writeheader()
        for val in entrance:
            dw.writerow({'park': val["park"], 
                        'state': val["state"], 
                        'entrancePasses': val['entrancePass'], 
                        'entrancePassDescription': val['entrancePassDescription'],
                        'entranceFee': val['entranceFee'],
                        'entranceFeeDescription': val['entranceFeeDescription']})

def extractCoordinate(apiData):
    coordinates = []
    for park in apiData:
        if "National Park" in park["fullName"]:
            coordinates.append([park["fullName"], park["latLong"]])

    with open('coordinate.csv', 'w') as output_file:
        fieldnames = ['park', 'coordinate']
        dw = csv.DictWriter(output_file, fieldnames=fieldnames, delimiter=',')
        dw.writeheader()
        for val in coordinates:
            dw.writerow({'park': val[0], 
                        'coordinate': val[1]})

def extractParkArea():
    areas = []
    with open('National_Park_Service__Park_Unit_Boundaries.csv', newline='') as fp:
        all_results = csv.DictReader(fp)
        for res in all_results:
            areas.append({"park": res["UNIT_NAME"], "area": res["Shape__Area"]})

    with open('area.csv', 'w') as output_file:
        fieldnames = ['park', 'area']
        dw = csv.DictWriter(output_file, fieldnames=fieldnames, delimiter=',')
        dw.writeheader()
        for val in areas:
            dw.writerow({'park': val["park"], 
                        'area': val["area"]})

# Scrap park activities from the website "findyourpark.com"
scrapActivity()

# Download data from NPS Data API
apiKey = "eE16KrzdPlgyQdOWKRrglZDcO9RMgokug4o9q7Vc"
apiData = download_NPS_data(apiKey)
park_codes = extractParkCode(apiData)
downloadCampsite(apiKey, park_codes)
extractCoordinate(apiData)
extractEntrancePass(apiData)

# Extract park area from downloaded table "National_Park_Service__Park_Unit_Boundaries.csv"
extractParkArea()