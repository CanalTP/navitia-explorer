$("#toggle_other_params").click(function(){
       $("#other_params").toggle();
});

function GetDateTime() {
	date = document.getElementById("idate").value;
	time = document.getElementById("itime").value;
	console.log("datetime a completer");
	return "20150602T120000";
}

function GetDateTimeRepresents(){
	console.log("GetDateTimeRepresents a completer");
	return "departure";
}

function clearMap(){
	if (journey.journey_list){
	   for (var i in journey.journey_list){
			jo=journey.journey_list[i];
			for (var j in jo.sections){
				sec=jo.sections[j];
				if (sec.polyline) {map.removeLayer(sec.polyline);}
				if (sec.from && sec.from.marker) {map.removeLayer(sec.from.marker);}
				if (sec.to && sec.to.marker) {map.removeLayer(sec.to.marker);}
			}
	   }
	}
}

function getJourneyListHtml(){
	str="";
	if (journey.journey_error) {
		str+="error_id: " + journey.journey_error.id + "<br>";
		str+="error_message: " + journey.journey_error.message + "<br>";
	}
	for (var i in journey.journey_list){
		str+='<div id="jo'+i+'" class="journey">';
		jo=journey.journey_list[i];
		str_duration=(jo.duration > 3600)? Math.floor(jo.duration / 3600) + " h ":"";
		str_duration+=(jo.duration > 60)? Math.floor((jo.duration%3600) / 60) + " min ":"";
		str_duration+= (jo.duration%60) + " sec";
		checked=(i==0)?" checked ":"";
		str+="<input type='radio' name='jo' value='"+i+"' "+checked+" onchange='showJourneyOnMap(journey.journey_list["+i+"]);'>";
		str+=jo.type+" ("+jo.nb_transfers+" corr // "+str_duration+")<br/>";
		str+= jo.departure_date_time.substring(6,8) +"/"+ jo.departure_date_time.substring(4,6) +"/"+ jo.departure_date_time.substring(0,4) + " ";
		str+= jo.departure_date_time.substring(9,11) +"h"+ jo.departure_date_time.substring(11,13) +"m"+ jo.departure_date_time.substring(13,15);
		str+= " ==> ";
		str+= jo.arrival_date_time.substring(6,8) +"/"+ jo.arrival_date_time.substring(4,6) +"/"+ jo.arrival_date_time.substring(0,4) + " ";
		str+= jo.arrival_date_time.substring(9,11) +"h"+ jo.arrival_date_time.substring(11,13) +"m"+ jo.arrival_date_time.substring(13,15);
		str+= "<br>";
		str+="<table style='font-size: 10px'><tr>";
		for (var j in jo.sections){
			sec=jo.sections[j];
			if (j==0){
				str+="<td style='max-width:100px;' align='center'><span>"+sec.from.name+"</span></td>";
			}

			if (sec.type == "waiting") {}
			else if ((sec.type == "public_transport") || (sec.type == "on_demand_transport")) {
				str+="<td  align='center'>";
				str+=sec.display_informations.network + "<br>";
				color=sec.display_informations.color;
				for (var link in sec.links){
					if (link.type=="line") sec.line_id=link.id;
					if (link.type=="route") sec.route_id=link.id;
					if (link.type=="network") sec.network_id=link.id;
				}
				//on ajoute un lien vers la grille horaire de ligne pour le jour en question
				url="route_schedules.html?ws_name="+document.getElementById("ws_name").value+
					"&coverage="+document.getElementById("coverage").value;
				url+="&datetime="+sec.departure_date_time;
				url+="&network_id="+sec.network_id+"&line_id="+sec.line_id+"&route_id="+sec.route_id;
				url+="&from_id="+sec.from.id+"&to_id="+sec.to.id;
				str+="<a href='"+url+"' target='_blank'>";
				if (color==""){color="000000";}
				if (sec.display_informations.code!="") {
					str+="<span class='icon-ligne' style='background-color: #"+color+";'>";
					str+=sec.display_informations.code;
					str+="</span>";
				}
				else {str+=sec.display_informations.commercial_mode + " " + sec.display_informations.headsign;}
				str+="</a>";
				str+="</td>";
				str+="<td style='max-width:100px'  align='center'><span>"+sec.to.name+"</span></td>";
			}
			else if (sec.type == "street_network") {
				str+="<td  align='center'>";
				str+="<span class='icon-ligne' style='background-color: #000000;'>";
				str+=sec.mode;
				str+="</span>";
				str+="</td>";
			}
		}
		str+="<td><span>"+sec.to.name+"</span></td></tr></table>";
		str+='</div>';
	}
	document.getElementById('journeys').innerHTML=str;
	document.getElementById('journey_url').innerHTML="<a href='" +journey.journey_url + "' target='blank'> URL</a>";
	if (journey.journey_list){showJourneyOnMap(journey.journey_list[0]);}
}

