ptref = function() {
    this.object_list=null,
    this.disruption_list=null,
    this.object_count=-1,
    this.object_type="",
    this.object_type_list = ["stop_points", "stop_areas", "pois", "poi_types", "networks", "lines", "routes", "vehicle_journeys", "physical_modes", "commercial_modes", "connections", "traffic_reports" ],
    this.response = null,
    this.load = function(ws_name, coverage, uri, call_back){
        if (endsWith(uri, "/departures/")) {
            navitia_call="coverage/"+coverage+uri+"?count=20";
            this.object_type = "departures";
        } else if (endsWith(uri, "/places_nearby/")) {
            navitia_call="coverage/"+coverage+uri+"?count=100";
            this.object_type = "places_nearby";
        } else {
            navitia_call="coverage/"+coverage+uri+"?count=1000";
            nav_params = uri.split("/");
            for (i = nav_params.length-1; i >=0; i--) {
                nav_param = nav_params[i];
                if (nav_param != "") {
                    if (this.object_type_list.indexOf(nav_param) > -1) {
                        this.object_type = nav_param;
                        break;
                    }
                }
            }
        }
        callObjectFunction(ws_name, navitia_call, this, function(object, response){
            object.response = response;
            var names = Object.keys( response );
            if (object.object_type == "") {object.object_type=names[2];}
            object.object_list=eval("response\."+object.object_type);

            //traitement des disruptions
            var disruptions = [];
            for (var di in response.disruptions){
              disruption = response.disruptions[di];
              disruptions[disruption.id] = disruption;
            }
            object.disruption_list = disruptions;

            if (response.pagination) {
                object.object_count = response.pagination.total_result;
            }
            if (response.error) { object.object_type = "error";}
            call_back(object);
        });
    }
}

function getSeverityIcon(disruption) {
    if (disruption != "") {
        title = "Severity: "+disruption.severity.effect + "\n" + "Message: " + (disruption.messages ? disruption.messages[0].text : "") ;
        if (disruption.severity.effect == "NO_SERVICE"){
            return '<img src="./assets/img/notification_error.png" title="'+title+'" height="20" width="20">';
        } else {
            return '<img src="./assets/img/warning.jpeg" title="'+title+'" height="20" width="20">';
        }
    }
    return "";
}

function onMapClick(e) {
	lamb=WGS_ED50(e.latlng.lng, e.latlng.lat);
	popup
		.setLatLng(e.latlng)
		.setContent(
			"LatLon WGS84 : " + e.latlng.lat + ", "+e.latlng.lng+"<br>"+
			"LatLon L2E : " + lamb[0] + ", "+lamb[1]+"<br>"
		 )
		.openOn(map);
}

function selectRegion(){
	var select = document.getElementById('region_select');
	params.region=select.options[select.options.selectedIndex].value;
	changeFormDataSubmit();
}

function changeFormDataSubmit(){
	document.forms[0].submit();
}

function changeURI(base_uri, object_id, uri_end) {
	new_uri=base_uri+object_id+uri_end;
    new_uri = new_uri.replace('%2F', '/');
    new_uri = new_uri.replace('//', '/');
	document.getElementById("uri").value=new_uri;
	document.forms[0].submit();
}

