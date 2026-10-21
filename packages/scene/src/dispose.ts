import type { BufferGeometry, Material, Object3D, Texture } from 'three';

const isTexture = (v: unknown): v is Texture =>
  !!v && typeof v === 'object' && (v as { isTexture?: boolean }).isTexture === true;

/** Dispose a material and every texture-valued property or uniform it references. */
export function disposeMaterial(material: Material): void {
  const record = material as unknown as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    const value = record[key];
    if (isTexture(value)) value.dispose();
  }
  const uniforms = (material as { uniforms?: Record<string, { value: unknown }> }).uniforms;
  if (uniforms) {
    for (const u of Object.values(uniforms)) {
      if (isTexture(u?.value)) u.value.dispose();
      else if (Array.isArray(u?.value)) for (const t of u.value) if (isTexture(t)) t.dispose();
    }
  }
  material.dispose();
}

/**
 * Release GPU resources held by an object tree: geometries, materials (single or arrays) and
 * all textures they reference. Shared resources are disposed once. The object is also removed
 * from its parent.
 */
export function disposeObject(root: Object3D): void {
  const geometries = new Set<BufferGeometry>();
  const materials = new Set<Material>();
  root.traverse((node) => {
    const mesh = node as Object3D & { geometry?: BufferGeometry; material?: Material | Material[] };
    if (mesh.geometry) geometries.add(mesh.geometry);
    if (Array.isArray(mesh.material)) for (const m of mesh.material) materials.add(m);
    else if (mesh.material) materials.add(mesh.material);
  });
  for (const g of geometries) g.dispose();
  for (const m of materials) disposeMaterial(m);
  root.removeFromParent();
}