function showJourneyOnMap(jo){
	for (i in journey.map_markers) {
		map.removeLayer(journey.map_markers[i]);
	}
	journey.map_markers=[];
	for (i in journey.map_polylines) {
		map.removeLayer(journey.map_polylines[i]);
	}
	journey.map_polylines=[];

	newBounds=false;
	for (var j in jo.sections){
		sec=jo.sections[j];
		//récupération des ID des objets
		for (l in sec.links){
			link=sec.links[l];
			if (link.type == "vehicle_journey") vehicle_journey_id=link.id;
			if (link.type == "line") line_id=link.id;
		}

		if (sec && sec.type != "waiting") {
			if ((sec.type == "street_network") ||(sec.type == "crow_fly"))  {drawOptions={dashArray: '7,7', lineJoin: 'round', color:'black', opacity:1, weight:3};}
			else {
				if (sec.display_informations && sec.display_informations.color) {drawOptions={color:"#"+sec.display_informations.color, opacity:1, weight:3};}
				else {drawOptions={color:'red', opacity:0.8, weight:3};}
			}
			if (sec.geojson) {
				sec.polyline=L.polyline(geojsonToGmap(sec.geojson.coordinates), drawOptions).addTo(map);
				if (!newBounds) {newBounds=sec.polyline.getBounds();}
				else {newBounds=newBounds.extend(sec.polyline.getBounds());}
			} else {
				//pas de GeoJSon, on crée une polyline quand même pour le vol d'oiseau
				coord1=eval("sec.from."+sec.from.embedded_type+".coord");
				coord2=eval("sec.to."+sec.to.embedded_type+".coord");
				poli=[new L.LatLng(coord1.lat, coord1.lon), new L.LatLng(coord2.lat, coord2.lon)];
				sec.polyline=L.polyline(poli, drawOptions).addTo(map);
				if (!newBounds) {newBounds=sec.polyline.getBounds();}
				else {newBounds=newBounds.extend(sec.polyline.getBounds());}
			}
			str="<table width='150px' border='1px' style='font-size:10px'><th><td colspan='2' align='center'>"+sec.type+"</td></th>";
			if (sec.type != "waiting") {
				var myDate = IsoToJsDate(sec.departure_date_time);
				str+='<tr><td>départ</td><td>' + sec.from.name + '<br/>' + sec.from.id + "<br/>" + formatDate(myDate, "dd/mm hh:nn") + "</td></tr>";
			}
			dist=0;
			if (sec.type == "street_network") {
				str+='<tr><td>mode</td><td>' + sec.mode + "</td></tr>";
				dist=0;
				for (k in sec.path) {
					dist+=sec.path[k].length;
				}
			} else if (sec.geojson) {
				dist=sec.geojson.properties[0].length;
			}
			dist_bird=0;
			coord_start=eval("sec.from."+sec.from.embedded_type+".coord");
			coord_end=eval("sec.to."+sec.to.embedded_type+".coord");
			if (coord_start && coord_end) {dist_bird=distance_wgs84(coord_start.lat, coord_start.lon, coord_end.lat, coord_end.lon);}
			str+='<tr><td>distance</td><td>filaire : ' + dist + " m <br/>vol d'oiseau : " +dist_bird+ " m</td></tr>";
			if (sec.display_informations){
				str+='<tr><td>réseau</td><td>' + sec.display_informations.network + "</td></tr>";
				str+='<tr><td>mode commercial // physique</td><td>' + sec.display_informations.commercial_mode + " // " + sec.display_informations.physical_mode+"</td></tr>";
				forbidden_link='<a href="#" onClick="add_forbidden_uri(\''+line_id+'\')">Éviter</a>';
				str+='<tr><td>line code - label</td><td>' + sec.display_informations.code + ' - '+sec.display_informations.label+" "+forbidden_link+"</td></tr>";
				str+='<tr><td>direction</td><td>' + sec.display_informations.direction + "</td></tr>";
				str+='<tr><td>headsign</td><td>' + sec.display_informations.headsign + "</td></tr>";
				str+="<tr><td>vehicle_journey</td><td><a href='ptref.html?"+"&ws_name="+document.getElementById("ws_name").value+
					"&coverage="+document.getElementById("coverage").value+
					"&uri=/vehicle_journeys/"+vehicle_journey_id + "/'>" + vehicle_journey_id + "</a></td></tr>";

			}
			if (sec.duration) {
				str+='<tr><td>durée</td><td>';
				str+= (sec.duration > 60)? Math.floor(sec.duration / 60) + " min ":"";
				str+= eval(sec.duration % 60) + " sec ("+sec.duration+" sec)</td></tr>";
			}
			/*
			*/
			if (sec.type != "waiting") {
				var myDate = IsoToJsDate(sec.arrival_date_time);
				str+='<tr><td>arrivée</td><td>' + sec.to.name + '<br/>' + sec.to.id + "<br/>" + formatDate(myDate, "dd/mm hh:nn") + "</td></tr>";
			}
			str+="</table>";
			if (sec.polyline) {
				sec.polyline.bindPopup(str);
				journey.map_polylines.push(sec.polyline);
			}

			/* AFFICHAGE DU MARQUEUR DE DEPART */
			if ( (j==0) && (sec.from) ){
				coord=eval("sec.from."+sec.from.embedded_type+".coord");
				sec.from.marker=L.marker([coord.lat, coord.lon], {draggable:'true'}).addTo(map);
				sec.from.marker.bindPopup("<b>"+sec.from.name+"</b>"+
					"<br />Id: "+sec.from.id+
					"<br />Type: "+sec.from.embedded_type+
					"<br />LatLon: "+coord.lat + ", "+ coord.lon
				);
				sec.from.marker.on('dragend', function(event){
					var marker = event.target;
					var position = marker.getLatLng();
					marker.setLatLng(new L.LatLng(position.lat, position.lng),{draggable:'true'});
					document.getElementById("from_text").value = position.lng + ";"+position.lat;
					document.getElementById("from").value = position.lng + ";"+position.lat;
					document.forms[0].submit();
				});
				map.addLayer(sec.from.marker);
				journey.map_markers.push(sec.from.marker);
			}
			/* AFFICHAGE DU MARQUEUR D'ARRIVEE */
			if (sec.to){
				coord=eval("sec.to."+sec.to.embedded_type+".coord");
				sec.to.marker=L.marker([coord.lat, coord.lon], {draggable:'true'}).addTo(map);
				sec.to.marker.bindPopup("<b>"+sec.to.name+"</b>"+
					"<br />Id: "+sec.to.id+
					"<br />Type: "+sec.to.embedded_type+
					"<br />LatLon: "+coord.lat + ", "+ coord.lon
				);
				sec.to.marker.on('dragend', function(event){
					var marker = event.target;
					var position = marker.getLatLng();
					marker.setLatLng(new L.LatLng(position.lat, position.lng),{draggable:'true'});
					document.getElementById("to_text").value = position.lng + ";"+position.lat;
					document.getElementById("to").value = position.lng + ";"+position.lat;
					document.forms[0].submit();
				});
				map.addLayer(sec.to.marker);
				journey.map_markers.push(sec.to.marker);
			}
			/* AFFICHAGE DES MARQUEURS INTERMEDIAIRES */
			if (sec.stop_date_times){
				for (sdt_idx in sec.stop_date_times){
					sdt=sec.stop_date_times[sdt_idx];
					sdt.marker=L.marker([sdt.stop_point.coord.lat, sdt.stop_point.coord.lon]).addTo(map);
					var myDate = IsoToJsDate(sdt.arrival_date_time);
					sdt.marker.bindPopup("<b>"+sdt.stop_point.name+"</b>"+
						"<br />Id: "+sdt.stop_point.id+
						"<br />ArrivalDateTime: "+ formatDate(myDate, "dd/mm hh:nn")+
						"<br />LatLon: "+sdt.stop_point.coord.lat + ", "+ sdt.stop_point.coord.lon
					);
					map.addLayer(sdt.marker);
					journey.map_markers.push(sdt.marker);
				}
			}

		}
	}
	if (newBounds) {map.fitBounds(newBounds)};
}

