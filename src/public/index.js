let globalNpd;
(async () => {
    const [stateTopo, npd, scores] = await Promise.all([
            d3.json('/datafiles?filename=states-10m.json'),
            d3.csv('/datafiles?filename=park_info.csv'),
            d3.csv('/datafiles?filename=result_similarity.csv', parseSimilarity)
    ]);
    
    // Remove parks that are not in the continental United States
    const ind1 = npd.findIndex(d => d.name === 'Virgin Islands NP');
    const ind2 = npd.findIndex(d => d.name === 'National Park of American Samoa');
    npd.splice(ind1, 1);
    npd.splice(ind2, 1);

    const reshapedNpd = reshapeParkData(npd);

    buildMap(stateTopo, d3.select('#map'), npd, reshapedNpd, scores);
    globalNpd = npd; // This gives the window access to the dataset.
})().catch(console.error);

function buildMap(topo, svg, npd, reshapedNpd, scores) {
    const defaultScale = d3.geoAlbersUsa().scale();
    const projection = d3.geoAlbersUsa().translate([480, 300]).scale(defaultScale * 600 / 510);

    const path = d3.geoPath().projection(projection);
    svg.append("g")
        .attr('class', 'states')
        .selectAll('path')
        .data(topojson.feature(topo, topo.objects.states).features)
        .enter()
        .append('path')
        .attr('class', 'state')
        .attr('d', path);

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

    plotTravelMonths(d3.select('.months'), (month, monthNum) => {
        console.log('Selected Month', month, monthNum);
        filters.month = { text: month, value: monthNum };
        plotParks(svg, reshapedNpd, scores, projection, filters);
    });

    plotParks(svg, reshapedNpd, scores, projection, filters);
}

