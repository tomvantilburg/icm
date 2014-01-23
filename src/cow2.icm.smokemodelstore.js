icm.SmokeModelStore = function(userid){
    this.wpsurl = '/service/argoss/cgi-bin/pywps.cgi';
    this.auth =  'Basic ' + 'Z2VvZGFuOjh4Q2ptOVdqSg==';
    this.userid = userid || 'geodan';
    this._models = [];
};

icm.SmokeModelStore.prototype._request = function(options){
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

icm.SmokeModelStore.prototype._processdata = function(document){
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

icm.SmokeModelStore.prototype._getuserinfo = function(){
    var userid = this.userid;
    var self = this;
    var options = {
        identifier: 'getuserinfo',
        datainputs: {
            userid: userid
        }
    };
    var request = this._request(options);
    return new Promise(function(resolve, reject){
        request.on('load', function(d){
            var outputs = self._processdata(d);
            var archiveid = outputs.archiveid.split(',');
            var processid = outputs.processid.split(',');
            var titlecase = outputs.titlecase.split(',');
            console.log(outputs);
            var models = [];
            for (var i=0;i<processid.length;i++){
                if (archiveid[i] == '0' || archiveid[i] == '2'){
                    var model = new icm.SmokeModel(processid[i], titlecase[i]);
                    models.push(model);
                }
            }
            self._models = models;
            resolve(models);
        });
    });
};

icm.SmokeModelStore.prototype.models = function(){
    return this._models;
};

icm.SmokeModelStore.prototype.init = function(){
    return this._getuserinfo();
};
