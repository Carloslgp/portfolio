// Camada visual WebGL do mural: subdivide cada foto para os pixels seguirem a
// parede curva. O DOM continua por cima como interação, acessibilidade e fallback.
import * as THREE from 'three';
import { TUNNEL } from './config';

export interface RenderPlacement {
  key: string;
  photoId: string;
  thumb: string;
  wx: number;
  wy: number;
  w: number;
  h: number;
}

interface DrawnPlacement extends RenderPlacement {
  mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
}

interface CompiledShader {
  uniforms: Record<string, { value: any }>;
}

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

export class TunnelRenderer {
  private renderer: THREE.WebGLRenderer | null = null;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera();
  private geometry: THREE.PlaneGeometry;
  private loader = new THREE.TextureLoader();
  private textures = new Map<string, Promise<THREE.Texture>>();
  private placements = new Map<string, DrawnPlacement>();
  private pending = new Map<string, { photoId: string; version: number }>();
  private version = 0;
  private offset = { x: 0, y: 0 };
  private strength = 0;
  private viewW = 1;
  private viewH = 1;
  private perspective = TUNNEL.PERSPECTIVE_MIN;
  private enabled = false;
  private firstFrame = false;
  private activating = false;
  private activation = 0;
  private renderRequest = 0;
  private disposed = false;
  private readyWaiters = new Set<() => void>();
  private readonly coarse: boolean;

  constructor(
    private canvas: HTMLCanvasElement,
    private reduced: boolean,
    private onFallback?: () => void,
    private onActivate?: () => void,
  ) {
    this.coarse = window.matchMedia('(pointer: coarse)').matches;
    this.geometry = new THREE.PlaneGeometry(
      1,
      1,
      this.coarse ? 16 : 24,
      this.coarse ? 12 : 18,
    );
    this.geometry.translate(0.5, 0.5, 0); // local (0..1), igual ao canto do tile DOM
  }

