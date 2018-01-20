import axios from 'axios';
import leaflet from 'leaflet';
import * as turf from '@turf/turf';

var leafletDraw = require('leaflet-draw');
var selectArea = require('leaflet-area-select');
var topojson = require('topojson');
require('leaflet-choropleth');

// these only being added to allow for choropleth extension (delete eventually...)
var chroma = require('chroma-js');
var _ = require('lodash/object');


const SELECTED_COLOR = "#444";
const NORMAL_COLOR = "#000";
const BUFFER_RADIUS = 0.5;

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

const topoLayer = new L.TopoJSON();
var geojsonLayer = new L.GeoJSON();

var choro;

var map = L.map('map').setView([32.7157, -117.11], 12);

map.selectArea.enable();
map.on('areaselected', (e) => {
    alert(e.bounds.toBBoxString());
});


L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw', {
    maxZoom: 18,
    attribution: '',
    id: 'mapbox.streets'
}).addTo(map);


//axios.get('data/sd_cbgs_with_sld_clean2.geojson')
axios.get('data/sd_cbgs_vmt.geojson')
    .then((resp) => {
        console.log(resp.data);

        /*
        geojsonLayer.addData(resp.data);

        geojsonLayer.setStyle({
            color: 'black', 
            opacity: 0.5, 
            weight: 1.5, 
            fill: '#333',
            fillOpacity: 0.5
        });

        geojsonLayer.addTo(map); 

        */
        geojsonLayer = L.choropleth(resp.data, {
            valueProperty: 'vmt_hh_type1_vmt',
            scale: ['white', 'red'],
            steps: 5, 
            mode: 'q',
            style: {
                color: NORMAL_COLOR,
                opacity: 1.0,
                weight: 0.0,
                fillOpacity: 0.4
            }
        }).addTo(map);
    });

var drawnItems = new L.FeatureGroup();
map.addLayer(drawnItems);

var drawControlOptions = {
    edit: { 
        featureGroup: drawnItems 
    },
    draw: { 
        polygon: {
            shapeOptions: { 
                color: 'red' 
            } 
        }
    }
};

var drawControl = new L.Control.Draw(drawControlOptions);
map.addControl(drawControl);

map.on(L.Draw.Event.DELETESTOP, (e) => {
    geojsonLayer.setStyle((f) => {

        f.properties._selected = false; // BAD!!! SIDE EFFECT!!!

        return {
            color: NORMAL_COLOR,
            weight: 0.0
        };
    });
});

