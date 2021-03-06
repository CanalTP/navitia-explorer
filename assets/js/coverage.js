function sort_compare_coverage(cov1, cov2){
    country1 = cov1.id.split('-')[0];
    country2 = cov2.id.split('-')[0];
    if (country1.length != country2.length) {
        //on trie les pays les plus grands en premiers (clients specifiques type transilien)
        return country2.length - country1.length;
    } else {
        //meme taille de pays, on met fr en 1er
        country1 = country1.substring(0, 2);
        country2 = country2.substring(0, 2);
        if (country1 == country2) {
            //on trie par ordre alpha
            return cov1.id.localeCompare(cov2.id);
        }
        if (country1 == "fr") {  return -1;  }
        if (country2 == "fr") {  return 1;  }
    }
    //on trie par ordre alpha
    return cov1.id.localeCompare(cov2.id);
}

function print_coveragelist_status(cov_list){
    selected_region=""
    var now = new Date();
    str = "<table border='1px'><tr>";
    str += "<th>Region</th>";
    str += "<th>Map</th>";
    str += "<th>Production End</th>";
    str += "<th>Address sources</th><th>POI sources</th>";
    str += "<th>Status</th>";
    str += "</tr>";
    for (var i in cov_list){
        r=cov_list[i];
        var myDate = r.end_production_date?IsoToJsDate(r.end_production_date):now;
        str+="<tr>";
        ws_name = (t["ws_name"])?t["ws_name"]:"";
        link = "<a href='./ptref.html?ws_name=" + ws_name + "&coverage=" + r.region_id + "'>" + r.region_id + "</a>" + "&nbsp;";
        str+="<td>" + link + "</td>";
        span_map = "<span id='showonmap_" + r.region_id + "' onClick='show_coverage_on_map(\""+r.region_id+"\");' class='span_link' style='display:none;'><img src='./assets/img/map_pin.png' height='20' width='13'></span>";
        str+="<td align='center'>" + span_map + "</td>";
        str+="<td><span style='" + DateToColor(myDate) + "'>" + r.end_production_date + " (" + dateDiff(myDate,now)+")</span></td>";
        span_address = "<span id='address_" + r.region_id + "'></span>";
        str+="<td align='center'>" + span_address + "</td>";
        span_poi = "<span id='poi_" + r.region_id + "'></span>";
        str+="<td align='center'>" + span_poi + "</td>";
        str+="<td>" + r.status+"</td>";
        str+="</tr>";
    }
    str+="</table>"
    document.getElementById('div_coverage').innerHTML=str;
    get_shapes_and_show_on_map();
    get_coverage_geostatus();
}

function get_shapes_and_show_on_map(){
    callNavitiaJS(ws_name, 'coverage', '', function(response){
        coverages2 = response.regions;
        for (c1 in coverages){
            shape = null;
            for (c2 in coverages2){
                if (coverages[c1].region_id == coverages2[c2].id){
                    if (coverages2[c2].shape != "") {
                        shape = coverages2[c2].shape;
                        span_id = "showonmap_" + coverages[c1].region_id;
                        $("#" + span_id).css("display", "inline");
                    }
                    break;
                }
            }
            coverages[c1].shape = shape;
        }
        show_coveragelist_on_map();
    });
}

function get_coverage_geostatus() {
    for (c in coverages){
        api = 'coverage/'+ coverages[c].id + '/_geo_status/';
        callNavitiaJS(ws_name, api, '', function(response){
            url_coverage = response.url.split("://")[1].split('/')[3];
            console.log(url_coverage);
            span_id = "address_" + url_coverage;
            $("#" + span_id).html(response.geo_status.street_network_sources.toString());
            span_id = "poi_" + url_coverage;
            $("#" + span_id).html(response.geo_status.poi_sources.toString());
        });
    }
}

function coverage_onLoad() {
    menu.show_menu("menu_div");
    t=extractUrlParams();
    ws_name = (t["ws_name"])?t["ws_name"]:"";
    coverage = (t["coverage"])?t["coverage"]:"";
    callNavitiaJS(ws_name, 'status', '', function(response){
        coverages = response.regions;
        for (c1 in coverages){
            coverages[c1].id = coverages[c1].region_id; //harmonisation des identifiants entre /status et /coverage
        }
        coverages.sort(sort_compare_coverage);
        print_coveragelist_status(coverages);
    });
}


