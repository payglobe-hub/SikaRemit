"use client"

import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DateRangePickerProps {
  value?: { from: Date | undefined; to: Date | undefined } | undefined
  onChange?: (range: { from: Date | undefined; to: Date | undefined } | undefined) => void
  className?: string
  placeholder?: string
}

export function DateRangePicker({
  value,
  onChange,
  className,
  placeholder = "Pick a date range",
}: DateRangePickerProps) {
  const [date, setDate] = React.useState<{ from: Date | undefined; to: Date | undefined } | undefined>(value)
  const [isOpen, setIsOpen] = React.useState(false)

  const handleSelect = (range: { from: Date | undefined; to: Date | undefined } | undefined) => {
    setDate(range)
    onChange?.(range)
    if (range?.from && range?.to) {
      setIsOpen(false)
    }
  }

  const handlePresetSelect = (preset: string) => {
    const today = new Date()
    let from: Date
    let to: Date = today

    switch (preset) {
      case "today":
        from = today
        to = today
        break
      case "yesterday":
        from = new Date(today)
        from.setDate(from.getDate() - 1)
        to = new Date(today)
        to.setDate(to.getDate() - 1)
        break
      case "last7":
        from = new Date(today)
        from.setDate(from.getDate() - 7)
        break
      case "last30":
        from = new Date(today)
        from.setDate(from.getDate() - 30)
        break
      case "last90":
        from = new Date(today)
        from.setDate(from.getDate() - 90)
        break
      case "thisMonth":
        from = new Date(today.getFullYear(), today.getMonth(), 1)
        break
      case "lastMonth":
        from = new Date(today.getFullYear(), today.getMonth() - 1, 1)
        to = new Date(today.getFullYear(), today.getMonth(), 0)
        break
      default:
        return
    }

    const range = { from, to }
    setDate(range)
    onChange?.(range)
  }

  const formatDateRange = () => {
    if (!date?.from) return placeholder
    if (!date?.to) return format(date.from, "MMM dd, yyyy")
    return `${format(date.from, "MMM dd, yyyy")} - ${format(date.to, "MMM dd, yyyy")}`
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !date?.from && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {formatDateRange()}
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-auto p-0 shadow-2xl border border-gray-200 dark:border-gray-700" 
        align="start"
        side="bottom"
        sideOffset={8}
        style={{ 
          backgroundColor: 'white',
          background: 'white',
          zIndex: 9999
        }}
      >
        <div className="p-6 space-y-6 rounded-lg min-w-[320px] max-w-[400px] shadow-2xl border border-gray-200 dark:border-gray-700" 
             style={{ 
               backgroundColor: 'white',
               background: 'white',
               backgroundImage: 'none'
             }}>
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-200/50 dark:border-gray-700/50 pb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
              <CalendarIcon className="w-5 h-5 mr-2 text-blue-600" />
              Select Date Range
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(false)}
              className="h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full"
            >
              <span className="sr-only">Close</span>
              <span className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-lg leading-none">×</span>
            </Button>
          </div>

          {/* Preset Selectors */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Quick Select</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: "today", label: "Today" },
                { value: "yesterday", label: "Yesterday" },
                { value: "last7", label: "Last 7 days" },
                { value: "last30", label: "Last 30 days" },
                { value: "thisMonth", label: "This month" },
                { value: "lastMonth", label: "Last month" }
              ].map((preset) => (
                <Button
                  key={preset.value}
                  variant="outline"
                  size="sm"
                  onClick={() => handlePresetSelect(preset.value)}
                  className="h-8 text-xs font-medium hover:bg-blue-50 dark:hover:bg-blue-950/30 hover:border-blue-200 dark:hover:border-blue-700 hover:text-blue-700 dark:hover:text-blue-300 transition-all duration-200"
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          </div>
          
          {/* Calendar */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Custom Range</label>
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-lg p-3">
              <Calendar
                mode="range"
                selected={date}
                onSelect={handleSelect}
                numberOfMonths={1}
                className="bg-transparent rounded-md"
                classNames={{
                  months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                  month: "space-y-4",
                  caption: "flex justify-center pt-1 relative items-center",
                  caption_label: "text-sm font-medium text-gray-900 dark:text-gray-100",
                  nav: "space-x-1 flex items-center",
                  nav_button: "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors",
                  nav_button_previous: "absolute left-1",
                  nav_button_next: "absolute right-1",
                  table: "w-full collapse border-spacing-0",
                  head_row: "flex",
                  head_cell: "text-gray-500 dark:text-gray-400 rounded-md w-9 font-normal text-[0.8rem]",
                  row: "flex w-full mt-2",
                  cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-gray-100/50 dark:bg-gray-800/50 [&:has([aria-selected].day-outside)]:text-gray-500 dark:text-gray-400 [&:has([aria-selected])]:bg-gray-100 dark:bg-gray-800 first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                  day: "h-9 w-9 p-0 font-normal text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors focus:z-10 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50",
                  day_range_end: "day-range-end",
                  day_selected: "bg-blue-600 text-white hover:bg-blue-700 hover:text-white focus:bg-blue-600 focus:text-white",
                  day_today: "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-semibold",
                  day_outside: "day-outside text-gray-400 dark:text-gray-600 opacity-50",
                  day_disabled: "text-gray-400 dark:text-gray-600 opacity-50",
                  day_range_middle: "aria-selected:bg-gray-100 dark:aria-selected:bg-gray-800 aria-selected:text-gray-900 dark:aria-selected:text-gray-100",
                  day_hidden: "invisible",
                }}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-200/50 dark:border-gray-700/50">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {date?.from && date?.to ? (
                <span className="flex items-center">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                  {format(date.from, "MMM dd")} - {format(date.to, "MMM dd, yyyy")}
                </span>
              ) : date?.from ? (
                <span className="flex items-center">
                  <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                  From {format(date.from, "MMM dd, yyyy")}
                </span>
              ) : (
                <span className="flex items-center">
                  <span className="w-2 h-2 bg-gray-400 rounded-full mr-2"></span>
                  No dates selected
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setDate(undefined)
                  onChange?.(undefined)
                }}
                className="h-8 text-xs hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                Clear
              </Button>
              {date?.from && date?.to && (
                <Button
                  size="sm"
                  onClick={() => setIsOpen(false)}
                  className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Apply
                </Button>
              )}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
