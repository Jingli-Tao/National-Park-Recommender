let globalNpd;
(async () => {
    const [stateTopo, npd, scores] = await Promise.all([
            d3.json("/datafiles?filename=states-10m.json"),
            d3.csv("/datafiles?filename=park_info.csv"),
            d3.csv("/datafiles?filename=result_similarity.csv", parseSimilarity)
    ]);
    
    // Remove parks that are not in the continental United States
    const ind1 = npd.findIndex(d => d.name === "Virgin Islands NP");
    const ind2 = npd.findIndex(d => d.name === "National Park of American Samoa");
    npd.splice(ind1, 1);
    npd.splice(ind2, 1);

    globalNpd = reshapeParkData(npd); // Reshape data

    buildMap(stateTopo, d3.select("#map"), npd, scores);
})().catch(console.error);

function buildMap(topo, svg, npd, scores) {
    const defaultScale = d3.geoAlbersUsa().scale();
    const projection = d3.geoAlbersUsa().translate([480, 300]).scale(defaultScale * 600 / 510);

    const path = d3.geoPath().projection(projection);
    svg.append("g")
        .attr("class", "states")
        .selectAll("path")
        .data(topojson.feature(topo, topo.objects.states).features)
        .enter()
        .append("path")
        .attr("class", "state")
        .attr("d", path);

    svg.append("path")
        .attr("class", "state-borders")
        .attr("d", path(topojson.mesh(topo, topo.objects.states, function (a, b) { return a !== b; })));

    const filters = {
        crowd: {
            text: '',
            value: 0,
        },
        month: {
            text: '',
            value: 0,
        },
    };

    npd.sort((a, b) => a.name > b.name ? 1 : -1); // Sort parks alphabetically

    plotTravelMonths(d3.select(".months"), (month, monthNum) => {
        // console.log("Selected Month", month, monthNum);
        filters.month = { text: month, value: monthNum };
        plotParks(svg, scores, projection, filters);
    });

    plotParks(svg, scores, projection, filters);
}

