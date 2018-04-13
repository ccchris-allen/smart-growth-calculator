/*
 * This is an extension of the 'leaflet-choropleth' package, so 
 * some of the code is from this project.  This plugin allows for
 * dynamic selection of choropleth attribute.
 */ 

var chroma = require('chroma-js');

const DEFAULT_OPTIONS = {
    property: 'value',
    scale: ['#eeeeee', '#ee2222'],
    steps: 5,
    mode: 'q',
    defaultStyle: { opacity: 0.0 }
}; 


L.Choropleth = L.GeoJSON.extend({
    
    initialize: function (geojson, options) {
        
        // use defaults, but override if applicable
        this.options = L.Util.extend(DEFAULT_OPTIONS, options || {});

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

        // color mapper
        // note: scale/domain doesn't work as expected (https://github.com/gka/chroma.js/issues/103)
        var cmapper = chroma.scale(colors).domain(limits);

        var userStyle = style || opts.style;

        function choroplethStyle(f) {
            var style = {};
            var featureValue;

            if (typeof opts.property === 'function') {
                featureValue = opts.property(f);
            } else { 
                featureValue = f.properties[opts.property];
            } 
            
            // Find the bucket that this value is less than and give it that color 
            if (!isNaN(featureValue)) { 
                //style.fillColor = cmapper(featureValue).toString();

                for (var i = 0; i < limits.length; i++) { 
                    if (featureValue <= limits[i]) {
                        style.fillColor = colors[i];
                        break;
                    }
                }
            } else {
                // need to change default style if some error occurs (not a number)
                style = opts.default;
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


        L.GeoJSON.prototype.setStyle.call(this, choroplethStyle);
    }
});

module.exports = L.Choropleth;
