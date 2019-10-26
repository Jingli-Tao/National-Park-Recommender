(async () => {
    const stateTopo = await d3.json('data/states-10m.json');
    buildMap(stateTopo, d3.select('#map'));
})().catch(console.error);

function buildMap(topo, svg) {
    const width = +svg.attr('width') - 240;
    const height = +svg.attr('height');

    // const tip = d3.tip()
    //     .attr('class', 'd3-tip')
    //     .direction('e')
    //     .offset([0, 5])
    //     .html(d => {
    //         return `<p>Tip Here</p>`
    //     });
    // svg.call(tip);

    const path = d3.geoPath()
        .projection(d3.geoAlbersUsa().scale(1300).translate([487.5, 305]));

    // const x = d3.scaleLog()
    //     .domain([1, highestQuake])
    //     .range([1, 100]);

    const color = d3.scaleQuantize()
        .domain([1,100])
        .range(d3.schemeReds[9]);

    svg.append('g')
        .attr('class', 'states')
        .selectAll('path')
        .data(topojson.feature(topo, topo.objects.states).features)
        .enter().append('path')
        .attr('fill', function (d) {
            return "#70a360";
            return color(x(earthquakes.get(d.properties.name) || 1));
        })
        .attr('class', 'state')
        .attr('d', path)
        .on('mouseover', d => {
            // tip.show(d);
        })
        .on('mouseout', d => {
            // tip.hide(d);
        });
}