function plotTravelMonths(select, onSelect) {
    select.on("change", function onSelectChange() {
        const opt = d3.select(this);
        const name = opt.property("name");
        const value = opt.property("value");
        onSelect(name, value);
    });

    select
        .selectAll("option")
        .data(["Select a month", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"])
        .enter()
        .append("option")
        .attr("name", d => d)
        .attr("value", (d, idx) => idx)
        .text(d => d);
}

function plotParks(svg, scores, projection, filters) {
    const defaultColor = "#4682b4";
    const selected_month = parseInt(filters.month.value),
        parkMonthData = getMonthlyVisit(selected_month);
    
    const parkRadius = d3.scaleLinear().range([4, 12]).domain(d3.extent(parkMonthData, d => d.visits*1000));
    const tooltip = d3.select("body").append("div") // for park image
        .attr("class", "tooltip")
        .style("opacity", 1e-6);

    svg.selectAll("g.parks").remove();
    svg.select("div.tooltip").remove();
    
    const parks = svg.append("g")
        .attr("class", "parks")
        .selectAll("g")
        .data(parkMonthData)
        .enter()
        .append("g")
        .attr("class", "park");
    
    parks.append("circle")
        .attr("cx", d => projection([d.long, d.lat])[0])
        .attr("cy", d => projection([d.long, d.lat])[1])
        .attr("r",  d => parkRadius(d.visits*1000))
        .attr("fill", defaultColor)
        .attr("class", "park-circle");

    // Highlight similar parks
    parks.on("click", function highlightSimilarPark(){
        // Clear highlights
        d3.selectAll("circle.highlight").style("fill", defaultColor);
        d3.selectAll("text.highlight").remove();
        d3.selectAll("image.highlight").remove();

        // Mark the clicked park
        d3.select(this)
            .append("svg:image")
            .attr("x", d => projection([d.long, d.lat])[0]-15)
            .attr("y", d => projection([d.long, d.lat])[1]-25)
            .attr("href", "image/pin.png")
            .attr("width", 30)
            .attr("height", 30)
            .attr("class", "highlight");
        
        // Hilight recommended parks
        const selected_park = d3.select(this).datum().name,
            recommendations = getRecomendation(scores, selected_month, selected_park)
            hilights = parks.filter(d => recommendations.includes(d.name));
            
        hilights
            .selectAll("circle")
            .style("fill", "#FF5908")
            .attr("class", "highlight");
        hilights
            .append("text")
            .attr("x", d => projection([d.long, d.lat])[0]-5)
            .attr("y", d => projection([d.long, d.lat])[1]-10)
            .text(function(d) {
                return recommendations.findIndex(r => r === d.name)+1;
            })
            .attr("class", "highlight");
        
        // Show details of clicked and recommended parks
        const results = [...recommendations];
        results.push(selected_park);
    
        const plotData = parkMonthData.filter(d => results.includes(d.name));
        plotData.forEach(match => match.rank = recommendations.findIndex(r => r === match.name)+1); // add rank
        plotData.sort(function(a,b) {return a.rank - b.rank;}) // sort per rank
 
        plotResults(plotData);
    });

    // Display park image when mouse hover
    parks.on('mouseover', function mouseOver(d) {
        let current_position = d3.mouse(this);
        let content = `<h3>` + d.name + `</h3><img src=` + d.url + ` class="tooltip" alt="park image">`;

        d3.select(this).select("circle").attr("r", 15);

        tooltip.style("opacity", .85)
            .style("visibility", "visible"); 
        
        tooltip.html(content)
            .style("left", function(){ // position image per window position
                if(current_position[0] > 700) return (d3.event.pageX-280) + "px";
                return (d3.event.pageX+25) + "px";
            })
            .style("top",function(){ // position image per window position
                if(current_position[1] < 150) return (d3.event.pageY-20) + "px";
                else if(current_position[1] > 400) return (d3.event.pageY-250) + "px";
                else return (d3.event.pageY-150) + "px";
            });
    }).on('mouseout', function mouseOut(){
        d3.select(this).select("circle").attr("r", d => parkRadius(d.visits*1000));
        tooltip.style("visibility", "hidden");
    });
}

function plotResults(matches) {
    d3.select('.result-container').remove();
    
    const resultContainer = d3.select('.content')
        .append('div')
        .attr('class', 'result-container');
    
    const toggleButton = resultContainer
        .append('button')
        .attr('id', 'result-toggle')
        .text('Hide');

    toggleButton.on('click', function(){
        if (toggleButton.text() === 'Hide') {
            toggleButton.text('Show');
            resultContainer.style('width', '3%');
        }
        else{
            toggleButton.text('Hide');
            resultContainer.style('width', '23%');
        }
    });
    
    const resultList = resultContainer.append('div')
        .attr('class', 'result-list');

    resultList
        .append('button')
        .attr('id', 'close-result')
        .text('Close')
        .on('click', function(){
            d3.select('.result-container').remove();
        });

    const resultItems = resultList
        .selectAll('div')
        .data(matches)
        .enter()
        .append('div')
        .attr('class', 'result-item shadow');
    
    // resultItems
    //     .append('div')
    //     .attr('class', 'park-name')
    //     // .text(d => d.rank + "." + d.name);
    //     .text(function(d){
    //         if(d.rank === 0) return d.name;
    //         return d.rank + "." + d.name;
    //     })
    //     .on("click", function(d){
    //         // d3.select(this).style("color", "blue");
    //         window.open(d.homepage);
    //     });
    resultItems
        .append('a')
        .attr('class', 'park-name')
        // .text(d => d.rank + "." + d.name);
        .text(function(d){
            if(d.rank === 0) return d.name;
            return d.rank + ". " + d.name;
        })
        .attr("href", d => d.homepage);
    
    resultItems
        .append('div')
        .attr('class', 'park-campsite')
        .text(d => 'Total campsites: ' + d.campsites);
    resultItems
        .append('div')
        .attr('class', 'park-trail')
        .text(d => 'Total trail length(km): ' + d.trails);
    resultItems
        .append('div')
        .attr('class', 'park-activity')
        .text(d => 'Activities: ' + d.activity);
}

function reshapeParkData(data){
    var newData = [];
    data.forEach(function(row) {
        Object.keys(row).forEach(function(colname) {
            if(colname === "name" || colname === "lat" || colname === "long" || colname === "area" || colname === "url" || colname === "homepage" || colname === "campsites" || colname === "trails" || colname === "activity") {
                return;
            }
            newData.push({name: row.name, 
                lat: +row.lat, 
                long: +row.long, 
                area: +row.area / 1000000, 
                url: row.url,
                homepage: row.homepage,
                campsites: +row.campsites,
                trails: +row.trails,
                activity: row.activity,
                month: colname, 
                visits: +row[colname]});
        });
    });

    return newData;
}

function parseSimilarity(row){
    return [row.park1, 
        row.park2, 
        +row['activity similariy'], 
        +row['crowdedness similarity Jan'], 
        +row['crowdedness similarity Feb'],
        +row['crowdedness similarity Mar'],
        +row['crowdedness similarity Apr'],
        +row['crowdedness similarity May'],
        +row['crowdedness similarity Jun'],
        +row['crowdedness similarity Jul'],
        +row['crowdedness similarity Aug'],
        +row['crowdedness similarity Sep'],
        +row['crowdedness similarity Oct'],
        +row['crowdedness similarity Nov'],
        +row['crowdedness similarity Dec']];
}

function getMonthlyVisit(selected_month) {
    switch(selected_month) {
        case 0:
            return globalNpd.filter(d => d.month === 'jan');
        case 1:
            return globalNpd.filter(d => d.month === 'jan');
        case 2:
            return globalNpd.filter(d => d.month === 'feb');
        case 3:
            return globalNpd.filter(d => d.month === 'mar');
        case 4:
            return globalNpd.filter(d => d.month === 'apr');
        case 5:
            return globalNpd.filter(d => d.month === 'may');
        case 6:
            return globalNpd.filter(d => d.month === 'jun');
        case 7:
            return globalNpd.filter(d => d.month === 'jul');
        case 8:
            return globalNpd.filter(d => d.month === 'aug');
        case 9:
            return globalNpd.filter(d => d.month === 'sep');
        case 10:
            return globalNpd.filter(d => d.month === 'oct');
        case 11:
            return globalNpd.filter(d => d.month === 'nov');
        case 12:
            return globalNpd.filter(d => d.month === 'dec');
    }
}

function getRecomendation(scores, selected_month, selected_park, threshold=0.25, max_recommendations=5){
    /* Get recomendation for selected_month and/or selected_park
    Inputs: 
        scores: park similarity scores saved in 'result_similarity.csv'.
        selected_month: an integer in [0,1,2,3,4,5,6,7,8,9,10,11,12]. 
                        0 means no selected month, use activity for making recommandations; 
                        otherwise, use both activity and crowdedness.
        selected_park: the name of one of 61 national parks.
        threshold: control the proximity to the selected park.
        max_recommendations: the maximum number of parks recommended.
    Outputs:
        recomanded_parks: a list of park names recommended*/
    
    var center = [1,1]
    var recomanded_parks = []
    var dist_dict = []
    var activity_score, crowdness_score, distance, park

    for (let i = 0; i < scores.length; i++){
        
        if (selected_park == scores[i][0] && selected_park != scores[i][1]){
            park = scores[i][1]
            if(park === 'Virgin Islands NP' || park === 'National Park of American Samoa') continue; // exclude parks that are not in the continental United States
            activity_score = scores[i][2];
            crowdness_score = scores[i][selected_month+2];
            distance = Math.sqrt(Math.pow(activity_score-center[0], 2) + Math.pow(crowdness_score-center[1], 2));
            dist_dict.push([park, distance])
        }
    }

    dist_dict = dist_dict.sort(function(a,b) {return a[1] - b[1];});
    
    if (recomanded_parks.length < max_recommendations) recomanded_parks = dist_dict.slice(0, max_recommendations).map(d => d[0]);
    else recomanded_parks = dist_dict.filter(d => d[1]<threshold).map(d => d[0]).slice(0, max_recommendations);

    return recomanded_parks;
}

// let matches = parkMonthData.filter(d => recommendations.includes(d.name));
// matches.forEach(match => match.rank = recommendations.findIndex(r => r === match.name)+1); // add rank
// matches.sort(function(a,b) {return a.rank - b.rank;}) // sort per rank

// plotResults(matches);
