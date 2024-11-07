// City data
const cities = [
    { section: "cupertino", label: "Cupertino" },
    { section: "new-york-city", label: "New York City" },
    { section: "london", label: "London" },
    { section: "amsterdam", label: "Amsterdam" },
    { section: "tokyo", label: "Tokyo" },
    { section: "hong-kong", label: "Hong Kong" },
    { section: "sydney", label: "Sydney" }
];

// DOM elements
const navItemsContainer = document.getElementById('navItems');
const indicator = document.getElementById('indicator');

let currentScene = 'globes'; // Track current scene: 'globes' or 'cityImages'
let globesGroup, imageWall;
let scene, camera, renderer;

let loadingManager;
let loadingSpinner;

let panoramaScene, panoramaCamera;
let is360View = false;
let viewButton;

// Add this at the top with other constants
const panoramaUrls = {
    "cupertino": "https://i.imgur.com/AcxpOnH.jpeg",
    "new-york-city": "https://i.imgur.com/TAS54cs.jpeg",
    "london": "https://i.imgur.com/EeeHSWE.jpeg",
    "amsterdam": "https://i.imgur.com/kAZ0ALt.jpeg",
    "tokyo": "https://i.imgur.com/6fndpTM.jpeg",
    "hong-kong": "https://i.imgur.com/7ukk0wI.jpeg",
    "sydney": "https://i.imgur.com/siaLuSy.jpeg"
};

// Function to get city images URLs
function getCityImageUrls(cityName, count = 35) {
    const width = 800;
    const height = 600;
    const urls = [];

    const formattedCityName = cityName.replace(/\s+/g, '');

    for (let i = 0; i < count; i++) {
        const randomSeed = Math.floor(Math.random() * 1000);
        urls.push(`https://loremflickr.com/${width}/${height}/${formattedCityName}?random=${randomSeed}`);
    }

    return urls;
}

// Navigation setup
function createNavItems() {
    cities.forEach((city, index) => {
        const navItem = document.createElement('div');
        navItem.classList.add('nav-item');
        navItem.textContent = city.label;
        navItem.dataset.index = index;
        navItemsContainer.appendChild(navItem);

        navItem.addEventListener('click', () => {
            activateNavItem(navItem);
            if (currentScene === 'globes') {
                transitionToImageWall(city.label);
            } else {
                updateImageWall(city.label);
            }
        });
    });
}

function activateNavItem(selectedItem) {
    const allNavItems = document.querySelectorAll('.nav-item');
    allNavItems.forEach(item => item.classList.remove('active'));
    selectedItem.classList.add('active');

    const itemRect = selectedItem.getBoundingClientRect();
    const containerRect = navItemsContainer.getBoundingClientRect();

    indicator.style.width = `${itemRect.width}px`;
    indicator.style.left = `${itemRect.left - containerRect.left}px`;
}

// Three.js setup
function initThreeJS() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true
    });

    renderer.setClearColor(0xffffff, 1); // Pure white background
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.getElementById('background-canvas').appendChild(renderer.domElement);

    camera.position.z = 15;

    // Increased ambient light for better visibility
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    // Adjusted directional light
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
    directionalLight.position.set(5, 3, 5);
    scene.add(directionalLight);

    createCyberBackground();
    createGlobeScene();
    createImageWall();
    createLoadingSpinner();

    animate();
    setupWindowResize();
}
function createGlobeScene() {
    globesGroup = new THREE.Group();

    const textureLoader = new THREE.TextureLoader();
    const earthTexture = textureLoader.load('https://i.imgur.com/YQmV3FM.jpg');

    const globeCount = 15; // Further reduced 
    const sphereGeometry = new THREE.SphereGeometry(2.2, 64, 64); // Increased size and detail
    const sphereMaterial = new THREE.MeshPhongMaterial({
        map: earthTexture,
        shininess: 25,
        bumpScale: 0.05
    });

    for (let i = 0; i < globeCount; i++) {
        const globe = new THREE.Mesh(sphereGeometry, sphereMaterial);

        // Randomize initial rotation to show different sides of Earth
        globe.rotation.x = Math.random() * Math.PI * 2;
        globe.rotation.y = Math.random() * Math.PI * 2;
        globe.rotation.z = Math.random() * Math.PI * 2;

        globe.position.set(
            (Math.random() - 0.5) * 30, // Further increased spread
            (Math.random() - 0.5) * 30,
            (Math.random() - 0.5) * 30
        );

        globe.userData = {
            rotationSpeed: Math.random() * 0.003 + 0.003,
            rotationAxis: new THREE.Vector3(
                Math.random() - 0.5,
                Math.random() - 0.5,
                Math.random() - 0.5
            ).normalize()
        };
        globesGroup.add(globe);
    }

    // Move the entire group back
    globesGroup.position.z = -10;

    scene.add(globesGroup);
}

