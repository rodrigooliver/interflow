-- Add title column to integrations table
alter table integrations 
add column title text;

-- Temporarily set titles for existing integrations
update integrations
set title = case 
    when type = 'openai' then 'OpenAI Integration'
    when type = 'aws_s3' then 'S3 Integration'
    else 'Integration'
end || ' ' || id::text;

-- Make title column not null after setting default values
alter table integrations 
alter column title set not null;