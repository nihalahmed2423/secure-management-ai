let map;
let activeMarkers = [];

function initMap() {
  if (!map) {
      map = L.map('map').setView([20.5937, 78.9629], 5);
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
          attribution: '&copy; OpenStreetMap contributors',
          maxZoom: 19
      }).addTo(map);
  }
}

document.getElementById('btn-enter').addEventListener('click', () => {
  setTimeout(() => {
      if (map) map.invalidateSize();
  }, 100);
});

function triggerPincodePrediction() {
  const pincode = document.getElementById('pincode-input').value.trim();
  const detectLabel = document.getElementById('detected-location');
  
  if (pincode.length < 6) {
      alert("Please enter a valid 6-digit Indian Pincode.");
      return;
  }
  
  detectLabel.innerText = "Connecting to satellites...";
  detectLabel.style.color = "var(--accent-cyan)";
  
  fetch(`https://nominatim.openstreetmap.org/search?postalcode=${pincode}&country=India&format=json`)
      .then(res => res.json())
      .then(data => {
          if (data && data.length > 0) {
              const lat = parseFloat(data[0].lat);
              const lon = parseFloat(data[0].lon);
              const placeName = data[0].display_name;
              
              detectLabel.innerText = `LOCKED: ${placeName.split(',')[0]} (${lat.toFixed(2)}, ${lon.toFixed(2)})`;
              detectLabel.style.color = "var(--risk-none)";
              
              // Populate Locality Details Card
              const parts = placeName.split(',');
              document.getElementById('locality-details-card').classList.remove('hidden');
              document.getElementById('locality-name').innerText = parts[0] ? parts[0].trim() : "--";
              
              // Depending on Nominatim's output size, index 1/2 usually holds the broader region/district
              if (parts.length >= 3) {
                  document.getElementById('locality-district').innerText = "Region/District: " + parts[1].trim();
                  document.getElementById('locality-state').innerText = "State/Location: " + parts[parts.length-3].trim();
              } else {
                  document.getElementById('locality-district').innerText = "Region/District: " + (parts[1] ? parts[1].trim() : "--");
                  document.getElementById('locality-state').innerText = "State/Location: India";
              }
              document.getElementById('locality-coords').innerText = `GPS Coords: ${lat.toFixed(5)}, ${lon.toFixed(5)}`;
              
              fetchPredictAPI("State", pincode, lat, lon, placeName);
          } else {
              detectLabel.innerText = "Location not found in Geodatabase.";
              detectLabel.style.color = "var(--risk-high)";
          }
      })
      .catch(err => {
          console.error(err);
          detectLabel.innerText = "GPS Error. Manual override required.";
      });
}

function fetchPredictAPI(state, pincode, lat, lon, placeName) {
  fetch("/api/predict", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ state: state, pincode: pincode, lat: lat, lon: lon })
  })
  .then(res => res.json())
  .then(data => {
      updateDashboardUI(data, lat, lon, placeName, pincode);
  })
  .catch(err => {
      console.error(err);
      alert("AI Backend Disconnected.");
  });
}