function format_date(sdate, sheure){
	r_date=""
	d= new Date()
	if (sdate==""){
		r_date+= d.getFullYear()
		if (d.getMonth()<8) { r_date+= "0"}
		r_date+= (d.getMonth()+1)
		r_date+= d.getDate()
	} else {
		a=sdate.split('/');
		r_date=a[2]+a[1]+a[0];
	}
	r_heure=""
	if (sheure==""){
		h=d.getHours();
		m=d.getMinutes();
		r_heure+= (h<10)?"0"+h:h;
		r_heure+= (m<10)?"0"+m:m;
		r_heure+= "00";
	} else {
		h=sheure.split('h');
		r_heure= h[0]+h[1]+"00";
	}
	return r_date+"T"+r_heure
}


function add_forbidden_uri(object_id){
	document.getElementById("forbidden_uris").value=document.getElementById("forbidden_uris").value + "§"+object_id;
	document.forms[0].submit();
}

function onMapClick(e) {
	popup
		.setLatLng(e.latlng)
		.setContent("LatLon : " + e.latlng.lat + ", "+e.latlng.lng + "<br/>" +
		 "<a href='javascript:void(0)' onClick='javascript:document.getElementById(\"from_text\").value=\""+e.latlng.lng + ";"+e.latlng.lat+"\";document.getElementById(\"from\").value=\""+e.latlng.lng + ";"+e.latlng.lat+"\";document.forms[0].submit();'>Partir d'ici</a><br>" +
		 "<a href='javascript:void(0)' onClick='javascript:document.getElementById(\"to_text\").value=\""+e.latlng.lng + ";"+e.latlng.lat+"\";document.getElementById(\"to\").value=\""+e.latlng.lng + ";"+e.latlng.lat+"\";document.forms[0].submit();'>Arriver ici</a>"
		)
		.openOn(map);
}

