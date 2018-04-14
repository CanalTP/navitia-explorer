$(document).ready(function() {
    menu.show_menu("menu_div");

    t=extractUrlParams();
    callTyrJS(t["ws_name"], "jobs/"+t["coverage"], display_tyr_job_list);
} );


function display_tyr_job_list(response){
    var to_display = [];
    for (var i in response.jobs){
        var job = response.jobs[i];
        if ((job.state == "pending") && (job.data_sets.length == 0) ) {continue;}
        for (var j in job.data_sets) {
            var ds = job.data_sets[j];
            var obj = {};
            obj.id = job.id;
            obj.name = job.instance.name;
            obj.created_at = moment.tz(job.created_at, "Africa/Abidjan").tz("Europe/Paris").format("YYYY-MM-DD HH:mm:ss");
            obj.updated_at = moment.tz(job.updated_at, "Africa/Abidjan").tz("Europe/Paris").format("YYYY-MM-DD HH:mm:ss");
            obj.state = job.state;
            obj.data_family = ds.family_type;
            obj.data_type = ds.type;
            var data_path = ds.name.split('/');
            obj.data_name = data_path[data_path.length -2] + '/' + data_path[data_path.length -1];
            to_display.push(obj);
        }
    }
    table_tyr_job_list = $('#table_tyr_job_list').DataTable( {
        data: to_display,
        ordering: false,
        "columns": [
            {title: "id", "data": "id"},
            // {title: "instance", "data": "name"},
            {title: "created_at", "data": "created_at"},
            {title: "updated_at", "data": "updated_at"},
            {title: "state", "data": "state"},
            {title: "family", "data": "data_family"},
            {title: "type", "data": "data_type"},
            {title: "name", "data": "data_name"},
        ]
    } );
}
