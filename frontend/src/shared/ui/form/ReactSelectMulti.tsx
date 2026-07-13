"use client"

import React from "react"
import Select, { MultiValue, Options } from "react-select"

type Option = { value: string; label: string }

interface ReactSelectMultiProps {
  value: string[]
  onChange: (values: string[]) => void
  options: Option[]
  placeholder?: string
  isDisabled?: boolean
}

const ReactSelectMulti: React.FC<ReactSelectMultiProps> = ({
  value,
  onChange,
  options,
  placeholder = "Select...",
  isDisabled = false,
}) => {
  const selected = options.filter((o) => value?.includes(o.value))

  const handleChange = (v: MultiValue<Option>) => {
    const vals = v ? v.map((i: Option) => i.value) : []
    onChange(vals)
  }

  return (
    <Select
      isMulti
      isDisabled={isDisabled}
      value={selected}
      onChange={handleChange}
      options={options as Options<Option>}
      placeholder={placeholder}
      classNamePrefix="react-select"
      className="border"
      styles={{
        control: () => ({ borderRadius: 6, minHeight: 40 }),
      }}
    />
  )
}

export default ReactSelectMulti