function plotTravelMonths(select, onSelect) {
    select.on('change', function onSelectChange() {
        const opt = d3.select(this);
        const name = opt.property('name');
        const value = opt.property('value');
        onSelect(name, value);
    });

    select
        .selectAll('option')
        .data(['Select a month', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'])
        .enter()
        .append('option')
        .attr('name', d => d)
        .attr('value', (d, idx) => idx)
        .text(d => d);
}

function plotParks(svg, reshapedNpd, scores, projection, filters) {
    const defaultColor = '#4682b4';
    let selected_month = parseInt(filters.month.value),
        parkMonthData = getMonthlyVisit(reshapedNpd, selected_month);
    
    const parkRadius = d3.scaleLinear().range([4, 10]).domain(d3.extent(parkMonthData, d => d.visits));
    const tooltip = d3.select("body").append("div") // for image
        .attr("class", "tooltip")
        .style("opacity", 1e-6);

    svg.selectAll('g.parks').remove();
    
    const parks = svg.append("g")
        .attr('class', 'park')
        .selectAll("g")
        .data(parkMonthData)
        .enter()
        .append("g")
        .attr('class', 'parks');
    
    parks.append("circle")
        .attr('cx', d => projection([d.long, d.lat])[0])
        .attr('cy', d => projection([d.long, d.lat])[1])
        .attr("r",  d => parkRadius(d.visits))
        .attr('fill', defaultColor)
        .attr('class', 'park-circle');

    parks.append("text")
        .attr("x", d => projection([d.long, d.lat])[0]-10)
        .attr("y", d => projection([d.long, d.lat])[1]-15)
        .text(d => d.name)
        .attr("font-size", 10)
        .attr("family", "sans-serif")
        .style("visibility", "hidden")
        .attr('class', 'park-label');
    
    parks.append("image") // marker for the clicked park
        .attr("x", d => projection([d.long, d.lat])[0]-15)
        .attr("y", d => projection([d.long, d.lat])[1]-25)
        .attr('xlink:href', 'https://drive.google.com/uc?id=1uz2TfUyPDkKyYUqCVt6Br1gcTadX-xHL')
        .attr('width', 30)
        .attr('height', 30)
        .style("visibility", "hidden");
    
    // Highlight similar parks
    parks.on('click', function(){
        // Clear highlights
        d3.selectAll("circle.highlight").style("fill", defaultColor);
        d3.selectAll("text.highlight").style("visibility", "hidden");
        d3.selectAll("image.highlight").style("visibility", "hidden");

        // Mark the clicked park
        d3.select(this)
            .select("image")
            .style("visibility", "visible")
            .attr("class", "highlight");
        
        // Hilight recommended parks
        let selected_park = d3.select(this).datum().name,
            recommendations = getRecomendation(scores, selected_month, selected_park),
            matches = parkMonthData.filter(d => recommendations.includes(d.name));
        
        parks.filter(d => recommendations.includes(d.name))
            .selectAll("circle")
            .style("fill", "#FF5908")
            .attr("class", "highlight");
        parks.filter(d => recommendations.includes(d.name))
            .selectAll("text")
            .style("visibility", "visible")
            .attr("class", "highlight");
        
        // Show details of recommended parks
        plotResults(matches);
    });

    // Display park image when mouse hover
    parks.on('mouseover', function(d) {
        let current_position = d3.mouse(this);
        let content = `<h3>` + d.name + `</h3><img src=` + d.url + `>`;

        d3.select(this).select("circle").attr("r", 15);

        tooltip.style("opacity", .85)
            .style("visibility", "visible"); 
        
        tooltip.html(content)
            .style("left", function(){
                if(current_position[0] > 700) return (d3.event.pageX-350) + "px";
                return (d3.event.pageX+25) + "px";
            })
            .style("top",function(){
                if(current_position[1] < 150) return (d3.event.pageY-20) + "px";
                else if(current_position[1] > 400) return (d3.event.pageY-300) + "px";
                else return (d3.event.pageY-150) + "px";
            });
        
    }).on('mouseout', function(){
        d3.select(this).select("circle").attr("r", d => parkRadius(d.visits));
        tooltip.style("visibility", "hidden");
    });
}

function plotResults(matches) {
    d3.selectAll('.result-item').remove();
    const resultList = d3.select('.content')
        .append('div')
        .attr('class', 'result-list');

    resultList
        .append('button')
        .attr('id', 'close-result')
        .text('Close')
        .on('click', closeResult);

    const resultItems = resultList
        .selectAll('div')
        .data(matches)
        .enter()
        .append('div')
        .attr('class', 'result-item shadow');
    
    resultItems
        .append('div')
        .attr('class', 'park-name')
        .text(d => d.name);
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

function closeResult(){
    d3.selectAll('.result-item').remove();
    d3.selectAll('#close-result').remove();
}

function reshapeParkData(data){
    // Reshape data
    var newData = [];
    data.forEach(function(row) {
        Object.keys(row).forEach(function(colname) {
            if(colname === "name" || colname === "lat" || colname === "long" || colname === "area" || colname === "url" || colname === "campsites" || colname === "trails" || colname === "activity") {
                return;
            }
            newData.push({name: row.name, 
                lat: +row.lat, 
                long: +row.long, 
                area: +row.area / 1000000, 
                url: row.url, 
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


function getMonthlyVisit(reshapedNpd, selected_month) {
    switch(selected_month) {
        case 0:
            return reshapedNpd.filter(d => d.month === 'jan');
        case 1:
            return reshapedNpd.filter(d => d.month === 'jan');
        case 2:
            return reshapedNpd.filter(d => d.month === 'feb');
        case 3:
            return reshapedNpd.filter(d => d.month === 'mar');
        case 4:
            return reshapedNpd.filter(d => d.month === 'apr');
        case 5:
            return reshapedNpd.filter(d => d.month === 'may');
        case 6:
            return reshapedNpd.filter(d => d.month === 'jun');
        case 7:
            return reshapedNpd.filter(d => d.month === 'jul');
        case 8:
            return reshapedNpd.filter(d => d.month === 'aug');
        case 9:
            return reshapedNpd.filter(d => d.month === 'sep');
        case 10:
            return reshapedNpd.filter(d => d.month === 'oct');
        case 11:
            return reshapedNpd.filter(d => d.month === 'nov');
        case 12:
            return reshapedNpd.filter(d => d.month === 'dec');
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
