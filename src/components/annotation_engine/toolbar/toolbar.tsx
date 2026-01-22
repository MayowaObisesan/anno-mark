import React, { useState, useEffect } from "react"
import { Flex, Separator, Slider, Text } from "@radix-ui/themes"
import type { AnnotationEngine } from "~components/annotation_engine/AnnotationEngine"
import type { ToolConfigSchemaType } from "~components/annotation_engine/engine/Tool"
import type { ToolType } from "~components/annotation_engine/engine/types"
import { toolSettingsStore } from "~services/tool-settings-store"

interface ConfigField {
  key: string
  label: string
  type: ToolConfigSchemaType
  min?: number
  max?: number
}

const colors = [
  "#ff0000",
  "#00ff00",
  "#0000ff",
  "#ffff00",
  "#ff00ff",
  "#00ffff",
  "#000000",
  "#ffffff"
]

export function Toolbar({
  engine,
  activeTool
}: {
  engine: AnnotationEngine;
  activeTool: ToolType
}) {
  const schema = engine.getToolSchema(activeTool)
  const [properties, setProperties] = useState(engine.getToolProperties())

  // Update properties when active tool changes
  useEffect(() => {
    setProperties(engine.getToolProperties())
  }, [activeTool, engine])

  const handleChange = async (key: string, value: any) => {
    let newProperties = { ...properties, [key]: value }

    // If changing stroke color, also update fill color with alpha
    if (key === "stroke") {
      // Convert hex to rgba with 0.22 alpha
      const hex = value.replace("#", "")
      const r = parseInt(hex.substring(0, 2), 16)
      const g = parseInt(hex.substring(2, 4), 16)
      const b = parseInt(hex.substring(4, 6), 16)
      newProperties.fill = `rgba(${r}, ${g}, ${b}, 0.22)`
    }

    setProperties(newProperties)
    
    // Save to global store and update engine
    await engine.setToolProperties(newProperties)
  }

  const renderInput = (field: ConfigField) => {
    const value = properties[field.key]

    switch (field.type) {
      case "color":
        return (
          <Flex align={"center"} gap={"2"}>
            {colors.map((color) => (
              <button
                key={color}
                onClick={() => handleChange(field.key, color)}
                style={{
                  width: 28,
                  height: 28,
                  backgroundColor: color,
                  border:
                    value === color
                      ? "2px solid var(--accent-9)"
                      : "1px solid var(--gray-4)",
                  borderRadius: 100,
                  cursor: "pointer"
                }}
              />
            ))}
          </Flex>
        )

      case "number":
        return (
          <Flex align={"center"} gap={"2"}>
            <Slider
              className={"w-32"}
              defaultValue={[value]}
              min={field.min || 1}
              max={field.max || 10}
              step={1}
              size={"3"}
              onValueChange={(sliderValue) => handleChange(field.key, sliderValue[0])}
            />
            <Text size="2">{value}px</Text>
          </Flex>
        )

      case "text":
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => handleChange(field.key, e.target.value)}
            className="px-2 py-1 text-sm border border-gray-300 rounded"
          />
        )

      default:
        return null
    }
  }

  return (
    <Flex align={"center"} justify={"between"} width={"100%"}>
      <Flex align={"center"} gap={"4"}>
        {schema.map((cfg, index) => (
          <React.Fragment key={cfg.key}>
            {index > 0 && <Separator orientation="vertical" size="1" />}
            <Flex align={"center"} gap={"2"}>
              <Text size="2" className="font-medium">{cfg.label}</Text>
              {renderInput(cfg)}
            </Flex>
          </React.Fragment>
        ))}
      </Flex>
    </Flex>
  )
}
