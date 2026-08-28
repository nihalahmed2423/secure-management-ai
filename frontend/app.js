// ----------------------------------------------------
// 1. THREE.JS 3D ANIMATION (Disaster Storm)
// ----------------------------------------------------
const container = document.getElementById('canvas-container');
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x11111f, 0.002);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 1000);
camera.position.z = 1;
camera.rotation.x = 1.16;
camera.rotation.y = -0.12;
camera.rotation.z = 0.27;

const renderer = new THREE.WebGLRenderer({ alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
container.appendChild(renderer.domElement);

const ambient = new THREE.AmbientLight(0x555555);
scene.add(ambient);
const directionalLight = new THREE.DirectionalLight(0xffeedd);
directionalLight.position.set(0,0,1);
scene.add(directionalLight);

let rainGeo, rainSystem;
const rainCount = 15000;
rainGeo = new THREE.BufferGeometry();
const rainPositions = new Float32Array(rainCount * 3);
const rainVelocities = [];

for(let i=0; i<rainCount; i++) {
    rainPositions[i*3] = Math.random() * 400 - 200;
    rainPositions[i*3+1] = Math.random() * 500 - 250;
    rainPositions[i*3+2] = Math.random() * 400 - 200;
    rainVelocities.push(0);
}
rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3));

const rainMaterial = new THREE.PointsMaterial({
    color: 0xaaaaaa,
    size: 0.1,
    transparent: true
});
rainSystem = new THREE.Points(rainGeo, rainMaterial);
scene.add(rainSystem);

function animate() {
    const positions = rainGeo.attributes.position.array;
    for(let i=0; i<rainCount; i++) {
        // Increased gravity/velocity for faster rain
        rainVelocities[i] -= 0.5 + Math.random() * 0.5;
        positions[i*3+1] += rainVelocities[i];
        if (positions[i*3+1] < -200) {
            positions[i*3+1] = 200;
            rainVelocities[i] = 0;
        }
    }
    rainGeo.attributes.position.needsUpdate = true;
    // Increased rotation speed for the storm swirl
    rainSystem.rotation.y += 0.008;
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
}
animate();

window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
});

// ----------------------------------------------------
// 2. ENTRY LOGIC
// ----------------------------------------------------
const enterBtn = document.getElementById('enter-btn');
const canvasContainer = document.getElementById('canvas-container');
const overlayText = document.getElementById('overlay-text');
const mainApp = document.getElementById('main-app');

enterBtn.addEventListener('click', () => {
    canvasContainer.style.display = 'none';
    overlayText.style.display = 'none';
    mainApp.style.display = 'block';
    // Fix map sizing issue after changing display
    setTimeout(() => { map.invalidateSize(); }, 200);
});

// ----------------------------------------------------
// 3. MAP (Leaflet)
// ----------------------------------------------------
const map = L.map('map').setView([20.5937, 78.9629], 5); // Center on India
L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

let currentMarker = null;
let currentCircle = null;

const stateCoordinates = {
    "Assam": [26.2006, 92.9376],
    "Bihar": [25.0961, 85.3131],
    "Uttar Pradesh": [26.8467, 80.9462],
    "Odisha": [20.9517, 85.0985],
    "West Bengal": [22.9868, 87.8550],
    "Andhra Pradesh": [15.9129, 79.7400],
    "Maharashtra": [19.7515, 75.7139],
    "Tamil Nadu": [11.1271, 78.6569],
    "Gujarat": [22.2587, 71.1924],
    "Rajasthan": [27.0238, 74.2179],
    "Delhi": [28.7041, 77.1025],
    "Karnataka": [15.3173, 75.7139]
};

// ----------------------------------------------------
// 4. APP LOGIC & API INTEGRATION
// ----------------------------------------------------
const stateSelect = document.getElementById('state-select');
const cancelBtn = document.getElementById('cancel-btn');
const alertBox = document.getElementById('alert-box');
const alertText = document.getElementById('alert-text');
const riskPercent = document.getElementById('risk-percent');
const priorityList = document.getElementById('priority-list');

