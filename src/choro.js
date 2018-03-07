/*
 * This is an extension of the 'leaflet-choropleth' package, so 
 * much of the code is from this project.  This plugin allows for
 * dynamic selection of choropleth attribute.
 */ 

//import leaflet from 'leaflet';
var L = require('leaflet');
var chroma = require('chroma-js');

L.Choropleth = L.GeoJSON.extend({
    
    initialize: function (geojson, options) {
    
        // Use defaults, but override if applicable
        this.options = L.Util.extend({
            property: 'value',
            scale: ['white', 'red'],
            steps: 5,
            mode: 'q'
        }, options || {});

        L.GeoJSON.prototype.initialize.call(this, geojson, options.style);

        this.setProperty(this.options.property);
    
    },

    setProperty: function (property, updateStyle) {

        updateStyle = (updateStyle === undefined) ? true : updateStyle;
        
        // Override current property if new value is passed
        this.options.property = property || this.options.property;

        if (updateStyle) this.setStyle();

    },
    
    setStyle: function (style) {

        var opts = this.options;
        var geojson = this.toGeoJSON();

        // Calculate limit
        var values = geojson.features.map((typeof opts.property === 'function') ?
                                            opts.property :
                                            function (item) { return item.properties[opts.property]; });

        var limits = chroma.limits(values, opts.mode, opts.steps - 1);

        // Create color buckets
        var colors = (opts.colors && opts.colors.length === limits.length ?
                                     opts.colors :
                                     chroma.scale(opts.scale).colors(limits.length));

        var userStyle = style || opts.style;

        function choroStyle(f) {
            var style = {};
            var featureValue;

            if (typeof opts.property === 'function') {
                featureValue = opts.property(f);
            } else { 
                featureValue = f.properties[opts.property];
            } 
            
            // Find the bucket that this value is less than and give it that color 
            if (!isNaN(featureValue)) { 
                for (var i = 0; i < limits.length; i++) { 
                    if (featureValue <= limits[i]) {
                        style.fillColor = colors[i];
                        break;
                    }
                }
            } else {
                // need to change default style if some error occurs (not a number)
                //style = { fillColor: 'blue' };
            }

            // Return this style, but include the user-defined style if it was passed 
            switch (typeof userStyle) {
                case 'function':
                    return L.Util.extend(style, userStyle(f));
                case 'object':
                    return L.Util.extend(style, userStyle);
                default: 
                    return style;
            }
        }

        L.GeoJSON.prototype.setStyle.call(this, choroStyle);

    }
});

module.exports = L.Choropleth;
