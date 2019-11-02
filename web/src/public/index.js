let globalNpd;
(async () => {
    const [stateTopo, postalCodes, parkData] = await Promise.all([
        d3.json('data/states-10m.json'),
        d3.csv('data/state_codes.csv'),
        d3.csv('http://localhost:8080/datafiles?filename=park_data.csv')
    ]);
    const postalCodesSet = new Set(postalCodes.map(pc => pc.postal_code));
    const npd = parkData
        .filter(row => {
            const isNatPark = row.designation === 'National Park'
            const isValidStates = row.states.split(',').some(state => postalCodesSet.has(state));
            const hasLatLong = row.latLong.length > 0;
            return isNatPark && isValidStates && hasLatLong;
        })
        .map(row => {
            const { lat, long } = getLatLong(row);
            return {
                ...row,
                lat,
                long
            };
        })

    console.table(npd);
    buildMap(stateTopo, d3.select('#map'), npd);
    globalNpd = npd; // This gives the window access to the dataset.
})().catch(console.error);

function getLatLong(row) {
    const [latStr, longStr] = row.latLong.split(', ');
    const [, lat] = latStr.split(':');
    const [, long] = longStr.split(':');
    return { lat: parseFloat(lat), long: parseFloat(long) };
}

function buildMap(topo, svg, npd) {
    const defaultScale = d3.geoAlbersUsa().scale();
    const projection = d3.geoAlbersUsa().translate([480, 300]).scale(defaultScale * 600 / 500);

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

    plotParks(svg, npd, projection);
    plotResults(npd); // todo: Filter out results based on facets.
}

function plotParks(svg, npd, projection) {
    const defaultRadius = 3.5;
    const defaultColor = '#0026ff';

    svg.selectAll('circle').remove();
    svg.selectAll('circle')
        .data(npd)
        .enter()
        .append('circle')
        .attr('cx', d => projection([d.long, d.lat])[0])
        .attr('cy', d => projection([d.long, d.lat])[1])
        .attr('r', defaultRadius) // todo: Update size based on park ranking
        .attr('fill', defaultColor)
        .on('mouseover', (val, idx, array) => {
            console.log(val);
            const circle = array[idx];
            d3.select(circle)
                .attr('r', defaultRadius * 2)
                // .attr('fill', 'red');
        })
        .on('mouseout', (d, idx, array) => {
            const circle = array[idx];
            d3.select(circle)
                .attr('r', defaultRadius)
                .attr('fill', defaultColor);
        });
}

function plotResults(npd) {
    d3.select('.result-item').remove();
    const resultList = d3.selectAll('.result-list');

    const resultItems = resultList
        .selectAll('div')
        .data(npd)
        .enter()
        .append('div')
        .attr('class', 'result-item shadow')

    resultItems
        .append('div')
        .attr('class', 'park-name')
        .text(d => d.name);
    resultItems
        .append('div')
        .attr('class', 'park-description')
        .text(d => d.description);
}
