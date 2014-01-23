icm.SmokeRun = function(inputs){
    this.wpsurl = '/service/argoss/cgi-bin/pywps.cgi';
    this.geoserverurl = '/service/argoss/geoserver';
    this.auth =  'Basic ' + 'Z2VvZGFuOjh4Q2ptOVdqSg==';
    this.inputs = inputs; 
};

icm.SmokeRun.prototype._request = function(options){
    var identifier = options.identifier;
    var entries = d3.map(options.datainputs).entries();
    var datainputs = [];
    entries.forEach(function(d){
        datainputs.push(d.key + '=' + d.value); 
    });
    datainputs = datainputs.join(';');
    var url = this.wpsurl + '?service=wps&version=1.0.0&request=execute&identifier=' + identifier + '&datainputs=[' + datainputs + ']';
    var request = d3.xml(url);
    request.header('Authorization', this.auth);
    return request.get();
};

icm.SmokeRun.prototype._processdata = function(document){
    var doc = d3.select(document);
    var status = doc.select('Status').attr('creationTime');
    var nodes = doc.selectAll('Output');
    var outputs = {};
    nodes.each(function(d){
        var identifier = d3.select(this).select('Identifier').html();
        var data = d3.select(this).select('LiteralData').html();
        outputs[identifier] = data;
    });
    return outputs;
};
	
icm.SmokeRun.prototype._startcallpuff = function(){
    var self = this;
    var now = new Date();
    var later1 = new Date();
    var later2 = later1.setHours(later1.getHours()+5);
    var later = new Date(later2); //TODO, ouch..
    var runname = this.inputs.titlecase;
    var titlecase = runname ||  "Run_" + now.getTime().toString();
    var epsg=32631;
    var begYear=now.getFullYear();
    var begMonth=now.getMonth()+1;
    var begDay=now.getDate();
    var begtime=now.getHours() + ":" + now.getMinutes();
    var endYear=later.getFullYear();
    var endMonth=later.getMonth()+1;
    var endDay=later.getDate();
    var endtime=later.getHours() + ":" + later.getMinutes();
    var x = this.inputs.xcrd;
    var y = this.inputs.ycrd;
    var point = new proj4.Point( parseFloat(x), parseFloat(y) ); 
    var fromProjection = "+proj=longlat +ellps=WGS84 +datum=WGS84 +no_defs";//new proj4.Proj('WGS84');    
    var toProjection = "+proj=utm +zone=31 +ellps=WGS84 +datum=WGS84 +units=m +no_defs"; //new proj4.Proj('EPSG:32631');
    var pointnew = proj4(toProjection,[x,y]);
    //var pointnew = proj4.transform(fromProjection, toProjection, point);
    x = pointnew[0] / 1000;
    y = pointnew[1] /1000;
    begDate = ''+begYear+'-'+begMonth+'-'+begDay+'_'+begtime+':00';
    endDate = ''+endYear+'-'+endMonth+'-'+endDay+'_'+endtime+':00';
    var species= this.inputs.species;
    var emission= this.inputs.emission;
    var temperature=this.inputs.temperature;
    var timesteps=1;
    var surface=1000;
    var stackheight=1;
    var typeoffire='area';
    var typeofleak=1;
    var gridsize=150;
    var options = {
        identifier: 'startcalpuffv5',
        datainputs: {
            userid: 'geodan',
            titlecase: runname,
            epsg: '32631',
            xcrd: x,
            ycrd: y,
            begtime: begDate,
            endtime: endDate,
            species: species,
            emission: emission,
            surface: 1000,
            stackheight: 20,
            timesteps: 1,
            temperature: temperature,
            typeoffire: 'area',
            gridsize: 150,
            validateonly: 'no'
        }
    };
    
    var request = this._request(options);
    request.on('load',function(d){
            var outputs = self._processdata(d);
            console.log(outputs);
            self.processid = outputs.processid;
            var model = new icm.SmokeModel(outputs.processid);
            model._getstatusinfo(outputs.processid);
    });
    return request;
};

icm.SmokeRun.prototype.startRun = function(){
    this._startcallpuff();
};


