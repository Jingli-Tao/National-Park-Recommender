let globalNpd;
(async () => {
    const [stateTopo, npd, scores] = await Promise.all([
            d3.json('data/states-10m.json'),
            d3.csv('/datafiles?filename=park_info.csv', parseParkInfo),
            d3.csv('/datafiles?filename=result_similarity.csv', parseSimilarity)
    ]);

    // Remove parks that are not in the continental United States
    let ind1 = npd.map(d => d.name).indexOf('Virgin Islands NP');
    let ind2 = npd.map(d => d.name).indexOf('National Park of American Samoa');
    npd.splice(ind1, 1);
    npd.splice(ind2, 1);

    buildMap(stateTopo, d3.select('#map'), npd, scores);
    globalNpd = npd; // This gives the window access to the dataset.
})().catch(console.error);

function buildMap(topo, svg, npd, scores) {
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
        plotParks(svg, npd, projection, filters);
    });

    plotParks(svg, npd, scores, projection, filters);
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

function plotParks(svg, npd, scores, projection, filters) {
    const defaultColor = '#4682b4';
    const parkRadius = d3.scaleLog().range([2, 8]).domain(d3.extent(npd, d => d.area));
    let tooltip = d3.select("body").append("div") // for image
        .attr("class", "tooltip")
        .style("opacity", 1e-6);

    let parks = svg.selectAll("circle")
        .data(npd)
        .enter()
        .append("circle")
        .attr("r",  d => parkRadius(d.area))
        .attr("transform", function(d) {
            return "translate(" + projection([
            d.long,
            d.lat
            ]) + ")";
        })
        .attr('fill', defaultColor)
        .attr('class', 'parks');
    
    // Highlight similar parks
    parks.on('click', function(){
        d3.selectAll("circle.highlight").style("fill", defaultColor);
        let selected_park = d3.select(this).datum().name,
            selected_month = filters.month.value,
            recommendations = getRecomendation(scores, selected_month, selected_park),
            matches = npd.filter(d => recommendations.includes(d.name));
        
        parks.filter(d => recommendations.includes(d.name))
            .style("fill", "#FF5908")
            .attr("class", "highlight");
        plotResults(matches);
        console.log(recommendations);
    });

    // Display park image when mouse hover
    parks.on('mouseover', function(d) {
        d3.select(this).attr("r", 15);
        
        const content = `<h3>` + d.name + `</h3><img src=` + d.url + `>`;
        tooltip.transition()        
            .duration(200)      
            .style("opacity", .85); 
        
        tooltip.html(content)
            .style("left", d3.event.pageX + "px")     
            .style("top", d3.event.pageY + "px");
        
    }).on('mouseout', function(){
        d3.select(this).attr("r", d => parkRadius(d.area));
        tooltip.transition()
            .duration(500)
            .style("opacity", 1e-6);
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

function parseParkInfo(row){
    return {name: row.name, 
        lat: +row.lat, 
        long: +row.long, 
        area: +row.area / 1000000,
        url: row.url,
        campsites: +row.campsites,
        trails: +row.trails,
        activity: row.activity};
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
    var activity_score, crowdness_score, distance

    for (let i = 0; i < scores.length; i++){
        
        if (selected_park == scores[i][0] && selected_park != scores[i][1]){
            park = scores[i][1]
            activity_score = scores[i][2];
            crowdness_score = scores[i][parseInt(selected_month)+2];
            distance = Math.sqrt(Math.pow(activity_score-center[0], 2) + Math.pow(crowdness_score-center[1], 2));
            dist_dict.push([park, distance])
        }
    }

    dist_dict = dist_dict.sort(function(a,b) {return a[1] - b[1];});
    
    if (recomanded_parks.length < max_recommendations) recomanded_parks = dist_dict.slice(0, max_recommendations).map(d => d[0]);
    else recomanded_parks = dist_dict.filter(d => d[1]<threshold).map(d => d[0]).slice(0, max_recommendations);

    return recomanded_parks
}
