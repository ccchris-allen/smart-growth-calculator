// import styles (need to do this for webpack to handle style)
import './styles/main.scss';

// axios handles requests
import axios from 'axios';

// mapping and geometry
import leaflet from 'leaflet';
import leafletDraw from 'leaflet-draw';
import selectArea from 'leaflet-area-select';
import * as turf from '@turf/turf';

// our module for drawing choropleth maps
import Choropleth from './choro';

const SELECTED_COLOR = "#444";
const NORMAL_COLOR = "#000";
const BUFFER_RADIUS = 0.5; // units = miles

const GEOJSON_FILES = [
    'data/sd_cbgs_latest_attributes.geojson', 
    'data/sd-rail-stations-buffered.geojson'
];

var geojsonLayer;
var stationsLayer;

var map = L.map('map').setView([32.7157, -117.11], 12);

var basemap_url = 'https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw';

L.tileLayer(basemap_url, {
    maxZoom: 18,
    attribution: '',
    id: 'mapbox.streets'
}).addTo(map);


axios.all(GEOJSON_FILES.map(axios.get))
    .then((resp) => {
        var [resp1, resp2] = resp;

        geojsonLayer = new Choropleth(resp1.data, {
            property: 'vmt_hh_type1_vmt',
            style: (f) => {
                return {
                    color: f.properties._selected ? SELECTED_COLOR : NORMAL_COLOR,
                    weight: f.properties._selected ? 2. : 0.0,
                    opacity: 1.0,
                    fillOpacity: 0.4
                };
            },
            onEachFeature: (f, l) => { }
        }).addTo(map);

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
            },
            onEachFeature: (f, l) => {
                //todo: move this to util file
                function titleCase(s) {
                    return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
                }

                var msg = `
                    <span class="font-weight-bold"> Station: </span> ${f.properties.FULL_NAME || 'None'} <br>
                    <span class="font-weight-bold"> Typology: </span> ${titleCase(f.properties.FINAL_TYPO)}`;
                
                l.bindPopup(msg);
            }
        }).addTo(map);

        L.control.layers([], {
            "Stations": stationsLayer
        }).addTo(map);
    });


$(".dropdown-menu a").click(function () {

    // first, set button text to selected value 
    // (this is a bit of a hack, since bootstrap doesn't really support dropdown)
    $("#btn-label").text($(this).text());

    var prop = {
        vmt: 'vmt_hh_type1_vmt',
        housing: "housing-data_hh_type1_h",
        pedcol: (item) => {
            var total_collisions = item.properties["pedcol-data-only_SumAllPed"];
            var walk_pct = item.properties["pedcol-data-only_JTW_WALK"] / item.properties["pedcol-data-only_JTW_TOTAL"];
            var population = item.properties['TOTPOP1']; 

            var ped_per_100k = 100000 * (total_collisions / population);
            var ped_per_100k_walk = ped_per_100k / walk_pct;
            var ped_per_100k_walk_daily = ped_per_100k_walk / 365.0;

            return ped_per_100k_walk_daily;
        },
        'ped-environment': 'D3b',
        'jobs-accessibility': 'D5br_cleaned'
    }[this.id];

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
        circle: false,
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
        "housing-data_hh_type1_h": 0.0,
        'D3b': 0.0,
        'D5br_cleaned': 0.0,
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
    var ghg = document.querySelector("#stat-ghg");
    var pedcol = document.querySelector("#stat-pedcol");
    var cbgs = document.querySelector("#stat-cbgs");
    var housing = document.querySelector("#stat-housing");
    var pedenv = document.querySelector("#stat-ped-environment");
    var jobsaccess= document.querySelector("#stat-jobs-accessibility");

    vmt.innerHTML = "N/A";
    ghg.innerHTML = "N/A";
    pedcol.innerHTML = "N/A";
    cbgs.innerHTML = "N/A";
    housing.innerHTML = "N/A";
    pedenv.innerHTML = "N/A";
    jobsaccess.innerHTML = "N/A";
});


var hits = 0;
var selections = 0;
var sums = {
    vmt_hh_type1_vmt: 0.0,
    "pedcol-data-only_SumAllPed": 0.0,
    "pedcol-data-only_JTW_TOTAL": 0.0,
    "pedcol-data-only_JTW_WALK": 0.0,
    "housing-data_hh_type1_h": 0.0,
    'D3b': 0.0,
    'D5br_cleaned': 0.0,
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
                // only parsing int because some variables are being converted to 
                // strings when exporting to geojson... (fix this!!)
                sums[k] = (sums[k] + parseInt(f.properties[k])) || sums[k];
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
    var ghg = document.querySelector("#stat-ghg");
    var pedcol = document.querySelector("#stat-pedcol");
    var cbgs = document.querySelector("#stat-cbgs");
    var housing = document.querySelector("#stat-housing");
    var pedenv = document.querySelector("#stat-ped-environment");
    var jobsaccess = document.querySelector("#stat-jobs-accessibility");


    function withCommas(x) {
        return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }

    var total_collisions = sums["pedcol-data-only_SumAllPed"];
    var walk_pct = sums["pedcol-data-only_JTW_WALK"] / sums["pedcol-data-only_JTW_TOTAL"];

    var ped_per_100k = 100000 * (total_collisions / sums.pop_ped);
    var ped_per_100k_walk = ped_per_100k / walk_pct;
    var ped_per_100k_walk_daily = ped_per_100k_walk / 365.0;

    vmt.innerHTML = withCommas((sums['vmt_hh_type1_vmt'] / hits).toFixed(0));
    ghg.innerHTML = withCommas(((sums['vmt_hh_type1_vmt'] / hits) * .90).toFixed(0));
    housing.innerHTML = (sums["housing-data_hh_type1_h"] / hits).toFixed(1);
    pedcol.innerHTML = isFinite(ped_per_100k_walk_daily) ? ped_per_100k_walk_daily.toFixed(2) : "N/A";
    pedenv.innerHTML = (sums["D3b"] / hits).toFixed(1);
    jobsaccess.innerHTML = withCommas((sums["D5br_cleaned"] / hits).toFixed(0));
    cbgs.innerHTML = hits;

});


