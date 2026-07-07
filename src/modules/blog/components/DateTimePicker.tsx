interface DateTimePickerProps {
  date: string
  onDateChange: (value: string) => void
  onTimeChange: (value: string) => void
  time: string
}

export function DateTimePicker({ date, onDateChange, onTimeChange, time }: DateTimePickerProps) {
  return (
    <div className="blog-date-time-picker">
      <label>
        Data
        <input onChange={(event) => onDateChange(event.target.value)} type="date" value={date} />
      </label>
      <label>
        Horário
        <input onChange={(event) => onTimeChange(event.target.value)} type="time" value={time} />
      </label>
    </div>
  )
}