// most of the work is here...selecting the CBGs
map.on(L.Draw.Event.CREATED, (e) => {
    var layer = e.layer;
    var coords = layer._latlngs.map((item) => { return [item.lng, item.lat]; });
    var buffer = turf.buffer(turf.lineString(coords), BUFFER_RADIUS, { units: 'miles' });

    var l = new L.geoJson(buffer);
    var cbgs = geojsonLayer.toGeoJSON();
    var hits = 0;

    var sums = { vmt_hh_type1_vmt: 0.0 };
    //var sums = {
    //    D5br: 0.0,
    //    D4d: 0.0,
    //    hh_ty1_: 0.0, //,hh_type1_h: 0.0,
    //    D1c: 0.0,
    //    D1C5_R1: 0.0, //D1c5_Ret10: 0.0,
    //    D1C8Hl1: 0.0, //,D1c8_Hlth10: 0.0,
    //    AC_LAND: 0.0,
    //    TOTPOP1: 0.0,
    //    D1C5_E1: 0.0, //,D1c5_Ent10: 0.0,
    //    D3b: 0.0
    //};

    drawnItems.addLayer(l);

    cbgs.features.forEach((f) => {

        // turf.insersect does not work for multipolygons...
        function intersects(a, b) {

            if (b.geometry.type === 'Polygon') {
                return turf.intersect(a, b);
            } else if (b.geometry.type === 'MultiPolygon') {
                var polys_coords = b.geometry.coordinates;

                for (var i = 0; i < polys_coords.length; i++) {
                    var polygon = {
                        geometry: {
                            type: 'Polygon', 
                            coordinates: polys_coords[i]
                        }
                    };

                    if (turf.intersect(a, polygon)) {
                        return true;
                    }
                }
            }

            return false;
        }
        
        if (intersects(buffer, f)) {
            f.properties._selected = true;
            var keys = Object.keys(sums);

            keys.forEach((k) => {
                sums[k] += f.properties[k];
            });
            hits++;
        }
    });

    // set style of selected CBGs
    geojsonLayer.setStyle((f) => {
        return {
            color: f.properties._selected ? SELECTED_COLOR : NORMAL_COLOR,
            weight: f.properties._selected ? 2. : 0.0
        };
    });

    var div = document.querySelector("#readout");

    div.innerHTML = `
        <h4> Total CBGs selected: ${hits} </h4>
        <h4> Average VMT: ${(sums['vmt_hh_type1_vmt'] / hits).toFixed(2)} </h4>
    `;
    /*
    // finally, output the aggregated metric values...
    var keys = Object.keys(sums);
    var aggregated = keys.reduce((result, k) => {
        result[k] = sums[k] / hits;
        return result;
    }, {});

    aggregated.PopDens = sums.TOTPOP1 / sums.AC_LAND;


    // very hacky way of populating the metric outputs
    var div = document.querySelector("#readout");

    div.innerHTML = `
        <h4> High-quality transit, walking, and bicycling opportunities </h4>
        <ul>
            <li> Transit job accessibility: ${aggregated.D5br.toFixed(1)} </li>
            <li> Transit service coverage: ${aggregated.D4d.toFixed(1)} </li>
        </ul>
        <h4> Mixed income housing near transit </h4>
        <ul>
            <li> Housing unaffordability: ${aggregated.hh_ty1_.toFixed(1)} </li>
            <li> Income diversity: NA </li>
        </ul>
        <h4> Transit-accessible economic opportunities </h4>
        <ul>
            <li> Jobs density: ${aggregated.D1c.toFixed(1)} </li>
            <li> Retail jobs density: ${aggregated.D1C5_R1.toFixed(1)} </li>
        </ul>
        <h4> Accessible social & government services </h4>  
        <ul>
            <li> Ridership balance: NA </li>
            <li> Health care opportunities: ${aggregated.D1C8Hl1.toFixed(1)} </li>
        </ul>
        <h4> Vibrant & accessible community, cultural & recreational opportunities </h4>
        <ul>
            <li> Population density: ${aggregated.PopDens.toFixed(1)} </li>
            <li> Access to culture and arts: ${aggregated.D1C5_E1.toFixed(1)} </li>
        </ul>
        <h4> Healthy, safe & walkable transit corridor neighborhoods </h4>
        <ul>
            <li> Pedestrian environment: ${aggregated.D3b.toFixed(1)} </li>
            <li> Pedestrian collisions per 100k pedestrians: NA </li>
        </ul>`;
    */
});



var selection = document.getElementById("selected-property");

selection.onchange = () => {
    // this is an incredibly crappy hack to allow for dynamic changing of choropleth properties
    // TODO: extend library to allow this...

    var prop = {
        vmt: 'vmt_hh_type1_vmt',
        population: 'TOTPOP1',
        land: 'AC_LAND'
    }[selection.value];

    var opts = {
        valueProperty: prop,
        scale: ['white', 'red'],
        steps: 5, 
        mode: 'q',
        style: {
            color: NORMAL_COLOR,
            weight: 0.0,
            opacity: 1.0,
            fillOpacity: 0.4
        }
    };
    var userStyle = opts.style;

    var chorogeojson = geojsonLayer.toGeoJSON();

    var values = chorogeojson.features.map(
        (typeof opts.valueProperty === 'function') ?
            opts.valueProperty :
            function (item) {
                return item.properties[opts.valueProperty]
            }
    );

    var limits = chroma.limits(values, opts.mode, opts.steps - 1);

    var colors = (opts.colors && opts.colors.length === limits.length ?
                      opts.colors :
                      chroma.scale(opts.scale).colors(limits.length));

    geojsonLayer.setStyle((f) => {
        var style = {};
        var featureValue;
        
        if (typeof opts.valueProperty === 'function') {
            featureValue = opts.valueProperty(f);
        } else {
            featureValue = f.properties[opts.valueProperty];
        }

        style.color = f.properties._selected ? SELECTED_COLOR : NORMAL_COLOR;
        style.weight = f.properties._selected ? 2. : 0.0;

        if (!isNaN(featureValue)) {
            for (var i = 0; i < limits.length; i++) {
                if (featureValue <= limits[i]) {
                    style.fillColor = colors[i];
                    break;
                }
            }
        }

        return _.defaults(style, userStyle);
    });
};