function updateAlertUI(data) {
    // Reset colors
    alertBox.classList.remove('border-gray-300', 'border-red-600', 'border-orange-500', 'border-yellow-400', 'border-green-500', 'bg-white', 'bg-red-50', 'bg-orange-50', 'bg-yellow-50', 'bg-green-50');
    alertText.classList.remove('text-gray-800', 'text-red-700', 'text-orange-700', 'text-yellow-700', 'text-green-700');
    
    let borderColor, bgColor, textColor, circleColor;
    
    if (data.alert === "HIGH RISK ALERT") {
        borderColor = 'border-red-600'; bgColor = 'bg-red-50'; textColor = 'text-red-700'; circleColor = 'red';
        // Send alert message to Secure Management & Locals
        console.log(`[ALERT DISPATCH] To: Secure Management & Locals in ${data.state} - HIGH RISK ALERT! Immediate evacuation. Risk: ${data.risk_percentage}%`);
    } else if (data.alert === "MODERATE RISK ALERT") {
        borderColor = 'border-orange-500'; bgColor = 'bg-orange-50'; textColor = 'text-orange-700'; circleColor = 'orange';
        console.log(`[ALERT DISPATCH] To: Secure Management & Locals in ${data.state} - MODERATE RISK ALERT. Prepare resources. Risk: ${data.risk_percentage}%`);
    } else if (data.alert === "LESS RISK ALERT") {
        borderColor = 'border-yellow-400'; bgColor = 'bg-yellow-50'; textColor = 'text-yellow-700'; circleColor = 'yellow';
        console.log(`[ALERT DISPATCH] To: Secure Management in ${data.state} - LESS RISK ALERT. Monitor situation. Risk: ${data.risk_percentage}%`);
    } else {
        borderColor = 'border-green-500'; bgColor = 'bg-green-50'; textColor = 'text-green-700'; circleColor = 'green';
    }

    alertBox.classList.add(borderColor, bgColor);
    alertText.classList.add(textColor);
    
    alertText.innerText = data.alert;
    riskPercent.innerText = `Prediction Risk: ${data.risk_percentage}%`;

    // Update Priorities
    priorityList.innerHTML = '';
    if (data.priorities && data.priorities.length > 0) {
        data.priorities.forEach(p => {
            const li = document.createElement('li');
            li.className = "flex items-center justify-between p-2 bg-gray-50 rounded border";
            li.innerHTML = `<span class="font-bold">${p.level}</span> <span>→ ${p.resource}</span>`;
            
            if(p.level === "Critical") li.classList.add("text-red-600", "border-red-200");
            else if(p.level === "High") li.classList.add("text-orange-600", "border-orange-200");
            else li.classList.add("text-yellow-600", "border-yellow-200");

            priorityList.appendChild(li);
        });
    } else {
        priorityList.innerHTML = '<li class="text-gray-500 italic">No critical emergencies.</li>';
    }

    // Update Map
    const coords = stateCoordinates[data.state];
    if (coords) {
        map.flyTo(coords, 6, { duration: 0.5 }); // Added duration: 0.5 for a faster map transition
        if (currentMarker) map.removeLayer(currentMarker);
        if (currentCircle) map.removeLayer(currentCircle);

        currentMarker = L.marker(coords).addTo(map)
            .bindPopup(`<b>${data.state}</b><br>${data.alert}<br>Risk: ${data.risk_percentage}%`).openPopup();
        
        currentCircle = L.circle(coords, {
            color: circleColor,
            fillColor: circleColor,
            fillOpacity: 0.4,
            radius: data.risk_percentage * 2000 // scale radius by risk
        }).addTo(map);
    }
}

stateSelect.addEventListener('change', async (e) => {
    const state = e.target.value;
    if (!state) return;
    
    alertText.innerText = "Analyzing Risk Data...";
    riskPercent.innerText = "Running Machine Learning Models...";
    alertText.classList.remove('text-red-700', 'text-orange-700', 'text-yellow-700', 'text-green-700');
    alertBox.classList.remove('border-red-600', 'border-orange-500', 'border-yellow-400', 'border-green-500');
    alertBox.classList.add('border-gray-300');

    try {
        const response = await fetch('/api/predict', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ state: state })
        });
        const data = await response.json();
        updateAlertUI(data);
    } catch (error) {
        console.error("Error predicting risk:", error);
        alertText.innerText = "Error contacting server";
        riskPercent.innerText = "Please check connection";
    }
});

cancelBtn.addEventListener('click', () => {
    stateSelect.value = "";
    
    alertBox.className = "p-6 rounded shadow-lg bg-white border-l-8 border-gray-300 text-center";
    alertText.className = "text-3xl font-bold text-gray-800";
    alertText.innerText = "Select a Location";
    riskPercent.innerText = "Prediction Risk: N/A";
    priorityList.innerHTML = '<li class="text-gray-500 italic">No priorities currently allocated.</li>';
    
    if (currentMarker) map.removeLayer(currentMarker);
    if (currentCircle) map.removeLayer(currentCircle);
    map.setView([20.5937, 78.9629], 5);
});
