# SMART GROWTH CALCULATOR CODE OVERVIEW

## Technology Used

The Smart Growth Calculator uses the following tools/technologies:

### CSS 
* The [Bootstrap](www.getbootstrap.com) CSS library is used for design and layout.  

### JavaScript 
* [JQuery](https://jquery.com) is used for Javascript DOM manipulation (eg, handling interactivity).
* [Leaflet](https://leafletjs.com) is used for creating the webmap.
* [Leaflet Draw](http://leaflet.github.io/Leaflet.draw/docs/leaflet-draw-latest.html) is used for handling the map drawing functions.

### Build Tools
* [Webpack](https://webpack.js.org) is used to build the JavaScript bundle used in the web page.  Webpack provides a number of capabilities, including transpiling ES6(allowing us to newer JS syntax) for broader browser capatibility and minifying the code to reduce file size. 

* To generate build files for development, run `npm run dev`.  For production, run `npm run prod`.

## Deployment

* We're using [Netlify](https://netlify.com) to deploy the app (it syncs any changes pushed to Github).

## Code Structure

The JavaScript code is divided into the following files:

### index.js

This file is the main entry-point for the JavaScript code.  It handles the main functionality of the web page, including:
* Setting up the web map and drawing tools
* Setting up event handlers to add drawn features to the map, perform spatial selection of census block groups based on these selections, and populate the readouts

### calculate.js

This file handles the aggregation of selected census block groups and updating readouts.

### choro.js

This file styles the map according to the selected metric.  

### exportCSV.js

This file handles the exporting of data to CSV format (to be downloaded).