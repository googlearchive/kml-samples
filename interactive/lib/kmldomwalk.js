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

/**
 * Walks a KML object, calling a given visit function for each object in
 * the KML DOM. The lone argument must be either a visit function or an
 * options literal.
 *
 * NOTE: walking the DOM can have pretty poor performance on very large
 * hierarchies, as first time accesses to KML objects from JavaScript
 * incur some overhead in the API.
 *
 * @param {KmlObject} rootObject The root of the KML object hierarchy to walk.
 * @param {Function} visitCallback The function to call upon visiting
 *     a node in the DOM. The 'this' variable in the callback function will be
 *     bound to the object being visited. The lone argument passed to this
 *     function will be an object literal for the call context. To get the
 *     current application-specific call context, use the 'current' property
 *     of the context object. To set the context for all child calls, set the
 *     'child' property of the context object. To prevent walking the children
 *     of the current object, set the 'walkChildren' property of the context
 *     object to false. To stop the walking process altogether,
 *     return false in the function.
 * @param {Object} [options] The walk options:
 * @param {boolean} [options.features] Descend into feature containers?
 *     Default true.
 * @param {boolean} [options.geometries] Descend into geometry containers?
 *     Default false.
 * @param {Object} [options.rootContext] The application-specific context to
 *     pass to the root item.
 */
function walkKmlDom(rootObject, visitCallback, options) {
  options = options || {};
  
  if (!('features' in options)) {
    options.features = true;
  }
  
  if (!('geometries' in options)) {
    options.geometries = false;
  }
  
  var recurse_ = function(object, currentContext) {
    var contextArgument = {
      current: currentContext,
      child: currentContext,
      walkChildren: true
    };
    
    // walk object
    var retValue = visitCallback.call(object, contextArgument);
    if (!retValue && typeof retValue !== 'undefined') {
      return false;
    }
    
    if (!contextArgument.walkChildren) {
      return true;
    }
    
    var objectContainer = null; // GESchemaObjectContainer
    
    // check if object is a parent
    if ('getFeatures' in object) { // GEFeatureContainer
      if (options.features) {
        objectContainer = object.getFeatures();
      }
    } else if ('getGeometry' in object) { // KmlFeature - descend into geoms.
      if (options.geometries && object.getGeometry()) {
        recurse_(object.getGeometry(), contextArgument.child);
      }
    } else if ('getGeometries' in object) { // GEGeometryContainer
      if (options.geometries) {
        objectContainer = object.getGeometries();
      }
    } else if ('getInnerBoundaries' in object) { // GELinearRingContainer
      if (options.geometries) {
        objectContainer = object.getInnerBoundaries();
      }
    }
    
    // iterate through children if object is a parent and recurse so they
    // can be walked
    if (objectContainer && objectContainer.hasChildNodes()) {
      var childNodes = objectContainer.getChildNodes();
      var numChildNodes = childNodes.getLength();
      
      for (var i = 0; i < numChildNodes; i++) {
        var child = childNodes.item(i);
        
        if (!recurse_(child, contextArgument.child))
          return false;
      }
    }
    
    return true;
  };
  
  recurse_(rootObject, options.rootContext);
};
