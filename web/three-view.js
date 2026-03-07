// ==================== GRAPH 3D VIEW ====================
class Graph3DView {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.container = null;
        this.nodes3D = new Map();
        this.edges3D = new Map();
        this.nodeLabels = [];
        this.isAutoRotating = true;
        this.isWireframe = false;
        this.animationId = null;
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.hoveredNode = null;
        this.particles = null;
        this.spherical = { theta: 0, phi: Math.PI / 4, radius: 60 };
        this.updateCameraPosition = null;
        this.initialized = false;
    }

    init(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error('Container not found:', containerId);
            return false;
        }

        this.container.innerHTML = '';

        const width = this.container.clientWidth || 800;
        const height = this.container.clientHeight || 600;

        // Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x1a1a2e);
        this.scene.fog = new THREE.FogExp2(0x1a1a2e, 0.008);

        // Camera
        this.camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
        this.camera.position.set(0, 40, 80);
        this.camera.lookAt(0, 0, 0);

        // Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.container.appendChild(this.renderer.domElement);

        this.setupLights();
        this.setupEnvironment();
        this.setupControls();

        window.addEventListener('resize', () => this.onResize());
        this.renderer.domElement.addEventListener('mousemove', (e) => this.onMouseMove(e));

        this.initialized = true;
        return true;
    }

    setupLights() {
        const ambientLight = new THREE.AmbientLight(0x6060a0, 0.6);
        this.scene.add(ambientLight);

        const mainLight = new THREE.DirectionalLight(0xffffff, 1.2);
        mainLight.position.set(50, 100, 50);
        mainLight.castShadow = true;
        mainLight.shadow.mapSize.width = 2048;
        mainLight.shadow.mapSize.height = 2048;
        this.scene.add(mainLight);

        const fillLight1 = new THREE.PointLight(0x667eea, 1, 150);
        fillLight1.position.set(40, 30, 40);
        this.scene.add(fillLight1);

        const fillLight2 = new THREE.PointLight(0xf093fb, 1, 150);
        fillLight2.position.set(-40, 30, -40);
        this.scene.add(fillLight2);

        const fillLight3 = new THREE.PointLight(0x43e97b, 0.8, 150);
        fillLight3.position.set(0, -20, 50);
        this.scene.add(fillLight3);
    }

    setupEnvironment() {
        const gridHelper = new THREE.GridHelper(120, 24, 0x667eea, 0x444488);
        gridHelper.position.y = -15;
        gridHelper.material.opacity = 0.3;
        gridHelper.material.transparent = true;
        this.scene.add(gridHelper);

        const groundGeometry = new THREE.PlaneGeometry(200, 200);
        const groundMaterial = new THREE.MeshStandardMaterial({
            color: 0x16213e,
            roughness: 0.9,
            metalness: 0.1,
            transparent: true,
            opacity: 0.8
        });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = -15;
        ground.receiveShadow = true;
        this.scene.add(ground);

        this.createParticles();
    }

    createParticles() {
        const particleCount = 300;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);

        for (let i = 0; i < particleCount; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 150;
            positions[i * 3 + 1] = Math.random() * 80 - 10;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 150;

            const color = new THREE.Color();
            color.setHSL(0.6 + Math.random() * 0.3, 0.8, 0.6);
            colors[i * 3] = color.r;
            colors[i * 3 + 1] = color.g;
            colors[i * 3 + 2] = color.b;
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        const material = new THREE.PointsMaterial({
            size: 0.4,
            vertexColors: true,
            transparent: true,
            opacity: 0.7,
            blending: THREE.AdditiveBlending
        });

        this.particles = new THREE.Points(geometry, material);
        this.scene.add(this.particles);
    }

    setupControls() {
        let isDragging = false;
        let isRightDragging = false;
        let previousMousePosition = { x: 0, y: 0 };

        const updateCameraPosition = () => {
            this.camera.position.x = this.spherical.radius * Math.sin(this.spherical.phi) * Math.cos(this.spherical.theta);
            this.camera.position.y = this.spherical.radius * Math.cos(this.spherical.phi);
            this.camera.position.z = this.spherical.radius * Math.sin(this.spherical.phi) * Math.sin(this.spherical.theta);
            this.camera.lookAt(0, 0, 0);
        };

        this.updateCameraPosition = updateCameraPosition;

        this.renderer.domElement.addEventListener('mousedown', (e) => {
            if (e.button === 0) isDragging = true;
            if (e.button === 2) isRightDragging = true;
            previousMousePosition = { x: e.clientX, y: e.clientY };
        });

        this.renderer.domElement.addEventListener('mousemove', (e) => {
            const deltaX = e.clientX - previousMousePosition.x;
            const deltaY = e.clientY - previousMousePosition.y;

            if (isDragging) {
                this.spherical.theta -= deltaX * 0.01;
                this.spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, this.spherical.phi + deltaY * 0.01));
                updateCameraPosition();
            }

            if (isRightDragging) {
                const panSpeed = 0.1;
                const right = new THREE.Vector3();
                const up = new THREE.Vector3(0, 1, 0);
                right.crossVectors(this.camera.getWorldDirection(new THREE.Vector3()), up).normalize();
                
                this.scene.position.x += right.x * deltaX * panSpeed;
                this.scene.position.z += right.z * deltaX * panSpeed;
                this.scene.position.y -= deltaY * panSpeed;
            }

            previousMousePosition = { x: e.clientX, y: e.clientY };
        });

        this.renderer.domElement.addEventListener('mouseup', () => {
            isDragging = false;
            isRightDragging = false;
        });

        this.renderer.domElement.addEventListener('mouseleave', () => {
            isDragging = false;
            isRightDragging = false;
        });

        this.renderer.domElement.addEventListener('wheel', (e) => {
            e.preventDefault();
            this.spherical.radius = Math.max(20, Math.min(150, this.spherical.radius + e.deltaY * 0.05));
            updateCameraPosition();
        });

        this.renderer.domElement.addEventListener('contextmenu', (e) => e.preventDefault());

        updateCameraPosition();
    }

    createNode(id, x, y, z, color = 0x667eea) {
        const group = new THREE.Group();

        // Main sphere
        const geometry = new THREE.SphereGeometry(2.5, 32, 32);
        const material = new THREE.MeshPhysicalMaterial({
            color: color,
            metalness: 0.4,
            roughness: 0.3,
            clearcoat: 1,
            clearcoatRoughness: 0.1,
            envMapIntensity: 1,
            wireframe: this.isWireframe
        });
        const sphere = new THREE.Mesh(geometry, material);
        sphere.castShadow = true;
        sphere.receiveShadow = true;
        group.add(sphere);

        // Glow
        const glowGeometry = new THREE.SphereGeometry(3.2, 32, 32);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.2,
            side: THREE.BackSide
        });
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        group.add(glow);

        // Ring
        const ringGeometry = new THREE.TorusGeometry(3.5, 0.15, 16, 32);
        const ringMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.4
        });
        const ring = new THREE.Mesh(ringGeometry, ringMaterial);
        ring.rotation.x = Math.PI / 2;
        group.add(ring);

        group.position.set(x, y, z);
        group.userData = { id, originalColor: color, currentColor: color, baseY: y };

        this.scene.add(group);
        this.nodes3D.set(id, group);

        this.createNodeLabel(id, group);

        return group;
    }

    createNodeLabel(id, nodeGroup) {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 128;
        canvas.height = 64;

        context.fillStyle = 'rgba(26, 26, 46, 0.9)';
        context.beginPath();
        context.roundRect(10, 10, 108, 44, 8);
        context.fill();

        context.strokeStyle = 'rgba(102, 126, 234, 0.8)';
        context.lineWidth = 2;
        context.stroke();

        context.fillStyle = '#ffffff';
        context.font = 'bold 28px Inter, Arial, sans-serif';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(id.toString(), 64, 32);

        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        
        const material = new THREE.SpriteMaterial({ 
            map: texture, 
            transparent: true,
            depthTest: false
        });
        const sprite = new THREE.Sprite(material);
        sprite.scale.set(5, 2.5, 1);
        sprite.position.y = 5;
        nodeGroup.add(sprite);
        this.nodeLabels.push(sprite);
    }

    createEdge(fromNode, toNode, color = 0x4facfe) {
        const from = this.nodes3D.get(fromNode);
        const to = this.nodes3D.get(toNode);
        if (!from || !to) return null;

        const curve = new THREE.CatmullRomCurve3([
            from.position.clone(),
            new THREE.Vector3(
                (from.position.x + to.position.x) / 2,
                Math.max(from.position.y, to.position.y) + 3,
                (from.position.z + to.position.z) / 2
            ),
            to.position.clone()
        ]);
        
        const tubeGeometry = new THREE.TubeGeometry(curve, 32, 0.2, 8, false);
        const tubeMaterial = new THREE.MeshPhysicalMaterial({
            color: color,
            metalness: 0.6,
            roughness: 0.2,
            transparent: true,
            opacity: 0.85,
            wireframe: this.isWireframe
        });
        const tube = new THREE.Mesh(tubeGeometry, tubeMaterial);
        tube.castShadow = true;
        tube.userData = { from: fromNode, to: toNode, originalColor: color };
        this.scene.add(tube);

        const edgeKey = `${fromNode}-${toNode}`;
        this.edges3D.set(edgeKey, tube);

        return tube;
    }

    loadGraph(graph) {
        if (!this.initialized) return;

        this.clearScene();

        const nodes = Array.from(graph.nodes.entries());
        const edges = graph.edges;

        if (nodes.length === 0) return;

        const nodeCount = nodes.length;
        const radius = Math.max(20, nodeCount * 4);
        const colors = [0x667eea, 0xf093fb, 0x4facfe, 0x43e97b, 0xfda085, 0xf5576c, 0xa8edea, 0xffecd2];

        nodes.forEach(([id, node], index) => {
            let x, y, z;
            
            if (nodeCount <= 6) {
                const angle = (index / nodeCount) * Math.PI * 2;
                x = radius * Math.cos(angle);
                y = 0;
                z = radius * Math.sin(angle);
            } else {
                const phi = Math.acos(-1 + (2 * index + 1) / nodeCount);
                const theta = Math.sqrt(nodeCount * Math.PI) * phi;
                
                x = radius * Math.cos(theta) * Math.sin(phi);
                y = radius * Math.cos(phi) * 0.5;
                z = radius * Math.sin(theta) * Math.sin(phi);
            }

            const color = colors[index % colors.length];
            this.createNode(id, x, y, z, color);
        });

        edges.forEach(edge => {
            this.createEdge(edge.from, edge.to);
        });
    }

    highlightNode(nodeId, color) {
        const node = this.nodes3D.get(nodeId);
        if (node && node.children[0]) {
            const sphere = node.children[0];
            const glow = node.children[1];
            
            if (sphere.material) {
                sphere.material.color.setHex(color);
                sphere.material.emissive = new THREE.Color(color);
                sphere.material.emissiveIntensity = 0.4;
            }
            if (glow && glow.material) {
                glow.material.color.setHex(color);
                glow.material.opacity = 0.4;
            }
            node.userData.currentColor = color;
            node.scale.set(1.3, 1.3, 1.3);
        }
    }

    highlightEdge(fromNode, toNode, color) {
        const edgeKey = `${fromNode}-${toNode}`;
        const reverseKey = `${toNode}-${fromNode}`;
        
        let tube = this.edges3D.get(edgeKey) || this.edges3D.get(reverseKey);
        if (tube && tube.material) {
            tube.material.color.setHex(color);
            tube.material.opacity = 1;
            tube.material.emissive = new THREE.Color(color);
            tube.material.emissiveIntensity = 0.3;
        }
    }

    resetColors() {
        this.nodes3D.forEach((node) => {
            const originalColor = node.userData.originalColor;
            const sphere = node.children[0];
            const glow = node.children[1];
            
            if (sphere && sphere.material) {
                sphere.material.color.setHex(originalColor);
                sphere.material.emissive = new THREE.Color(0x000000);
                sphere.material.emissiveIntensity = 0;
            }
            if (glow && glow.material) {
                glow.material.color.setHex(originalColor);
                glow.material.opacity = 0.2;
            }
            node.userData.currentColor = originalColor;
            node.scale.set(1, 1, 1);
        });

        this.edges3D.forEach((tube) => {
            const originalColor = tube.userData.originalColor;
            if (tube.material) {
                tube.material.color.setHex(originalColor);
                tube.material.opacity = 0.85;
                tube.material.emissive = new THREE.Color(0x000000);
                tube.material.emissiveIntensity = 0;
            }
        });
    }

    clearScene() {
        this.nodes3D.forEach(node => this.scene.remove(node));
        this.nodes3D.clear();

        this.edges3D.forEach(edge => this.scene.remove(edge));
        this.edges3D.clear();

        this.nodeLabels = [];
    }

    onMouseMove(event) {
        if (!this.renderer) return;
        
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.camera);

        const nodeObjects = Array.from(this.nodes3D.values()).map(g => g.children[0]).filter(Boolean);
        const intersects = this.raycaster.intersectObjects(nodeObjects);

        if (this.hoveredNode && this.hoveredNode.parent) {
            const prevGroup = this.hoveredNode.parent;
            if (prevGroup.scale) {
                prevGroup.scale.lerp(new THREE.Vector3(1, 1, 1), 0.3);
            }
            this.hoveredNode = null;
        }

        if (intersects.length > 0) {
            const hoveredSphere = intersects[0].object;
            const group = hoveredSphere.parent;
            if (group && group.scale) {
                group.scale.set(1.2, 1.2, 1.2);
            }
            this.hoveredNode = hoveredSphere;
            this.renderer.domElement.style.cursor = 'pointer';
        } else {
            this.renderer.domElement.style.cursor = 'grab';
        }
    }

    onResize() {
        if (!this.container || !this.camera || !this.renderer) return;
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;

        if (width > 0 && height > 0) {
            this.camera.aspect = width / height;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(width, height);
        }
    }

    toggleAutoRotate() {
        this.isAutoRotating = !this.isAutoRotating;
        return this.isAutoRotating;
    }

    toggleWireframe() {
        this.isWireframe = !this.isWireframe;
        this.nodes3D.forEach(group => {
            group.children.forEach(child => {
                if (child.material && child.material.wireframe !== undefined) {
                    child.material.wireframe = this.isWireframe;
                }
            });
        });
        this.edges3D.forEach(edge => {
            if (edge.material && edge.material.wireframe !== undefined) {
                edge.material.wireframe = this.isWireframe;
            }
        });
        return this.isWireframe;
    }

    resetCamera() {
        this.spherical.theta = 0;
        this.spherical.phi = Math.PI / 4;
        this.spherical.radius = 60;
        if (this.updateCameraPosition) {
            this.updateCameraPosition();
        }
        this.scene.position.set(0, 0, 0);
    }

    animate() {
        if (!this.renderer || !this.scene || !this.camera) return;
        
        this.animationId = requestAnimationFrame(() => this.animate());

        if (this.isAutoRotating && this.updateCameraPosition) {
            this.spherical.theta += 0.003;
            this.updateCameraPosition();
        }

        if (this.particles) {
            this.particles.rotation.y += 0.0003;
        }

        const time = Date.now() * 0.001;
        this.nodes3D.forEach((group, index) => {
            if (group.children[2]) {
                group.children[2].rotation.z = time * 0.5 + index;
            }
            const baseY = group.userData.baseY || 0;
            group.position.y = baseY + Math.sin(time * 1.5 + index * 0.5) * 0.5;
        });

        this.renderer.render(this.scene, this.camera);
    }

    start() {
        if (!this.animationId && this.initialized) {
            this.animate();
        }
    }

    stop() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }

    dispose() {
        this.stop();
        this.clearScene();
        if (this.renderer) {
            this.renderer.dispose();
            if (this.container && this.renderer.domElement && this.container.contains(this.renderer.domElement)) {
                this.container.removeChild(this.renderer.domElement);
            }
        }
        this.initialized = false;
    }
}