icm.SmokeModel = function(processid, name){
    this.wpsurl = '/service/argoss/cgi-bin/pywps.cgi';
    this.geoserverurl = '/service/argoss/geoserver';
    this.auth =  'Basic ' + 'Z2VvZGFuOjh4Q2ptOVdqSg==';
    this.processid = processid || 1389954444;
    this.name = name || 'unknown';
    this._layers = [];
    this._processinfo = null;
    this.id = this.processid;
};
icm.SmokeModel.prototype._request = function(options){
    var identifier = options.identifier;
    var entries = d3.map(options.datainputs).entries();
    var datainputs = [];
    entries.forEach(function(d){
        datainputs.push(d.key + '=' + d.value); 
    });
    datainputs = datainputs.join(';');
    var url = this.wpsurl + '?service=wps&version=1.0.0&request=execute&identifier=' + identifier + '&datainputs=[' + datainputs + ']';
    var request = d3.xml(url);
    request.header('Authorization', this.auth);
    return request.get();
};
icm.SmokeModel.prototype._processdata = function(document){
    var doc = d3.select(document);
    var status = doc.select('Status').attr('creationTime');
    var nodes = doc.selectAll('Output');
    var outputs = {};
    nodes.each(function(d){
        var identifier = d3.select(this).select('Identifier').html();
        var data = d3.select(this).select('LiteralData').html();
        outputs[identifier] = data;
    });
    return outputs;
};

icm.SmokeModel.prototype._getprocessinfo = function(){
    var processid = this.processid;
    var self = this;
    var options = {
        identifier: 'getprocessinfo',
        datainputs: {
            processid: processid
        }
    };
    var request = this._request(options);
    return new Promise(function(resolve, reject){
        request.on('load', function(d){
            var outputs = self._processdata(d);
            self._processinfo = outputs;
            resolve();
        });
    });
};

icm.SmokeModel.prototype.getGrid = function(){
    var processid = this.processid;
    var self = this;
    var url = "/service/argoss/geoserver/"+processid+"/ows?service=WFS&version=1.0.0&request=GetFeature&typeName="+self.processid+":grid&srsName=epsg:4326&maxFeatures=10000&outputFormat=json";                  
    
    return new Promise(function(resolve, reject){
        d3.json(url,function(d){
           self._grid = d;
           resolve(d);
        });
    });
};

icm.SmokeModel.prototype._getstatusinfo = function(){
    var processid = this.processid;
    var self = this;
    var options = {
        identifier: 'getstatusinfo',
        datainputs: {
            processid: processid
        }
    };
    var request = this._request(options);
    request.on('load', function(d){
        var outputs = self._processdata(d);
        console.log(outputs);
        if (outputs.status != 'successfully'){
            window.setTimeout(function(){
                self._getstatusinfo(processid);
            },2000);
        }
        if (outputs.status == 'successfully'){
            
            self._getmodelresults(processid);
        }
    });
};

icm.SmokeModel.prototype._fetchlayers = function(){
    var self = this;
    var url = '/service/argoss/geoserver/rest/workspaces/' + this.processid + '/datastores.xml';
    return new Promise(function(resolve, reject){
        d3.xml(url).header('Authorization', self.auth).get().on('load',function(document){
               var doc = d3.select(document);
               var nodes = doc.selectAll('dataStore');
               var layers = [];
               var processid = self.processid;
               nodes.each(function(d){
                       var layer = {};
                       var name = d3.select(this).select('name').html();
                       if (name != 'grid'){
                           var arr = name.split('=')[1].split('_');
                           var date = new Date(arr[0] + ' ' + arr[1].replace('-',':'));
                           var type = arr[2];
                           var url = "/service/argoss/geoserver/"+processid+"/ows?service=WFS&version=1.0.0&request=GetFeature&typeName="+self.processid+":"+name+"&srsName=EPSG:4326&maxFeatures=10000&outputFormat=json";
                           layer.name = name; 
                           layer.type = type;
                           layer.date = date;
                           layer.url = url;
                           layers.push(layer);
                       }
               });
               self._layers = layers;
               resolve();
        });
    });
};

icm.SmokeModel.prototype.layers = function(){
    return this._layers;   
};
