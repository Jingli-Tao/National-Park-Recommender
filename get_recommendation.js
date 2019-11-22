var selected_month = 0; // replace it with user selected value
var selected_park = 'Acadia NP'; // replace it with user selected value

// load in similarity scores (change the way of parsing data based on actual needs)
d3.dsv(",", "result_similarity.csv", function(d) {
    return [d.park1, 
            d.park2, 
            +d['activity similariy'], 
            +d['crowdedness similarity Jan'], 
            +d['crowdedness similarity Feb'],
            +d['crowdedness similarity Mar'],
            +d['crowdedness similarity Apr'],
            +d['crowdedness similarity May'],
            +d['crowdedness similarity Jun'],
            +d['crowdedness similarity Jul'],
            +d['crowdedness similarity Aug'],
            +d['crowdedness similarity Sep'],
            +d['crowdedness similarity Oct'],
            +d['crowdedness similarity Nov'],
            +d['crowdedness similarity Dec']];
}).then(function(scores){

    recommended_parks = get_recomendation(scores, selected_month, selected_park);
    // console.log(recommended_parks); // uncomment this line to see recommendations

    // do things with recommended_parks...
});

function get_recomendation(scores, selected_month, selected_park, threshold=0.25, max_recommendations=3){
    /* Get recomendation for selected_month and/or selected_park
    Inputs: 
        scores: park similarity scores saved in 'result_similarity.csv'.
        selected_month: an integer in [0,1,2,3,4,5,6,7,8,9,10,11,12]. 
                        0 means no selected month, use activity for making recommandations; 
                        otherwise, use both activity and crowdedness.
        selected_park: the name of one of 61 national parks.
        threshold: control the proximity to the selected park; change the value based on actual needs.
        max_recommendations: the maximum number of parks recommended; change the value based on actual needs.
    Outputs:
        recomanded_parks: a list of park names recommended*/
    
    var center = [1,1]
    var recomanded_parks = []
    var dist_dict = []
    var activity_score, crowdness_score, distance

    for (let i = 0; i < scores.length; i++){
        
        if (selected_park == scores[i][0] && selected_park != scores[i][1]){
            park = scores[i][1]
            activity_score = scores[i][2];
            crowdness_score = scores[i][selected_month+2];
            distance = Math.sqrt(Math.pow(activity_score-center[0], 2) + Math.pow(crowdness_score-center[1], 2));
            dist_dict.push([park, distance])
        }
    }

    recomanded_parks = dist_dict.sort(function(a,b) {return a[1] - b[1];}).filter(d => d[1]<threshold).map(d => d[0]);
    
    if (recomanded_parks.length > max_recommendations) return recomanded_parks.slice(0, max_recommendations)
    return recomanded_parks
}