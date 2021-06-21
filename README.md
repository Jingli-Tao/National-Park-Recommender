# National Park Recommender

## Project Introduction
National Park Recommender (NPR) is a travel recommender system that provides recommendations on U.S. national parks based on travel month and park attributes derived from aggregated data. Its backend combined random forest and cosine similarity while its UI employed visualization and user interaction to simplify search and create ease of finding alternative.

### Methods Used
* Feature Engeneering
* Supervised Learning
* Data Visualization

### Technologies
* Python
* D3
* Pandas
* HTML
* JavaScript
* sciki-learn
* numpy
* BeautifulSoup

## Project Description

### Data
NPR is built on an aggregated dataset that is collected by scripting, downloading, and web scraping.
No. of Parks | Rows | Columns | No. of Features | Period | Data Type 
:-: | :-: | :-: | :-: | :-: | :-:
61 | 115897 | 17 | 9 | Jan. 2008 to Dec. 2018 | catogorial, temporal

### Approach
This project took a different approach from the current practice, illustrated as below. The difference is mainly around "what to match".
![image info](https://drive.google.com/uc?export=view&id=1F_qjfEU5C197_12fub35-n8y5bOIAG0R)

The backend of NPR leveraged feature engineering and supervised learning.
<p align="center">
 <img src="https://drive.google.com/uc?export=view&id=17FceAzSfTqcGoX4X8UF7rbdT1IgguwYR" width="600" height="350">
</p>

## Repo Contents
The project repo contains:
  * ```data```: data used for project development;
  * ```data_processing```: python scripts for data collection and combination;
  * ```data_analysis```: python scripts for feature engineering, regression model, and similarity computation; 
  * ```web```: javascripts for server setup and web interface as well as html/css files for web interface.
  * ```package.json``` and ```package-lock.json```: files for defining nodejs dependencies.

## Running Project
We hosted our system online so you can play with it: https://national-park-recommender.herokuapp.com/

If you want to run the system on your local machine, please follow below instructions.

### Running ```data_processing```
```bash
../data_processing$ python data_collection.py
```
```bash
../data_processing$ python data_combination.py
```
**NOTE:** manual works have been involved in the data combination and cleaning, since it's more effecient for some data sources, so the output of ```data_combination.py``` won't be the same as the final results shown in ```data/new_combined.csv``` 

### Running ```data_analysis```
```bash
../data_analysis$ python backend.py
```

### Running ```web```

* Download the latest [Node LTS (12.x.x)](https://nodejs.org/en/download/)
* Installing dependencies
```bash
npm install
```
* Starting the server
```bash
npm start
```

This will start the server on port *8080*

If you wish to change the port, update the port environment variable
```bash
port=3000 npm start
```
