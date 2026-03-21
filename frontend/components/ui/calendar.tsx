"use client"

import * as React from "react"
import { DayPicker } from "react-day-picker"
import { cn } from "@/lib/utils"

interface CalendarProps {
  mode?: "single" | "range"
  selected?: Date | { from: Date; to: Date } | undefined
  onSelect?: (date: Date | { from: Date; to: Date } | undefined) => void
  className?: string
  classNames?: Partial<Record<string, string>>
  showOutsideDays?: boolean
  numberOfMonths?: number
}

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  selected,
  onSelect,
  mode = 'single',
  numberOfMonths = 1,
  ...props
}: CalendarProps & any) {
  return (
    <DayPicker
      mode={mode}
      selected={selected}
      onSelect={onSelect}
      showOutsideDays={showOutsideDays}
      numberOfMonths={numberOfMonths}
      className={cn("p-3 bg-white dark:bg-gray-800 rounded-lg", className)}
      classNames={{
        months: "flex flex-col space-y-1",
        month: "space-y-2",
        caption: "flex justify-center pt-1 relative items-center",
        caption_label: "text-sm font-medium text-gray-900 dark:text-white",
        nav: "space-x-1 flex items-center",
        nav_button: cn(
          "h-8 w-8 bg-transparent p-0 opacity-70 hover:opacity-100 hover:bg-gray-100 dark:hover:bg-gray-700 inline-flex items-center justify-center rounded-md transition-colors"
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse space-y-1",
        head_row: "flex",
        head_cell: "text-xs font-medium text-gray-500 dark:text-gray-400 rounded-md w-8 h-8",
        row: "flex w-full mt-1",
        cell: "h-8 w-8 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-gray-50 dark:bg-gray-700 [&:has([aria-selected])]:bg-blue-50 dark:bg-blue-900/20 first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
        day: cn(
          "h-8 w-8 p-0 font-normal rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        ),
        day_range_end: "day-range-end",
        day_selected: "bg-blue-500 text-white hover:bg-blue-600 focus:bg-blue-600 focus:text-white rounded-md",
        day_today: "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-md",
        day_outside: "day-outside text-gray-400 dark:text-gray-600 opacity-50",
        day_disabled: "text-gray-300 dark:text-gray-600 opacity-50",
        day_range_middle: "aria-selected:bg-blue-50 dark:aria-selected:bg-blue-900/20 aria-selected:text-blue-600 dark:aria-selected:text-blue-400",
        day_hidden: "invisible",
        ...classNames,
      }}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

export { Calendar }
