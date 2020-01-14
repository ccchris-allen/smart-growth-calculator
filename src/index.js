// import styles (need to do this for webpack to handle stylesheet files for css bundle)
import "./styles/main.css";
import "./styles/main.scss";

// having trouble importing styles for installed libraries
//import 'leaflet-geosearch/dist/style.css';

// axios handles requests
import axios from "axios";

// mapping and geometry modules
import L from "leaflet";
import leafletDraw from "leaflet-draw";
import leafletPattern from "leaflet.pattern";
import { GeoSearchControl, EsriProvider } from "leaflet-geosearch";

// only import turf modules needed (otherwise the import is very large)
import { polygon, lineString } from "@turf/helpers";
import turfBuffer from "@turf/buffer";
import centroid from "@turf/centroid";
import intersect from "@turf/intersect";
import circle from "@turf/circle";

// our module for drawing choropleth maps
import Choropleth from "./choro";
import { exportCSVFile } from "./exportCSV";
import {
  PROPERTY_ORDER,
  property_config,
  populateReadouts,
  clearReadouts
} from "./calculate";

// global constants
const SELECTED_COLOR = "#444";
const NORMAL_COLOR = "#000";
const BUFFER_RADIUS = 0.5; // units = miles
const BASEMAP_URL =
  "https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw";

// we're going to only do some things when in production mode, ex: only show 'directions' modal
// immediately when in production mode (otherwise, it's annoying for debugging purposes to have to
// close the window each reload)
const IS_PROD = process.env.NODE_ENV === "production";

// should be separate json config?
const areas = {
  "btn-sd-county": {
    files: {
      polygons: "data/SanDiegoCounty-new-polygon.geojson",
      stations: "data/SanDiegoStations.geojson",
      ces: "data/SanDiegoDC-old.geojson"
    },
    center: [32.7157, -117.11],
    zoom: 12
  },
  "btn-sm-county": {
    files: {
      polygons: "data/SanMateoCounty.json",
      stations: "data/SanMateoStations.geojson",
      ces: "data/SanMateoDC.geojson"
    },
    center: [37.56, -122.313],
    zoom: 12
  },
  "btn-ml-county": {
    files: {
      polygons: "data/MultnomahCounty.geojson",
      stations: "",
      ces: ""
    },
    center: [45.515, -122.679],
    zoom: 12
  },
  "btn-clk-county": {
    files: {
      polygons: "data/ClackamasCounty.geojson",
      stations: "",
      ces: ""
    },
    center: [45.3364, -122.6],
    zoom: 12
  },
  "btn-wa-county": {
    files: {
      polygons: "data/WashingtonCounty.geojson",
      stations: "",
      ces: ""
    },
    center: [45.515, -122.8],
    zoom: 12
  },
  "btn-la-county": {
    files: {
      polygons: "data/LosAngelesCounty.json",
      stations: "data/LosAngelesStations.geojson",
      ces: "data/LosAngelesDC.geojson"
    },
    center: [34.05, -118.24],
    zoom: 12
  },
  "btn-alcc-county": {
    files: {
      polygons: "data/AlamedaContraCostaCounty.json",
      stations: "data/AlamedaStations.geojson",
      ces: "data/AlamedaDC.geojson"
    },
    center: [37.66, -121.87],
    zoom: 12
  },
  "btn-oc-county": {
    files: {
      polygons: "data/OrangeCounty.json",
      stations: "data/OrangeStations.geojson",
      ces: "data/OrangeDC.geojson"
    },
    center: [33.83, -117.91],
    zoom: 12
  },
  "btn-sa-county": {
    files: {
      polygons: "data/SacramentoCounty.json",
      stations: "data/SacramentoStations.geojson",
      ces: "data/SacramentoDC.geojson"
    },
    center: [38.58, -121.49],
    zoom: 12
  },
  "btn-sf-county": {
    files: {
      polygons: "data/SanFranciscoCounty.json",
      stations: "data/SanFranciscoStations.geojson",
      ces: "data/SanFranciscoDC.geojson"
    },
    center: [37.77, -122.41],
    zoom: 12
  },
  "btn-sc-county": {
    files: {
      polygons: "data/SantaClaraCounty.json",
      stations: "data/SantaClaraStation.geojson",
      ces: "data/SantaClaraDC.geojson"
    },
    center: [37.35, -121.95],
    zoom: 12
  }
};

//alert(window.location.href.split('/').slice(-1))

// variables that will reference out leaflet layers and map object
let geojsonLayer;
let stationsLayer;
let stationsPtsLayer;
let cesLayer;

// create a leaflet map object
var map = L.map("map").setView([32.7157, -117.11], 12);

