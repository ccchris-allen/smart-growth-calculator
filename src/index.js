import axios from 'axios';
import leaflet from 'leaflet';
import * as turf from '@turf/turf';
import * as choropleth from './choro.js';

//require('./choro.js');


var leafletDraw = require('leaflet-draw');
var selectArea = require('leaflet-area-select');
//require('leaflet-choropleth');

// these only being added to allow for choropleth extension (delete eventually...)
var chroma = require('chroma-js');
var _ = require('lodash/object');


const SELECTED_COLOR = "#444";
const NORMAL_COLOR = "#000";
const BUFFER_RADIUS = 0.5; // units = miles

var geojsonLayer;
var stationsLayer;

var map = L.map('map').setView([32.7157, -117.11], 12);

L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw', {
    maxZoom: 18,
    attribution: '',
    id: 'mapbox.streets'
}).addTo(map);


axios.get('data/sd_cbgs_vmt_and_pedcol.geojson')
    .then((resp) => {

        geojsonLayer = new choropleth(resp.data, {
            property: 'vmt_hh_type1_vmt',
            style: (f) => {
                return {
                    color: f.properties._selected ? SELECTED_COLOR : NORMAL_COLOR,
                    weight: f.properties._selected ? 2. : 0.0,
                    opacity: 1.0,
                    fillOpacity: 0.4
                };
            },
            onEachFeature: (f, l) => {
                var msg = `
                    SumPed: ${f.properties["pedcol-data-only_SumAllPed"]}<br>
                    Walk: ${f.properties["pedcol-data-only_JTW_WALK"]}<br>
                    TotalTrips: ${f.properties["pedcol-data-only_JTW_TOTAL"]}<br>
                    Pop: ${f.properties["TOTPOP1"]}`;
                l.bindPopup(msg);
            }
        }).addTo(map);

        // AVOID CALLBACK HELL ?
        axios.get('data/sd-rail-stations-buffered.geojson')
            .then((resp2) => {
                stationsLayer = L.geoJSON(resp2.data, {
                    style: (f) => {
                        var style = {
                            weight: 0.0,
                            fillOpacity: .5
                        };

                        if (f.properties.FINAL_TYPO === 'INTEGRATED') {
                            style.fillColor = 'green';
                        } else if (f.properties.FINAL_TYPO === 'TRANSITIONING') {
                            style.fillColor = 'yellow';
                        } else {
                            style.fillColor = 'red';
                        }

                        return style;
                    }
                }).addTo(map);

                L.control.layers([], {
                    "Stations": stationsLayer
                }).addTo(map);
            });

    });


$('#select-property input:radio').change(() => {
    var checked = $('#select-property input:radio:checked')[0];

    var prop = {
        vmt: 'vmt_hh_type1_vmt',
        pedcol: (item) => {
            var total_collisions = item.properties["pedcol-data-only_SumAllPed"];
            var walk_pct = item.properties["pedcol-data-only_JTW_WALK"] / item.properties["pedcol-data-only_JTW_TOTAL"];
            var population = item.properties['TOTPOP1']; 

            var ped_per_100k = 100000 * (total_collisions / population);
            var ped_per_100k_walk = ped_per_100k / walk_pct;
            var ped_per_100k_walk_daily = ped_per_100k_walk / 365.0;

            return ped_per_100k_walk_daily;
        }
    }[checked.id];


    geojsonLayer.setProperty(prop, true); 

});


var drawnItems = new L.FeatureGroup();
map.addLayer(drawnItems);

var drawControlOptions = {
    edit: {
        featureGroup: drawnItems,
        edit: false
    },
    draw: {
        polygon: false,
        circle: true,
        circlemarker: false,
        rectangle: false
    }
};

var drawControl = new L.Control.Draw(drawControlOptions);
map.addControl(drawControl);

map.on(L.Draw.Event.DELETED, (e) => {
    console.log(e);
});