function journey_onLoad() {
	menu.show_menu("menu_div");
	t=extractUrlParams();

	init_date();
	document.getElementById("from").value = (t["from"])?t["from"]:"";
	document.getElementById("from_text").value = (t["from_text"])?t["from_text"]:"";
	document.getElementById("to").value = (t["to"])?t["to"]:"";
	document.getElementById("to_text").value = (t["to_text"])?t["to_text"]:"";
	document.getElementById("max_duration_to_pt").value = (t["max_duration_to_pt"])?t["max_duration_to_pt"]:"";
	
	document.getElementById("traveler_type").value = (t["traveler_type"])?t["traveler_type"]:"";
	
	if (t["debug"]=="on"){document.getElementById("debug").checked="true";}
	if (t["date"]) { document.getElementById("date").value=decodeURIComponent(t["date"]);}
	if (t["time"]) { document.getElementById("time").value=decodeURIComponent(t["time"]);}
	if (t["min_nb_journeys"]){
		document.getElementById("min_nb_journeys").value =parseInt(t["min_nb_journeys"]);
	}
	if (t["data_freshness"]){
		document.getElementById("data_freshness").value=t["data_freshness"];
	}
	if (t["first_section_mode"]){
		if ( Object.prototype.toString.call( t["first_section_mode"] ) === '[object Array]' ){
			journey.first_section_mode_list=t["first_section_mode"];
		} else {
			journey.first_section_mode_list=Array();
			journey.first_section_mode_list.push(t["first_section_mode"]);
		}
		for (i = 0; i < journey.first_section_mode_list.length; i++){
			var mode = journey.first_section_mode_list[i];
			if (mode=="walking") {document.getElementById("first_section_mode_walking").checked=true;}
			if (mode=="bike") {document.getElementById("first_section_mode_bike").checked=true;}
			if (mode=="bss") {document.getElementById("first_section_mode_bss").checked=true;}
			if (mode=="car") {document.getElementById("first_section_mode_car").checked=true;}
		}
	}
	if (t["last_section_mode"]){
		if ( Object.prototype.toString.call( t["last_section_mode"] ) === '[object Array]' ){
			journey.last_section_mode_list=t["last_section_mode"];
		} else {
			journey.last_section_mode_list=Array();
			journey.last_section_mode_list.push(t["last_section_mode"]);
		}
		for (i = 0; i < journey.last_section_mode_list.length; i++){
			var mode = journey.last_section_mode_list[i];
			if (mode=="walking") {document.getElementById("last_section_mode_walking").checked=true;}
			if (mode=="bike") {document.getElementById("last_section_mode_bike").checked=true;}
			if (mode=="bss") {document.getElementById("last_section_mode_bss").checked=true;}
			if (mode=="car") {document.getElementById("last_section_mode_car").checked=true;}
		}
	}
	if (t["forbidden_uris"]) {
		document.getElementById("forbidden_uris").value=decodeURIComponent(t["forbidden_uris"]);
		journey.forbidden_uris_list=t["forbidden_uris"].split("§");
	}
	if (t["datetime_represents"]) {
		//document.getElementById("forbidden_uris").value=decodeURIComponent(t["forbidden_uris"]);
		journey.datetime_represents=t["datetime_represents"];
		if (t["datetime_represents"]=="departure") {document.getElementById("datetime_represents_d").checked=true;}
		if (t["datetime_represents"]=="arrival") {document.getElementById("datetime_represents_a").checked=true;}
	}

	document.getElementById("custom_scenario").value = (t["custom_scenario"])?t["custom_scenario"]:"";


	map = L.map('map-canvas').setView([48.837212, 2.413], 8);
	// add an OpenStreetMap tile layer
	L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
		attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
	}).addTo(map);
	map.on('click', onMapClick);

	shortcut.add("F9",function() {
		search();
	},{
		'type':'keydown',
		'propagate':true,
		'target':document
	});

	if (document.getElementById("from").value!="" && document.getElementById("to").value!="") {getItinerary();}
}


