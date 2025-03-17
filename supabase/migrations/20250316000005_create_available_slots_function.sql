/*
  # Create function to find available appointment slots

  1. New Function
    - `find_available_slots` - Find available slots for a specific provider, service, and date range
*/

-- Create function to find available slots
CREATE OR REPLACE FUNCTION find_available_slots(
  p_schedule_id uuid, 
  p_provider_id uuid,
  p_service_id uuid,
  p_start_date date,
  p_end_date date,
  p_slot_duration interval DEFAULT '30 minutes'
)
RETURNS TABLE (
  date date,
  start_time time,
  end_time time,
  provider_id uuid,
  service_id uuid
) AS $$
DECLARE
  v_service_duration interval;
  v_day_of_week integer;
  v_current_date date := p_start_date;
  slot record; -- Declaração da variável de loop como record
  time_slot record; -- Declaração da variável de loop como record
BEGIN
  -- Get the service duration
  SELECT duration INTO v_service_duration
  FROM schedule_services
  WHERE id = p_service_id AND schedule_id = p_schedule_id;
  
  -- If no service duration found, use the default slot duration
  IF v_service_duration IS NULL THEN
    v_service_duration := p_slot_duration;
  END IF;

  -- Loop through each date in the range
  WHILE v_current_date <= p_end_date LOOP
    -- Get the day of week (0-6, Sunday-Saturday)
    v_day_of_week := EXTRACT(DOW FROM v_current_date);
    
    -- For each day, find the available slots
    -- First, get the provider's availability for this day of week
    FOR slot IN (
      SELECT 
        v_current_date as date,
        a.start_time,
        a.end_time,
        p_provider_id as provider_id,
        p_service_id as service_id
      FROM schedule_availability a
      WHERE a.provider_id = p_provider_id
      AND a.day_of_week = v_day_of_week
      -- Provider must be available to provide this service
      AND EXISTS (
        SELECT 1 FROM schedule_providers sp
        WHERE sp.id = p_provider_id
        AND sp.status = 'active'
        AND (
          jsonb_array_length(sp.available_services) = 0
          OR p_service_id::text IN (SELECT jsonb_array_elements_text(sp.available_services))
        )
      )
      -- Exclude dates with holidays for the provider or schedule
      AND NOT EXISTS (
        SELECT 1 FROM schedule_holidays h
        WHERE (h.schedule_id = p_schedule_id OR h.provider_id = p_provider_id)
        AND h.date = v_current_date
        AND (
          h.all_day = true
          OR (h.all_day = false AND (
            (a.start_time BETWEEN h.start_time AND h.end_time)
            OR (a.end_time BETWEEN h.start_time AND h.end_time)
            OR (h.start_time BETWEEN a.start_time AND a.end_time)
          ))
        )
      )
    ) LOOP
      -- Generate slots within this availability period
      FOR time_slot IN (
        SELECT 
          t as slot_start,
          (t + v_service_duration) as slot_end
        FROM generate_series(
          slot.start_time, 
          slot.end_time - v_service_duration, 
          p_slot_duration
        ) t
      ) LOOP
        -- Only include slots that don't overlap with existing appointments
        IF NOT EXISTS (
          SELECT 1 FROM appointments a
          WHERE a.provider_id = p_provider_id
          AND a.date = v_current_date
          AND a.status NOT IN ('canceled', 'no_show')
          AND (
            (time_slot.slot_start BETWEEN a.start_time AND a.end_time)
            OR (time_slot.slot_end BETWEEN a.start_time AND a.end_time)
            OR (a.start_time BETWEEN time_slot.slot_start AND time_slot.slot_end)
          )
        ) THEN
          -- Return this available slot
          RETURN QUERY
          SELECT 
            v_current_date as date,
            time_slot.slot_start as start_time,
            time_slot.slot_end as end_time,
            p_provider_id as provider_id,
            p_service_id as service_id;
        END IF;
      END LOOP;
    END LOOP;
    
    -- Move to the next date
    v_current_date := v_current_date + 1;
  END LOOP;
  
  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 