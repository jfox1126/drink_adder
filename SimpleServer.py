import SimpleHTTPServer
import SocketServer
import logging
import cgi
import urllib
from urlparse import urlparse
import UpdateDrinks

import sys


if len(sys.argv) > 2:
    PORT = int(sys.argv[2])
    I = sys.argv[1]
elif len(sys.argv) > 1:
    PORT = int(sys.argv[1])
    I = ""
else:
    PORT = 8000
    I = ""

# update the drink list at first
UpdateDrinks.update_drinks();


class ServerHandler(SimpleHTTPServer.SimpleHTTPRequestHandler):

    def do_GET(self):
        logging.warning("======= GET STARTED =======")
        logging.warning(self.headers)
        SimpleHTTPServer.SimpleHTTPRequestHandler.do_GET(self)

    def do_POST(self):
        logging.warning("======= POST STARTED =======")
        logging.warning(self.headers)
        length = int(self.headers.getheader('content-length'))
        data = self.rfile.read(length)
        print data

        o = urlparse(self.path)
        drinkId = o.query.split("=", 1)[1]
        print drinkId

        # write out the file to where we're saving it
        file = open("drinks/" + drinkId + ".json", "w+")
        file.write(data)
        file.close()

        UpdateDrinks.update_drinks();

        # change up the path to redirect
        self.path = "Index.html?drink=" + drinkId
        SimpleHTTPServer.SimpleHTTPRequestHandler.do_GET(self)

Handler = ServerHandler

httpd = SocketServer.TCPServer(("", PORT), Handler)

print "@rochacbruno Python http server version 0.1 (for testing purposes only)"
print "Serving at: http://%(interface)s:%(port)s" % dict(interface=I or "localhost", port=PORT)
httpd.serve_forever()