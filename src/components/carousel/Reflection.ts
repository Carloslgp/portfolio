import * as THREE from 'three';
import { REFLECT } from './config';

// Relógio compartilhado por TODOS os materiais de reflexo — o mesmo objeto de
// uniform é injetado em cada shader, então o Carousel avança um valor só por frame.
export const reflectTime = { value: 0 };

// Ajustes por chamador. Quem tem cena própria (o carrossel do About) precisa de
// duas coisas: números próprios — as constantes de REFLECT foram calibradas para
// a foto de 1.6 do anel, e a mesma frequência numa foto menor vira chiado — e um
// RELÓGIO próprio, senão o reflexo de lá congela sempre que o loop do anel para.
export type ReflectOpts = Partial<typeof REFLECT> & { time?: { value: number } };

// O reflexo é um clone da foto que vive no grupo espelhado (scale.y = -1).
// Aqui remendamos o shader do MeshBasicMaterial (onBeforeCompile) para ele parecer
// uma poça em vez de uma cópia invertida:
//   - a UV ondula em duas senoides fora de fase, como marola descendo;
//   - as cristas ganham brilho (shimmer), que é o que dá o "molhado";
//   - a imagem apaga com a profundidade, então o corte na base da tela é suave.
//
// A ondulação acontece na UV CRUA da geometria, antes do mapTransform, onde
// u = horizontal e v = 0 cai na linha d'água — independente da rotação que a
// textura da foto carrega (ver Segment.ts).
export function makeReflectionMaterial(
  src: THREE.Mesh,
  opts: ReflectOpts = {},
): THREE.MeshBasicMaterial {
  const cfg = { ...REFLECT, ...opts };
  const clock = opts.time ?? reflectTime;

  const base = src.material as THREE.MeshBasicMaterial;
  const mat = new THREE.MeshBasicMaterial({
    map: base.map,
    side: THREE.DoubleSide,   // o espelhamento inverte o winding
    transparent: true,
    opacity: cfg.opacity,
    depthWrite: false,
  });

  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = clock;

    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vRawUv;')
      .replace('#include <uv_vertex>', '#include <uv_vertex>\n\tvRawUv = uv;');

    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', /* glsl */ `
        #include <common>
        // mapTransform é declarado pelo three só no vertex; redeclarar aqui pega o
        // MESMO uniform (é por programa), e é ele que leva a UV distorcida à textura.
        uniform mat3 mapTransform;
        uniform float uTime;
        varying vec2 vRawUv;
      `)
      .replace('#include <map_fragment>', /* glsl */ `
        #ifdef USE_MAP

          float depth = clamp( vRawUv.y, 0.0, 1.0 );   // 0 = linha d'água, 1 = fundo
          float t = uTime * ${cfg.speed.toFixed(3)};

          // onda lenta desenha as cristas largas; a rápida (que também varia em x)
          // quebra a regularidade — sozinha, a primeira parece uma persiana
          float wx = sin( depth * ${cfg.freq.toFixed(2)} - t )
                   + 0.55 * sin( depth * ${(cfg.freq * 2.3).toFixed(2)} + vRawUv.x * 5.0 + t * 1.37 );
          float wy = sin( depth * ${(cfg.freq * 0.7).toFixed(2)} + vRawUv.x * 2.0 - t * 0.8 );

          // a margem fica quase parada e a água solta conforme afunda
          float ramp = ${cfg.amp.toFixed(4)}
                     * ( 0.15 + 0.85 * smoothstep( 0.0, ${cfg.rampDepth.toFixed(2)}, depth ) );

          // clamp na UV crua: o cilindro usa RepeatWrapping e sem isso a borda
          // distorcida traria de volta um naco do outro lado da foto
          vec2 rippleUv = clamp( vRawUv + vec2( wx * ramp, wy * ramp * 0.35 ), 0.0, 1.0 );

          vec4 sampledDiffuseColor = texture2D( map, ( mapTransform * vec3( rippleUv, 1.0 ) ).xy );
          diffuseColor *= sampledDiffuseColor;

          diffuseColor.rgb *= 1.0 + wx * ${cfg.shimmer.toFixed(3)};
          diffuseColor.a *= pow( 1.0 - depth, ${cfg.fade.toFixed(2)} );

        #endif
      `);
  };

  return mat;
}
