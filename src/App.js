import React, { useRef, useEffect } from 'react';
import mapboxgl from 'mapbox-gl';
import useSWR from 'swr';
import lookup from 'country-code-lookup';
import './App.scss';
// Need mapbox css for tooltips later in the tutorial
import 'mapbox-gl/dist/mapbox-gl.css';

mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_ACCESS_TOKEN;

function App() {
  const mapboxElRef = useRef(null); // DOM element to render map

  const fetcher = (url) =>
    fetch(url)
      .then((r) => r.json())
      .then((data) =>
        data.map((point, index) => ({
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [point.coordinates.longitude, point.coordinates.latitude]
          },
          properties: {
            id: index,
            country: point.country,
            province: point.province,
            cases: point.stats.confirmed,
            deaths: point.stats.deaths
          }
        }))
      );

  const { data } = useSWR('https://corona.lmao.ninja/v2/jhucsse', fetcher);

  // Initialize our map
  useEffect(() => {
    if (data) {
      const map = new mapboxgl.Map({
        container: mapboxElRef.current,
        style: 'mapbox://styles/rarysonrost/ck8p8atvv05v01imrb3gtagep',
        center: [16, 27],
        zoom: 2
      });

      // Add navigation controls to the top right of the canvas
      map.addControl(new mapboxgl.NavigationControl());

      map.once('load', function () {


        /* Image: An image is loaded and added to the map. */
        map.loadImage("https://i.imgur.com/Cprz6oO.png", function (error, image) {
          if (error) throw error
          map.addImage("custom-marker", image);
          /* Style layer: A style layer ties together the source and image and specifies how they are displayed on the map. */
          map.addLayer({
            id: "markers",
            type: "symbol",
            /* Source: A data source specifies the geographic coordinate where the image marker gets placed. */
            source: {
              type: "geojson",
              data: {
                type: 'FeatureCollection',
                features: [
                  {
                    type: 'Feature',
                    properties: {},
                    geometry: {
                      type: "Point",
                      coordinates: [-79.9071, 39.0512]
                    }
                  }
                ]
              }
            },

          });
        });



        // Add our SOURCE
        map.addSource('points', {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: data
          }
        });

        // Add our layer
        map.addLayer({
          id: 'markers',
          source: 'points', // this should be the id of source
          type: 'symbol', layout: {
            "icon-image": "custom-marker",
          }
        });

        const popup = new mapboxgl.Popup({
          closeButton: false,
          closeOnClick: false
        });

        let lastId;

        map.on('mousemove', 'markers', (e) => {
          const id = e.features[0].properties.id;

          if (id !== lastId) {
            lastId = id;
            const { cases, deaths, country, province } = e.features[0].properties;

            // Change the pointer type on mouseenter
            map.getCanvas().style.cursor = 'pointer';

            const coordinates = e.features[0].geometry.coordinates.slice();

            const countryISO = lookup.byCountry(country)?.iso2 || lookup.byInternet(country)?.iso2;
            const provinceHTML = province !== 'null' ? `<p>Province: <b>${province}</b></p>` : '';
            const mortalityRate = ((deaths / cases) * 100).toFixed(2);
            const countryFlagHTML = Boolean(countryISO)
              ? `<img src="https://www.countryflags.io/${countryISO}/flat/64.png"></img>`
              : '';

            const HTML = `<p>Country: <b>${country}</b></p>
              ${provinceHTML}
              <p>Cases: <b>${cases}</b></p>
              <p>Deaths: <b>${deaths}</b></p>
              <p>Mortality Rate: <b>${mortalityRate}%</b></p>
              ${countryFlagHTML}`;

            // Ensure that if the map is zoomed out such that multiple
            // copies of the feature are visible, the popup appears
            // over the copy being pointed to.
            while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
              coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
            }

            popup.setLngLat(coordinates).setHTML(HTML).addTo(map);
          }
        });

        map.on('mouseleave', 'markers', function () {
          lastId = undefined;
          map.getCanvas().style.cursor = '';
          popup.remove();
        });
      });
    }
  }, [data]);

  return (
    <div className="App">
      <div className="mapContainer">
        {/* Mapbox container */}
        <div className="mapBox" ref={mapboxElRef} />
      </div>
      {/* Source container - not part of the tutorial */}
      <div className="source">
        <span role="img" aria-label="computer">
          🖥️
        </span>
        <a href="https://github.com/alemesa/mapbox-covid19" target="_blank" rel="noreferrer noopener">
          Source code
        </a>
      </div>
    </div>
  );
}

export default App;