function focusRegion(region_id){
    showOnMap(region_id);
    for (var i in coverage.regions){
        r=coverage.regions[i];
        if (r.shape && r.id==region_id) {
            map.setCenter(geojsonToGmap(r.shape)[0]);
        }
    }
}

function get_coverage_popup(coverage){
    var now = new Date();
    var myDate = r.end_production_date?IsoToJsDate(r.end_production_date):now;
    str = "<table border='1'  style='font-size:12px'>";
    str += "<tr>";
    str += "<th>Name</th><td>" + r.region_id + "</td>";
    str += "</tr><tr>";
    str+="<td>status</td><td>" + r.status+"</td>";
    str += "</tr><tr>";
    str+="<td>ProductionDates</td><td>" + r.start_production_date+" <br> " +
        "<span style='" + DateToColor(myDate) + "'>" + r.end_production_date + " (" + dateDiff(myDate,now)+")</span>" +"</td>";
    str += "</tr><tr>";
    str+="<td>Dataset Creation</td><td>" + NavitiaDateTimeToString(r.dataset_created_at, 'yyyymmdd hh:nn') +"</td>";
    str += "</tr><tr>";
    str+="<td>Dataset Publication</td><td>" + NavitiaDateTimeToString(r.publication_date, 'yyyymmdd hh:nn') +"</td>";
    str += "</tr><tr>";
    str+="<td>Last Load</td><td>" + NavitiaDateTimeToString(r.last_load_at, 'yyyymmdd hh:nn') +"</td>";
    str += "</tr>";
    str += "</table>";
    return str;
}

function show_coveragelist_on_map(){
    for (var i in map_polygons){map.removeLayer(map_polygons[i]);}
    map_polygons=[];
    globalBounds = false;
    for (var i in coverages){
        r=coverages[i];
        if (r.shape) {
            geoJson=wkt2geojson(r.shape);
            if (geoJson.type == "Linestring") {
                geoJson_coords=geoJson.coordinates;
            } else {
                geoJson_coords=geoJson.coordinates[0];
            };
            if (!globalBounds)
                globalBounds = L.latLngBounds(
                    [geoJson_coords[0][1], geoJson_coords[0][0] ],
                    [geoJson_coords[1][1], geoJson_coords[1][0] ]);
                for (p in geoJson_coords) {
                    globalBounds.extend(L.latLng(geoJson_coords[p][1], geoJson_coords[p][0]));
                }
            map_poly = L.geoJson([geoJson],{
                color: '#FF0000',
                opacity: 1.0,
                weight: 3,
                fillColor: '#FF0000',
                fillOpacity: 0.35
            });
            map_poly.bindPopup(get_coverage_popup(r));
            map_polygons.push(map_poly);
            map_poly.addTo(map);
        }
    }
    map.fitBounds(globalBounds)
}

function show_coverage_on_map(region_id){
    for (var i in map_polygons){map.removeLayer(map_polygons[i]);}
    map_polygons=[];
    globalBounds = false;
    for (var i in coverages){
        r=coverages[i];
        if ( (r.shape) && (r.region_id == region_id)) {
            geoJson=wkt2geojson(r.shape);
            if (geoJson.type == "Linestring") {
                geoJson_coords=geoJson.coordinates;
            } else {
                geoJson_coords=geoJson.coordinates[0];
            };
            if (!globalBounds) {
                globalBounds = L.latLngBounds(
                    [geoJson_coords[0][1], geoJson_coords[0][0] ],
                    [geoJson_coords[1][1], geoJson_coords[1][0] ]);
                for (p in geoJson_coords) {
                    globalBounds.extend(L.latLng(geoJson_coords[p][1], geoJson_coords[p][0]));
                }
            }
            map_poly = L.geoJson([geoJson],{
                color: '#0000FF',
                opacity: 1.0,
                weight: 3,
                fillColor: '#0000FF',
                fillOpacity: 0.35
            });
            map_poly.bindPopup(get_coverage_popup(r));
            map_polygons.push(map_poly);
            map_poly.addTo(map);
            map.fitBounds(globalBounds)
        }
    }
}

var selected = null;
var popup = L.popup();
var map = L.map('map').setView([51.505, -0.09], 13);
var coverages = null;
var map_polygons = [];
// add an OpenStreetMap tile layer
L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

L.easyButton( '<img src="./assets/img/map30.png" height="20" width="15">', function(){
  show_coveragelist_on_map();
}).addTo(map);
