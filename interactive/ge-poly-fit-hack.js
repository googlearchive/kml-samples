function getObjectCoordData(ge, kmlObject) {
  var out = {
    'coords': [],
    'altitudeMode': -1,
    'maxAltitude': -9999
  };

  function pushLatLngAlt(lat, lng, alt) {
    out.coords.push({
      lat: lat,
      lng: lng,
      alt: alt
    });

    out.maxAltitude = Math.max(out.maxAltitude, alt);
  }
  
  function pushCoord(pointOrCoord) {
    pushLatLngAlt(pointOrCoord.getLatitude(), pointOrCoord.getLongitude(), pointOrCoord.getAltitude());
  }
  
  function pushChildCall(retval, altitudeMode) {
    out.coords = out.coords.concat(retval.coords);
    out.maxAltitude = Math.max(out.maxAltitude, retval.maxAltitude);
    
    // stop at first altitudeMode, so if it's already set, don't update it
    if (out.altitudeMode == -1)
      out.altitudeMode = retval.altitudeMode;
  }
  
  // extract the points from the given object
  if (kmlObject && 'getType' in kmlObject) {
    if (out.altitudeMode == -1 && 'getAltitudeMode' in kmlObject)
      out.altitudeMode = kmlObject.getAltitudeMode();
    
    switch (kmlObject.getType()) {
      // features
      case 'KmlFolder':
      case 'KmlDocument':
        var children = kmlObject.getFeatures().getChildNodes();
        var numChildren = children.getLength();
        for (var i = 0; i < numChildren; i++)
          pushChildCall(getObjectCoordData(ge, children.item(i)));
        break;
      
      case 'KmlPlacemark':
        if ('getGeometry' in kmlObject)
          return getObjectCoordData(ge, kmlObject.getGeometry());
        break;

      case 'KmlGroundOverlay':
        var latLonBox = kmlObject.getLatLonBox();
        var alt = kmlObject.getAltitude();
        pushLatLngAlt(latLonBox.getNorth(), latLonBox.getEast(), alt);
        pushLatLngAlt(latLonBox.getNorth(), latLonBox.getWest(), alt);
        pushLatLngAlt(latLonBox.getSouth(), latLonBox.getEast(), alt);
        pushLatLngAlt(latLonBox.getSouth(), latLonBox.getWest(), alt);
        break;
      
      // geometries
      case 'KmlMultiGeometry':
        var children = kmlObject.getGeometries().getChildNodes();
        var numChildren = children.getLength();
        for (var i = 0; i < numChildren; i++)
          pushChildCall(getObjectCoordData(ge, children.item(i)));
        break;

      case 'KmlModel':
        pushCoord(kmlObject.getLocation());
        break;
      
      case 'KmlPolygon':
        pushChildCall(getObjectCoordData(ge, kmlObject.getOuterBoundary()));
        break;
      
      case 'KmlLinearRing':
      case 'KmlLineString':
        var coordsObj = kmlObject.getCoordinates();
        var n = coordsObj.getLength();
        for (var i = 0; i < n; i++)
          pushCoord(coordsObj.get(i));
        break;
      
      case 'KmlCoord': // coordinates
      case 'KmlLocation': // models
      case 'KmlPoint': // points
        pushCoord(kmlObject);
        break;
    }
  }
  
  return out;
}

function computeFitLookAt(ge, obj, aspectRatio) {
  var DEGREES = Math.PI / 180;
  var EARTH_RADIUS = 6378137;
  
  var coordData = getObjectCoordData(ge, obj);

  if ('getAbstractView' in obj) {
    var la = obj.getAbstractView();
    if (la != null)
      return la;
  }
  
  if (coordData.coords.length) {
    // range calculation -- the hard part
    var center = null;
    var range = 0.0;
    if (coordData.coords.length == 1) {
      center = new google.maps.LatLng(coordData.coords[0].lat, coordData.coords[0].lng);
      range = 1000;
    } else {
      // compute bbox
      var bounds = new google.maps.LatLngBounds();
      for (var i = 0; i < coordData.coords.length; i++)
        bounds.extend(new google.maps.LatLng(coordData.coords[i].lat, coordData.coords[i].lng));
      
      // find center
      center = bounds.getCenter();
      var sw = bounds.getSouthWest();
      var ne = bounds.getNorthEast();
    
      var lngSpan = new google.maps.LatLng(center.lat(), sw.lng()).
        distanceFrom(new google.maps.LatLng(center.lat(), ne.lng()));
      var latSpan = new google.maps.LatLng(sw.lat(), center.lng()).
        distanceFrom(new google.maps.LatLng(ne.lat(), center.lng()));
    
      if (!aspectRatio)
        aspectRatio = 1.0;
    
      var PAD_FACTOR = 1.5; // add 50% to the computed range for padding
      var beta;
      
      var aspectUse = Math.max(aspectRatio, Math.min(1.0, lngSpan / latSpan));
      var alpha = (45.0 / (aspectUse + 0.4) - 2.0) * DEGREES; // computed experimentally;
      
      // create LookAt using distance formula
      if (lngSpan > latSpan) {
        // polygon is wide
        beta = Math.min(90 * DEGREES, alpha + lngSpan / 2 / EARTH_RADIUS);
      } else {
        // polygon is taller
        beta = Math.min(90 * DEGREES, alpha + latSpan / 2 / EARTH_RADIUS);
      }
    
      range = PAD_FACTOR * EARTH_RADIUS * (Math.sin(beta) *
        Math.sqrt(1 / Math.pow(Math.tan(alpha),2) + 1) - 1);
    }
    
    var la = ge.createLookAt('');
    la.set(center.lat(), center.lng(), coordData.maxAltitude, coordData.altitudeMode, 0, 0, range);
    return la;
  }
  
  return null;
}
