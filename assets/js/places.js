function places_onLoad() {
    menu.show_menu("menu_div", ws_name, coverage);

    t=extractUrlParams();
    document.getElementById("q").value=(t["q"])?t["q"]:"";
    if (t["administrative_region"]=="on"){document.getElementById("administrative_region").checked="true";}
    if (t["stop_area"]=="on"){document.getElementById("stop_area").checked="true";}
    if (t["address"]=="on"){document.getElementById("address").checked="true";}
    if (t["poi"]=="on"){document.getElementById("poi").checked="true";}
    if (t["stop_point"]=="on"){document.getElementById("stop_point").checked="true";}

    if (t["pt_network"]=="on"){document.getElementById("pt_network").checked="true";}
    if (t["pt_commercial_mode"]=="on"){document.getElementById("pt_commercial_mode").checked="true";}
    if (t["pt_stop_area"]=="on"){document.getElementById("pt_stop_area").checked="true";}
    if (t["pt_line"]=="on"){document.getElementById("pt_line").checked="true";}
    if (t["pt_route"]=="on"){document.getElementById("pt_route").checked="true";}

    document.getElementById("distance_reference").value=(t["distance_reference"])?t["distance_reference"]:"";
    if (document.getElementById("q").value != "") {
        doSearch();
    }
    map = L.map('map').setView([51.505, -0.09], 13);
    // add an OpenStreetMap tile layer
    L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);
    map.on('click', onMapClick);
    L.control.scale().addTo(map);

    if (t["distance_reference"]){
        var myIcon = L.icon({
            iconUrl: 'img/Here.gif'
        });
        ref_marker = L.marker([t["distance_reference"].split(";")[1], t["distance_reference"].split(";")[0]], {icon: myIcon}).addTo(map);
        lamb=WGS_ED50(t["distance_reference"].split(";")[1], t["distance_reference"].split(";")[0]);
        ref_marker.bindPopup("<b>point de référence pour le calcul de distance</b>"+
            "<br />LatLon wgs84: "+t["distance_reference"].split(";")[0] + " , " + t["distance_reference"].split(";")[1]+
            "<br />LatLon l2E: "+lamb[0] + ", "+ lamb[1]
        );
        map.addLayer(ref_marker);
    }

}

function onMapClick(e) {
    lamb=WGS_ED50(e.latlng.lng, e.latlng.lat);
    popup
        .setLatLng(e.latlng)
        .setContent(
            "LatLon WGS84 : " + e.latlng.lat + ", "+e.latlng.lng+"<br>"+
            "LatLon L2E : " + lamb[0] + ", "+lamb[1]+"<br>" +
            "<a href='javascript:void(0)' onClick='javascript:document.getElementById(\"distance_reference\").value=\""+e.latlng.lng + ";"+e.latlng.lat+"\";document.forms[0].submit();'>Distance depuis ce point</a><br>"
         )
        .openOn(map);
}

function doSearch(){
    doSearch_places();
    doSearch_pt_objects();
}

function doSearch_places(){
    url="coverage/"+document.getElementById("coverage").value+"/places?q="+document.getElementById('q').value;
    if (document.getElementById('administrative_region').checked) {
        url+= encodeURI("&type[]=administrative_region");
    }
    if (document.getElementById('stop_area').checked) {
        url+= encodeURI("&type[]=stop_area");
    }
    if (document.getElementById('stop_point').checked) {
        url+= encodeURI("&type[]=stop_point");
    }
    if (document.getElementById('poi').checked) {
        url+= encodeURI("&type[]=poi");
    }
    if (document.getElementById('address').checked) {
        url+= encodeURI("&type[]=address");
    }
    callNavitiaJS(document.getElementById("ws_name").value, url, '', showPlaces);
}

function doSearch_pt_objects(){
    url="coverage/"+document.getElementById("coverage").value+"/pt_objects?q="+document.getElementById('q').value;
    if (document.getElementById('pt_network').checked) {
        url+= encodeURI("&type[]=network");
    }
    if (document.getElementById('pt_commercial_mode').checked) {
        url+= encodeURI("&type[]=commercial_mode");
    }
    if (document.getElementById('pt_stop_area').checked) {
        url+= encodeURI("&type[]=stop_area");
    }
    if (document.getElementById('pt_line').checked) {
        url+= encodeURI("&type[]=line");
    }
    if (document.getElementById('pt_route').checked) {
        url+= encodeURI("&type[]=route");
    }
    callNavitiaJS(document.getElementById("ws_name").value, url, '', showPtobjects);
}

