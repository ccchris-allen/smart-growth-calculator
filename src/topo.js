var topojson = require('topojson');

L.TopoJSON = L.GeoJSON.extend({
    addData: function (jsonData) {
        if (jsonData.type === 'Topology') {
            for (key in jsonData.objects) {
                let geojson = topojson.feature(jsonData, jsonData.objects[key]);
                L.GeoJSON.prototype.addData.call(this, geojson);
                return;
            }
        } else {
            L.GeoJSON.prototype.addData.call(this, jsonData);
        }
    }
});