function createImageWall() {
    imageWall = new THREE.Group();
    imageWall.visible = false;
    scene.add(imageWall);
}

function createLoadingSpinner() {
    loadingSpinner = new THREE.Group();
    scene.add(loadingSpinner);
    loadingSpinner.visible = false;

    const ringCount = 5;
    const colors = [
        0x4f46e5, // Indigo
        0x7c3aed, // Violet
        0xc026d3, // Fuchsia
        0xe11d48, // Rose
        0xf59e0b  // Amber
    ];

    const baseRadius = 0.4;
    const thickness = 0.03;

    for (let i = 0; i < ringCount; i++) {
        const geometry = new THREE.TorusGeometry(
            baseRadius + i * 0.15,
            thickness,
            16,
            50
        );
        const material = new THREE.MeshBasicMaterial({
            color: colors[i],
            transparent: true,
            opacity: 0.9,
            side: THREE.DoubleSide
        });

        const ring = new THREE.Mesh(geometry, material);

        ring.userData.rotationAxis = new THREE.Vector3(
            Math.sin(i * Math.PI / ringCount),
            Math.cos(i * Math.PI / ringCount),
            Math.sin((i + 2) * Math.PI / ringCount)
        ).normalize();

        ring.userData.rotationSpeed = 0.02 + (i * 0.008);
        ring.userData.pulseSpeed = 0.003 + (i * 0.001);
        ring.userData.pulseOffset = i * Math.PI / ringCount;

        loadingSpinner.add(ring);
    }
}

function showLoadingSpinner() {
    if (loadingSpinner) {
        loadingSpinner.visible = true;
        loadingSpinner.position.set(0, 0, 0);
        loadingSpinner.scale.set(1, 1, 1);
    }
}

function hideLoadingSpinner() {
    if (loadingSpinner) {
        loadingSpinner.visible = false;
    }
}

function updateImageWall(cityName) {
    showLoadingSpinner();

    const images = getCityImageUrls(cityName);
    let loadedCount = 0;
    const totalImages = images.length;

    // Clear existing images
    while (imageWall.children.length) {
        const mesh = imageWall.children[0];
        mesh.geometry.dispose();
        mesh.material.dispose();
        imageWall.remove(mesh);
    }

    const rows = 4;
    const cols = 5;
    const spacing = 5;
    const radius = 30;
    const arcAngle = Math.PI * 0.3;

    images.forEach((url, index) => {
        const row = Math.floor(index / cols);
        const col = index % cols;

        const textureLoader = new THREE.TextureLoader();
        textureLoader.load(
            url,
            (texture) => {
                const scale = 0.8 + Math.random() * 0.4;
                const geometry = new THREE.PlaneGeometry(4 * scale, 3 * scale);
                const material = new THREE.MeshBasicMaterial({
                    map: texture,
                    side: THREE.DoubleSide
                });

                const mesh = new THREE.Mesh(geometry, material);

                const angleOffset = (col / (cols - 1)) * arcAngle - arcAngle / 2;
                const x = Math.sin(angleOffset) * radius;
                const z = Math.cos(angleOffset) * radius - radius;
                const y = (row - 1.5) * spacing;

                mesh.position.set(x, y, z);
                mesh.rotation.y = -angleOffset;

                mesh.rotation.x += (Math.random() - 0.5) * 0.2;
                mesh.rotation.z += (Math.random() - 0.5) * 0.2;

                imageWall.add(mesh);

                loadedCount++;
                if (loadedCount === totalImages) {
                    hideLoadingSpinner();
                }
            },
            undefined,
            (error) => {
                console.error('Error loading texture:', error);
                loadedCount++;
                if (loadedCount === totalImages) {
                    hideLoadingSpinner();
                }
            }
        );
    });
}

function transitionToImageWall(cityName) {
    currentScene = 'cityImages';

    // Fade out globes
    const fadeOutTween = new TWEEN.Tween(globesGroup.position)
        .to({ y: -20 }, 1000)
        .easing(TWEEN.Easing.Quadratic.Out)
        .onComplete(() => {
            globesGroup.visible = false;
        });

    // Show and fade in image wall
    imageWall.visible = true;
    imageWall.position.y = 20;
    updateImageWall(cityName);

    // Create and show the view button
    if (!viewButton) {
        createViewButton();
        setupButtonInteraction();
    }
    viewButton.visible = true;
    viewButton.position.set(0, 0, 0);

    const fadeInTween = new TWEEN.Tween(imageWall.position)
        .to({ y: 0 }, 1000)
        .easing(TWEEN.Easing.Quadratic.Out);

    fadeOutTween.start();
    fadeInTween.start();
}

