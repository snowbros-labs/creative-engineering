import type { WebGLRenderer } from 'three';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';

export type { GLTF };

export interface LoadModelOptions {
  /** Path to the Draco decoder files (e.g. `/draco/`). Enables Draco-compressed meshes. */
  draco?: string;
  /** Enable EXT_meshopt_compression (recommended default for gltf-transform output). */
  meshopt?: boolean;
  /** Enable KTX2/Basis textures. Needs the transcoder path and the renderer for format detection. */
  ktx2?: { transcoderPath: string; renderer: WebGLRenderer };
  /** Abort loading (e.g. component unmounted). Rejects with an AbortError. */
  signal?: AbortSignal;
  onProgress?: (loaded: number, total: number) => void;
}

const abortError = () =>
  typeof DOMException !== 'undefined'
    ? new DOMException('Model load aborted', 'AbortError')
    : new Error('AbortError');

/**
 * Load a glTF/GLB model. Loaders and decoders are imported on demand, so pages that never call
 * this don't pay for them. Decoders are disposed after the load.
 *
 * Asset pipeline recommendation: `gltf-transform optimize in.glb out.glb --compress meshopt
 * --texture-compress ktx2` (see docs/reference/3d-assets).
 */
export async function loadModel(url: string, options: LoadModelOptions = {}): Promise<GLTF> {
  if (options.signal?.aborted) throw abortError();
  const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
  const loader = new GLTFLoader();
  const cleanups: Array<() => void> = [];

  if (options.draco) {
    const { DRACOLoader } = await import('three/examples/jsm/loaders/DRACOLoader.js');
    const draco = new DRACOLoader().setDecoderPath(options.draco);
    loader.setDRACOLoader(draco);
    cleanups.push(() => draco.dispose());
  }
  if (options.meshopt) {
    const { MeshoptDecoder } = await import('three/examples/jsm/libs/meshopt_decoder.module.js');
    loader.setMeshoptDecoder(MeshoptDecoder);
  }
  if (options.ktx2) {
    const { KTX2Loader } = await import('three/examples/jsm/loaders/KTX2Loader.js');
    const ktx2 = new KTX2Loader()
      .setTranscoderPath(options.ktx2.transcoderPath)
      .detectSupport(options.ktx2.renderer);
    loader.setKTX2Loader(ktx2);
    cleanups.push(() => ktx2.dispose());
  }
  if (options.signal?.aborted) {
    for (const c of cleanups) c();
    throw abortError();
  }

  try {
    return await new Promise<GLTF>((resolve, reject) => {
      const onAbort = () => reject(abortError());
      options.signal?.addEventListener('abort', onAbort, { once: true });
      loader.load(
        url,
        (gltf) => {
          options.signal?.removeEventListener('abort', onAbort);
          resolve(gltf);
        },
        (e) => options.onProgress?.(e.loaded, e.total),
        (err) => {
          options.signal?.removeEventListener('abort', onAbort);
          reject(err);
        },
      );
    });
  } finally {
    for (const c of cleanups) c();
  }
}
