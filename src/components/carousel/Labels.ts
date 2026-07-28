import * as THREE from 'three';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { SECTIONS, LABEL } from './config';
import { bendRibbon, captureRest, type RibbonRest } from './Ribbon';

// Labels 3D de vidro presas às fotos. Como as fotos, cada seção tem UM texto só:
// ele dobra junto com a fita (mesma curvatura, ver Ribbon.bendRibbon), flutuando
// LABEL.lift à frente da superfície em qualquer ponto da animação.
export class Labels {
  meshes: THREE.Mesh[] = [];
  private mats: THREE.MeshPhysicalMaterial[] = [];
  private rests: RibbonRest[] = [];

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
      // assim a dobra a seguir já trabalha nas medidas finais)
      geo.computeBoundingBox();
      const w = geo.boundingBox!.max.x - geo.boundingBox!.min.x;
      const fit = Math.min(1, LABEL.maxWidth / w);
      geo.scale(fit, fit, fit);

      const mat = makeGlass();
      const mesh = new THREE.Mesh(geo, mat);
      // a esfera envolvente ficaria desatualizada a cada dobra; são 5 textos
      // pequenos, sai mais barato desligar o culling do que recalculá-la
      mesh.frustumCulled = false;

      this.rests[i] = captureRest(geo);   // pose esticada, fonte de toda dobra
      this.meshes[i] = mesh;
      this.mats[i] = mat;
    });
  }

  // dobra os textos na curvatura atual da fita
  bend(k: number) {
    for (let i = 0; i < this.meshes.length; i++) {
      bendRibbon(this.meshes[i].geometry, this.rests[i], k, LABEL.lift);
    }
  }

  // esmaece a label conforme a foto dela sai da frente — de perfil o vidro
  // viraria um borrão fosco na borda do anel. `facing` é o cosseno da guinada
  // da fita ali: 1 encarando a câmera, 0 de perfil. Na fita reta a guinada é
  // zero em todo mundo, então todas as labels ficam cheias, como devem ficar.
  setFacing(i: number, facing: number) {
    // visível cheia até ~26° do centro, some de vez perto de ~50°
    const o = THREE.MathUtils.smoothstep(facing, 0.64, 0.9);
    this.mats[i].opacity = o;
    this.meshes[i].visible = o > 0.001;
  }
}

// vidro POLIDO: o corpo da letra é quase invisível e quem desenha a forma é a
// BORDA — refração deslocando a foto + Fresnel acendendo o chanfro.
// Uma versão jateada (roughness alta) borrava o que passava pela letra, e a
// média daquele borrão sobre uma foto cheia de detalhe dava sempre o mesmo
// cinza leitoso. Legível, mas opaco. Aqui a legibilidade vem de contorno.
function makeGlass(): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    transmission: 1,          // sem resto difuso: 100% da cor vem da foto atrás
    roughness: 0.08,          // quase liso — é o blur que acinzenta
    metalness: 0,
    ior: 1.62,                // refração forte: a foto DESLOCA dentro da letra
    thickness: 1.1,           // alonga o raio refratado → deslocamento maior
    dispersion: 1.6,          // franja cromática na borda: definição sem cinza
    clearcoat: 1,
    clearcoatRoughness: 0.04, // verniz nítido: fio de brilho na borda, não véu largo
    envMapIntensity: 0.55,    // liso, o ambiente só acende os ângulos rasantes
    transparent: true,        // permite o fade por orientação
  });
}