function showPtobjects(response){
    str="";
    if (response){
        places=response.places;
        var str="<table border='1'>";
        str+= "<tr>"
        str+= "<th>Type</th>"
        str+= "<th>Name</th>"
        str+= "<th>Quality</th>"
        str+= "<th>Liens</th>"
        str+= "</tr>"
        for (var i in response.pt_objects) {

            str+= "<tr>"
            var ptobj = response.pt_objects[i];
            str+= "<td>"+ptobj.embedded_type+"</td>";
            str+= "<td>"+ptobj.name+"</td>";
            str+= "<td>"+ptobj.quality+"</td>";
            str+= "<td><a href='ptref.html?"+"&ws_name="+document.getElementById("ws_name").value+
                "&coverage="+document.getElementById("coverage").value+"&uri=/"+ptobj.embedded_type+"s/"+ptobj.id + "/'>Explorer</a></td>";
        }
        str+="</table>";
    }
    document.getElementById('pt_objects').innerHTML = str;
}

function showPlaces(response){
    reference_point=document.getElementById("distance_reference").value.split(";");
    placesBounds=false;
    places=false;
    markerList=Array();
    str="";
    if (response){
        places=response.places;
        var str="<table border='1'>";
        str+= "<tr>"
        str+= "<th>Type</th>"
        str+= "<th>Name</th>"
        str+= "<th>Quality</th>"
        str+= "<th>Dist. Vol</th>"
        str+= "<th>Dist. Man</th>"
        str+= "<th>Dist. filaire</th>"
        str+= "</tr>"
        for (var i in response.places) {

            str+= "<tr>"
            var place = response.places[i];
            str+= "<td>"+place.embedded_type+"</td>";
            switch (place.embedded_type) {
                case "administrative_region" :
                    str+= "<td>" + place.name + "</td>";
                    break;
                case "stop_area" :
                    str+= "<td><a href='ptref.html?"+"&ws_name="+document.getElementById("ws_name").value+
                        "&coverage="+document.getElementById("coverage").value+"&uri=/stop_areas/"+place.id + "/'>" + place.name + "</a></td>";
                    break;
                case "stop_point" :
                    str+= "<td><a href='ptref.html?"+"&ws_name="+document.getElementById("ws_name").value+
                        "&coverage="+document.getElementById("coverage").value+"&uri=/stop_points/"+place.id + "/'>" + place.name + "</a></td>";
                    break;
                case "address" :
                    str+= "<td>" + place.name + " ("+ place.id + ")" + "</td>";
                    break;
                default:
                    str+= "<td><a href='ptref.html?"+"&ws_name="+document.getElementById("ws_name").value+
                        "&coverage="+document.getElementById("coverage").value+"&uri=/pois/"+place.id + "/'>" + place.name + "</a></td>";
            }
            coord=eval("place."+place.embedded_type+".coord");
            str+= "<td>"+place.quality+"</td>" ;
            str+= "<td>"+distance_wgs84(reference_point[1], reference_point[0], coord.lat, coord.lon)+"</td>" ;
            str+= "</tr>";
            place.marker = L.marker([coord.lat, coord.lon]).addTo(map);
            lamb=WGS_ED50(coord.lon, coord.lat);
            proxy_link = "<a href='places_nearby.html?ws_name="+ws_name+"&coverage="+coverage;
            proxy_link += "&point_id="+place.id+"&point_name="+place.name+"'>nearby</a>";
            place.marker.bindPopup("<b>"+place.name+"</b>"+
                "<br />Id: "+place.id+
                "<br />Quality: "+place.quality+
                "<br />Type: "+place.embedded_type+
                "<br />LatLon wgs84: "+coord.lat + ", "+ coord.lon+
                "<br />LatLon l2E: "+lamb[0] + ", "+ lamb[1]+
                "<br />LatLon l2E: "+lamb[0] + ", "+ lamb[1] +
                "<br />"+proxy_link
            );
            map.addLayer(place.marker);
            if (i==0) { map.setView([coord.lat, coord.lon]);}
            if (!placesBounds) {
                placesBounds=[[coord.lat, coord.lon], [coord.lat, coord.lon]];
            } else {
                if (coord.lat < placesBounds[0][0]) {placesBounds[0][0]=coord.lat};
                if (coord.lat > placesBounds[1][0]) {placesBounds[1][0]=coord.lat};
                if (coord.lon < placesBounds[0][1]) {placesBounds[0][1]=coord.lon};
                if (coord.lon > placesBounds[1][1]) {placesBounds[1][1]=coord.lon};
            }

        }
        str+="</table>";
    }
    document.getElementById('places').innerHTML = str;
    if (placesBounds) {map.fitBounds(placesBounds)};
}

var map;
var places;
var placesBounds=false;
var popup = L.popup();
