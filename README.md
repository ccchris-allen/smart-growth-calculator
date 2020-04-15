# SMART GROWTH CALCULATOR CODE OVERVIEW

[Production Site Link](https://smartgrowthcalculator.netlify.app)

[Test Site Link](https://testsmartgrowthcalculator.netlify.app)

## Getting Started

First clone this repo to your local machine using Git. Then download and install Node.js. Node.js will allow you to manage the dependancies the calculor requires. Once Node.js is install simply type "npm install" in the command line in the cloned directory. This will read the package.json file and download all dependancies for you. Lastly you will need a way to serve up the web page on your local machine in the same way a website does. The easiest way to do that is by downloading Visual Studio Code and installing the Live Server extension. Press the 'Go Live' button at the botton and if you did everything right you should have a fully functional calculator on your machine ready for development.

Everytime you make changes to the JS or the CSS in the project the files in the dist folder will need to be rebundled using Webpack. Simply type "npm run build" to rebuild the project. You will notice that this is a script command also detailed in the package.json file. If Live Server is running the page should refresh with the new changes. Your changes will not be displayed on the live server until they are committed to the remote repo using Git.

## Technology Used

The Smart Growth Calculator uses the following tools/technologies:

### CSS

- The [Bootstrap](www.getbootstrap.com) CSS library is used for design and layout.

### JavaScript

- [Node.js](https://nodejs.org) used for Javascript package managment.
- [JQuery](https://jquery.com) is used for Javascript DOM manipulation (eg, handling interactivity).
- [Leaflet](https://leafletjs.com) is used for creating the webmap.
- [Leaflet Draw](http://leaflet.github.io/Leaflet.draw/docs/leaflet-draw-latest.html) is used for handling the map drawing functions.

### Build Tools

- [Webpack](https://webpack.js.org) is used to build the JavaScript bundle used in the web page. Webpack provides a number of capabilities, including transpiling ES6 (allowing us to use newer JS syntax) for broader browser capatibility and minifying the code to reduce file size.

### Deployment

- We're using [Netlify](https://netlify.com) to deploy the app (it syncs any changes pushed to Github).

## Code Structure

The JavaScript code is divided into the following files:

### index.js

This file is the main entry-point for the JavaScript code. It handles the main functionality of the web page, including:

- Setting up the web map and drawing tools
- Setting up event handlers to add drawn features to the map, perform spatial selection of census block groups based on these selections, and populate the readouts

### calculate.js

This file handles the aggregation of selected census block groups and updating readouts.

### choro.js

This file styles the map according to the selected metric.

### exportCSV.js

This file handles the exporting of data to CSV format (to be downloaded).