map.on(L.Draw.Event.DELETESTOP, (e) => {
    hits = 0;
    sums = {
        vmt_hh_type1_vmt: 0.0,
        "pedcol-data-only_SumAllPed": 0.0,
        "pedcol-data-only_JTW_TOTAL": 0.0,
        "pedcol-data-only_JTW_WALK": 0.0,
        TOTPOP1: 0,
        pop_ped: 0
    };

    geojsonLayer.setStyle((f) => {

        f.properties._selected = false; // BAD!!! SIDE EFFECT!!!

        return {
            color: NORMAL_COLOR,
            weight: 0.0
        };
    });


    var vmt = document.querySelector("#stat-vmt");
    var pedcol = document.querySelector("#stat-pedcol");
    var cbgs = document.querySelector("#stat-cbgs");

    vmt.innerHTML = "N/A";
    pedcol.innerHTML = "N/A";
    cbgs.innerHTML = "N/A";
});


var hits = 0;
var selections = 0;
var sums = {
    vmt_hh_type1_vmt: 0.0,
    "pedcol-data-only_SumAllPed": 0.0,
    "pedcol-data-only_JTW_TOTAL": 0.0,
    "pedcol-data-only_JTW_WALK": 0.0,
    TOTPOP1: 0,
    pop_ped: 0
};

// most of the work is here...selecting the CBGs
map.on(L.Draw.Event.CREATED, (e) => {

    var buffer;
    var layer = e.layer;

    if (e.layerType === 'marker') {
        var coords = [layer._latlng.lng, layer._latlng.lat];
        buffer = turf.circle(coords, BUFFER_RADIUS, {
            units: 'miles'
        });
    } else if (e.layerType === 'circle') {
        var coords = [layer._latlng.lng, layer._latlng.lat];
        buffer = turf.circle(coords, BUFFER_RADIUS, {
            units: 'miles'
        });
    } else if (e.layerType === 'polyline') {
        var coords = layer._latlngs.map((item) => {
            return [item.lng, item.lat];
        });
        buffer = turf.buffer(turf.lineString(coords), BUFFER_RADIUS, {
            units: 'miles'
        });
    }

    var cbgs = geojsonLayer.toGeoJSON();

    var bufferLayer = new L.geoJson(buffer);
    bufferLayer.bindPopup("Selected Area:");

    drawnItems.addLayer(bufferLayer);

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
                sums[k] = (sums[k] + f.properties[k]) || sums[k];
            });

            hits++;

            function isNumeric(n) {
                return !isNaN(parseFloat(n)) && isFinite(n);
            }

            if (isNumeric(f.properties["pedcol-data-only_SumAllPed"])) {
                sums.pop_ped += f.properties.TOTPOP1;
            }
        }
    });

    // set style of selected CBGs
    geojsonLayer.setStyle((f) => {
        return {
            color: f.properties._selected ? SELECTED_COLOR : NORMAL_COLOR,
            weight: f.properties._selected ? 2. : 0.0
        };
    });

    var vmt = document.querySelector("#stat-vmt");
    var pedcol = document.querySelector("#stat-pedcol");
    var cbgs = document.querySelector("#stat-cbgs");

    function withCommas(x) {
        return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }

    var total_collisions = sums["pedcol-data-only_SumAllPed"];
    var walk_pct = sums["pedcol-data-only_JTW_WALK"] / sums["pedcol-data-only_JTW_TOTAL"];

    var ped_per_100k = 100000 * (total_collisions / sums.pop_ped);
    var ped_per_100k_walk = ped_per_100k / walk_pct;
    var ped_per_100k_walk_daily = ped_per_100k_walk / 365.0;

    vmt.innerHTML = withCommas((sums['vmt_hh_type1_vmt'] / hits).toFixed(0));
    pedcol.innerHTML = ped_per_100k_walk_daily.toFixed(2);
    cbgs.innerHTML = hits;
});