function updateDashboardUI(data, lat, lon, placeName, pincode) {
  const score = data.risk_percentage;
  const level = data.alert;
  const cleanPlaceName = placeName.split(',')[0];
  
  document.getElementById('priority-location-card').classList.remove('hidden');
  document.getElementById('priority-location-name').innerText = cleanPlaceName.toUpperCase();
  document.getElementById('priority-score').innerText = score + "%";
  document.getElementById('priority-risk-tag').innerText = level;
  
  let peopleRisk = 0;
  let vehiclesNeeded = 0;
  if (score > 10) {
      peopleRisk = Math.floor(score * 124.5); 
      vehiclesNeeded = Math.ceil(peopleRisk / 18);
  }
  
  document.getElementById('val-people-risk').innerText = peopleRisk.toLocaleString();
  document.getElementById('val-vehicles-needed').innerText = vehiclesNeeded.toLocaleString();
  
  const priorityList = document.getElementById('priority-list');
  if (data.priorities && data.priorities.length > 0) {
      priorityList.innerHTML = data.priorities.map(p => 
          `<div class="priority-item"><strong>${p.resource}</strong> (Priority: ${p.level})</div>`
      ).join('');
      
      document.getElementById('priority-resource-list').innerHTML = data.priorities.map(p => 
          `<li>${p.resource}</li>`
      ).join('');
  } else {
      priorityList.innerHTML = "<div class='queue-placeholder'>No immediate priorities.</div>";
      document.getElementById('priority-resource-list').innerHTML = "<li>None</li>";
  }
  
  activeMarkers.forEach(m => map.removeLayer(m));
  activeMarkers = [];
  
  map.flyTo([lat, lon], 12, { animate: true, duration: 1.5 });
  
  let circleColor = "#22cc66";
  if (score > 65) circleColor = "#ffa500";
  if (score > 85) circleColor = "#ff3344";
  
  const disasterRadius = L.circle([lat, lon], {
      color: circleColor,
      fillColor: circleColor,
      fillOpacity: 0.2,
      radius: score > 65 ? 8000 : 3000
  }).addTo(map);
  
  activeMarkers.push(disasterRadius);
  
  const pulsingIcon = L.divIcon({
      className: 'pulse-icon',
      html: `<div style="width:20px; height:20px; background:${circleColor}; border-radius:50%; animation: blink 1.5s infinite; filter: drop-shadow(0 0 10px ${circleColor});"></div>`,
      iconSize: [20, 20],
      iconAnchor: [10, 10]
  });
  
  const centerMarker = L.marker([lat, lon], {icon: pulsingIcon}).addTo(map);
  centerMarker.bindPopup(`<b>${cleanPlaceName}</b><br>Risk: ${score}%`).openPopup();
  activeMarkers.push(centerMarker);

  document.getElementById('val-temp').innerText = "Scanning...";
  
  fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=precipitation,surface_pressure`)
    .then(res => res.json())
    .then(wData => {
        if(wData.current_weather) {
            document.getElementById('val-temp').innerText = wData.current_weather.temperature + " °C";
            document.getElementById('val-wind').innerText = wData.current_weather.windspeed + " km/h";
            
            let rain = (wData.hourly && wData.hourly.precipitation) ? wData.hourly.precipitation[0] : (score > 65 ? 114.5 : 12.0);
            let pressure = (wData.hourly && wData.hourly.surface_pressure) ? wData.hourly.surface_pressure[0] : (score > 65 ? 980 : 1012);
            
            document.getElementById('val-rain').innerText = rain + " mm";
            document.getElementById('val-pressure').innerText = pressure + " hPa";
        }
    })
    .catch(err => {
        console.error(err);
        document.getElementById('val-temp').innerText = "API Err";
    });

  const assetTracker = document.getElementById('asset-tracker-list');
  assetTracker.innerHTML = "";
  
  let assets = [];
  
  if (score > 65) {
      assets.push({ emoji: "🚑", name: "Ambulance Unit A-42", eta: "ETA: 4 mins", lat: lat - 0.02, lon: lon + 0.025 });
      assets.push({ emoji: "🚑", name: "Ambulance Unit B-19", eta: "ETA: 7 mins", lat: lat + 0.03, lon: lon - 0.015 });
  }
  if (score > 85) {
      assets.push({ emoji: "🚁", name: "NDRF Rescue Squad", eta: "ETA: 12 mins", lat: lat - 0.04, lon: lon - 0.03 });
  }
  
  globalAssets = assets;
  if (window.trackerInterval) clearInterval(window.trackerInterval);

  if (score <= 35) {
      assetTracker.innerHTML = "<div style='color:#94a3b8'>No emergency assets currently required.</div>";
  } else {
      assets.forEach(asset => {
          assetTracker.innerHTML += `
            <div style="display:flex; justify-content: space-between; margin-bottom: 8px; border-bottom: 1px solid #1e293b; padding-bottom: 4px;">
              <span>${asset.emoji} <strong>${asset.name}</strong></span>
              <span style="color: var(--accent-cyan); font-size: 0.85rem;">${asset.eta}</span>
            </div>
          `;
          
          const icon = L.divIcon({
              html: `<div style="font-size: 24px; filter: drop-shadow(0px 0px 4px rgba(0,0,0,0.8));">${asset.emoji}</div>`,
              className: 'custom-asset-icon',
              iconSize: [30, 30],
              iconAnchor: [15, 15]
          });
          asset.marker = L.marker([asset.lat, asset.lon], {icon: icon}).addTo(map);
          asset.marker.bindPopup(`<b>${asset.name}</b><br>Status: ${asset.eta}`);
          activeMarkers.push(asset.marker);
      });

      window.trackerInterval = setInterval(() => {
          assets.forEach(asset => {
              if (asset.marker) {
                  asset.lat += (lat - asset.lat) * 0.02;
                  asset.lon += (lon - asset.lon) * 0.02;
                  asset.marker.setLatLng([asset.lat, asset.lon]);
              }
          });
      }, 1000);
  }

  const hospitalCard = document.getElementById('hospital-card');
  const hospitalList = document.getElementById('hospital-list');
  hospitalCard.classList.remove('hidden');
  
  hospitalList.innerHTML = "<li style='color: var(--risk-mod); padding: 5px 0;'>📡 Scanning live satellite network for hospitals in the surroundings (25km radius)...</li>";
  
  const overpassQuery = `[out:json];(node["amenity"="hospital"](around:25000,${lat},${lon});way["amenity"="hospital"](around:25000,${lat},${lon});relation["amenity"="hospital"](around:25000,${lat},${lon}););out center 5;`;
  
  fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(overpassQuery)}`)
    .then(res => res.json())
    .then(osmData => {
        hospitalList.innerHTML = "";
        if (osmData.elements && osmData.elements.length > 0) {
            osmData.elements.forEach(el => {
                const name = el.tags.name || "General Medical Facility";
                const type = el.tags.emergency === "yes" ? "Emergency Ward" : "Hospital";
                const destLat = el.lat || el.center.lat;
                const destLon = el.lon || el.center.lon;
                
                const gmapsDir = `https://www.google.com/maps/dir/?api=1&destination=${destLat},${destLon}`;
                const gmapsDetails = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}+${destLat},${destLon}`;
                
                hospitalList.innerHTML += `<li style="margin-bottom: 8px; padding-bottom: 6px; border-bottom: 1px solid rgba(255,255,255,0.1);">
                    <strong style="color: #66b3ff;">${name}</strong><br>
                    <span style="font-size: 0.8rem; color: #94a3b8;">${type} - Present in Surroundings</span><br>
                    <div style="margin-top: 4px; display: flex; gap: 12px;">
                        <a href="${gmapsDetails}" target="_blank" style="font-size: 0.75rem; color: #66b3ff; text-decoration: underline;">📄 View Details & Contact</a>
                        <a href="${gmapsDir}" target="_blank" style="font-size: 0.75rem; color: var(--risk-none); text-decoration: underline;">🚑 Route Ambulances</a>
                    </div>
                </li>`;
                
                const hIcon = L.divIcon({
                    html: `<div style="font-size: 20px; filter: drop-shadow(0px 0px 4px rgba(34, 204, 102,0.8));">🏥</div>`,
                    className: 'custom-asset-icon',
                    iconSize: [24, 24],
                    iconAnchor: [12, 12]
                });
                const hMarker = L.marker([destLat, destLon], {icon: hIcon}).addTo(map);
                hMarker.bindPopup(`<b>${name}</b><br>${type}`);
                activeMarkers.push(hMarker);
            });
        } else {
            hospitalList.innerHTML = `<li><span style='color: #94a3b8;'>No registered hospitals found in the surroundings. Deploying mobile medical units to ${cleanPlaceName}.</span></li>`;
        }
    })
    .catch(err => {
        console.error("Overpass API Error:", err);
        hospitalList.innerHTML = "<li><span style='color: var(--risk-high);'>❌ Network connection failed. Cannot fetch real-time hospitals.</span></li>";
    });
}

function broadcastAlert() {
  const msgBox = document.getElementById('public-alert-msg').value;
  if (msgBox === "Awaiting risk analysis...") return;
  
  const btn = document.getElementById('btn-broadcast');
  btn.innerText = "BROADCASTING TO NATIONAL CHANNELS...";
  
  setTimeout(() => {
      document.getElementById('broadcast-status').style.display = "block";
      btn.innerText = "BROADCAST SENT";
  }, 1200);
}

function showAlert(message) {
  const banner = document.getElementById('alert-banner');
  document.getElementById('alert-content').innerText = message;
  banner.classList.remove('hidden');
}

function closeAlert() {
  document.getElementById('alert-banner').classList.add('hidden');
}

function resetSelection() {
  document.getElementById('pincode-input').value = "";
  const detectLabel = document.getElementById('detected-location');
  if (detectLabel) {
      detectLabel.innerText = "Awaiting input...";
      detectLabel.style.color = "#94a3b8";
  }
  
  document.getElementById('locality-details-card').classList.add('hidden');
  
  document.getElementById('public-alert-msg').value = "Awaiting risk analysis...";
  document.getElementById('broadcast-status').style.display = "none";
  document.getElementById('btn-broadcast').innerText = "BROADCAST TO LOCALS & NATIONAL CHANNELS";
  
  const existingAutoLog = document.getElementById('auto-dispatch-log');
  if (existingAutoLog) existingAutoLog.remove();
  
  document.getElementById('priority-location-card').classList.add('hidden');
  document.getElementById('hospital-card').classList.add('hidden');
  activeMarkers.forEach(m => map.removeLayer(m));
  activeMarkers = [];
  
  if (userSOSMarker) {
      map.removeLayer(userSOSMarker);
      userSOSMarker = null;
  }
  sosActive = false;
  document.getElementById('sos-status').style.display = "none";
  document.getElementById('btn-sos').innerText = "SHARE LIVE LOCATION";
  
  if (window.trackerInterval) clearInterval(window.trackerInterval);
  document.getElementById('asset-tracker-list').innerHTML = "<div class='queue-placeholder'>Awaiting dispatch orders...</div>";

  map.flyTo([20.5937, 78.9629], 5);
}

let userSOSMarker = null;
let sosActive = false;
let globalAssets = [];

function triggerSOS() {
    const statusDiv = document.getElementById('sos-status');
    const btnSOS = document.getElementById('btn-sos');
    
    statusDiv.style.display = 'block';
    statusDiv.innerText = 'Acquiring GPS lock...';
    statusDiv.style.color = 'var(--risk-mod)';
    btnSOS.innerText = 'CONNECTING SATELLITE...';
    
    if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(position => {
            const userLat = position.coords.latitude;
            const userLon = position.coords.longitude;
            
            statusDiv.innerHTML = `<b>Location Locked!</b><br>Rescue teams have been rerouted to your exact GPS coordinates.<br><span style='color: #66b3ff;'>Rescue Command will contact you at <b>${window.userPhoneNumber || 'your registered number'}</b>.</span>`;
            statusDiv.style.color = 'var(--risk-none)';
            btnSOS.innerText = 'SOS SIGNAL °CTIVE';
            btnSOS.style.background = 'var(--risk-none)';
            
            sosActive = true;
            
            map.flyTo([userLat, userLon], 14);
            
            if (userSOSMarker) map.removeLayer(userSOSMarker);
            const icon = L.divIcon({
                html: `<div style='font-size: 32px; filter: drop-shadow(0px 0px 8px rgba(255,51,68,1));'>SOS</div>`,
                className: 'custom-asset-icon',
                iconSize: [32, 32],
                iconAnchor: [16, 16]
            });
            userSOSMarker = L.marker([userLat, userLon], {icon: icon}).addTo(map);
            userSOSMarker.bindPopup('<b>Your Live Location</b><br>Transmitting to Rescue Units...').openPopup();
            
            if (window.trackerInterval) clearInterval(window.trackerInterval);
            
            window.trackerInterval = setInterval(() => {
                globalAssets.forEach(asset => {
                    if (asset.marker) {
                        asset.lat += (userLat - asset.lat) * 0.05; 
                        asset.lon += (userLon - asset.lon) * 0.05;
                        asset.marker.setLatLng([asset.lat, asset.lon]);
                    }
                });
            }, 1000);
            
        }, error => {
            statusDiv.innerText = 'GPS Error. Please allow location access in your browser to broadcast SOS.';
            statusDiv.style.color = 'var(--risk-high)';
            btnSOS.innerText = 'RETRY SIGNAL';
        });
    } else {
        statusDiv.innerText = 'Geolocation is not supported by your browser.';
    }
}