function show_depart_list(){
	select = document.getElementById('idepart_list');
	while (select.options.length >0)
		select.options.remove(0);
	for (var i in journey.from_list){
		var option = document.createElement("option");
		option.text = journey.from_list[i].name;
		option.value = journey.from_list[i].id;
		select.add(option);
	}
}
	
function show_arrivee_list(){
	select = document.getElementById('iarrivee_list');
	while (select.options.length >0)
		select.options.remove(0);
	for (var i in journey.to_list){
		var option = document.createElement("option");
		option.text = journey.to_list[i].name;
		option.value = journey.to_list[i].id;
		select.add(option);
	}
}

function change_search(){
	select=document.getElementById("idepart_list");
	from=select.options[select.selectedIndex].value;
	journey.from.name=select.options[select.selectedIndex].text;
	journey.from.id=select.options[select.selectedIndex].value;
	select=document.getElementById("iarrivee_list");
	to=select.options[select.selectedIndex].value;
	journey.to.name=select.options[select.selectedIndex].text;
	journey.to.id=select.options[select.selectedIndex].value;
	journey.get_journey(print_journeylist);
}

function init_date(sdate, sheure){
	r_date=""
	d= new Date()
	if (!sdate || sdate==""){
		if (d.getDate()<10) { r_date+= "0"}
		r_date+= d.getDate()+"/";
		if (d.getMonth()<9) { r_date+= "0"}
		r_date+= (d.getMonth()+1)+"/";
		r_date+= d.getFullYear()
	} else {r_date=sdate;}
	document.getElementById("date").value=r_date;

	r_heure=""
	if (!sheure || sheure==""){
		h=d.getHours();
		m=d.getMinutes();
		r_heure+= (h<10)?"0"+h:h;
		r_heure+= "h";
		r_heure+= (m<10)?"0"+m:m;
		//r_heure+= "00";
	} else {r_heure=sheure;}
	document.getElementById("time").value=r_heure;
}

