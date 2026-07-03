import * as THREE from 'three';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { SECTIONS, RADIUS, SEG_ANGLE, LABEL } from './config';

// Labels 3D de vidro PRESAS ao anel — mesmo padrão dos Segments: cada seção
// tem dois textos extrudados que compartilham a aparência:
//   - curved: DOBRADO no arco do cilindro, baked no ângulo da sua fatia.
//     Vive no curvedGroup, então gira colado na frente da sua foto.
//   - flat:   reto; vive no flatGroup e desliza em x junto com a fita.
// O crossfade curvo↔reto usa o mesmo morph dos Segments (ver setMorph).
export class Labels {
  curved: THREE.Mesh[] = [];
  flat: THREE.Mesh[] = [];
  private curvedMats: THREE.MeshPhysicalMaterial[] = [];
  private flatMats: THREE.MeshPhysicalMaterial[] = [];

  async init() {
    const font = await new FontLoader().loadAsync(LABEL.font);

    SECTIONS.forEach((s, i) => {
      let geo: THREE.BufferGeometry = new TextGeometry(s.label, {
        font,
        size: LABEL.size,
        depth: LABEL.depth,
        curveSegments: 10,
        bevelEnabled: true,
        bevelThickness: LABEL.bevel,
        bevelSize: LABEL.bevel,
        bevelOffset: LABEL.bevelOffset,   // negativo = afina o traço da letra
        bevelSegments: 5,
      });
      geo.center();

      // ExtrudeGeometry sai não-indexada (normais por face = vidro facetado).
      // Solda os vértices e recalcula → normais SUAVES, letra lisa de gel.
      geo.deleteAttribute('normal');
      geo.deleteAttribute('uv');    // sem texturas no vidro; permite a solda
      geo = mergeVertices(geo);
      geo.computeVertexNormals();

      // labels largas encolhem pra caber na foto (baked na geometria,
      // assim o bend a seguir já trabalha nas medidas finais)
      geo.computeBoundingBox();
      const w = geo.boundingBox!.max.x - geo.boundingBox!.min.x;
      const fit = Math.min(1, LABEL.maxWidth / w);
      geo.scale(fit, fit, fit);

      // mesmo centro de fatia dos Segments (Segment.centerAngle)
      const centerAngle = i * SEG_ANGLE + SEG_ANGLE / 2;
      const curvedGeo = bendToRing(geo.clone(), centerAngle);

      const curvedMat = makeGlass();
      const flatMat = makeGlass();
      flatMat.opacity = 0;

      const curved = new THREE.Mesh(curvedGeo, curvedMat);
      const flat = new THREE.Mesh(geo, flatMat);
      flat.visible = false;

      this.curved[i] = curved;
      this.flat[i] = flat;
      this.curvedMats[i] = curvedMat;
      this.flatMats[i] = flatMat;
    });
  }

  // crossfade curvo↔reto (mesmo morph dos Segments) + fade por orientação:
  // a label acompanha o giro do anel, mas esmaece conforme a foto dela sai
  // da frente — de perfil o vidro viraria um borrão fosco na borda do anel.
  setMorph(morph: number, ringAngle: number) {
    for (let i = 0; i < this.curved.length; i++) {
      const centerAngle = i * SEG_ANGLE + SEG_ANGLE / 2;
      // cos(ângulo até a frente): 1 = encarando a câmera, 0 = de perfil
      const facing = Math.cos(centerAngle + ringAngle);
      // visível cheia até ~26° do centro, some de vez perto de ~50°
      const frontness = THREE.MathUtils.smoothstep(facing, 0.64, 0.9);

      const curvedOpacity = (1 - morph) * frontness;
      this.curvedMats[i].opacity = curvedOpacity;
      this.flatMats[i].opacity = morph;
      this.curved[i].visible = curvedOpacity > 0.001;
      this.flat[i].visible = morph > 0;
    }
  }
}

// "veste" o texto no cilindro: x vira arco (ângulo em volta do anel) e a
// profundidade z vira deslocamento radial — o texto abraça a curva da foto.
// As normais NÃO são recalculadas (viraria facetado de novo): como a dobra é
// uma rotação em Y que varia com x, basta girar a normal original junto.
function bendToRing(geo: THREE.BufferGeometry, centerAngle: number): THREE.BufferGeometry {
  const R = RADIUS + LABEL.lift;
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const nor = geo.attributes.normal as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const a = centerAngle + x / R;
    const sin = Math.sin(a);
    const cos = Math.cos(a);
    const r = R + z;
    pos.setXYZ(i, r * sin, y, r * cos);

    const nx = nor.getX(i);
    const nz = nor.getZ(i);
    nor.setXYZ(i, nx * cos + nz * sin, nor.getY(i), -nx * sin + nz * cos);
  }
  pos.needsUpdate = true;
  nor.needsUpdate = true;
  return geo;
}

// vidro FOSCO discreto (referência): a roughness borra o que atravessa a letra
// (frosted glass), o ior baixo distorce pouco — a legibilidade vem do blur
// contrastando com a foto nítida ao redor + o brilho do chanfro
function makeGlass(): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    transmission: 0.97,       // quase toda a cor vem da FOTO atrás (borrada)
    roughness: 0.32,          // é o que dá o BLUR da transmissão (vidro jateado)
    metalness: 0,
    ior: 1.15,
    thickness: 0.55,          // espessura também alarga o raio do blur
    dispersion: 1,
    clearcoat: 0.45,
    clearcoatRoughness: 0.25,
    envMapIntensity: 0.4,     // reflexo branco contido pra não lavar a cor
    transparent: true,        // permite o crossfade de morph
    // depthWrite LIGADO (default): as fotos em morph são transparent e
    // renderizam depois do passe transmissivo — sem depth, cobririam o vidro.
  });
}
