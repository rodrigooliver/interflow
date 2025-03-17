export default function SchedulePage() {
  // ... existing code ...
  
  return (
    <div className="p-6 w-full h-full overflow-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {t('schedules:title')}
        </h1>
        
        {/* Configurações adicionais */}
        <div className="flex items-center space-x-3">
          <Toggle 
            checked={isProfessionalMode}
            onCheckedChange={setIsProfessionalMode}
          />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('schedules:professionalMode')}
          </span>
        </div>
      </div>
      
      {/* Calendário de agendamentos */}
      {schedule && (
        <ScheduleCalendar
          appointments={appointments || []}
          providers={providers || []}
          services={services || []}
          onSelectAppointment={handleSelectAppointment}
          onSelectSlot={handleSelectSlot}
          isProfessionalMode={isProfessionalMode}
          height="calc(100vh - 180px)"
        />
      )}
      
      {/* ... existing code ... */}
    </div>
  );
} 