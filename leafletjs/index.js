var L = require('leaflet')
var map = require('leaflet-map')()
var request = require('browser-request')

map.setView([35.03625128110528, -85.29939651489256], 12)  

L.tileLayer("https://{s}.tiles.mapbox.com/v3/jden.ie42jhle/{z}/{x}/{y}.png", {
    minZoom: 0,
    maxZoom:16,
    bounds: [
      [34.9813,-85.3816],
      [35.1292,-85.1132]
    ]
  })
  .addTo(map)

map.locate({setView: true, maxZoom: 16});

map.on('locationfound', onLocationFound)

function onLocationFound(e) {
  L.marker(e.latlng, {
    icon: new L.icon({iconUrl: 'marker-red.png'}),
    zIndexOffset: 20000
  }).addTo(map)
  loadBusStops(e)
}

var activeRoutes = []
var stops = {}

function loadBusStops(e) {

  request({
      url:'http://staging-api.chab.us/stops/near?lat=' + e.latlng.lat + '&lon=' + e.latlng.lng,
      json:true
    }, function (err, res, body) {

      L.geoJson(body, {
          onEachFeature: function (feature, layer) {
            stops[feature.id] = layer
            var desc = '<strong>' + feature.properties.name + '</strong><br/>'
                        + feature.properties.routes.map(function (route) {
                          return route.id + ' ' + route.direction
                        }).join(', ')

            layer.bindPopup(desc)
            layer.on('click', function () {
              activateStop(feature.id)
              updateActiveRoutes(feature.properties.routes.map(function (route) {
                return route.id
              }))
            })
          }
        })
        .addTo(map)
    })

}

function activateStop(stopId) {
  stops[stopId].setIcon(L.icon({iconUrl: 'marker-blue.png'}))

  Object.keys(stops)
    .filter(function (id) {
      return stopId !== id
    })
    .map(function (stopId) {
      return stops[stopId]
    })
    .forEach(function (stop) {
      stop.setIcon(L.icon({iconUrl: 'marker-light-grey.png'}))
    })
}

function updateActiveRoutes(routes) {
  activeRoutes = routes
  Object.keys(buses)
    .map(function (busId) {
      var bus = buses[busId]
      map.removeLayer(bus.marker)
      return bus
    })
    .filter(function (bus) {
      return activeRoutes.indexOf(bus.properties.route) > -1
    })
    .forEach(function (bus) {
      map.addLayer(bus.marker)
    })
}

var busSource = new EventSource('http://api.chab.us/buses/tail')
var buses = {}
busSource.addEventListener('add', function (e) {
  var bus = JSON.parse(e.data)
  buses[bus.id] = bus

  bus.marker = L.marker([bus.geometry.coordinates[1], bus.geometry.coordinates[0]],
    {
      icon: L.icon({iconUrl: 'marker-green.png'}),
      zIndexOffset: 1000
    })

})
busSource.addEventListener('change', function (e) {
  var ebus = JSON.parse(e.data)
  var bus = buses[ebus.id]
  bus.marker.setLatLng([ebus.geometry.coordinates[1], ebus.geometry.coordinates[0]])
})
busSource.addEventListener('remove', function (e) {
  var ebus = JSON.parse(e.data)
  map.removeLayer(buses[ebus.id].marker)
  delete buses[ebus.id]
})