function createViewButton() {
    // Create group to hold both crystal and its wireframe
    viewButton = new THREE.Group();

    // Crystal-like geometry with more faces
    const geometry = new THREE.OctahedronGeometry(1.5, 2);

    // Crystal shader material
    const crystalMaterial = new THREE.ShaderMaterial({
        uniforms: {
            time: { value: 0.0 }
        },
        vertexShader: `
            varying vec2 vUv;
            varying vec3 vNormal;
            varying vec3 vPosition;
            
            void main() {
                vUv = uv;
                vNormal = normalize(normalMatrix * normal);
                vPosition = position;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform float time;
            varying vec2 vUv;
            varying vec3 vNormal;
            varying vec3 vPosition;
            
            void main() {
                // Holographic base color
                vec3 baseColor = vec3(0.6, 0.8, 1.0);
                
                // Create smooth angular patterns based on position
                float pattern = sin(vPosition.x * 4.0 + vPosition.y * 4.0 + time * 0.5) * 0.5 + 0.5;
                
                // Enhanced fresnel effect for edge glow
                float fresnel = pow(1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0))), 3.0);
                
                // Iridescent color shift
                vec3 iridescent = vec3(
                    sin(fresnel * 3.0 + time * 0.5) * 0.5 + 0.5,
                    sin(fresnel * 3.0 + time * 0.5 + 2.094) * 0.5 + 0.5,
                    sin(fresnel * 3.0 + time * 0.5 + 4.188) * 0.5 + 0.5
                );
                
                // Subtle sparkle effect
                float sparkle = pow(sin(vPosition.x * 20.0 + time) * 
                                  sin(vPosition.y * 20.0 + time * 1.1) * 
                                  sin(vPosition.z * 20.0 + time * 0.9), 8.0) * 0.3;
                
                // Combine all effects
                vec3 finalColor = mix(baseColor, iridescent, fresnel * 0.7);
                finalColor = mix(finalColor, vec3(1.0), sparkle);
                finalColor += vec3(pattern * 0.2); // Add subtle pattern
                
                // Pulsing glow
                float glow = sin(time * 2.0) * 0.1 + 0.9;
                finalColor *= glow;
                
                // Transparency
                float alpha = 0.3 + fresnel * 0.5 + pattern * 0.2;
                
                gl_FragColor = vec4(finalColor, alpha);
            }
        `,
        transparent: true,
        side: THREE.DoubleSide
    });

    // Create wireframe material
    const wireframeMaterial = new THREE.LineBasicMaterial({
        color: 0x00ffff,
        transparent: true,
        opacity: 0.8,
        linewidth: 1
    });

    // Create main crystal mesh
    const crystalMesh = new THREE.Mesh(geometry, crystalMaterial);

    // Create wireframe mesh
    const wireframe = new THREE.LineSegments(
        new THREE.WireframeGeometry(geometry),
        wireframeMaterial
    );

    // Add both meshes to the group
    viewButton.add(crystalMesh);
    viewButton.add(wireframe);

    // Scale and position the button group
    viewButton.scale.set(2, 0.8, 0.4);
    viewButton.position.set(0, 0, 5);

    // Create a separate group for text that won't be affected by button scaling
    const textGroup = new THREE.Group();
    textGroup.position.copy(viewButton.position);
    scene.add(textGroup);

    // Add text with enhanced effects
    const loader = new THREE.FontLoader();
    loader.load('https://threejs.org/examples/fonts/helvetiker_regular.typeface.json', function (font) {
        const textGeometry = new THREE.TextGeometry('View 360°', {
            font: font,
            size: 0.35,  // Slightly smaller size
            height: 0.05,  // Less depth
            curveSegments: 12,
            bevelEnabled: true,
            bevelThickness: 0.02, // Reduced bevel thickness
            bevelSize: 0.01,  // Reduced bevel size
            bevelOffset: 0,
            bevelSegments: 5
        });

        // Create text outline for glow effect
        const outlineMaterial = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0.0 }
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform float time;
                varying vec2 vUv;
                
                void main() {
                    float glow = sin(time * 2.0) * 0.15 + 0.85; // Reduced glow intensity
                    vec3 color = vec3(0.7, 0.3, 1.0); // Base purple
                    color *= glow;
                    gl_FragColor = vec4(color, 0.6); // Reduced opacity
                }
            `,
            transparent: true,
            side: THREE.DoubleSide
        });

        // Main text material with metallic effect
        const textMaterial = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            metalness: 0.6,  // Reduced metalness
            roughness: 0.3,  // Increased roughness slightly
            emissive: 0x9933ff,
            emissiveIntensity: 0.8  // Reduced emissive intensity
        });

        // Create main text and outline
        const textMesh = new THREE.Mesh(textGeometry, textMaterial);
        const outlineMesh = new THREE.Mesh(textGeometry, outlineMaterial);

        // Scale outline slightly larger for glow effect
        outlineMesh.scale.multiplyScalar(1.05);  // Reduced outline scale

        // Create a group for the text meshes
        const textMeshGroup = new THREE.Group();
        textMeshGroup.add(textMesh);
        textMeshGroup.add(outlineMesh);

        // Center the text
        textGeometry.computeBoundingBox();
        const textWidth = textGeometry.boundingBox.max.x - textGeometry.boundingBox.min.x;
        textMeshGroup.position.set(-textWidth / 2, -0.2, 0.3);

        // Add text to the separate group
        textGroup.add(textMeshGroup);

        // Store reference to textGroup and materials for animations
        viewButton.userData.textGroup = textGroup;
        viewButton.userData.textMaterial = textMaterial;
        viewButton.userData.outlineMaterial = outlineMaterial;
    });

    scene.add(viewButton);
}

function create360Scene(cityName) {
    panoramaScene = new THREE.Scene();
    panoramaCamera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

    const geometry = new THREE.SphereGeometry(500, 60, 40);
    geometry.scale(-1, 1, 1);

    const textureLoader = new THREE.TextureLoader();
    // Use the specific panorama URL for the city
    const panoramaUrl = panoramaUrls[cityName.toLowerCase().replace(/\s+/g, '-')];

    textureLoader.load(panoramaUrl, function (texture) {
        const material = new THREE.MeshBasicMaterial({ map: texture });
        const sphere = new THREE.Mesh(geometry, material);
        panoramaScene.add(sphere);
    });
}
function setupButtonInteraction() {
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let buttonEnabled = true;  // Track if button is interactive

    window.addEventListener('click', (event) => {
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObject(viewButton, true);

        if (is360View) {
            // Exit 360 view
            is360View = false;
            buttonEnabled = true;  // Re-enable button
            viewButton.visible = true;
            new TWEEN.Tween(viewButton.position)
                .to({ y: 0 }, 1000)
                .easing(TWEEN.Easing.Quadratic.Out)
                .start();
        } else if (intersects.length > 0 && buttonEnabled) {
            // Enter 360 view
            buttonEnabled = false;  // Disable button
            is360View = true;
            const activeCity = document.querySelector('.nav-item.active').textContent;
            create360Scene(activeCity);

            // Animate button out
            new TWEEN.Tween(viewButton.position)
                .to({ y: -10 }, 1000)
                .easing(TWEEN.Easing.Quadratic.Out)
                .start();
        }
    });

    // Enhanced hover effect
    window.addEventListener('mousemove', (event) => {
        if (!buttonEnabled) {
            document.body.style.cursor = 'default';
            return;
        }

        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObject(viewButton, true);

        if (intersects.length > 0) {
            document.body.style.cursor = 'pointer';
        } else {
            document.body.style.cursor = 'default';
        }
    });
}
// Update the animation to handle the text group
function animate() {
    requestAnimationFrame(animate);
    TWEEN.update();

    // Animate cyber background
    if (backgroundEffects) {
        // Rotate particle system
        particlePoints.rotation.y += 0.0003;
        particlePoints.rotation.x += 0.0001;

        // Animate particles
        const positions = particleGeometry.attributes.position.array;
        for (let i = 0; i < positions.length; i += 3) {
            positions[i + 2] += Math.sin(Date.now() * 0.001 + i) * 0.01;
        }
        particleGeometry.attributes.position.needsUpdate = true;

        // Animate cyber grid
        cyberLines.rotation.x = Math.sin(Date.now() * 0.0001) * 0.1;
        cyberLines.rotation.y = Math.cos(Date.now() * 0.0002) * 0.1;

        // Animate glow spheres
        backgroundEffects.children.forEach(child => {
            if (child.userData.pulseSpeed) {
                const pulse = Math.sin(Date.now() * child.userData.pulseSpeed + child.userData.pulseOffset);
                child.scale.setScalar(1 + pulse * 0.3);
                child.material.opacity = 0.1 + pulse * 0.1;
            }
        });
    }

    if (is360View) {
        // Rotate panorama camera based on mouse movement
        panoramaCamera.rotation.y += 0.001;
        renderer.render(panoramaScene, panoramaCamera);
    } else {
        // Existing animation code
        if (currentScene === 'globes' && globesGroup) {
            globesGroup.rotation.y += 0.001;
            globesGroup.rotation.x += 0.0005;

            globesGroup.children.forEach(globe => {
                // globe.rotation.y += globe.userData.rotationSpeed;
                globe.rotateOnAxis(globe.userData.rotationAxis, globe.userData.rotationSpeed);
            });
        }

        if (currentScene === 'cityImages' && imageWall) {
            imageWall.rotation.y = Math.sin(Date.now() * 0.0005) * 0.1;
        }

        if (loadingSpinner && loadingSpinner.visible) {
            loadingSpinner.children.forEach((ring, index) => {
                ring.rotateOnAxis(ring.userData.rotationAxis, ring.userData.rotationSpeed);
                const pulse = Math.sin(Date.now() * ring.userData.pulseSpeed + ring.userData.pulseOffset);
                ring.scale.setScalar(1 + pulse * 0.1);
            });
        }

        // Animate button
        if (viewButton) {
            // Update shader time uniform
            if (viewButton.material && viewButton.material.uniforms) {
                viewButton.material.uniforms.time.value = Date.now();
            }

            // Floating animation for both button and text
            const floatY = Math.sin(Date.now() * 0.003) * 0.2;
            viewButton.position.y = floatY;

            // Update text position if it exists
            if (viewButton.userData.textGroup) {
                viewButton.userData.textGroup.position.y = floatY;
            }
        }

        renderer.render(scene, camera);
    }

    // Update the animation part that handles the text (add this to your animate function)
    if (viewButton && viewButton.userData.outlineMaterial) {
        viewButton.userData.outlineMaterial.uniforms.time.value = Date.now() * 0.001;

        // Pulse the emissive intensity
        if (viewButton.userData.textMaterial) {
            const pulse = Math.sin(Date.now() * 0.003) * 0.3 + 1.2;
            viewButton.userData.textMaterial.emissiveIntensity = pulse;
        }
    }
}

function setupWindowResize() {
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
}

// Add click handler to exit 360 view
function setup360Interaction() {
    let touchStartX = 0;
    let touchStartY = 0;

    window.addEventListener('touchstart', (event) => {
        touchStartX = event.touches[0].clientX;
        touchStartY = event.touches[0].clientY;
    });

    window.addEventListener('touchmove', (event) => {
        if (is360View) {
            const touchX = event.touches[0].clientX;
            const touchY = event.touches[0].clientY;
            const deltaX = touchX - touchStartX;
            const deltaY = touchY - touchStartY;

            panoramaCamera.rotation.y -= deltaX * 0.01;
            panoramaCamera.rotation.x -= deltaY * 0.01;

            touchStartX = touchX;
            touchStartY = touchY;
        }
    });
}
function createHomeButton() {
    const homeGroup = new THREE.Group();

    // Create house shape
    const roofGeometry = new THREE.CylinderGeometry(0, 0.5, 0.4, 4, 1);
    const baseGeometry = new THREE.BoxGeometry(0.8, 0.6, 0.8);
    const doorGeometry = new THREE.BoxGeometry(0.2, 0.3, 0.1);
    const windowGeometry = new THREE.BoxGeometry(0.15, 0.15, 0.1);

    const homeMaterial = new THREE.ShaderMaterial({
        uniforms: {
            time: { value: 0.0 },
            hover: { value: 0.0 }  // New uniform for hover effect
        },
        vertexShader: `
            varying vec2 vUv;
            varying vec3 vNormal;
            void main() {
                vUv = uv;
                vNormal = normalize(normalMatrix * normal);
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform float time;
            uniform float hover;
            varying vec2 vUv;
            varying vec3 vNormal;
            
            void main() {
                vec3 baseColor = vec3(0.3, 0.6, 1.0);
                float fresnel = pow(1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0))), 2.0);
                float glow = sin(time * 2.0) * 0.1 + 0.9;
                
                // Add pulse effect on hover
                float pulse = sin(time * 4.0) * 0.5 + 0.5;
                float hoverGlow = hover * pulse * 0.3;
                
                vec3 finalColor = mix(baseColor, vec3(1.0), fresnel * 0.7) * (glow + hoverGlow);
                gl_FragColor = vec4(finalColor, 0.9);
            }
        `,
        transparent: true,
        side: THREE.DoubleSide
    });

    // Create meshes
    const roof = new THREE.Mesh(roofGeometry, homeMaterial.clone());
    const base = new THREE.Mesh(baseGeometry, homeMaterial.clone());
    const door = new THREE.Mesh(doorGeometry, homeMaterial.clone());
    const windowLeft = new THREE.Mesh(windowGeometry, homeMaterial.clone());
    const windowRight = new THREE.Mesh(windowGeometry, homeMaterial.clone());

    // Position parts
    roof.position.y = 0.5;
    roof.rotation.y = Math.PI / 4;
    base.position.y = 0;
    door.position.set(0, -0.15, 0.4);
    windowLeft.position.set(-0.2, 0.1, 0.4);
    windowRight.position.set(0.2, 0.1, 0.4);

    // Add parts to group
    homeGroup.add(roof);
    homeGroup.add(base);
    homeGroup.add(door);
    homeGroup.add(windowLeft);
    homeGroup.add(windowRight);

    // Position relative to nav bar
    const navBar = document.getElementById('navItems');
    const navRect = navBar.getBoundingClientRect();
    const yPos = (navRect.top / window.innerHeight) * 2 - 1;
    homeGroup.position.set(-8, yPos + 1, 5);
    homeGroup.scale.set(1, 1, 1);

    // Initially hide the home button
    homeGroup.visible = false;

    // Interaction setup
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let isHovered = false;
    let hoverStartTime = 0;

    window.addEventListener('click', (event) => {
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObject(homeGroup, true);

        if (intersects.length > 0) {
            window.location.reload();
        }
    });

    // Enhanced hover effect
    window.addEventListener('mousemove', (event) => {
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObject(homeGroup, true);

        if (intersects.length > 0) {
            if (!isHovered) {
                isHovered = true;
                hoverStartTime = Date.now();
            }
            document.body.style.cursor = 'pointer';

            // Smooth scale up
            new TWEEN.Tween(homeGroup.scale)
                .to({ x: 1.2, y: 1.2, z: 1.2 }, 200)
                .easing(TWEEN.Easing.Quadratic.Out)
                .start();

        } else {
            if (isHovered) {
                isHovered = false;
            }
            if (!viewButton || !raycaster.intersectObject(viewButton, true).length) {
                document.body.style.cursor = 'default';
            }

            // Smooth scale down
            new TWEEN.Tween(homeGroup.scale)
                .to({ x: 1, y: 1, z: 1 }, 200)
                .easing(TWEEN.Easing.Quadratic.Out)
                .start();
        }
    });

    scene.add(homeGroup);

    // Update visibility when transitioning scenes
    const originalTransitionToImageWall = transitionToImageWall;
    transitionToImageWall = function (cityName) {
        originalTransitionToImageWall(cityName);
        homeGroup.visible = true;
    };

    // Enhanced animation
    function animateHome() {
        if (homeGroup && homeGroup.visible) {
            const time = Date.now() * 0.001;

            // Floating animation with rotation
            const floatY = Math.sin(time * 2) * 0.05;
            const rotationY = Math.sin(time * 1.5) * 0.1;

            homeGroup.position.y = yPos + 1 + floatY;
            homeGroup.rotation.y = rotationY;

            // Update shader uniforms for all parts
            homeGroup.children.forEach(child => {
                if (child.material.uniforms) {
                    child.material.uniforms.time.value = time;
                    child.material.uniforms.hover.value = isHovered ? 1.0 : 0.0;
                }
            });
        }
    }

    return animateHome;
}

function createClock() {
    const clockGroup = new THREE.Group();

    // Create background for the time
    const bgGeometry = new THREE.PlaneGeometry(2, 0.8);
    const bgMaterial = new THREE.ShaderMaterial({
        uniforms: {
            time: { value: 0.0 }
        },
        vertexShader: `
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform float time;
            varying vec2 vUv;
            
            void main() {
                vec3 baseColor = vec3(0.3, 0.6, 1.0);
                float glow = sin(time * 2.0) * 0.1 + 0.9;
                vec3 finalColor = baseColor * glow;
                gl_FragColor = vec4(finalColor, 0.3);
            }
        `,
        transparent: true,
        side: THREE.DoubleSide
    });

    const background = new THREE.Mesh(bgGeometry, bgMaterial);
    clockGroup.add(background);

    // Position clock
    const navBar = document.getElementById('navItems');
    const navRect = navBar.getBoundingClientRect();
    const yPos = (navRect.top / window.innerHeight) * 2 - 1;
    clockGroup.position.set(8, yPos + 1, 5);

    // Initially hide the clock
    clockGroup.visible = false;

    // Store current city
    clockGroup.userData = {
        currentCity: null,
        timeText: null
    };

    // City time zones
    const timeZones = {
        'Cupertino': 'America/Los_Angeles',
        'New York City': 'America/New_York',
        'London': 'Europe/London',
        'Amsterdam': 'Europe/Amsterdam',
        'Tokyo': 'Asia/Tokyo',
        'Hong Kong': 'Asia/Hong_Kong',
        'Sydney': 'Australia/Sydney'
    };

    // Create time text
    const loader = new THREE.FontLoader();
    loader.load('https://threejs.org/examples/fonts/helvetiker_regular.typeface.json', function (font) {
        const textMaterial = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            emissive: 0x9933ff,
            emissiveIntensity: 0.8
        });

        clockGroup.userData.font = font;
        clockGroup.userData.textMaterial = textMaterial;
    });

    scene.add(clockGroup);
    setupClockInteraction(clockGroup);

    // Update clock for city
    function updateCityTime(cityName) {
        if (!timeZones[cityName]) return;
        clockGroup.userData.currentCity = cityName;
        clockGroup.visible = true;

        // Force immediate time update
        clockGroup.userData.timeText = null;
    }

    // Animation function
    function animateClock() {
        if (clockGroup && clockGroup.visible && clockGroup.userData.currentCity) {
            const cityTime = new Date().toLocaleString('en-US', {
                timeZone: timeZones[clockGroup.userData.currentCity],
                hour12: false,
                hour: '2-digit',
                minute: '2-digit'
            });

            // Update text if it's different
            if (clockGroup.userData.timeText !== cityTime && clockGroup.userData.font) {
                // Remove old text if it exists
                const oldText = clockGroup.children.find(child => child.isText);
                if (oldText) clockGroup.remove(oldText);

                // Create new text geometry
                const textGeometry = new THREE.TextGeometry(cityTime, {
                    font: clockGroup.userData.font,
                    size: 0.3,
                    height: 0.05,
                    curveSegments: 12
                });

                const textMesh = new THREE.Mesh(textGeometry, clockGroup.userData.textMaterial);
                textMesh.isText = true;

                // Center the text
                textGeometry.computeBoundingBox();
                const textWidth = textGeometry.boundingBox.max.x - textGeometry.boundingBox.min.x;
                textMesh.position.set(-textWidth / 2, -0.15, 0.1);

                clockGroup.add(textMesh);
                clockGroup.userData.timeText = cityTime;
            }

            // Floating animation
            const floatY = Math.sin(Date.now() * 0.002) * 0.05;
            clockGroup.position.y = yPos + 1 + floatY;

            // Update background shader
            if (background.material.uniforms) {
                background.material.uniforms.time.value = Date.now() * 0.001;
            }
        }
    }

    // Update both transition functions to show clock
    const originalTransitionToImageWall = transitionToImageWall;
    transitionToImageWall = function (cityName) {
        originalTransitionToImageWall(cityName);
        updateCityTime(cityName);
    };

    const originalUpdateImageWall = updateImageWall;
    updateImageWall = function (cityName) {
        originalUpdateImageWall(cityName);
        updateCityTime(cityName);
    };

    return animateClock;
}


// Add these variables at the top
let particleSystem, particleGeometry, particlePoints;
let cyberLines;
let backgroundEffects;

// Add this function to create cyber background effects
function createCyberBackground() {
    backgroundEffects = new THREE.Group();
    scene.add(backgroundEffects);

    // Create particle system
    const particleCount = 2000;
    particleGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount * 3; i += 3) {
        // Spread particles in a cube
        positions[i] = (Math.random() - 0.5) * 100;
        positions[i + 1] = (Math.random() - 0.5) * 100;
        positions[i + 2] = (Math.random() - 0.5) * 100;

        // Add colors with cyber theme
        colors[i] = 0.2 + Math.random() * 0.5;     // Blue-ish
        colors[i + 1] = 0.5 + Math.random() * 0.5; // Cyan-ish
        colors[i + 2] = 1;                         // Full blue
    }

    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const particleMaterial = new THREE.PointsMaterial({
        size: 0.2,
        vertexColors: true,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending
    });

    particlePoints = new THREE.Points(particleGeometry, particleMaterial);
    backgroundEffects.add(particlePoints);

    // Create cyber grid lines
    cyberLines = new THREE.Group();
    const lineCount = 20;
    const lineSpacing = 5;
    const lineGeometry = new THREE.BufferGeometry();
    const lineMaterial = new THREE.LineBasicMaterial({
        color: 0x00ffff,
        transparent: true,
        opacity: 0.2
    });

    // Create horizontal and vertical grid lines
    for (let i = -lineCount; i <= lineCount; i++) {
        const horizontalPoints = [];
        const verticalPoints = [];

        horizontalPoints.push(new THREE.Vector3(-lineCount * lineSpacing, i * lineSpacing, -50));
        horizontalPoints.push(new THREE.Vector3(lineCount * lineSpacing, i * lineSpacing, -50));

        verticalPoints.push(new THREE.Vector3(i * lineSpacing, -lineCount * lineSpacing, -50));
        verticalPoints.push(new THREE.Vector3(i * lineSpacing, lineCount * lineSpacing, -50));

        const hLineGeometry = new THREE.BufferGeometry().setFromPoints(horizontalPoints);
        const vLineGeometry = new THREE.BufferGeometry().setFromPoints(verticalPoints);

        const hLine = new THREE.Line(hLineGeometry, lineMaterial);
        const vLine = new THREE.Line(vLineGeometry, lineMaterial);

        cyberLines.add(hLine);
        cyberLines.add(vLine);
    }

    backgroundEffects.add(cyberLines);

    // Add pulsing glow spheres
    const glowCount = 5;
    for (let i = 0; i < glowCount; i++) {
        const glowGeometry = new THREE.SphereGeometry(2, 32, 32);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ffff,
            transparent: true,
            opacity: 0.1,
            blending: THREE.AdditiveBlending
        });

        const glowSphere = new THREE.Mesh(glowGeometry, glowMaterial);
        glowSphere.position.set(
            (Math.random() - 0.5) * 40,
            (Math.random() - 0.5) * 40,
            -30
        );

        glowSphere.userData = {
            pulseSpeed: 0.001 + Math.random() * 0.002,
            pulseOffset: Math.random() * Math.PI * 2
        };

        backgroundEffects.add(glowSphere);
    }
}
// Initialize everything
document.addEventListener('DOMContentLoaded', () => {
    createNavItems();
    initThreeJS();
    const animateHome = createHomeButton();
    const animateClock = createClock();

    // Add both animations
    const originalAnimate = animate;
    animate = function () {
        originalAnimate();
        animateHome();
        animateClock();
    };
});

// Add hover effect for the clock
function setupClockInteraction(clockGroup) {
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let isHovered = false;

    window.addEventListener('mousemove', (event) => {
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObject(clockGroup, true);

        if (intersects.length > 0) {
            if (!isHovered) {
                isHovered = true;
                document.body.style.cursor = 'pointer';

                // Scale up animation
                new TWEEN.Tween(clockGroup.scale)
                    .to({ x: 1.2, y: 1.2, z: 1.2 }, 200)
                    .easing(TWEEN.Easing.Quadratic.Out)
                    .start();

                // Increase glow
                if (clockGroup.userData.textMaterial) {
                    new TWEEN.Tween(clockGroup.userData.textMaterial)
                        .to({ emissiveIntensity: 1.5 }, 200)
                        .start();
                }
            }
        } else {
            if (isHovered) {
                isHovered = false;
                if (!viewButton || !raycaster.intersectObject(viewButton, true).length) {
                    document.body.style.cursor = 'default';
                }

                // Scale down animation
                new TWEEN.Tween(clockGroup.scale)
                    .to({ x: 1, y: 1, z: 1 }, 200)
                    .easing(TWEEN.Easing.Quadratic.Out)
                    .start();

                // Reset glow
                if (clockGroup.userData.textMaterial) {
                    new TWEEN.Tween(clockGroup.userData.textMaterial)
                        .to({ emissiveIntensity: 0.8 }, 200)
                        .start();
                }
            }
        }
    });
}

// Enhanced view button interaction
function setupButtonInteraction() {
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let buttonEnabled = true;
    let isHovered = false;

    window.addEventListener('click', (event) => {
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObject(viewButton, true);

        if (is360View) {
            is360View = false;
            buttonEnabled = true;
            viewButton.visible = true;

            // Add pop-in animation
            viewButton.scale.set(0.5, 0.5, 0.5);
            new TWEEN.Tween(viewButton.scale)
                .to({ x: 1, y: 1, z: 1 }, 500)
                .easing(TWEEN.Easing.Back.Out)
                .start();

            new TWEEN.Tween(viewButton.position)
                .to({ y: 0 }, 1000)
                .easing(TWEEN.Easing.Quadratic.Out)
                .start();
        } else if (intersects.length > 0 && buttonEnabled) {
            buttonEnabled = false;
            is360View = true;
            const activeCity = document.querySelector('.nav-item.active').textContent;
            create360Scene(activeCity);

            // Add pop-out animation
            new TWEEN.Tween(viewButton.scale)
                .to({ x: 0.5, y: 0.5, z: 0.5 }, 300)
                .easing(TWEEN.Easing.Back.In)
                .start();

            new TWEEN.Tween(viewButton.position)
                .to({ y: -10 }, 1000)
                .easing(TWEEN.Easing.Quadratic.Out)
                .start();
        }
    });

    // Enhanced hover effect
    window.addEventListener('mousemove', (event) => {
        if (!buttonEnabled) {
            document.body.style.cursor = 'default';
            return;
        }

        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObject(viewButton, true);

        if (intersects.length > 0) {
            if (!isHovered) {
                isHovered = true;
                document.body.style.cursor = 'pointer';

                // Scale up with bounce effect
                new TWEEN.Tween(viewButton.scale)
                    .to({ x: 1.2, y: 1.2, z: 1.2 }, 300)
                    .easing(TWEEN.Easing.Back.Out)
                    .start();

                // Increase glow intensity
                if (viewButton.userData.textMaterial) {
                    new TWEEN.Tween(viewButton.userData.textMaterial)
                        .to({ emissiveIntensity: 1.5 }, 200)
                        .start();
                }
            }
        } else {
            if (isHovered) {
                isHovered = false;
                document.body.style.cursor = 'default';

                // Scale down smoothly
                new TWEEN.Tween(viewButton.scale)
                    .to({ x: 1, y: 1, z: 1 }, 200)
                    .easing(TWEEN.Easing.Quadratic.Out)
                    .start();

                // Reset glow intensity
                if (viewButton.userData.textMaterial) {
                    new TWEEN.Tween(viewButton.userData.textMaterial)
                        .to({ emissiveIntensity: 0.8 }, 200)
                        .start();
                }
            }
        }
    });
}


