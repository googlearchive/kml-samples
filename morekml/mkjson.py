#!/usr/bin/env python
import os
import os.path
import sys
import simplejson
import re

def mkchildren(path):
  children = []
  diritems = os.listdir(path)
  diritems.sort()
  for entry in diritems:
    entryPath = os.path.join(path, entry)
    if os.path.isdir(entryPath):
      # recurse into directory
      entryChildren = mkchildren(entryPath)
      if not entryChildren:
        continue
      
      children.append({
        'name': entry.replace('_', ' '),
        'source': entryPath,
        'children': entryChildren
      })

    elif os.path.isfile(entryPath) and entry.endswith('.kml'):
      # tree leaf
      leaf = {
        'name': re.sub(r'.*\.(.*)\.kml', r'\1', entry).replace('_', ' '),
        'source': entryPath
      }
      
      if os.path.isfile(entryPath + '.html'):
        leaf['descSource'] = entryPath + '.html'
      
      children.append(leaf)

  return children

def main(args):
  obj = {
    'label': 'name',
    'identifier': 'source',
    'items': mkchildren('.')
  }

  print simplejson.dumps(obj, indent=2)

if __name__ == '__main__':
  main(sys.argv[1:])
