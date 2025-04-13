-- Create contact_messages table
CREATE TABLE IF NOT EXISTS public.contact_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    company TEXT,
    phone TEXT,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'new',
    organization_id UUID REFERENCES public.organizations(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

-- Allow organization members to read contact messages for their organization
CREATE POLICY "Organization members can read their contact messages" ON public.contact_messages
    FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM public.organization_members
            WHERE user_id = auth.uid()
        )
    );

-- Allow organization admins and owners to update contact messages
CREATE POLICY "Organization admins and owners can update contact messages" ON public.contact_messages
    FOR UPDATE
    USING (
        organization_id IN (
            SELECT organization_id FROM public.organization_members
            WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
        )
    );

-- Allow public insert
CREATE POLICY "Anyone can insert contact messages" ON public.contact_messages
    FOR INSERT
    WITH CHECK (true);

-- Add function to update updated_at column
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to automatically update updated_at
CREATE TRIGGER set_updated_at
BEFORE UPDATE ON public.contact_messages
FOR EACH ROW
EXECUTE PROCEDURE public.handle_updated_at();

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS contact_messages_organization_id_idx ON public.contact_messages (organization_id);
CREATE INDEX IF NOT EXISTS contact_messages_status_idx ON public.contact_messages (status);
CREATE INDEX IF NOT EXISTS contact_messages_email_idx ON public.contact_messages (email); 