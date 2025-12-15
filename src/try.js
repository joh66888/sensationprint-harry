import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { PMREMGenerator } from 'three/src/extras/PMREMGenerator.js';
import { updateLoadingText } from './loading-text-animation.js';


import { gsap } from 'gsap';

// Loaders
const loadingbar = document.querySelector('.loading-bar');
const loadingtext = document.querySelector('.loading-text');
const rgbeLoader = new RGBELoader();

// Canvas
const canvas = document.querySelector('canvas.webgl')

// Scene
const scene = new THREE.Scene();

// Overlay Shader
const overlayGeometry = new THREE.PlaneGeometry(2, 2, 1, 1);
const overlayMaterial = new THREE.ShaderMaterial({
    transparent: true,
    uniforms: {
        uAlpha: { value: 1 }
    },
    vertexShader: `
        void main() {
            gl_Position = vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        uniform float uAlpha;
        void main() {
            gl_FragColor = vec4(0.0, 0.0, 0.0, uAlpha);
        }
    `
});
const overlay = new THREE.Mesh(overlayGeometry, overlayMaterial);
scene.add(overlay);

// Force overlay fade out after a short delay to ensure visibility even if assets fail
gsap.to(overlayMaterial.uniforms.uAlpha, { duration: 3, value: 0, delay: 1 });

// Renderer
const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true
})
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

// Adjust canvas on resize
window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Load the HDR environment map
// Create a new PMREMGenerator
const pmremGenerator = new PMREMGenerator(renderer);
pmremGenerator.compileEquirectangularShader();

// Load the HDR environment map

// 記錄開始時間
const startTime = performance.now();
let envMap = null;

rgbeLoader.setDataType(THREE.HalfFloatType);
/* no environment map
rgbeLoader.load(
    '/textures/environmentMap/universe.hdr',
    (texture) => {
        // 下載進度
        const progressRatio = texture.loaded / texture.total;
        //console.log("loaded progressRatio: " + progressRatio);

        gsap.delayedCall(0.5, () => {
            const downloadEndTime = performance.now();
            console.log(`HDR environment map download complete in ${(downloadEndTime - startTime).toFixed(2)}ms`);

            // 處理進度模擬
            const processStartTime = performance.now();

            // 正式處理貼圖
            texture.mapping = THREE.EquirectangularReflectionMapping;
            envMap = pmremGenerator.fromEquirectangular(texture).texture;

            scene.background = envMap;
            scene.environment = envMap;

            texture.dispose();
            pmremGenerator.dispose();

            const processEndTime = performance.now();
            console.log(`HDR environment map processed in ${(processEndTime - processStartTime).toFixed(2)}ms`);
            console.log(`Total time: ${(processEndTime - startTime).toFixed(2)}ms`);

            // 更新 loading bar: remove loading bar transform style & add ended class
            loadingbar.classList.add('ended');
            loadingbar.style.transform = ``;

            // 動畫完成 overlay 消失

        });
    },
    (xhr) => {
        // 下載進度
        const progressRatio = xhr.loaded / xhr.total;
        //console.log("progressing progressRatio: " + progressRatio);

        // 更新 loading bar
        loadingbar.style.transform = `scaleX(${progressRatio})`;

        // 使用 GSAP 更新 loading text
        updateLoadingText(progressRatio, loadingtext);
    },
    (error) => {
        // 加載失敗
        console.error('An error occurred while loading the HDR environment map:', error);
    }
);
*/

/*以下爲核心模型區，僅需調整此部分即可-----------------------------------------------------------*/

// ------------------ 建立「太空船 Group」 ------------------
const spaceship = new THREE.Group();
spaceship.position.set(0, 0, 0);
scene.add(spaceship);

// ------------------ 載入外部 glb 物件 ------------------
const gltfLoader = new GLTFLoader();
let spaceshipModel = new THREE.Group(); // ⭐ 重要：建立 Group
scene.add(spaceshipModel);

// Textures 太空船材質
const textLoader = new THREE.TextureLoader();
const metcapTexture = textLoader.load('./textures/matcaps/13.png');
metcapTexture.colorSpace = THREE.SRGBColorSpace;

// Material
const metalmaterial = new THREE.MeshMatcapMaterial({
    matcap: metcapTexture,
    side: THREE.DoubleSide
});

gltfLoader.load('/models/sensifylogo.glb', (gltf) => {

    const obj = gltf.scene.children[0];

    // -------- 內層金屬材質 --------
    obj.material = metalmaterial;

    obj.geometry.computeBoundingBox();
    obj.geometry.center();
    obj.geometry.computeBoundingSphere();

    obj.scale.set(50, 50, 50);
    obj.rotation.x = Math.PI / 2;

    // -------- 外層玻璃殼 --------
    const glassMesh = obj.clone();
    glassMesh.material = new THREE.MeshPhysicalMaterial({
        transmission: 1,
        thickness: 5,
        roughness: 0,
        metalness: 0,
        ior: 1.45,
        reflectivity: 1,
        envMapIntensity: 10,
        transparent: true
    });

    // 放大外殼
    glassMesh.scale.multiplyScalar(1.02);

    // -------- 加入 Group --------
    spaceshipModel.add(obj);        // 金屬核心
    //spaceshipModel.add(glassMesh);  // 玻璃外殼
});

// ------------------ Camera + Controls ------------------
const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    1,
    1000
);
camera.position.set(0, 5, 5);
scene.add(camera);

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;


// ------------------ Animation Loop ------------------
const clock = new THREE.Clock();

function animate() {
    controls.update();

    const t = clock.getElapsedTime();

    if (spaceshipModel) {
        spaceshipModel.rotation.y = t / 3;
    }

    renderer.render(scene, camera);
    requestAnimationFrame(animate);
}

animate();