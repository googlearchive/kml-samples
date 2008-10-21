#!/usr/bin/env python

# Copyright 2008, Google Inc. All rights reserved.
#
# Redistribution and use in source and binary forms, with or without 
# modification, are permitted provided that the following conditions are met:
#
#  1. Redistributions of source code must retain the above copyright notice, 
#     this list of conditions and the following disclaimer.
#  2. Redistributions in binary form must reproduce the above copyright notice,
#     this list of conditions and the following disclaimer in the documentation
#     and/or other materials provided with the distribution.
#  3. Neither the name of Google Inc. nor the names of its contributors may be
#     used to endorse or promote products derived from this software without
#     specific prior written permission.
#
# THIS SOFTWARE IS PROVIDED BY THE AUTHOR ``AS IS'' AND ANY EXPRESS OR IMPLIED
# WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF 
# MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO
# EVENT SHALL THE AUTHOR BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, 
# SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
# PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS;
# OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
# WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR 
# OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF 
# ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

import BaseHTTPServer
import random

def GenerateKml():
  """ Returns a Document containing a Point-Placemark and a NetworkLink that
      refreshes every 4 seconds to update the position of the Point.
  """
  kml = (
    '<Document>\n'
    '<name>Document</name>\n'
    '<open>1</open>\n'
    '<Placemark>\n'
    '<name>Placemark</name>\n'
    '<Point id="p">\n'
    '<coordinates>-122,37</coordinates>\n'
    '</Point>\n'
    '</Placemark>\n'
    '<NetworkLink>\n'
    '<name>Update Link</name>\n'
    '<flyToView>1</flyToView>\n'
    '<Link>\n'
    '<href>http://localhost:8080/update</href>\n'
    '<refreshMode>onInterval</refreshMode>\n'
    '</Link>\n'
    '</NetworkLink>\n'
    '</Document>')
  return kml

def UpdateKml():
  """ Returns a NetworkLinkControl that updates the position of the previously
      fetched point. Also returns a camera position to fly the viewer to the
      position of the updated Point.
  """
  lon = -122.0 + random.random()
  lat = 37.0 + random.random()
  kml = (
    '<NetworkLinkControl>\n'
    '<Update>\n'
    '<targetHref>http://localhost:8080/index.kml</targetHref>\n'
    '<Change>\n'
    '<Point targetId="p">\n'
    '<coordinates>%0.6f,%0.6f</coordinates>\n'
    '</Point>\n'
    '</Change>\n'
    '</Update>\n'
    '<LookAt>\n'
    '<longitude>%0.6f</longitude>\n'
    '<latitude>%0.6f</latitude>\n'
    '<range>10000</range>\n'
    '<tilt>0</tilt>\n'
    '</LookAt>\n'
    '</NetworkLinkControl>') % (lon, lat, lon, lat)
  return kml

class UpdateHandler(BaseHTTPServer.BaseHTTPRequestHandler):
  """ Dirt simple HTTP server. If /index.kml is fetched, return the base
      KML file. Else return the Update for it.
  """
  def do_GET(self):
    print 'GET %s' % self.path
    self.send_response(200)
    self.send_header('Content-type', 'application/vnd.google-earth.kml+xml')
    self.end_headers()
    if self.path == '/index.kml':
      self.wfile.write(GenerateKml())
    else:
      self.wfile.write(UpdateKml())

def main():
  try:
    server = BaseHTTPServer.HTTPServer(('', 8080), UpdateHandler)
    print 'Started http server on port 8080. ^C to terminate'
    server.serve_forever()
  except KeyboardInterrupt:
    print 'Shutting down server'
    server.socket.close()

if __name__ == '__main__':
  main()

