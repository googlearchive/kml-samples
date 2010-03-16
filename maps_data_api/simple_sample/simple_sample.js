/*
Copyright 2009 Google Inc.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

     http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

/* Global constants. */
var MAPS_SCOPE = 'http://maps.google.com/maps/feeds/';
var MAPS_MAIN_FEED = 'http://maps.google.com/maps/feeds/maps/default/full';

/* Global variables. */
var g_mapsService;  // google.gdata.maps.MapsService

/**
 * Helper function to get an HTML element by its id.
 */
function $(id) {
  return document.getElementById(id);
}

/**
 * Helper function to add an event listener on an object.
 */
function eventHandler(node, eventName, listener) {
  if (node.addEventListener)
    return node.addEventListener(eventName, listener, false);
  else if (node.attachEvent)
    return node.attachEvent('on' + eventName, listener);
  
  return null;
}

/**
 * Asks the user to provide access to his/her My Maps via AuthSub. If already
 * authenticated, does nothing.
 */
function login() {
  google.accounts.user.login(MAPS_SCOPE);
}

/**
 * Logs the user out, and destroys any AuthSub tokens related to the My Maps
 * scope for this application.
 */
function logout() {
  google.accounts.user.logout();
  window.location.reload();
}

/**
 * Shows an error notification to the user representing the given error.
 */
function showGDataError(e) {
  $('errors').innerHTML =
      'Error: ' + (e.cause ? e.cause.statusText : e.message);
  $('errors').style.display = '';
}

/**
 * Hides any currently shown error notifications.
 */
function hideErrors() {
  $('errors').style.display = 'none';
}

/**
 * Called when the DOM is ready and all libraries have been loaded.
 */
function init() {
  var authSubToken = google.accounts.user.checkLogin(MAPS_SCOPE);
  if (!authSubToken) {
    $('state-guest').style.display = '';
    return;
  }

  $('state-loggedin').style.display = '';
  
  g_mapsService = new google.gdata.maps.MapsService(
      'com.google.mapsdatasamples.simple_simple');
  
  // Load a list of maps.
  var mapListNode = $('map-list');
  mapListNode.innerHTML = '<li>Loading...</li>';
  
  g_mapsService.getMapFeed(MAPS_MAIN_FEED, function(mapFeedRoot) {
    mapListNode.innerHTML = '';
    var mapEntries = mapFeedRoot.feed.getEntries();
    
    for (var i = 0; i < mapEntries.length; i++) {
      // Create the map list item and link.
      var mapEntryNode = document.createElement('li');
      var mapEntryLinkNode = document.createElement('a');
      mapEntryLinkNode.href = '#';
      
      // Use a closure for event handlers.
      eventHandler(mapEntryLinkNode, 'click', (function(featureFeedHref) {
        return function(evt) {
          loadFeatureFeed(featureFeedHref);
        };
      })(mapEntries[i].content.src)); // content.src is a feature feed href
      
      mapEntryLinkNode.appendChild(
          document.createTextNode(mapEntries[i].getTitle().$t));
      
      mapEntryNode.appendChild(mapEntryLinkNode);
      mapListNode.appendChild(mapEntryNode);
    }
  }, showGDataError);
}

/**
 * Loads the feature feed with the given href into the features list.
 */
function loadFeatureFeed(featureFeedHref) {
  var featureListNode = $('feature-list');
  featureListNode.innerHTML = '<li>Loading...</li>';
  
  g_mapsService.getFeatureFeed(featureFeedHref, function(featureFeedRoot) {
    featureListNode.innerHTML = '';
    var featureEntries = featureFeedRoot.feed.getEntries();
    
    for (var i = 0; i < featureEntries.length; i++) {
      // Create the feature list item and link.
      var featureEntryNode = document.createElement('li');
      var featureEntryLinkNode = document.createElement('a');
      featureEntryLinkNode.href = '#';
      
      // Use a closure for event handlers.
      eventHandler(
        featureEntryLinkNode, 'click', (function(featureKml) {
          return function(evt) {
            loadFeatureKml(featureKml);
          };
        })(featureEntries[i].getContent().$t)); // getContent().$t is a KML
                                                // string.
      
      featureEntryLinkNode.appendChild(
          document.createTextNode(featureEntries[i].getTitle().$t));
      
      featureEntryNode.appendChild(featureEntryLinkNode);
      featureListNode.appendChild(featureEntryNode);
    }
  }, showGDataError);
}

/**
 * Shows the given KML string in the feature KML text area.
 */
function loadFeatureKml(featureKml) {
  $('feature-kml').value = featureKml;
}
