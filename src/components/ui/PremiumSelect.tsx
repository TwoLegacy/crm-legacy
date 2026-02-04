'use client'

import { useState, useRef, useEffect } from 'react'

interface Option {
  value: string
  label: string
  icon?: React.ReactNode
}

interface PremiumSelectProps {
  options: Option[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  label?: string
  className?: string
  error?: string
  disabled?: boolean
}

export default function PremiumSelect({
  options,
  value,
  onChange,
  placeholder = 'Selecione uma opção',
  label,
  className = '',
  error,
  disabled = false
}: PremiumSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  
  const selectedOption = options.find(opt => opt.value === value)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = (optionValue: string) => {
    onChange(optionValue)
    setIsOpen(false)
  }

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1.5 ml-1">
          {label}
        </label>
      )}
      
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`
          w-full flex items-center justify-between px-4 py-2.5 
          bg-white border-2 rounded-xl text-left transition-all duration-200
          ${isOpen ? 'border-[#8B0000] ring-4 ring-[#8B0000]/5' : 'border-gray-100 hover:border-gray-200'}
          ${error ? 'border-red-500' : ''}
          ${disabled ? 'opacity-50 cursor-not-allowed bg-gray-50' : 'cursor-pointer'}
        `}
      >
        <div className="flex items-center gap-2 overflow-hidden">
          {selectedOption?.icon && (
            <span className="flex-shrink-0 text-gray-400">
              {selectedOption.icon}
            </span>
          )}
          <span className={`truncate text-sm ${selectedOption ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </div>
        
        <svg 
          className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180 text-[#8B0000]' : ''}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="max-h-48 overflow-y-auto py-1.5 custom-scrollbar">
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => handleSelect(option.value)}
                className={`
                  w-full flex items-center gap-2 px-4 py-2.5 text-sm text-left transition-colors
                  ${option.value === value 
                    ? 'bg-[#8B0000]/5 text-[#8B0000] font-semibold' 
                    : 'text-gray-700 hover:bg-gray-50'
                  }
                `}
              >
                {option.icon && (
                  <span className={`flex-shrink-0 ${option.value === value ? 'text-[#8B0000]' : 'text-gray-400'}`}>
                    {option.icon}
                  </span>
                )}
                <span className="truncate flex-1">{option.label}</span>
                {option.value === value && (
                  <svg className="w-4 h-4 text-[#8B0000]" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {error && <p className="mt-1 text-xs text-red-500 ml-1">{error}</p>}
    </div>
  )
}
