var markerGroup = new L.LayerGroup();
var boatIcon = new L.Icon({
			iconUrl: './images/marinetraffic/marker.png',
			shadowUrl: null,
			iconSize: new L.Point(19, 26),
			iconAnchor: new L.Point(9, 13)
		});
var loadAis = function() {
    var map = leaflmap._map; //FIXME
    var url = "/service/marinetraffic/map/getjson/sw_x:3.6/sw_y:52.28/ne_x:6.02/ne_y:53.06/zoom:10/fleet:/station:0/id:null";
    //var url = "/service/marinetraffic/api/exportvessels/cc503f48eb2c8e49549cc56de3c7059c4b042931/timespan:4/protocol:json"; 
    d3.json(url,
        function(data) {
            if (data) {
                markerGroup.clearLayers(); // comment this line to see the traject of boat just for fun
                for (var i = 0;i < data.length; i++){
                //$.each(data, function(i,item){
                    var item = data[i];
                    var lat = item[0];
                    var lng = item[1];
                    var marker = new L.Marker(new L.LatLng(lat,lng), {icon:boatIcon});
                    marker.options.course = item[4];
                    marker.setIconAngle(marker.options.course);
                    marker.options.mmsi = item[2];
                    marker.options.status = item[6];
                    marker.on('click', function(e) {
                        var popup = new L.Popup({'minWidth': 350});
                        popup.setLatLng(e.target._latlng);
                        /*
                        d3$.get("proxy.php",
                            {
                                url: "/service/marinetraffic/ais/shipinfo.aspx?mmsi="+ e.target.options.mmsi +"&lat="+ e.target._latlng.lat +"&lon="+ e.target._latlng.lng,
                                mode: "native"
                            },
                            function(data) {
                                // fix wrong url for the image
                                data = data.replace('/service/marinetraffic/ais/http://photos','http://photos');
                                popup.setContent(data);
                                map.openPopup(popup);
                            });
                        */
                            
                    });
                    
                    markerGroup.addLayer(marker);
                }
                map.addLayer(markerGroup);
            }
        },
        function() { alert("error loading data"); 
    });
};