// ==================== ISLAND 3D VIEW ====================
class Island3DView {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.container = null;
        this.cells3D = [];
        this.cellMap = new Map();
        this.water = null;
        this.isAutoRotating = true;
        this.animationId = null;
        this.spherical = { theta: Math.PI / 4, phi: Math.PI / 4, radius: 80 };
        this.updateCameraPosition = null;
        this.initialized = false;
        this.trees = [];
    }

    init(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) return false;

        this.container.innerHTML = '';

        const width = this.container.clientWidth || 800;
        const height = this.container.clientHeight || 600;

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0a1628);
        this.scene.fog = new THREE.FogExp2(0x0a1628, 0.006);

        this.camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
        this.camera.position.set(50, 60, 50);
        this.camera.lookAt(0, 0, 0);

        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.container.appendChild(this.renderer.domElement);

        this.setupLights();
        this.setupControls();

        window.addEventListener('resize', () => this.onResize());
        
        this.initialized = true;
        return true;
    }

    setupLights() {
        const ambientLight = new THREE.AmbientLight(0x4488aa, 0.6);
        this.scene.add(ambientLight);

        const sunLight = new THREE.DirectionalLight(0xffffcc, 1.2);
        sunLight.position.set(100, 150, 100);
        sunLight.castShadow = true;
        sunLight.shadow.mapSize.width = 2048;
        sunLight.shadow.mapSize.height = 2048;
        this.scene.add(sunLight);

        const hemisphereLight = new THREE.HemisphereLight(0x87ceeb, 0x2e7d8a, 0.6);
        this.scene.add(hemisphereLight);

        const pointLight1 = new THREE.PointLight(0x4facfe, 0.8, 100);
        pointLight1.position.set(30, 30, 30);
        this.scene.add(pointLight1);

        const pointLight2 = new THREE.PointLight(0x43e97b, 0.8, 100);
        pointLight2.position.set(-30, 30, -30);
        this.scene.add(pointLight2);
    }

    setupControls() {
        let isDragging = false;
        let previousMousePosition = { x: 0, y: 0 };

        const updateCameraPosition = () => {
            this.camera.position.x = this.spherical.radius * Math.sin(this.spherical.phi) * Math.cos(this.spherical.theta);
            this.camera.position.y = this.spherical.radius * Math.cos(this.spherical.phi);
            this.camera.position.z = this.spherical.radius * Math.sin(this.spherical.phi) * Math.sin(this.spherical.theta);
            this.camera.lookAt(0, 0, 0);
        };

        this.updateCameraPosition = updateCameraPosition;

        this.renderer.domElement.addEventListener('mousedown', (e) => {
            isDragging = true;
            previousMousePosition = { x: e.clientX, y: e.clientY };
        });

        this.renderer.domElement.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            const deltaX = e.clientX - previousMousePosition.x;
            const deltaY = e.clientY - previousMousePosition.y;
            this.spherical.theta -= deltaX * 0.01;
            this.spherical.phi = Math.max(0.1, Math.min(Math.PI / 2 - 0.1, this.spherical.phi + deltaY * 0.01));
            updateCameraPosition();
            previousMousePosition = { x: e.clientX, y: e.clientY };
        });

        this.renderer.domElement.addEventListener('mouseup', () => isDragging = false);
        this.renderer.domElement.addEventListener('mouseleave', () => isDragging = false);
        
        this.renderer.domElement.addEventListener('wheel', (e) => {
            e.preventDefault();
            this.spherical.radius = Math.max(30, Math.min(150, this.spherical.radius + e.deltaY * 0.05));
            updateCameraPosition();
        });

        updateCameraPosition();
    }

    loadIslandGrid(grid, islandMap) {
        if (!this.initialized) return;
        
        this.clearScene();

        const rows = grid.length;
        const cols = grid[0].length;
        const cellSize = 3;
        const offsetX = -(cols * cellSize) / 2;
        const offsetZ = -(rows * cellSize) / 2;

        // Water plane
        const waterGeometry = new THREE.PlaneGeometry(cols * cellSize + 30, rows * cellSize + 30, 64, 64);
        const waterMaterial = new THREE.MeshPhysicalMaterial({
            color: 0x006994,
            metalness: 0.1,
            roughness: 0.3,
            transparent: true,
            opacity: 0.85,
            clearcoat: 0.5
        });
        this.water = new THREE.Mesh(waterGeometry, waterMaterial);
        this.water.rotation.x = -Math.PI / 2;
        this.water.position.y = -0.5;
        this.water.receiveShadow = true;
        this.scene.add(this.water);

        // Island colors
        const islandColors = [
            0xFF6B6B, 0x4ECDC4, 0x45B7D1, 0xFFA07A,
            0x98D8C8, 0xF7DC6F, 0xBB8FCE, 0x85C1E9
        ];

        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < cols; j++) {
                const x = offsetX + j * cellSize + cellSize / 2;
                const z = offsetZ + i * cellSize + cellSize / 2;

                if (grid[i][j] === 1) {
                    const islandNum = islandMap && islandMap[i] && islandMap[i][j] ? islandMap[i][j] : 1;
                    const color = islandColors[(islandNum - 1) % islandColors.length];
                    const height = 2 + Math.random() * 2;

                    // Land block
                    const geometry = new THREE.BoxGeometry(cellSize - 0.3, height, cellSize - 0.3);
                    const material = new THREE.MeshPhysicalMaterial({
                        color: color,
                        metalness: 0.1,
                        roughness: 0.6,
                        clearcoat: 0.3
                    });
                    const block = new THREE.Mesh(geometry, material);
                    block.position.set(x, height / 2, z);
                    block.castShadow = true;
                    block.receiveShadow = true;
                    block.userData = { row: i, col: j, originalColor: color, baseHeight: height };
                    this.scene.add(block);
                    this.cells3D.push(block);
                    this.cellMap.set(`${i}-${j}`, block);

                    // Add grass on top
                    const grassGeometry = new THREE.BoxGeometry(cellSize - 0.3, 0.3, cellSize - 0.3);
                    const grassMaterial = new THREE.MeshPhysicalMaterial({
                        color: 0x228B22,
                        metalness: 0.0,
                        roughness: 0.8
                    });
                    const grass = new THREE.Mesh(grassGeometry, grassMaterial);
                    grass.position.set(x, height + 0.15, z);
                    grass.castShadow = true;
                    this.scene.add(grass);
                    this.cells3D.push(grass);

                    // Add tree randomly
                    if (Math.random() > 0.6) {
                        this.addTree(x, height, z);
                    }
                } else {
                    // Water cell with animation marker
                    const geometry = new THREE.BoxGeometry(cellSize - 0.3, 0.3, cellSize - 0.3);
                    const material = new THREE.MeshPhysicalMaterial({
                        color: 0x3498db,
                        metalness: 0.5,
                        roughness: 0.2,
                        transparent: true,
                        opacity: 0.6
                    });
                    const waterCell = new THREE.Mesh(geometry, material);
                    waterCell.position.set(x, -0.2, z);
                    waterCell.userData = { row: i, col: j, isWater: true };
                    this.scene.add(waterCell);
                    this.cells3D.push(waterCell);
                    this.cellMap.set(`${i}-${j}`, waterCell);
                }
            }
        }
    }

    addTree(x, baseHeight, z) {
        // Trunk
        const trunkGeometry = new THREE.CylinderGeometry(0.15, 0.25, 1.5, 8);
        const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
        const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
        trunk.position.set(x + (Math.random() - 0.5) * 0.5, baseHeight + 0.75, z + (Math.random() - 0.5) * 0.5);
        trunk.castShadow = true;
        this.scene.add(trunk);
        this.trees.push(trunk);

        // Leaves - multiple layers for fuller look
        for (let layer = 0; layer < 3; layer++) {
            const leavesGeometry = new THREE.ConeGeometry(0.8 - layer * 0.2, 1.2 - layer * 0.2, 8);
            const leavesMaterial = new THREE.MeshStandardMaterial({ 
                color: layer === 0 ? 0x228B22 : (layer === 1 ? 0x2E8B2E : 0x32CD32)
            });
            const leaves = new THREE.Mesh(leavesGeometry, leavesMaterial);
            leaves.position.set(trunk.position.x, baseHeight + 1.8 + layer * 0.5, trunk.position.z);
            leaves.castShadow = true;
            this.scene.add(leaves);
            this.trees.push(leaves);
        }
    }

    highlightCell(row, col, color, scale = 1.2) {
        const key = `${row}-${col}`;
        const cell = this.cellMap.get(key);
        if (cell && cell.material) {
            cell.material.color.setHex(color);
            cell.material.emissive = new THREE.Color(color);
            cell.material.emissiveIntensity = 0.3;
            cell.scale.set(scale, scale, scale);
        }
    }

    resetCellColors() {
        this.cellMap.forEach((cell) => {
            if (cell.userData && cell.userData.originalColor) {
                cell.material.color.setHex(cell.userData.originalColor);
                cell.material.emissive = new THREE.Color(0x000000);
                cell.material.emissiveIntensity = 0;
            }
            cell.scale.set(1, 1, 1);
        });
    }

    clearScene() {
        this.cells3D.forEach(cell => this.scene.remove(cell));
        this.cells3D = [];
        this.cellMap.clear();

        this.trees.forEach(tree => this.scene.remove(tree));
        this.trees = [];

        if (this.water) {
            this.scene.remove(this.water);
            this.water = null;
        }
    }

    onResize() {
        if (!this.container || !this.camera || !this.renderer) return;
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;

        if (width > 0 && height > 0) {
            this.camera.aspect = width / height;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(width, height);
        }
    }

    toggleAutoRotate() {
        this.isAutoRotating = !this.isAutoRotating;
        return this.isAutoRotating;
    }

    resetCamera() {
        this.spherical.theta = Math.PI / 4;
        this.spherical.phi = Math.PI / 4;
        this.spherical.radius = 80;
        if (this.updateCameraPosition) {
            this.updateCameraPosition();
        }
    }

    animate() {
        if (!this.renderer || !this.scene || !this.camera) return;
        
        this.animationId = requestAnimationFrame(() => this.animate());

        if (this.isAutoRotating && this.updateCameraPosition) {
            this.spherical.theta += 0.003;
            this.updateCameraPosition();
        }

        // Animate water
        if (this.water) {
            const time = Date.now() * 0.001;
            const positions = this.water.geometry.attributes.position;
            for (let i = 0; i < positions.count; i++) {
                const x = positions.getX(i);
                const y = positions.getY(i);
                positions.setZ(i, Math.sin(x * 0.3 + time) * 0.4 + Math.cos(y * 0.3 + time) * 0.4);
            }
            positions.needsUpdate = true;
        }

        // Animate trees (sway)
        const time = Date.now() * 0.001;
        this.trees.forEach((tree, index) => {
            if (tree.geometry.type === 'ConeGeometry') {
                tree.rotation.z = Math.sin(time * 2 + index) * 0.05;
                tree.rotation.x = Math.cos(time * 1.5 + index) * 0.03;
            }
        });

        this.renderer.render(this.scene, this.camera);
    }

    start() {
        if (!this.animationId && this.initialized) {
            this.animate();
        }
    }

    stop() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }

    dispose() {
        this.stop();
        this.clearScene();
        if (this.renderer) {
            this.renderer.dispose();
            if (this.container && this.renderer.domElement) {
                this.container.removeChild(this.renderer.domElement);
            }
        }
        this.initialized = false;
    }
}

// Export
window.Graph3DView = Graph3DView;
window.Island3DView = Island3DView;