function getNewURI(changed_uri, keep_current, current_id) {
    url = location.href;
    base_uri = url.substring(0, url.indexOf("?"));
    params = url.substring(url.indexOf("?")+1, 1000);
    params = params.split("&");
    new_uri = "";
    for (i in params) {
        p = params[i];
        if (p.split('=')[0] != 'uri'){
            new_uri += p.split('=')[0] + "=" + p.split('=')[1]+"&";
        } else {
            if (keep_current) {
                if (p.endsWith(current_id+'/')) {
                    new_uri += "uri" + "=" + p.split('=')[1] + changed_uri+"&";
                } else {
                    new_uri += "uri" + "=" + p.split('=')[1] + current_id + '/' + changed_uri+"&";
                }
            } else {
                new_uri += "uri" + "=" + changed_uri+"&";
            }
        }
    }
    new_uri = new_uri.replace(/%2F/g, '/');
    new_uri = new_uri.replace(/\/\//g, '/');
    new_uri = base_uri + '?' + new_uri;
    return new_uri;
}

function showNetworksHtml(){
	str="";
	str+='<table><tr>';
	str+='<th>Id (Nb : ' + ptref.object_list.length + ' / ' + ptref.object_count + ')</th>';
	str+='<th>Name</th>';
	str+='<th>Explorer</th>';
	str+='<th></th>';
	str+='</tr>';
	for (var i in ptref.object_list){
		n=ptref.object_list[i];
		s_str="<tr>";
		s_str+='<td><a href="'+getNewURI('/networks/'+n.id+'/', false, n.id)+'">'+n.id+'</a></td>';
		s_str+='<td>'+n.name + "</td>";
		s_str+='<td><a href="'+getNewURI('/physical_modes/', true, n.id)+'">Modes Ph</a></td>';
		s_str+='<td><a href="'+getNewURI('/commercial_modes/', true, n.id)+'">Modes Co</a></td>';
		s_str+='<td><a href="'+getNewURI('/lines/', true, n.id)+'">Lines</a></td>';
		s_str+='<td><a href="'+getNewURI('/stop_areas/', true, n.id)+'">Zones d\'arrêts</a></td>';
		worst_disruption = "";
    for (var k in n.links){
      d= n.links[k];
      //on cherche la severité la plus forte : NO_SERVICE
      if (d.type == 'disruption') {
        if ((worst_disruption == "") || (worst_disruption.severity.effect != 'NO_SERVICE')) {
          worst_disruption = ptref.disruption_list[d.id];
        }
      }
    }
		s_str+='<td>'+getSeverityIcon(worst_disruption)+'</td>';
		s_str+="</tr>\n";
		str+=s_str;
	}
	str+='</table>'
	document.getElementById('ptref_content').innerHTML=str;
}

function showTrafficReportsHtml(){
	str="";
	str+='<table><tr>';
	str+='<th>Network</th>';
	str+='<th>Line</th>';
	str+='<th>Status</th>';
	str+='<th>From</th>';
	str+='<th>To</th>';
	str+='<th>Updated</th>';
	str+='<th>  </th>';
	str+='</tr>';
	for (var i in ptref.object_list){
      //chaque élément contient toutes les perturbations d'un réseau
		  n=ptref.object_list[i];
      network_id = n.network.id;
      network_name = n.network.name;

      for (var j in n.lines) {
          l=n.lines[j];
          for (var k in l.links){
              d=l.links[k];
              s_str="<tr>";
              s_str+='<td>'+'<a href="'+getNewURI('/networks/'+ network_id + '/', false)+'" ">'+ network_id + "</a>" + "</td>";
              s_str+='<td>'+'<a href="'+getNewURI('/lines/'+ l.id + '/', false)+'" ">'+"<span class='icon-ligne' style='background-color: #"+l.color+";'>"+l.code + "</span>" +"</a></td>";
              s_str+='<td>'+ptref.disruption_list[d.id].status+'</td>';
              s_str+='<td>'+ptref.disruption_list[d.id].application_periods[0].begin+'</td>';
              s_str+='<td>'+ptref.disruption_list[d.id].application_periods[0].end+'</td>';
              s_str+='<td>'+ptref.disruption_list[d.id].updated_at+'</td>';
              if (ptref.disruption_list[d.id].severity.effect = "NO_SERVICE"){
                  s_str+='<td><img src="./assets/img/notification_error.png" title="Severity: '+ptref.disruption_list[d.id].severity.effect+'" height="20" width="20"></td>';
              } else {
                  s_str+='<td><img src="./assets/img/warning.jpeg" title="Severity: '+ptref.disruption_list[d.id].severity.effect+'" height="20" width="20"></td>';
              }

              s_str+="</tr>\n";
              str+=s_str;
          }
      }
	}
	str+='</table>'

	str+='<table><tr>';
	str+='<th>Network</th>';
	str+='<th>StopArea</th>';
	str+='<th>Status</th>';
	str+='<th>From</th>';
	str+='<th>To</th>';
	str+='<th>Updated</th>';
	str+='<th>  </th>';
	str+='</tr>';
    for (var i in ptref.object_list){
      //chaque élément contient toutes les perturbations d'un réseau
      n=ptref.object_list[i];
      network_id = n.network.id;
      network_name = n.network.name;

      for (var j in n.stop_areas) {
            sa=n.stop_areas[j];
            for (var k in l.links){
                d=l.links[k];
                s_str="<tr>";
                s_str+='<td>'+'<a href="'+getNewURI('/networks/'+network_id+'/', false)+'" >'+network_id + "</a>" + "</td>";
                // s_str+='<td>'+network_id + "</td>";
                s_str+='<td>'+'<a href="'+getNewURI('/stop_areas/'+sa.id+'/', false)+'">'+sa.name + "</a></td>";
                s_str+='<td>'+ptref.disruption_list[d.id].status+'</td>';
                s_str+='<td>'+ptref.disruption_list[d.id].application_periods[0].begin+'</td>';
                s_str+='<td>'+ptref.disruption_list[d.id].application_periods[0].end+'</td>';
                s_str+='<td>'+ptref.disruption_list[d.id].updated_at+'</td>';
                if (ptref.disruption_list[d.id].severity.effect = "NO_SERVICE"){
                    s_str+='<td><img src="./assets/img/notification_error.png" title="Severity: '+ptref.disruption_list[d.id].severity.effect+'" height="20" width="20"></td>';
                } else {
                    s_str+='<td><img src="./assets/img/warning.jpeg" title="Severity: '+ptref.disruption_list[d.id].severity.effect+'" height="20" width="20"></td>';
                }

                s_str+="</tr>\n";
                str+=s_str;
            }
        }
	}
	str+='</table>'
	document.getElementById('ptref_content').innerHTML=str;
}

function showModesHtml(){
	str="";
	str+='<table><tr>';
	str+='<th>Id (Nb : ' + ptref.object_list.length + ' / ' + ptref.object_count + ')</th>';
	str+='<th>Name</th>';
	str+='<th>Explorer</th>';
	str+='</tr>';
	for (var i in ptref.object_list){
		n=ptref.object_list[i];
		s_str="<tr>";
		s_str+='<td>'+n.id + "</td>";
		s_str+='<td>'+n.name + "</td>";
		s_str+='<td><a href="'+getNewURI('/lines/', true, n.id)+'">Lignes</a></td>';
		s_str+="</tr>\n";
		str+=s_str;
		console.log(s_str);
	}
	str+='</table>'
	document.getElementById('ptref_content').innerHTML=str;
}

function showStopAreasHtml(){
  newBounds=[];
	str="";
	str+='<table><tr>';
	str+='<th>Id (Nb : ' + ptref.object_list.length + ' / ' + ptref.object_count + ')</th>';
	str+='<th>Label</th>';
	//str+='<th>City</th>';
	str+='<th>Explorer</th>';
	str+='<th></th>';
	str+='</tr>';
	for (var i in ptref.object_list){
		n=ptref.object_list[i];
		s_str="<tr>";
		s_str+='<td><a href="'+getNewURI('', true, n.id)+'">'+n.id+'</a></td>';
		s_str+='<td>'+n.label + "</td>";
		/*
		s_str+='<td>';
		for (var j in n.administrative_regions){
			c=n.administrative_regions[j];
			s_str+= c.id + " ";
		}
		*/
		s_str+='</td>';
		s_str+='<td><a href="'+getNewURI('/lines/', true, n.id)+'">Lignes</a></td>';
		s_str+='<td><a href="'+getNewURI('/stop_points/', true, n.id)+'">StopPoints</a></td>';
		s_str+='<td><a href="'+getNewURI('/connections/', true, n.id)+'">Corresp.</a></td>';
		s_str+='<td><a href="'+getNewURI('/departures/', true, n.id)+'">Depart.</a></td>';
		s_str+='<td><a href="stop_schedules.html?ws_name='+ws_name+'&coverage='+coverage+'&stop_area_id='+n.id+'">Horaires</a></td>';
		s_str+='<td><a href="'+getNewURI('/places_nearby/', true, n.id)+'">Nearby</a></td>';
    worst_disruption = "";
    for (var k in n.links){
        d= n.links[k];
        //on cherche la severité la plus forte : NO_SERVICE
        if (d.type == 'disruption') {
            if ((worst_disruption == "") || (worst_disruption.severity.effect != 'NO_SERVICE')) {
                worst_disruption = ptref.disruption_list[d.id];
            }
        }
    }
        s_str+="</tr>\n";
		str+=s_str;
		coord=n.coord;
		n.marker = L.marker([coord.lat, coord.lon]).addTo(map);
		lamb=WGS_ED50(coord.lon, coord.lat);
		try {
			s_city=n.administrative_regions[0].name;
		}
		catch (err) {
			s_city="no_city";
		}

		n.marker.bindPopup(
			"<b>"+n.name+"</b>"+
			"<br />"+s_city+
			"<br />Id: "+n.id+
			"<br />LatLon wgs84: "+coord.lat + ", "+ coord.lon+
			"<br />LatLon l2E: "+lamb[0] + ", "+ lamb[1]
		);
		map.addLayer(n.marker);
		if (i==0) { map.setView([coord.lat, coord.lon]);}

		newBounds.push([coord.lat, coord.lon]);
	}
	str+='</table>'
	document.getElementById('ptref_content').innerHTML=str;
	if (newBounds) {map.fitBounds(newBounds)};
}

function showStopPointsHtml(){
	newBounds=[];
	str="";
	str+='<table><tr>';
	str+='<th>Id (Nb : ' + ptref.object_list.length + ' / ' + ptref.object_count + ')</th>';
	str+='<th>Label</th>';
	str+='<th>Explorer</th>';
	str+='</tr>';
	for (var i in ptref.object_list){
		n=ptref.object_list[i];
		s_str="<tr>";
		s_str+='<td><a href="'+getNewURI('', true, n.id)+'">'+n.id+'</a></td>';
		s_str+='<td>'+n.label + "</td>";
		s_str+='<td><a href="'+getNewURI('/lines/', true, n.id)+'">Lignes</a></td>';
		s_str+='<td><a href="'+getNewURI('/stop_areas/'+n.stop_area.id+'/', true, n.id)+'">StopArea</a></td>';
		s_str+='<td><a href="'+getNewURI('/connections/', true, n.id)+'">Corresp.</a></td>';
		s_str+='<td><a href="'+getNewURI('/departures/', true, n.id)+'">Depart.</a></td>';
		s_str+='<td><a href="'+getNewURI('/places_nearby/', true, n.id)+'">Nearby</a></td>';
		s_str+="</tr>\n";
		str+=s_str;
		coord=n.coord;
		n.marker = L.marker([coord.lat, coord.lon]).addTo(map);
		lamb=WGS_ED50(coord.lon, coord.lat);
		n.marker.bindPopup("<b>"+n.name+"</b>"+
			"<br />Id: "+n.id+
			"<br />LatLon wgs84: "+coord.lat + ", "+ coord.lon+
			"<br />LatLon l2E: "+lamb[0] + ", "+ lamb[1]
		);
		map.addLayer(n.marker);
		if (i==0) { map.setView([coord.lat, coord.lon]);}

		newBounds.push([coord.lat, coord.lon]);
	}
	str+='</table>'
	document.getElementById('ptref_content').innerHTML=str;
	if (newBounds) {map.fitBounds(newBounds)};
}


function showPlacesNearbyHtml(){
	str="";
	str+='<table style="font-size:11px"><tr>';
	str+='<th>Type</th>';
	str+='<th>Object</th>';
	str+='<th>Distance</th>';
	str+='</tr>';
	for (var i in ptref.object_list){
		n=ptref.object_list[i];
		s_str="<tr>";
		if (n.embedded_type=="poi") {
			s_str+='<td>'+n.poi.poi_type.name + "</td>";
		} else {
			s_str+='<td>'+n.embedded_type + "</td>";
		}
		s_str+='<td>'+n.name + "</td>";
		s_str+='<td>'+n.distance + "</td>";
		s_str+="</tr>\n";
		str+=s_str;
	}
	str+='</table>'
	document.getElementById('ptref_content').innerHTML=str;
}

function showDeparturesHtml(){
	str="";
	str+='<table style="font-size:11px"><tr>';
	str+='<th>StopPointId</th>';
	str+='<th>Route</th>';
	str+='<th>Arrival</th>';
	str+='<th>Departure</th>';
	str+='</tr>';
	for (var i in ptref.object_list){
		n=ptref.object_list[i];
		base_url=location.href;
		if (!base_url.endsWith(encodeURIComponent(n.id)+'/')) { base_url+=encodeURIComponent(n.id)+'/'; }
		s_str="<tr>";
		s_str+='<td><a href="'+base_url+'">'+n.stop_point.id+'</a></td>';
		s_str+='<td>'+n.route.line.code + ' - ' + n.route.name + "</td>";
		d = IsoToJsDate(n.stop_date_time.arrival_date_time);
		s_str+='<td>'+formatDate(d, "dd/mm hh:nn") + "</td>";
		d = IsoToJsDate(n.stop_date_time.departure_date_time);
		s_str+='<td>'+formatDate(d, "dd/mm hh:nn") + "</td>";
		s_str+="</tr>\n";
		str+=s_str;
	}
	str+='</table>'
	document.getElementById('ptref_content').innerHTML=str;
}

function showErrorHtml(){
	str = ptref.response.error.message;
	document.getElementById('ptref_content').innerHTML=str;
}

function showPOIsHtml(){
	newBounds=[];
	str="";
	str+='<table><tr>';
	//str+='<th>Id (Nb : ' + ptref.object_list.length + ')</th>';
	str+='<th>Id (Nb : ' + ptref.object_list.length + ' / ' + ptref.object_count + ')</th>';
	str+='<th>Label</th>';
	str+='<th>Explorer</th>';
	str+='</tr>';
	for (var i in ptref.object_list){
		n=ptref.object_list[i];
		s_str="<tr>";
		s_str+='<td><a href="'+getNewURI('', true, n.id)+'">'+n.id+'</a></td>';
		s_str+='<td>'+n.label + "</td>";
		s_str+='<td><a href="'+getNewURI('/places_nearby/', true, n.id)+'">Nearby</a></td>';
		s_str+="</tr>\n";
		str+=s_str;
		coord=n.coord;
		n.marker = L.marker([coord.lat, coord.lon]).addTo(map);
		lamb=WGS_ED50(coord.lon, coord.lat);
		n.marker.bindPopup("<b>"+n.name+"</b>"+
			"<br />Id: "+n.id+
			"<br />LatLon wgs84: "+coord.lat + ", "+ coord.lon+
			"<br />LatLon l2E: "+lamb[0] + ", "+ lamb[1]
		);
		map.addLayer(n.marker);
		if (i==0) { map.setView([coord.lat, coord.lon]);}

		newBounds.push([coord.lat, coord.lon]);
	}
	str+='</table>'
	document.getElementById('ptref_content').innerHTML=str;
	if (newBounds) {map.fitBounds(newBounds)};
}

function showPoiTypesHtml(){
	str="";
	str+='<table><tr>';
	str+='<th>Id (Nb : ' + ptref.object_list.length + ' / ' + ptref.object_count + ')</th>';
	str+='<th>Name</th>';
	str+='<th>Explorer</th>';
	str+='</tr>';
	for (var i in ptref.object_list){
		n=ptref.object_list[i];
		s_str="<tr>";
		s_str+='<td><a href="'+getNewURI('', true, n.id)+'">'+n.id+'</a></td>';
		s_str+='<td>'+n.name + "</td>";
		s_str+='<td><a href="'+getNewURI('/pois/', true, n.id)+'">POIs</a></td>';
		s_str+="</tr>\n";
		str+=s_str;
	}
	str+='</table>'
	document.getElementById('ptref_content').innerHTML=str;
}

function setConnectionFilter(){
	start_select = document.getElementById("connection_start");
	document.getElementById("connection_start_filter").value=start_select.value;
	end_select = document.getElementById("connection_end");
	document.getElementById("connection_end_filter").value=end_select.value;
	document.forms[0].submit();
}

function showConnectionsHtml(){
	newBounds=[];
	start_stopoints=[];
	start_filter = document.getElementById("connection_start_filter").value;
	end_stopoints=[];
	end_filter = document.getElementById("connection_end_filter").value;
	duree_max = 0;
	vit_max_man = 0;
	str="";
	str+='<table border=1 style="font-size:11px"><tr>';
	str+='<th>Origine</th>';
	str+='<th>Destination</th>';
	str+='<th>Durée</th>';
	str+='<th>Dist. vol</th>';
	str+='<th>Vit. vol</th>';
	str+='<th>Dist. Man</th>';
	str+='<th>Vit. Man</th>';
	str+='</tr>';
	for (var i in ptref.object_list){
		n=ptref.object_list[i];
		base_url=location.href;
		if (start_stopoints.indexOf(n.origin.id)==-1) {start_stopoints.push(n.origin.id);}
		if (end_stopoints.indexOf(n.destination.id)==-1) {end_stopoints.push(n.destination.id);}

		if ((start_filter != "") && (n.origin.id != start_filter) ) continue;
		if ((end_filter != "") && (n.destination.id != end_filter) ) continue;

		dist=distance_wgs84(n.origin.coord.lat, n.origin.coord.lon, n.destination.coord.lat, n.destination.coord.lon);
		s_str="<tr>";
		s_str+='<td><a href="'+base_url+"stop_points/"+n.origin.id+'/">'+n.origin.name+'</a>';
		s_str+='<br><span style="font-size:10px">'+n.origin.id+'</span>';
		s_str+='</td>';
		s_str+='<td><a href="'+base_url+"stop_points/"+n.destination.id+'/">'+n.destination.name+'</a>';
		s_str+='<br><span style="font-size:10px">'+n.destination.id+'</span>';
		s_str+='</td>';
		duree_map = n.display_duration;
		if (duree_max < duree_map) {
			duree_max = duree_map;
		}
		duree_tolerence = n.duration - n.display_duration;
		chaine= duree_map + "s (tol:"+duree_tolerence+"s)";
		if (duree_map < parseInt(dist)/1.12 ) {
			s_str+='<td><font color="red">'+chaine+"</font></td>";
		} else {
			s_str+='<td>'+chaine + "</td>";
		}
		s_str+='<td>'+ dist + "m</td>";
		vit=dist/n.duration*3600/1000;
		s_str+='<td>'+ Math.round(vit*10)/10 + " km/h</td>";

		dist_man=Math.round(dist*1.414*10)/10;
		s_str+='<td>'+ dist_man + "m</td>";
		vit=dist_man/n.duration*3600/1000;
		s_str+='<td>'+ Math.round(vit*10)/10 + " km/h</td>";
		if (vit_max_man < vit) {
			vit_max_man = vit;
		}


//                s_str+='<td><a href="'+base_url+'/lines/'+'">Lignes</a></td>';
		s_str+="</tr>\n";
		str+=s_str;
		coord=n.origin.coord;
		n.marker = L.marker([coord.lat, coord.lon]).addTo(map);
		lamb=WGS_ED50(coord.lon, coord.lat);
		n.marker.bindPopup("<b>"+n.origin.name+"</b>"+
			"<br />Id: "+n.origin.id+
			"<br />LatLon wgs84: "+coord.lat + ", "+ coord.lon+
			"<br />LatLon l2E: "+lamb[0] + ", "+ lamb[1]
		);
		map.addLayer(n.marker);
		if (i==0) { map.setView([coord.lat, coord.lon]);}

		newBounds.push([coord.lat, coord.lon]);
	}
	str+='</table>';
	str+='<br>durée max : ' + duree_max + ' s';
	str+='<br>Vitesse max (manh) : ' + Math.round(vit_max_man*10)/10 + ' km/h';

	start_stopoints.sort();
	start_select = '<select id="connection_start" name="connection_start" onChange="setConnectionFilter()">';
	start_select += '<option value="">Tous</option>';
	for (sp_idx in start_stopoints) {
		selected = (start_filter == start_stopoints[sp_idx])?" selected ":"";
		start_select += '<option'+selected+'>'+start_stopoints[sp_idx]+'</option>';
	}
	start_select += '</select>'
	end_stopoints.sort();
	end_select = '<select id="connection_end" name="connection_end" onChange="setConnectionFilter()">';
	end_select += '<option value="">Tous</option>';
	for (sp_idx2 in end_stopoints) {
		selected = (end_filter == end_stopoints[sp_idx2])?" selected ":"";
		end_select += '<option'+selected+'>'+end_stopoints[sp_idx2]+'</option>';
	}
	end_select += '</select>'
	document.getElementById('ptref_content').innerHTML=start_select + end_select + "<br>" + str;
	if (newBounds) {map.fitBounds(newBounds)};
}

function showLinesHtml(){
	str="";
	str+='<table><tr>';
	str+='<th>Id (Nb : ' + ptref.object_list.length + ' / ' + ptref.object_count + ')</th>';
	str+='<th>Code</th>';
	str+='<th>Name</th>';
	str+='<th>Explorer</th>';
	str+='<th></th>';
	str+='</tr>';
	newBounds=false;
	for (var i in ptref.object_list){
		n=ptref.object_list[i];
		s_str="<tr>";
		s_str+='<td><a href="'+getNewURI('', true, n.id)+'">'+n.id+'</a></td>';
		s_str+='<td>'+"<span class='icon-ligne' style='background-color: #"+n.color+";'>"+n.code + "</span>" +"</td>";
		s_str+='<td>'+n.name + "</td>";
		s_str+='<td><a href="'+getNewURI('/physical_modes/', true, n.id)+'">Modes Ph</a></td>';
		s_str+='<td><a href="'+getNewURI('/commercial_modes/', true, n.id)+'">Modes Co</a></td>';
		s_str+='<td><a href="'+getNewURI('/stop_areas/', true, n.id)+'">Zones d\'arrêts</a></td>';
		s_str+='<td><a href="'+getNewURI('/routes/', true, n.id)+'">Routes</a></td>';
        worst_disruption = "";
        for (var k in n.links){
            d= n.links[k];
            //on cherche la severité la plus forte : NO_SERVICE
            if (d.type == 'disruption') {
                if ((worst_disruption == "") || (worst_disruption.severity.effect != 'NO_SERVICE')) {
                    worst_disruption = ptref.disruption_list[d.id];
                }
            }
        }
		s_str+='<td>'+getSeverityIcon(worst_disruption)+'</td>';
		s_str+="</tr>\n";
		str+=s_str;
		//on trace la ligne sur la carte
		if (n.geojson.coordinates.length>0) {
			drawOptions={color:"#"+n.color, opacity:1, weight:3};
			n.layer=L.geoJson(n.geojson, drawOptions).addTo(map);
			if (!newBounds) {newBounds=n.layer.getBounds();}
			else {newBounds=newBounds.extend(n.layer.getBounds());}
		}
	}
	str+='</table>'
	document.getElementById('ptref_content').innerHTML=str;
	console.log(newBounds);
	if (newBounds) {map.fitBounds(newBounds)};
	//if (this.network_list){this.showNetworkOnMap(this.network_list[0]);}
}

function showRoutesHtml(){
	str="";
	str+='<table><tr>';
	str+='<th>Id (Nb : ' + ptref.object_list.length + ' / ' + ptref.object_count + ')</th>';
	str+='<th>Code</th>';
	str+='<th>Name</th>';
	str+='<th>Explorer</th>';
	str+='</tr>';
	newBounds=false;
	for (var i in ptref.object_list){
		n=ptref.object_list[i];
		s_str="<tr>";
		s_str+='<td><a href="'+getNewURI('', true, n.id)+'">'+n.id+'</a></td>';
		s_str+='<td>'+"<span class='icon-ligne' style='background-color: #"+n.color+";'>"+n.code + "</span>" +"</td>";
		s_str+='<td>'+n.name + "</td>";
		s_str+='<td><a href="'+getNewURI('/stop_areas/', true, n.id)+'">Zones d\'arrêts</a></td>';
		s_str+='<td><a href="'+getNewURI('/vehicle_journeys/', true, n.id)+'">Courses</a></td>';
		s_str+="</tr>\n";
		str+=s_str;
		//on trace le parcours sur la carte
		if (n.geojson.coordinates.length>0) {
			drawOptions={color:"#"+n.line.color, opacity:1, weight:3};
			n.layer=L.geoJson(n.geojson, drawOptions).addTo(map);
			if (!newBounds) {newBounds=n.layer.getBounds();}
			else {newBounds=newBounds.extend(n.layer.getBounds());}
		}
	}
	str+='</table>'
	document.getElementById('ptref_content').innerHTML=str;
	if (newBounds) {map.fitBounds(newBounds)};
	//if (this.network_list){this.showNetworkOnMap(this.network_list[0]);}
}

function showObjectHtml(ptref){
	if (ptref.object_type == "lines") {
		showLinesHtml();
	} else if ( (ptref.object_type == "physical_modes") || (ptref.object_type == "commercial_modes") ) {
		showModesHtml();
	} else if (ptref.object_type == "stop_areas") {
		showStopAreasHtml();
	} else if (ptref.object_type == "stop_points") {
		showStopPointsHtml();
	} else if (ptref.object_type == "routes") {
		showRoutesHtml();
	} else if (ptref.object_type == "connections") {
		showConnectionsHtml();
	} else if (ptref.object_type == "poi_types") {
		showPoiTypesHtml();
	} else if (ptref.object_type == "pois") {
		showPOIsHtml();
	} else if (ptref.object_type == "departures") {
		showDeparturesHtml();
	} else if (ptref.object_type == "places_nearby") {
		showPlacesNearbyHtml();
	} else if (ptref.object_type == "traffic_reports") {
		showTrafficReportsHtml();
	} else if (ptref.object_type == "networks") {
		showNetworksHtml();
	} else {
		showErrorHtml();
	}
}

function showAriane(uri){
	var res= uri.split("/");
	base_uri="/";
	ariane="";
	object_type = "";
	key_list=["networks", "lines", "routes", "commercial_modes", "physical_modes", "stop_areas", "stop_points",
	  "connections", "departures", "places_nearby", "traffic_reports"];
	for (var i=0; i<res.length; i++) {
		if (res[i]!="") {
			if (key_list.indexOf(res[i])>=0) {
				base_uri += res[i]+"/";
				object_type = res[i];
				ariane += " > " + '<a href="#" onclick="changeURI(\''+base_uri + '\',' +  '\'\', \'\')">'+res[i]+"</a>";
			} else {
				base_uri += res[i]+"/";
				ariane += " > " + '<a href="#" onclick="changeURI(\''+base_uri + '\',' +  '\'\', \'\')">'+res[i]+"</a>";
				//ariane += " > " + res[i];
			}
		}
	}
	document.getElementById("ariane").innerHTML=ariane;
	return object_type;
}

function ptref_onLoad(){
	menu.show_menu("menu_div");
	t=extractUrlParams();
	uri=(t["uri"])?t["uri"]:"";
	document.getElementById("uri").value = uri;
	if (uri=="") {
		document.getElementById("uri").value="/networks/";
		document.forms[0].submit();
	}
	var object_type = showAriane(uri);

	//on crée les éléments complémentaires du formulaire si besoin
	if (object_type == "connections"){
		var input1 = document.createElement("input");
		input1.type = "hidden";
		input1.id = "connection_start_filter";
		input1.name = "connection_start_filter";
		input1.value = (t["connection_start_filter"])?t["connection_start_filter"]:"";
		document.forms[0].appendChild(input1);

		var input2 = document.createElement("input");
		input2.type = "hidden";
		input2.id = "connection_end_filter";
		input2.name = "connection_end_filter";
		input2.value = (t["connection_end_filter"])?t["connection_end_filter"]:"";;
		document.forms[0].appendChild(input2);
	}

	ptref = new ptref();
	ptref.load(ws_name, coverage, uri, showObjectHtml);

	// add OpenStreetMap tile layers
	var osm = L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
		attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
	});
	var mono = L.tileLayer('http://www.toolserver.org/tiles/bw-mapnik/{z}/{x}/{y}.png', {
		attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
	});

	map = L.map('map-canvas', {
		center:[48.837212, 2.413],
		zoom: 8,
		layers: [osm]
	});

	// add control
	var baseMaps = {
		 "Normal": osm,
		 "Noir et blanc": mono
	};
	var overlayMaps = {};
	L.control.layers(baseMaps, overlayMaps).addTo(map);

	map.on('click', onMapClick);
}

var map;
var popup = L.popup();
var regions;
var placesBounds=false;
var selected = null;
var infowindow = null;
