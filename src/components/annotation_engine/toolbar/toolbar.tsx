import type { AnnotationEngine } from "~components/annotation_engine/AnnotationEngine"

export function Toolbar({ engine }: { engine: AnnotationEngine }) {
  const tool = engine.getActiveTool()
  const schema = engine.getToolSchema(tool)

  return (
    <div>
      {schema.map((cfg) => (
        <label key={cfg.key}>
          {cfg.label}
          <input type={cfg.type} />
        </label>
      ))}
    </div>
  )
}
