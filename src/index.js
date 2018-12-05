// import styles (need to do this for webpack to handle stylesheet files)
import './styles/main.css';
import './styles/main.scss';

// axios handles requests
import axios from 'axios';

// mapping and geometry modules
import L from 'leaflet';
import leafletDraw from 'leaflet-draw';
import leafletPattern from 'leaflet.pattern';
import * as turf from '@turf/turf';

// our module for drawing choropleth maps
import Choropleth from './choro';
import { exportCSVFile } from './exportCSV';
import { PROPERTY_ORDER, property_config, populateReadouts, clearReadouts } from './calculate';

// global constants
const SELECTED_COLOR = '#444';
const NORMAL_COLOR = '#000';
const BUFFER_RADIUS = 0.5; // units = miles

// we're going to only do some things when in production mode, ex: only show 'directions' modal 
// immediately when in production mode (otherwise, it's annoying for debugging purposes to have to 
// close the window each reload)
const IS_PROD = process.env.NODE_ENV === 'production';

var areas = {
    'btn-sd-county': {
        files: {
            polygons: 'data/sd_cbgs_latest_attributes_normed6.geojson',
            stations: 'data/sd-rail-stations-buffered.geojson',
            ces: 'data/ces-tracts.geojson'
        },
        center: [32.7157, -117.11],
        zoom: 12
    },
    'btn-sm-county': {
        files: {
            polygons: 'data/san-mateo-with-data_normed6.geojson',
            stations: 'data/stations-san-mateo.geojson',
            ces: 'data/ces-tracts.geojson'
        },
        center: [37.56, -122.313],
        zoom: 12
    }
};

// variables that will reference out leaflet layers and map object
var geojsonLayer;
var stationsLayer;
var cesLayer;

// create a leaflet map object
var map = L.map('map').setView([32.7157, -117.11], 12);

// create a mapbox basemap layer and add to map
var basemap_url = 'https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw';

L.tileLayer(basemap_url, {
    maxZoom: 18,
    attribution: '',
    id: 'mapbox.streets'
}).addTo(map);

// add layer to hold the drawn features
var drawnItems = new L.FeatureGroup();
map.addLayer(drawnItems);

// add the drawing controls
var drawControlOptions = {
    edit: {
        featureGroup: drawnItems,
        edit: false
    },
    draw: {
        polygon: true,
        circle: false,
        circlemarker: false,
        rectangle: false
    }
};

var drawControl = new L.Control.Draw(drawControlOptions);
map.addControl(drawControl);


$('.btn-squared').click(function() {
    $('#modal-select-city').modal('hide');

    // only show annoying popups initially if in production mode
    if (IS_PROD) {
        $('#modal-directions').modal('show');
    }

    var area = areas[this.id];

    map.setView(area.center, area.zoom);

    var GEOJSON_FILES = [
        area.files.polygons, 
        area.files.stations,
        area.files.ces
    ];

    // use axios to get the geojson files we need for this map 
    axios.all(GEOJSON_FILES.map(axios.get))
        .then((resp) => {
            var [resp1, resp2, resp3] = resp;

            var feats = resp1.data.features;

            PROPERTY_ORDER.forEach((p) => {
                var vals = feats
                            .map(property_config[p].summarizer)
                            .filter((v) => !isNaN(v) && isFinite(v))
                            .filter((v) => v > 0); //do we really want to filter out zeros?

                var min = Math.min(...vals);
                var max = Math.max(...vals);

                property_config[p].range = { 
                    min: min, 
                    max: max
                };
            });

            // create a choropleth map using the CBG features
            // initially use VMT as the choropleth property
            geojsonLayer = new Choropleth(resp1.data, {
                property: property_config['vmt'].summarizer,
                style: (f) => {
                    return {
                        color: f.properties._selected ? SELECTED_COLOR : NORMAL_COLOR,
                        weight: f.properties._selected ? 2. : 0.0,
                        opacity: 1.0,
                        fillOpacity: 0.4
                    };
                },
                onEachFeature: (f, l) => {
                    l.on('mouseover', (e) => {
                        f.properties._selected = true; 
                        updateSelected();
                    });
                    l.on('mouseout', (e) => {
                        delete f.properties._selected;
                        updateSelected();
                    });
                }
            }).addTo(map);

            // add the stations layer to the map
            // set style of stations layer based on typology
            stationsLayer = L.geoJSON(resp2.data, {
                style: (f) => {
                    var style = {
                        weight: 0.0,
                        fillOpacity: .5
                    };

                    if (f.properties.FINAL_TYPO === 'INTEGRATED') {
                        style.fillColor = 'SeaGreen';
                    } else if (f.properties.FINAL_TYPO === 'TRANSITIONING') {
                        style.fillColor = 'Gold';
                    } else {
                        style.fillColor = 'Crimson';
                    }

                    return style;
                },
                onEachFeature: (f, l) => {
                    l.on('click', () => selectFeatures(f));

                    // todo: move this to util file
                    const titleCase = (s) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();

                    var msg = `
                        <span class='font-weight-bold'> Station: </span> ${f.properties.FULL_NAME || 'None'} <br>
                        <span class='font-weight-bold'> Typology: </span> ${titleCase(f.properties.FINAL_TYPO)}`;

                    //l.bindPopup(msg);
                }
            });

            let stripes = new L.StripePattern({
                angle: 45,
                weight:  4,
                color:  'black',
                opacity:  1.0
            });
            stripes.addTo(map);

            // add the ces layer to the map
            cesLayer = L.geoJSON(resp3.data, {
                style: {
                    fillPattern: stripes,
                    opacity: 0.0
                }
            });

            // add control to map (allows users to turn off/on layers)
            let opts = { position: 'topright' };
            L.control.layers([], {
                "Livability Attributes": geojsonLayer,
                "Rail Transit Stations": stationsLayer,
                'Disadvantage Communities': cesLayer
            }, opts).addTo(map);
        });
});

