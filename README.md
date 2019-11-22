# Project Introduction
This project built a travel recommender system for U.S. national parks with a different approach from the current practice. It tries to address the issues of complicated user query, intensive user input, and inaccurate suggestion for new user imposed in the current practice. 

# Project Repo Walkthrough
The project repo contains:
  * ```data```: data used for project development;
  * ```data_processing```: python scripts for data collection and combination;
  * ```data_analysis```: python scripts for feature engineering, regression model, and similarity computation; 
  * ```web```: javascripts for server setup and web interface as well as html/css files for web interface.
  * ```package.json``` and ```package-lock.json```: files for defining nodejs dependencies.

# Running Project
We hosted our system online so you can play with it: https://national-park-recommender.herokuapp.com/

If you want to run the system on your local machine, please follow the instructions as below.

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
