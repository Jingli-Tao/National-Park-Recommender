let npd;
(async () => {
    const [stateTopo, postalCodes, parkData] = await Promise.all([
        d3.json('data/states-10m.json'),
        d3.csv('data/state_codes.csv'),
        d3.csv('http://localhost:8080/datafiles?filename=park_data.csv')
    ]);
    console.table(postalCodes);
    const postalCodesSet = new Set(postalCodes.map(pc => pc.postal_code));
    npd = parkData
        .filter(row => {
            const isNatPark = row.designation === 'National Park'
            const isValidStates = row.states.split(',').some(state => postalCodesSet.has(state));
            const hasLatLong = row.latLong.length > 0;
            return isNatPark && isValidStates && hasLatLong;
        })
        .map(row => {
            console.log(row);
            const { lat, long } = getLatLong(row);
            return {
                ...row,
                lat,
                long
            };
        })

    console.table(npd);
    buildMap(stateTopo, d3.select('#map'), npd);
})().catch(console.error);

function getLatLong(row) {
    const [latStr, longStr] = row.latLong.split(', ');
    const [, lat] = latStr.split(':');
    const [, long] = longStr.split(':');
    return { lat, long };
}

function buildMap(topo, svg, npd) {
    const defaultScale = d3.geoAlbersUsa().scale();
    const projection = d3.geoAlbersUsa().translate([480, 300]).scale(defaultScale * 600 / 500);

    const path = d3.geoPath().projection(projection);
    svg.append("g")
        .selectAll('path')
        .data(topojson.feature(topo, topo.objects.states).features)
        .enter()
        .append('path')
        .attr('fill', '#70a360')
        .attr('d', path);

    svg.selectAll('circle')
        .data(npd)
        .enter()
        .append('circle')
        .attr('cx', d =>  projection([parseFloat(d.long), parseFloat(d.lat)])[0])
        .attr('cy', d =>  projection([parseFloat(d.long), parseFloat(d.lat)])[1])
        .attr('r', 2.5)
        .attr('fill', 'blue')
        .on('mouseover', d => {
            console.log(d);
        })

}
