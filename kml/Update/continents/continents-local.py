#!/usr/bin/python

# This script is CGI script which generates KML.
# If no cookie is found an initial KML file is generated.
# If the CGI variable "count=num" is found an Update KML is generated.

import cgi
import os
import socket
import sys

# The hostname _must_ match the <href> in the fetching NetworkLink/Link.
#hostname = socket.gethostname()
hostname = 'localhost'
appname = os.path.basename(sys.argv[0])
#href = 'http://%s/cgi-bin/continents.py' % hostname
href = 'http://%s/cgi-bin/%s' % (hostname,appname)
minrefreshperiod = 7  # seconds

# This list has LookAt data (name, lon,lat,range) for each continent.
continents = []
continents.append(('nowhere', 0, 0, 0))  # offset 0 is unused
continents.append(('Australia', 134.6, -20.47, 3500000))
continents.append(('Antarctica', 138.3, -86.37, 4700000))
continents.append(('Europe', 18.37, 49.18, 3400000))
continents.append(('Africa', 13.15, -1.01, 5600000))
continents.append(('South America', -67.09, -22.48, 5600000))
continents.append(('Asia', 102, 33.7, 4700000))
continents.append(('North America', -100.7, 31.7, 4200000))

# The <cookie> content appears in the CGI params list.
fs = cgi.FieldStorage()
if fs.has_key('count'):
  # We found count=val in the CGI params.  Break out the value.
  # The original KML sets count=1.  Increment here to find 1st entry.
  count = int(fs['count'].value) + 1
  # This indexes the continents list.  After entry 7 cycle back to 1.
  if count > 7:
    count = 1
else:
  # No cookie found.  Set the count to trigger sending the original KML.
  count = 0

icon = 'http://maps.google.com/mapfiles/kml/shapes/flag.png'

def Original():
  k = []
  k.append('<kml>')
  k.append('  <NetworkLinkControl>')
  k.append('    <minRefreshPeriod>%d</minRefreshPeriod>' % minrefreshperiod)
  k.append('    <cookie>count=0</cookie>')
  k.append('  </NetworkLinkControl>')
  k.append('  <Placemark>')
  k.append('    <name>Moving point</name>')
  k.append('    <Style>')
  k.append('      <LabelStyle>')
  k.append('        <color>ffffff00</color>')
  k.append('      </LabelStyle>')
  k.append('      <IconStyle>')
  k.append('        <color>ffff7f00</color>')
  k.append('        <Icon>')
  k.append('          <href>%s</href>' % icon)
  k.append('        </Icon>')
  k.append('      </IconStyle>')
  k.append('      <BalloonStyle>')
  k.append('        <bgColor>ff223344</bgColor>')
  k.append('      </BalloonStyle>')
  k.append('    </Style>')
  k.append('    <Point id=\"pt0\">')
  k.append('      <coordinates>0,0</coordinates>')
  k.append('    </Point>')
  k.append('  </Placemark>')
  k.append('</kml>')
  return '\n'.join(k)

# This is always called with 1 <= count <= 7
def Update(count, targethref):
  global continents
  name = continents[count][0]
  longitude = continents[count][1]
  latitude = continents[count][2]
  range = continents[count][3]
  k = []
  k.append('<kml>')
  k.append('  <NetworkLinkControl>')
  k.append('    <minRefreshPeriod>%d</minRefreshPeriod>' % minrefreshperiod)
  k.append('    <message>Arriving %s</message>' % name)
  k.append('    <cookie>count=%d</cookie>' % count)
  k.append('    <Update>')
  k.append('      <targetHref>%s</targetHref>' % targethref)
  k.append('      <Change>')
  k.append('        <Point targetId=\"pt0\">')
  k.append('          <coordinates>%f,%f</coordinates>' % (longitude, latitude))
  k.append('        </Point>')
  k.append('      </Change>')
  k.append('    </Update>')
  k.append('    <LookAt>')
  k.append('      <longitude>%f</longitude>' % longitude)
  k.append('      <latitude>%f</latitude>' % latitude)
  k.append('      <range>%d</range>' % range)
  k.append('    </LookAt>')
  k.append('  </NetworkLinkControl>')
  k.append('</kml>')
  return '\n'.join(k)
	
print 'Content-type: text/plain'
print

if count == 0:
  print Original()
else:
  print Update(count, href)