L.tileLayer(BASEMAP_URL, {
  maxZoom: 18,
  attribution: "",
  id: "mapbox.streets"
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

const drawControl = new L.Control.Draw(drawControlOptions);
map.addControl(drawControl);

// add geosearch control
const provider = new EsriProvider();
const searchControl = new GeoSearchControl({
  provider: provider,
  style: "bar"
});

map.addControl(searchControl);

// Commenting out this part because Bruce doesn't want to show the "Select a County" modal right now...
$(".btn-squared").click(function() {
  $("#modal-select-city").modal("hide");

  // only show annoying popups initially if in production mode
  if (0) {
    //IS_PROD) {
    $("#modal-directions").modal("show");
  }

  var area = areas[this.id];
  //var area = areas['btn-sd-county'];

  map.setView(area.center, area.zoom);

  const GEOJSON_FILES = [
    area.files.polygons,
    area.files.stations,
    area.files.ces
  ];

  // use axios to get the geojson files we need for this map
  axios.all(GEOJSON_FILES.map(axios.get)).then(resp => {
    let [resp1, resp2, resp3] = resp;

    let feats = resp1.data.features;

    // after the data loads, emphasize the directions link by pulsating
    let link = document.querySelector("#nav-link-directions");
    link.classList.add("emphasize");
    // after animation is complete, remove the `emphasize` class
    // to prevent re-animation on re-draw (NOTE: still not working on IE/Edge?)
    link.addEventListener("animationend webkitAnimationEnd", e => {
      e.target.classList.remove("emphasize");
    });

    /*
            let loading = document.querySelector('.loading');
            loading.style.display = 'none';
            */

    PROPERTY_ORDER.forEach(p => {
      let vals = feats
        .map(property_config[p].summarizer)
        .filter(v => !isNaN(v) && isFinite(v))
        .filter(v => v > 0); //do we really want to filter out zeros?

      let min = Math.min(...vals);
      let max = Math.max(...vals);
      let avg = vals.reduce((r, v) => r + v, 0) / vals.length; // average calculation

      property_config[p].range = { min, max, avg };
    });

    // create a choropleth map using the CBG features
    // initially use VMT as the choropleth property
    geojsonLayer = new Choropleth(resp1.data, {
      property: property_config["vmt"].summarizer,
      style: f => {
        return {
          color: f.properties._selected ? SELECTED_COLOR : NORMAL_COLOR,
          weight: f.properties._selected ? 2 : 0.0,
          opacity: 1.0,
          fillOpacity: 0.4
        };
      },
      onEachFeature: (f, l) => {
        l.on("mouseover", e => {
          f.properties._hovered = true;
          updateSelected();
        });
        l.on("mouseout", e => {
          delete f.properties._hovered;
          updateSelected();
        });
      }
    }).addTo(map);

    // cloning the transit station buffers to get the centroid to display as points
    /*
            let cloned = JSON.parse(JSON.stringify(resp2.data));
            cloned.features = cloned.features.map((f) => centroid(polygon(f.geometry.coordinates)));
            
            stationsPtsLayer = L.geoJSON(cloned, {
                pointToLayer: function (feature, latLng) {
                    return L.circleMarker(latLng, {
                        radius: 3,
                        color: '$444',
                        fillOpacity: 1.0
                    });
                }
            }).addTo(map);
            */

    // add the stations layer to the map
    // set style of stations layer based on typology
    stationsLayer = L.geoJSON(resp2.data, {
      style: f => {
        var style = {
          weight: 3.0,
          fillOpacity: 0.0
        };

        // make sure SDSU station (83) is green --hacky!!!
        if (
          f.properties.F02 === 83 ||
          f.properties.FINAL_TYPO === "INTEGRATED"
        ) {
          style.color = "SeaGreen";
        } else if (f.properties.FINAL_TYPO === "TRANSITIONING") {
          style.color = "rgb(255, 195, 0)"; //'Gold';
        } else {
          style.color = "Crimson";
        }

        return style;
      },
      onEachFeature: (f, l) => {
        l.on("click", () => selectFeatures(f));

        // todo: move this to util file
        const titleCase = s =>
          s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();

        var msg = `
                        <span class='font-weight-bold'> Station: </span> ${f
                          .properties.FULL_NAME || "None"} <br>
                        <span class='font-weight-bold'> Typology: </span> ${titleCase(
                          f.properties.FINAL_TYPO
                        )}`;

        //l.bindPopup(msg);
      }
    }).addTo(map);

    let stripes = new L.StripePattern({
      angle: 45,
      weight: 4,
      color: "black",
      opacity: 1.0
    });
    stripes.addTo(map);

    // add the ces layer to the map
    cesLayer = L.geoJSON(resp3.data, {
      style: {
        fillPattern: stripes,
        fillOpacity: 0.3,
        opacity: 0.0
      },
      interactive: false // need this to allow for selection of cbgs UNDER this layer
    }).addTo(map);

    // add control to map (allows users to turn off/on layers)
    let opts = { position: "topright" };
    L.control
      .layers(
        [],
        {
          "Livability Attributes": geojsonLayer,
          "Rail Transit Station .5 Mile Buffers": stationsLayer,
          /*"Rail Transit Stations": stationsPtsLayer,*/
          "Disadvantage Communities": cesLayer
        },
        opts
      )
      .addTo(map);
  });
});

// create an event handler for when the user clicks the drop-down menu
// to select a layer for visualization
$(".dropdown-menu a").click(function() {
  // first, set button text to selected value
  // (this is a bit of a hack, since bootstrap doesn't really support dropdowns)
  $("#btn-label").text(this.text);

  let { summarizer, range, invert } = property_config[this.id];
  let { max } = range;

  // update the choropleth layer with the new property
  if (invert) {
    geojsonLayer.setProperty(f => max - summarizer(f), true);
  } else {
    geojsonLayer.setProperty(summarizer, true);
  }
});

// add event handler for when a drawn feature is deleted
map.on(L.Draw.Event.DELETESTOP, e => {
  geojsonLayer.eachLayer(l => {
    delete l.feature.properties._selected;
  });

  geojsonLayer.setStyle(f => {
    return {
      color: NORMAL_COLOR,
      weight: 0.0
    };
  });

  clearReadouts();
  document.querySelector("#stat-cbgs").innerHTML = 0;
});

function selectFeatures(buffer) {
  var cbgs = geojsonLayer.toGeoJSON();
  var bufferLayer = new L.geoJson(buffer);

  // add feature to drawing layer
  drawnItems.addLayer(bufferLayer);

  /*
    bufferLayer.bindTooltip("polygon!", {
        permanent: true,
        direction: "center"
    }).openTooltip();
    */

  // turf.insersect does not work for multipolygons...
  function intersects(a, b) {
    if (b.geometry.type === "Polygon") {
      return intersect(a, b);
    } else if (b.geometry.type === "MultiPolygon") {
      var polys_coords = b.geometry.coordinates;

      for (var i = 0; i < polys_coords.length; i++) {
        var polygon = {
          geometry: {
            type: "Polygon",
            coordinates: polys_coords[i]
          }
        };

        if (intersect(a, polygon)) {
          return true;
        }
      }
    }

    return false;
  }

  cbgs.features.forEach(f => {
    if (intersects(buffer, f)) {
      f.properties._selected = true;
    }
  });
}

function updateSelected(layer = geojsonLayer) {
  var cbgs = layer.toGeoJSON();

  // set style of selected CBGs
  geojsonLayer.setStyle(f => {
    let is_selected = f.properties._selected || f.properties._hovered;
    return {
      color: is_selected ? SELECTED_COLOR : NORMAL_COLOR,
      dashArray: "3 3",
      weight: is_selected ? 2 : 0.0
    };
  });

  var selected_features = cbgs.features.filter(
    f => f.properties._selected || f.properties._hovered
  );

  populateReadouts(selected_features);

  document.querySelector("#stat-cbgs").innerHTML = selected_features.length;
}

// add event handler for when a feature is drawn by the user
map.on(L.Draw.Event.CREATED, e => {
  let buffer;
  let { layer, layerType } = e;
  let opts = { units: "miles" };

  // this is where we take the drawn feature and draw a buffer around
  if (layerType === "marker") {
    var coords = [layer._latlng.lng, layer._latlng.lat];
    buffer = circle(coords, BUFFER_RADIUS, opts);
  } else if (layerType === "circle") {
    var coords = [layer._latlng.lng, layer._latlng.lat];
    buffer = circle(coords, BUFFER_RADIUS, opts);
  } else if (layerType === "polyline") {
    var coords = layer._latlngs.map(item => {
      return [item.lng, item.lat];
    });
    buffer = turfBuffer(lineString(coords), BUFFER_RADIUS, opts);
  } else {
    var coords = layer._latlngs.map(ring => {
      return ring.map(poly => {
        return [poly.lng, poly.lat];
      });
    });

    // need to complete the polygon by repeating first coords
    coords[0].push(coords[0][0]);
    buffer = polygon(coords);
  }

  selectFeatures(buffer);
  updateSelected();
});

$("#download-csv").on("click", () => {
  let cbgs = geojsonLayer.toGeoJSON();
  let selected = cbgs.features.filter(f => f.properties._selected);

  if (selected.length == 0) {
    alert("Select features first!");
    return;
  }

  let rows = selected.map(s => {
    // sometimes the geoid is called 'GEOIDCLEAN' and sometimes 'GEOID' (need to fix this in future...)
    let fips = s.properties["GEOIDCLEAN"] || s.properties["GEOID"];

    // grab row data in proper order (defined by `PROPERTY_ORDER`)
    return PROPERTY_ORDER.reduce(
      (result, prop) => {
        let { attribute, name } = property_config[prop];

        if (!attribute) return result;

        result[name] = s.properties[attribute] || "NA";
        return result;
      },
      { FIPS: fips }
    );
  });

  exportCSVFile(rows);
});
