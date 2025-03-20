import React, { useState, useEffect, useCallback, memo } from 'react';
import { useTranslation } from 'react-i18next';
import Select from 'react-select';
import { timezones } from '../../../../utils/timezones';

interface TimeSlot {
  id: string;
  day: number;
  startTime: string;
  endTime: string;
}

interface ScheduleRuleProps {
  params: {
    timezone: string;
    timeSlots: TimeSlot[];
  };
  onChange: (params: { timezone: string; timeSlots: TimeSlot[] }) => void;
}

const TimeInput = memo(({ 
  initialValue, 
  onChange, 
  onBlur 
}: { 
  initialValue: string; 
  onChange: (value: string) => void;
  onBlur: () => void;
}) => {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  return (
    <input
      type="time"
      value={value}
      onChange={(e) => {
        setValue(e.target.value);
        onChange(e.target.value);
      }}
      onBlur={onBlur}
      className="block w-32 h-10 px-3 rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
    />
  );
});

const DaySelect = memo(({ 
  value, 
  options, 
  onChange, 
  onBlur 
}: { 
  value: number;
  options: { value: number; label: string }[];
  onChange: (value: number) => void;
  onBlur: () => void;
}) => {
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  return (
    <Select
      value={options.find(day => day.value === localValue)}
      onChange={(selected) => {
        const newValue = selected?.value ?? value;
        setLocalValue(newValue);
        onChange(newValue);
      }}
      onBlur={onBlur}
      options={options}
      menuPlacement="top"
      className="react-select-container w-48"
      classNamePrefix="react-select"
      styles={{
        control: (base, state) => ({
          ...base,
          backgroundColor: 'var(--select-bg)',
          borderColor: state.isFocused ? 'var(--select-focus-border)' : 'var(--select-border)',
          '&:hover': {
            borderColor: 'var(--select-hover-border)'
          }
        }),
        menu: (base) => ({
          ...base,
          backgroundColor: 'var(--select-bg)',
          border: '1px solid var(--select-border)'
        }),
        option: (base, { isFocused, isSelected }) => ({
          ...base,
          backgroundColor: isSelected 
            ? 'var(--select-selected-bg)'
            : isFocused 
              ? 'var(--select-hover-bg)'
              : 'transparent',
          color: isSelected 
            ? 'var(--select-selected-text)'
            : 'var(--select-text)'
        }),
        singleValue: (base) => ({
          ...base,
          color: 'var(--select-text)'
        })
      }}
    />
  );
});

export function ScheduleRule({ params, onChange }: ScheduleRuleProps) {
  const { t } = useTranslation('flows');
  const [localTimeSlots, setLocalTimeSlots] = useState(params.timeSlots);

  // Usar o timezone do navegador se não houver um configurado
  useEffect(() => {
    if (!params.timezone) {
      try {
        // Tenta obter o timezone do navegador usando Intl.DateTimeFormat
        const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        
        // Verifica se o timezone do navegador está na nossa lista, caso contrário usa UTC
        const isValidTimezone = timezones.some(tz => tz.value === browserTimezone);
        const defaultTimezone = isValidTimezone ? browserTimezone : 'UTC';
        
        // Aplica o timezone default
        onChange({
          ...params,
          timezone: defaultTimezone
        });
      } catch (error) {
        console.error('Erro ao obter o timezone do navegador:', error);
      }
    }
  }, []);

  // Atualiza localTimeSlots quando params mudar
  useEffect(() => {
    setLocalTimeSlots(params.timeSlots);
  }, [params.timeSlots]);

  const weekDays = [
    { value: 0, label: t('days.sunday') },
    { value: 1, label: t('days.monday') },
    { value: 2, label: t('days.tuesday') },
    { value: 3, label: t('days.wednesday') },
    { value: 4, label: t('days.thursday') },
    { value: 5, label: t('days.friday') },
    { value: 6, label: t('days.saturday') }
  ];

  const addTimeSlot = () => {
    onChange({
      ...params,
      timeSlots: [
        ...params.timeSlots,
        {
          id: crypto.randomUUID(),
          day: 1,
          startTime: '09:00',
          endTime: '18:00'
        }
      ]
    });
  };

  const removeTimeSlot = (id: string) => {
    onChange({
      ...params,
      timeSlots: params.timeSlots.filter(slot => slot.id !== id)
    });
  };

  const updateTimeSlot = useCallback((id: string, updates: Partial<TimeSlot>) => {
    setLocalTimeSlots(prev => 
      prev.map(slot => slot.id === id ? { ...slot, ...updates } : slot)
    );
  }, []);

  const handleBlur = useCallback(() => {
    onChange({ ...params, timeSlots: localTimeSlots });
  }, [params, localTimeSlots, onChange]);

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {t('triggers.timezone')}
        </label>
        <Select
          value={{ value: params.timezone, label: params.timezone }}
          onChange={(selected) => {
            onChange({
              ...params,
              timezone: selected?.value || params.timezone
            });
          }}
          options={timezones.map(tz => ({ value: tz.value, label: `${tz.label} (${tz.offset})` }))}
          className="react-select-container"
          classNamePrefix="react-select"
          placeholder={t('triggers.selectTimezone')}
          isSearchable={true}
          noOptionsMessage={() => t('triggers.noTimezoneFound') || 'Nenhum fuso horário encontrado'}
          styles={{
            control: (base, state) => ({
              ...base,
              backgroundColor: 'var(--select-bg)',
              borderColor: state.isFocused ? 'var(--select-focus-border)' : 'var(--select-border)',
              '&:hover': {
                borderColor: 'var(--select-hover-border)'
              }
            }),
            menu: (base) => ({
              ...base,
              backgroundColor: 'var(--select-bg)',
              border: '1px solid var(--select-border)'
            }),
            option: (base, { isFocused, isSelected }) => ({
              ...base,
              backgroundColor: isSelected 
                ? 'var(--select-selected-bg)'
                : isFocused 
                  ? 'var(--select-hover-bg)'
                  : 'transparent',
              color: isSelected 
                ? 'var(--select-selected-text)'
                : 'var(--select-text)'
            }),
            singleValue: (base) => ({
              ...base,
              color: 'var(--select-text)'
            })
          }}
        />
      </div>

      <button
        type="button"
        onClick={addTimeSlot}
        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
      >
        {t('triggers.addTimeSlot')}
      </button>

      {params.timeSlots.map((slot) => (
        <div key={slot.id} className="border dark:border-gray-700 p-4 rounded-md">
          <div className="flex items-center gap-4">
            <DaySelect
              value={slot.day}
              options={weekDays}
              onChange={(value) => updateTimeSlot(slot.id, { day: value })}
              onBlur={handleBlur}
            />
            
            <div className="flex items-center gap-2">
              <TimeInput
                initialValue={slot.startTime}
                onChange={(value) => updateTimeSlot(slot.id, { startTime: value })}
                onBlur={handleBlur}
              />
              <span className="text-gray-500 dark:text-gray-400">-</span>
              <TimeInput
                initialValue={slot.endTime}
                onChange={(value) => updateTimeSlot(slot.id, { endTime: value })}
                onBlur={handleBlur}
              />
            </div>

            <button
              type="button"
              onClick={() => removeTimeSlot(slot.id)}
              className="p-2 text-gray-400 hover:text-red-600 dark:text-gray-500 dark:hover:text-red-400 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
} 