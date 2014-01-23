var tmp; //DEBUG
icm.SmokeModelSubmit = function(form){
    var inputs = {};
    form.selectAll('input').each(function(d){
        //console.log(d3.select(this).attr('value'));
        var key = d3.select(this).attr('name');
        var value = this.value;//d3.select(this).attr('value');
        inputs[key] = value;
    });
    //console.log(form.selectAll('input'));
    d3.select('#centerbox').style('display','none');
    var model = new icm.SmokeRun(inputs);
    model.startRun();
};

icm.NewModelUi = function(item){
    var feature = new L.geoJson(item.data('feature'));
    var centroid = feature.getBounds().getCenter();
    //var lat = Math.round(centroid.lat*100)/100;
    //var lon = Math.round(centroid.lng*100)/100;
    var lat = centroid.lat;
    var lon = centroid.lng;
    d3.select('#sidebarleft').style('left','-350px');
    var formHtml = ' '+ 
         'Name <input name="titlecase" label="titlecase"><br>' +
         //'Coords: <span>' + lat + ',' + lon + '</span><br>' +
         '<input type="hidden" name="xcrd" value='+lon+'>' +
         '<input type="hidden" name="ycrd" value='+lat+'>' + 
         //'Start time<input name="begtime" label="Start time" value="2014-1-17_12:00:00"><br>' +
         //'End time<input name="endtime" label="End time" value="2014-1-17_17:00:00"><br>' +
         'Species<input name="species" label="Species" value="NOX"><br>' +
         'Emission<input name="emission" label="Emission" value="2.0"><br>' +
         'Temperature<input name="temperature" label="Temperature" value="293"><br>' +
    '';
    var box = d3.select('#centerbox').style('display', 'block').html('');
    box.append('b').html('New model');
    var form = box.append('form').on('Submit', function(){
            console.log('submit');
            icm.SmokeModelSubmit();
    }).html(formHtml);
    
    form.append('div').html('Start').attr('type','submit').on('click',function(){
       icm.SmokeModelSubmit(form);
    });
    form.append('div').html('Cancel').on('click',function(){
       box.style('display', 'none');
    });
};


icm.SmokeModelUi = function(selection){
   
    var modelstore = new icm.SmokeModelStore('argoss');
    modelstore.init().then(function(foo){
        var items = selection.selectAll('.model').data(modelstore.models(), function(d){
            return d.id;
        });
        var newitem = items.enter().append('div').classed('model',true);
        var title = newitem.append('div').html(function(d){
            return d.name;
        });
        newitem.append('span').classed('time',true).html('00:00:00');
        var controls = newitem.append('span').classed('controls',true);
        newitem.append('div').classed('layers',true);
        newitem.append('div').classed('slider',true).style('margin-bottom','20px').style('width','70%');
        
        controls.append('span').append('img').attr('src','./css/img/zoom_icon_16.png').on('click',function(d){
                d.getGrid().then(function(d){
                    var feat = new L.geoJson(d);
                    var map = leaflmap._map;
                    map.fitBounds(feat.getBounds());
                    console.log(foo);
                });
        });
        controls.append('span').append('img').attr('src','./css/img/info_icon_16.png').on('click',function(d){
                if (newitem.select('.info').style('display') == 'block'){
                    newitem.select('.info').transition().style('display','none');
                }
                else{
                    newitem.select('.info').transition().style('display','block');
                }
        });
        newitem.append('div').classed('info',true).style('display','none');
        
        newitem.each(function(d){
            var self = this;
            d._getprocessinfo().then(function(foo){
                d3.select(self).select('.info').html(function(d){
                    var html = '<small>';
                    _.each(d._processinfo,function(d,i){
                            html = html + i + ':<i>' + d + '</i><br>';
                    });
                    html = html + '</small>';
                    return html;
                });
            });
            d._fetchlayers().then(function(foo){
                var map = leaflmap._map;
                var layergroup = new L.LayerGroup([]).addTo(map);
                var records = _(d.layers()).filter(function(d){return d.type == 'h';});
                records = _.sortBy(records, function(d){return d.name;});
                var colorscaleNOX = d3.scale.linear()
                    .domain([1, 20, 100])
                    .range(["yellow", "orange", "red"]);
                colorscale = ["yellow", "orange", "red"];
                d3.select(self).select('.slider')
                  .call(d3.slider().axis(
                      false
                      //d3.svg.axis().orient('bottom').ticks(d3.time.minutes,10)
                  ).min(0).max(records.length).step(1)
                  .on('slide',function(evt, val){
                    var url = records[val].url;
                    layergroup.clearLayers();
                    d3.json(url,function(data){
                        var grouped = _.groupBy(data.features, function(d){return d.properties.conc;});
                        var i = 0;
                        var feats = []; 
                        _.each(grouped, function(obj){
                            _.each(obj, function(d){ 
                                d.properties.idx = i;
                                feats.push(d);
                            });
                            i++;
                        });
                        data.features = feats;
                        var layer = new L.geoJson(data, {
                            style: function (feature) {
                                var idx = feature.properties.idx;
                                return {color: colorscale[idx]};
                            }
                        });
                        layergroup.addLayer(layer);
                    });
                    d3.select(self).select('.time').html(new Date(records[val].date).toLocaleTimeString());
                }));
                //var windvelden = d.layers();
                //var items = d3.select(self).select('.layers').selectAll('.layer').data(windvelden, function(d){return d.name});
                //var newitem = items.enter().append('div').classed('layer',true).html(function(d){
                //    return d.name;
                //});
                
            });
        });
        
    });
    //END OF MODEL BLOCK
    
}