  /** Inicializa sem nunca tornar o canvas autoritativo: `false` deixa o DOM. */
  init(): boolean {
    if (this.reduced || this.disposed) return false;
    try {
      this.renderer = new THREE.WebGLRenderer({
        canvas: this.canvas,
        alpha: true,
        antialias: !this.coarse,
        powerPreference: 'high-performance',
      });
      this.renderer.setClearColor(0x000000, 0);
      // Three apenas relata falhas de link/compilação por callback; render()
      // não lança. Sem isto, um driver incompatível poderia ativar um canvas
      // transparente e esconder o fallback DOM perfeitamente utilizável.
      this.renderer.debug.onShaderError = () => this.fallback();
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.coarse ? 1.5 : 2));
      this.renderer.outputColorSpace = THREE.SRGBColorSpace;
      this.resize();
      this.canvas.addEventListener('webglcontextlost', this.onContextLost, { once: true });
      this.enabled = true;
      return true;
    } catch {
      this.fallback();
      return false;
    }
  }

  /** Espelha o conjunto virtualizado do InfiniteCanvas, sem medir o DOM. */
  sync(entries: RenderPlacement[]) {
    if (!this.enabled) return;
    const wanted = new Set(entries.map((entry) => entry.key));

    for (const [key, placed] of this.placements) {
      if (wanted.has(key)) continue;
      this.scene.remove(placed.mesh);
      placed.mesh.material.dispose();
      this.placements.delete(key);
    }
    for (const key of this.pending.keys()) {
      if (wanted.has(key)) continue;
      this.pending.delete(key);
    }

    for (const entry of entries) {
      const current = this.placements.get(entry.key);
      if (current?.photoId === entry.photoId) {
        Object.assign(current, entry);
        continue;
      }
      if (this.pending.get(entry.key)?.photoId === entry.photoId) continue;
      if (current) {
        this.scene.remove(current.mesh);
        current.mesh.material.dispose();
        this.placements.delete(entry.key);
      }
      this.mount(entry);
    }
  }

  frame(offset: { x: number; y: number }, strength: number) {
    if (!this.enabled) return;
    this.offset.x = offset.x;
    this.offset.y = offset.y;
    this.strength = clamp(strength, 0, 1);
    if (!this.activating) this.render();
  }

  /** A emenda da home só recua depois que o canvas já pintou de verdade. */
  readyForEntry(): Promise<void> {
    if (!this.enabled || this.firstFrame) return Promise.resolve();
    return new Promise((resolve) => this.readyWaiters.add(resolve));
  }

  resize() {
    if (!this.renderer) return;
    this.viewW = Math.max(this.canvas.clientWidth, 1);
    this.viewH = Math.max(this.canvas.clientHeight, 1);
    this.perspective = Math.max(
      Math.hypot(this.viewW, this.viewH) * TUNNEL.PERSPECTIVE_DIAG,
      TUNNEL.PERSPECTIVE_MIN,
    );
    this.renderer.setSize(this.viewW, this.viewH, false);

    // Uma PerspectiveCamera CSS-equivalente: fov derivado da mesma distância,
    // câmera no centro do viewport e plano do mural em z=0.
    this.camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(this.viewH / (2 * this.perspective)));
    this.camera.aspect = this.viewW / this.viewH;
    this.camera.near = 1;
    this.camera.far = Math.max(this.perspective * 6, 6000);
    this.camera.position.set(this.viewW / 2, this.viewH / 2, this.perspective);
    this.camera.lookAt(this.viewW / 2, this.viewH / 2, 0);
    this.camera.updateProjectionMatrix();
    this.render();
  }

  destroy() {
    this.disposed = true;
    this.fallback();
    cancelAnimationFrame(this.renderRequest);
    this.renderRequest = 0;
    for (const placed of this.placements.values()) placed.mesh.material.dispose();
    this.placements.clear();
    for (const texture of this.textures.values()) texture.then((value) => value.dispose()).catch(() => {});
    this.textures.clear();
    this.geometry.dispose();
    this.renderer?.dispose();
    this.renderer = null;
  }

  private mount(entry: RenderPlacement) {
    const version = ++this.version;
    this.pending.set(entry.key, { photoId: entry.photoId, version });

    this.texture(entry.photoId, entry.thumb)
      .then((texture) => {
        if (!this.enabled || this.pending.get(entry.key)?.version !== version) return;
        this.pending.delete(entry.key);
        const material = new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide });
        this.curveMaterial(material, entry);
        const mesh = new THREE.Mesh(this.geometry, material);
        mesh.frustumCulled = false; // a GPU deforma depois do culling da CPU
        const placed: DrawnPlacement = { ...entry, mesh };
        this.placements.set(entry.key, placed);
        this.scene.add(mesh);
        this.scheduleRender();
      })
      .catch(() => {
        if (this.pending.get(entry.key)?.version !== version) return;
        this.pending.delete(entry.key);
        this.fallback();
      });
  }

  private texture(id: string, src: string): Promise<THREE.Texture> {
    const cached = this.textures.get(id);
    if (cached) return cached;
    // TextureLoader conserva o mesmo eixo visual do <img>. Em ImageBitmap,
    // `Texture.flipY` é ignorado por especificação e virava a foto de cabeça
    // para baixo em alguns navegadores, apesar de a geometria estar correta.
    const request = this.loader.loadAsync(src).then((texture) => {
      this.prepareTexture(texture);
      return texture;
    });
    this.textures.set(id, request);
    return request;
  }

  private prepareTexture(texture: THREE.Texture) {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = Math.min(this.renderer?.capabilities.getMaxAnisotropy() ?? 1, 8);
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = true;
    texture.needsUpdate = true;
  }

  /** O MeshBasicMaterial cuida de textura/sRGB; só trocamos a posição do vértice. */
  private curveMaterial(material: THREE.MeshBasicMaterial, entry: RenderPlacement) {
    material.onBeforeCompile = (shader) => {
      shader.uniforms.uRect = { value: new THREE.Vector4(entry.wx, entry.wy, entry.w, entry.h) };
      // Estes valores precisam nascer no estado DESTE quadro: onBeforeCompile
      // roda dentro do primeiro render, depois da passada que atualiza shaders
      // já compilados. Defaults genéricos produziriam um frame no viewport 1×1
      // sempre que uma nova cópia virtualizada entrasse no mural.
      shader.uniforms.uOffset = { value: new THREE.Vector2(this.offset.x, this.offset.y) };
      shader.uniforms.uViewport = { value: new THREE.Vector2(this.viewW, this.viewH) };
      shader.uniforms.uStrength = { value: this.strength };
      shader.uniforms.uMaxAngle = { value: this.coarse ? TUNNEL.MAX_ANGLE_COARSE : TUNNEL.MAX_ANGLE };
      shader.uniforms.uVerticalWeight = { value: TUNNEL.VERTICAL_WEIGHT };
      material.userData.shader = shader;

      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', /* glsl */ `
          #include <common>
          uniform vec4 uRect;
          uniform vec2 uOffset;
          uniform vec2 uViewport;
          uniform float uStrength;
          uniform float uMaxAngle;
          uniform float uVerticalWeight;

          vec2 tunnelAxis(float distance, float halfView, float maxAngle) {
            float radius = halfView / max(maxAngle, 0.0001);
            float signD = distance < 0.0 ? -1.0 : 1.0;
            float absolute = abs(distance);
            float angle = min(absolute / radius, maxAngle);
            float position = radius * sin(angle);
            float depth = radius * (1.0 - cos(angle));
            float limit = radius * maxAngle;
            if (absolute > limit) {
              float extra = absolute - limit;
              position += extra * cos(maxAngle);
              depth += extra * sin(maxAngle);
            }
            return vec2(position * signD, depth);
          }
        `)
        .replace('#include <begin_vertex>', /* glsl */ `
          vec2 world = uRect.xy + vec2(position.x, 1.0 - position.y) * uRect.zw;
          vec2 distance = world - uOffset - uViewport * 0.5;
          vec2 sx = tunnelAxis(distance.x, uViewport.x * 0.5, uMaxAngle);
          vec2 sy = tunnelAxis(distance.y, uViewport.y * 0.5, uMaxAngle * uVerticalWeight);
          vec3 planar = vec3(
            world.x - uOffset.x,
            uViewport.y - (world.y - uOffset.y),
            0.0
          );
          vec3 curved = vec3(
            uViewport.x * 0.5 + sx.x,
            uViewport.y - (uViewport.y * 0.5 + sy.x),
            sx.y + sy.y
          );
          vec3 transformed = mix(planar, curved, uStrength);
        `);
    };
    material.customProgramCacheKey = () => 'mural-tunnel-v1';
  }

  private render() {
    if (!this.renderer || !this.enabled) return;
    if (this.renderRequest) {
      cancelAnimationFrame(this.renderRequest);
      this.renderRequest = 0;
    }
    for (const placed of this.placements.values()) {
      const shader = placed.mesh.material.userData.shader as CompiledShader | undefined;
      if (!shader) continue;
      shader.uniforms.uRect.value.set(placed.wx, placed.wy, placed.w, placed.h);
      shader.uniforms.uOffset.value.set(this.offset.x, this.offset.y);
      shader.uniforms.uViewport.value.set(this.viewW, this.viewH);
      shader.uniforms.uStrength.value = this.strength;
    }
    try {
      this.renderer.render(this.scene, this.camera);
      this.activateWhenReady();
    } catch {
      this.fallback();
    }
  }

  /** Dois quadros completos evitam trocar DOM→canvas enquanto shaders compilam. */
  private activateWhenReady() {
    if (this.firstFrame || this.activating || !this.placements.size || this.pending.size) return;
    const compiled = [...this.placements.values()].every((placed) => placed.mesh.material.userData.shader);
    if (!compiled) return;
    const token = ++this.activation;
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (
        !this.enabled || token !== this.activation || !this.placements.size || this.pending.size ||
        ![...this.placements.values()].every((placed) => placed.mesh.material.userData.shader)
      ) return;
      this.activating = true;
      try {
        this.onActivate?.();
        this.render();
      } catch {
        this.fallback();
      } finally {
        this.activating = false;
      }
      if (!this.enabled) return;
      this.firstFrame = true;
      document.documentElement.dataset.tunnelRenderer = 'webgl';
      this.resolveReady();
    }));
  }

  private onContextLost = (event: Event) => {
    event.preventDefault();
    this.fallback();
  };

  private fallback() {
    const wasEnabled = this.enabled;
    this.enabled = false;
    cancelAnimationFrame(this.renderRequest);
    this.renderRequest = 0;
    this.activation++;
    this.firstFrame = false;
    if (document.documentElement.dataset.tunnelRenderer === 'webgl') {
      delete document.documentElement.dataset.tunnelRenderer;
    }
    if (wasEnabled) this.onFallback?.();
    this.resolveReady();
  }

  private scheduleRender() {
    if (!this.enabled || this.renderRequest) return;
    this.renderRequest = requestAnimationFrame(() => {
      this.renderRequest = 0;
      this.render();
    });
  }

  private resolveReady() {
    for (const resolve of this.readyWaiters) resolve();
    this.readyWaiters.clear();
  }
}
