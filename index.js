'use strict';

// dependancies
var xml2js = require( 'xml2js' );
var xmlparser = new xml2js.Parser();
var xmlbuilder = new xml2js.Builder();
var fs = require( 'fs' );

// read the basefile into memory for speedier processing
var baseFile = fs.readFileSync( __dirname + '/heatmap.base.svg', 'utf-8' );

// some boundries
var MIN_OPACITY = 0.3;
var MAX_OPACITY = 0.9;
var MAX_RADIUS = 150;
var MIN_RADIUS = 8;

/**
 * [generateHeatmap description]
 * @param  {[type]} eventStatsByCountry [description]
 * @return {[type]}                     [description]
 */
function generateHeatmap( eventStatsByCountry ) {
  var errorHeatmap = '';

  // store json version of svg
  var heatmap = {};
  // store reference to the heatmaps spots
  var heatmapSpots = {};

  // convert the svg to json for easier usage
  xmlparser.parseString( baseFile, function( error, data ) {
    if( error ) {
      return console.error( error );
    }

    heatmap = data;

    // loop through all top level groups till we find the heatmap spots
    for( var idx = 0, j = data.svg.g.length; idx < j; idx++ ) {
      var g = data.svg.g[ idx ];

      if( g.$.id === 'mp-heatmap-spots' ) {
        heatmapSpots = g.g;
        break;
      }
    }
  });

  if( heatmap === {} ) {
    errorHeatmap = fs.readFileSync( __dirname + '/heatmap.error.svg', 'utf-8' );
    errorHeatmap = errorHeatmap.replace( '{{ error }}', 'failed to load heatmap' );
    return errorHeatmap;
  }

  if( !eventStatsByCountry ) {
    errorHeatmap = fs.readFileSync( __dirname + '/heatmap.error.svg', 'utf-8' );
    errorHeatmap = errorHeatmap.replace( '{{ error }}', 'failed to get event statistics' );
    return errorHeatmap;
  }

  // get amounts to increase by per percentage
  var opacityIncrease = ( MAX_OPACITY - MIN_OPACITY ) / 100;
  var radiusIncrease = ( MAX_RADIUS - MIN_RADIUS ) / 100;

  // get total events
  var totalEvents = 0;
  for( var event in eventStatsByCountry ) {
    event = eventStatsByCountry[ event ];
    totalEvents += event.events;
  }

  // update spots on heatmap
  heatmapSpots.forEach( function( spot, idx ) {
    if( eventStatsByCountry[ spot.$.id ] ) {
      // get percentage of events the current country makes up
      var spotEvents = eventStatsByCountry[ spot.$.id ].events;
      var pctEvents = ( spotEvents / totalEvents ) * 100;

      // set the visible number of events
      spot.text[ 0 ]._ = spotEvents;

      // set spot radius
      var radius = MIN_RADIUS + ( Math.sqrt( radiusIncrease * pctEvents ) * 10 );
      radius = Math.round( radius * 100 ) / 100; // round radius to 2dp
      spot.circle[ 0 ].$.r = radius;

      // set spot opacity
      var opacity = MAX_OPACITY - Math.sqrt( opacityIncrease * pctEvents );
      opacity = Math.round( opacity * 100 ) / 100;
      spot.circle[ 0 ].$.opacity = opacity;
    }
  });

  // one more pass to remove any + all empty circles
  var l = heatmapSpots.length;
  while( l-- ) {
    if( heatmapSpots[ l ].text[ 0 ]._ === '0' ) {
      heatmapSpots.splice( l, 1 );
    }
  }

  return xmlbuilder.buildObject( heatmap );
}

module.exports = {
  generateHeatmap: generateHeatmap,
  baseFile: baseFile
};