// create an event handler for when the user clicks the drop-down menu
// to select a layer for visualization
$('.dropdown-menu a').click(function() {

    // first, set button text to selected value 
    // (this is a bit of a hack, since bootstrap doesn't really support dropdowns)
    $('#btn-label').text(this.text);

    var summarizer = property_config[this.id].summarizer;

    // update the choropleth layer with the new property
    geojsonLayer.setProperty(summarizer, true);

});

// add event handler for when a drawn feature is deleted 
map.on(L.Draw.Event.DELETESTOP, (e) => {
    geojsonLayer.eachLayer((l) => { delete l.feature.properties._selected; });

    geojsonLayer.setStyle((f) => {
        return {
            color: NORMAL_COLOR,
            weight: 0.0
        };
    });

    clearReadouts();
    document.querySelector('#stat-cbgs').innerHTML = 0;
    
});

function selectFeatures(buffer) {
    var cbgs = geojsonLayer.toGeoJSON();
    var bufferLayer = new L.geoJson(buffer);

    // add feature to drawing layer
    drawnItems.addLayer(bufferLayer);

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
    
    cbgs.features.forEach((f) => {
        if (intersects(buffer, f)) {
            f.properties._selected = true;
        }
    });

}

function updateSelected(layer=geojsonLayer) {
    var cbgs = geojsonLayer.toGeoJSON();
    
    // set style of selected CBGs
    geojsonLayer.setStyle((f) => {
        return {
            color: f.properties._selected ? SELECTED_COLOR : NORMAL_COLOR,
            dashArray: "3 3",
            weight: f.properties._selected ? 2. : 0.0
        };
    });

    var selected_features = cbgs.features.filter((f) => f.properties._selected);

    populateReadouts(selected_features);

    document.querySelector('#stat-cbgs').innerHTML = selected_features.length;
}

// add event handler for when a feature is drawn by the user
map.on(L.Draw.Event.CREATED, (e) => {

    var buffer;
    var layer = e.layer;
    var opts = {
        units: 'miles'
    };

    // this is where we take the drawn feature and draw a buffer around
    if (e.layerType === 'marker') {
        var coords = [layer._latlng.lng, layer._latlng.lat];
        buffer = turf.circle(coords, BUFFER_RADIUS, opts);
    } else if (e.layerType === 'circle') {
        var coords = [layer._latlng.lng, layer._latlng.lat];
        buffer = turf.circle(coords, BUFFER_RADIUS, opts);
    } else if (e.layerType === 'polyline') {
        var coords = layer._latlngs.map((item) => {
            return [item.lng, item.lat];
        });
        buffer = turf.buffer(turf.lineString(coords), BUFFER_RADIUS, opts);
    } else {
        var coords = layer._latlngs.map((ring) => {
            return ring.map((poly) => {
                return [poly.lng, poly.lat];
            });
        });

        // need to complete the polygon by repeating first coords
        coords[0].push(coords[0][0]);
        buffer = turf.polygon(coords);
    }

    selectFeatures(buffer);
    updateSelected();
});


$("#download-csv").on('click', () => {
    let cbgs = geojsonLayer.toGeoJSON();
    let selected = cbgs.features.filter((f) => f.properties._selected);

    if (selected.length == 0) {
        alert("Select features first!");
        return;
    }

    let rows = selected.map((s) => {
        let fips = s.properties['GEOIDCLEAN'] || s.properties['GEOID'];

        return PROPERTY_ORDER.reduce((result, prop) => {
            let attr = property_config[prop].attribute;
            let name = property_config[prop].name;

            if (!attr) return result;

            result[name] = s.properties[attr] || "NA";
            return result;
        }, { 'FIPS': fips });
    });

    exportCSVFile(rows);
});