function getItinerary(){
	//on vérifie si c'est une coordonnée dans le FROM
	clearMap();
	url="coverage/"+document.getElementById("coverage").value+"/journeys?debug="+document.getElementById("debug").checked+
		"&from="+document.getElementById("from").value+"&to="+document.getElementById("to").value+
		"&datetime="+natural_str_to_iso(document.getElementById("date").value,document.getElementById("time").value);
	url+="&min_nb_journeys="+document.getElementById("min_nb_journeys").value;
	if (t["datetime_represents"]) {
		url+="&datetime_represents="+t["datetime_represents"];
	}
	if (t["traveler_type"]) {
		url+="&traveler_type="+t["traveler_type"];
	}	
	if (document.getElementById("max_duration_to_pt").value) {
		url+="&max_duration_to_pt="+parseInt(document.getElementById("max_duration_to_pt").value)*60;
	} 
	if (journey.first_section_mode_list) {
		for (i = 0; i < journey.first_section_mode_list.length; i++){
			var mode = journey.first_section_mode_list[i];
			url+="&first_section_mode[]="+mode;
		}
	}
	if (journey.last_section_mode_list) {
		for (i = 0; i < journey.last_section_mode_list.length; i++){
			var mode = journey.last_section_mode_list[i];
			url+="&last_section_mode[]="+mode;
		}
	}
	//ajout des forbidden_uris
	for (i = 0; i < journey.forbidden_uris_list.length; i++){
		var forbidden_uri = journey.forbidden_uris_list[i];
		url+="&forbidden_uris[]="+forbidden_uri;
	}

    custom_scenario = t["custom_scenario"]
    if (custom_scenario) {
        url+="&_override_scenario="+custom_scenario
    }
	
    data_freshness = document.getElementById("data_freshness").value
    if (data_freshness) {
        url += "&data_freshness=" + data_freshness
    }
	
	callNavitia(document.getElementById("ws_name").value, url, function(response){
		journey.journey_list=response.journeys;
		if (response.message) {
            journey.journey_error = {
                'id' : '(aucun id navitia)', 
                'message' : response.message
            };
        } else {
            journey.journey_error = response.error;
        }
		journey.journey_url=response.url;
		getJourneyListHtml();
	});
}
	
function submit_monday_search(){
	d= new Date();
	while (d.getDay()!=1) {d.setDate(d.getDate() + 1);}
	r_date=""
	if (d.getDate()<10) { r_date+= "0"}
	r_date+= d.getDate()+"/";
	if (d.getMonth()<9) { r_date+= "0"}
	r_date+= (d.getMonth()+1)+"/";
	r_date+= d.getFullYear()
	document.getElementById("idate").value=r_date;

	document.getElementById("iheure").value="09h00";

	document.forms[0].submit();
}

function Journey(){
	this.first_section_mode_list = "", //utilisé pour le chargement des paramètres
	this.last_section_mode_list = "",//utilisé pour le chargement des paramètres
	this.forbidden_uris_list = [],
	this.journey_list = [],
	this.journey_error = false,
	this.journey_url = "",
	this.map_markers = [],
	this.map_polylines = []
};

var selected = null;
var map;
var popup = L.popup();
var journey = new Journey();

